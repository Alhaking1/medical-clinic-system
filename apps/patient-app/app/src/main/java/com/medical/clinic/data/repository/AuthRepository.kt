package com.medical.clinic.data.repository

import com.google.gson.Gson
import com.medical.clinic.data.api.ApiClient
import com.medical.clinic.data.api.ChangePasswordRequest
import com.medical.clinic.data.api.GoogleLoginStaffRequest
import com.medical.clinic.data.api.LoginPasswordRequest
import com.medical.clinic.data.api.CheckAccountRequest
import com.medical.clinic.data.api.CheckAccountResponse
import com.medical.clinic.data.api.RecoveryRequest
import com.medical.clinic.data.api.RecoveryWithPasswordRequest
import com.medical.clinic.data.api.ResetPasswordRequest
import com.medical.clinic.data.api.RecoveryStatusResponse
import com.medical.clinic.data.api.RecoveryRequestResponse
import com.medical.clinic.data.api.SetPasswordRequest
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.data.models.ErrorResponse
import com.medical.clinic.data.models.User
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.HttpException
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val apiClient: ApiClient,
    private val sessionManager: SessionManager
) {

    // ═══════════════════════════════════════════
    // Login
    // ═══════════════════════════════════════════

    suspend fun login(
        email: String,
        password: String,
        role: String
    ): Result<User> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.apiService.loginPassword(
                LoginPasswordRequest(
                    login = email.trim(),
                    password = password,
                    role = role
                )
            )

            val token = response.token
            if (token.isNullOrBlank()) {
                return@withContext Result.failure(
                    Exception(response.message ?: "لم يتم استلام رمز الدخول")
                )
            }

            val user = response.user
            if (user == null) {
                return@withContext Result.failure(
                    Exception(response.message ?: "تعذر استلام بيانات المستخدم")
                )
            }

            sessionManager.saveToken(token)
            response.refreshToken?.let { sessionManager.saveRefreshToken(it) }
            sessionManager.saveUser(user)
            response.permissions?.let {
                sessionManager.savePermissions(it)
            }

            Result.success(user)

        } catch (e: HttpException) {
            Result.failure(Exception(parseErrorMessage(e)))
        } catch (e: IOException) {
            Result.failure(Exception("تعذر الاتصال بالخادم. تحقق من الإنترنت."))
        } catch (e: Exception) {
            Result.failure(Exception(e.message ?: "خطأ غير معروف"))
        }
    }

    // ═══════════════════════════════════════════
    // Google Login — محدّث ليقبل pending
    // ═══════════════════════════════════════════
    suspend fun loginWithGoogle(idToken: String, role: String): Result<User> = withContext(Dispatchers.IO) {
        try {
            val response = if (role == com.medical.clinic.utils.Constants.ROLE_PATIENT) {
                apiClient.apiService.googleLoginPatient(mapOf("idToken" to idToken))
            } else {
                apiClient.apiService.googleLoginStaff(
                    GoogleLoginStaffRequest(
                        idToken = idToken,
                        role = role
                    )
                )
            }

            // ✅ الآن Backend يُرجع token حتى لـ pending
            val token = response.token

            // ✅ تحقق من نجاح الاستجابة ومن وجود المستخدم
            val user = response.user
            if (!response.success || user == null) {
                return@withContext Result.failure(
                    Exception(response.message ?: "تعذر إكمال تسجيل الدخول. قد يحتاج حسابك لمراجعة الإدارة.")
                )
            }

            // ✅ احفظ الـ token إذا موجود (pending أو approved)
            if (!token.isNullOrBlank()) {
                sessionManager.saveToken(token)
                response.refreshToken?.let { sessionManager.saveRefreshToken(it) }
            }

            // ✅ احفظ user دائماً
            sessionManager.saveUser(user)
            response.permissions?.let {
                sessionManager.savePermissions(it)
            }

            // ✅ أرجع success مع المستخدم المضمون غير null
            Result.success(user)

        } catch (e: HttpException) {
            Result.failure(Exception(parseErrorMessage(e)))
        } catch (e: IOException) {
            Result.failure(Exception("تعذر الاتصال بالخادم"))
        } catch (e: Exception) {
            Result.failure(Exception(e.message ?: "خطأ غير معروف"))
        }
    }

    // ═══════════════════════════════════════════
    // Google Direct Login (تسجيل دخول رسمي وإصدار توكن صالح من السيرفر)
    // ═══════════════════════════════════════════
    suspend fun loginWithGoogleDirect(email: String, name: String): Result<User> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.apiService.googleDirectLogin(
                mapOf(
                    "email" to email,
                    "name" to name
                )
            )

            val token = response.token
            val user = response.user
            if (!response.success || user == null || token.isNullOrBlank()) {
                return@withContext Result.failure(
                    Exception(response.message ?: "تعذر استلام رمز الدخول من الخادم")
                )
            }

            sessionManager.saveToken(token)
            response.refreshToken?.let { sessionManager.saveRefreshToken(it) }
            sessionManager.saveUser(user)
            response.permissions?.let {
                sessionManager.savePermissions(it)
            }

            Result.success(user)
        } catch (e: HttpException) {
            Result.failure(Exception(parseErrorMessage(e)))
        } catch (e: IOException) {
            Result.failure(Exception("تعذر الاتصال بالخادم"))
        } catch (e: Exception) {
            Result.failure(Exception(e.message ?: "خطأ غير معروف"))
        }
    }

    // ═══════════════════════════════════════════
    // Register Patient (تسجيل فوري مباشر لمريض طبيبك)
    // ═══════════════════════════════════════════
    suspend fun registerPatient(
        fullName: String,
        phone: String,
        password: String,
        governorate: String,
        age: Int,
        gender: String,
        bloodGroup: String
    ): Result<User> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.apiService.registerPatient(
                mapOf(
                    "full_name" to fullName.trim(),
                    "phone" to phone.trim(),
                    "password" to password,
                    "governorate" to governorate.trim(),
                    "age" to age,
                    "gender" to gender,
                    "blood_group" to bloodGroup
                )
            )

            val token = response.token
            if (token.isNullOrBlank()) {
                return@withContext Result.failure(
                    Exception(response.message ?: "فشل استلام رمز الدخول")
                )
            }

            val user = response.user
            if (user == null) {
                return@withContext Result.failure(
                    Exception(response.message ?: "تعذر استلام بيانات المستخدم")
                )
            }

            sessionManager.saveToken(token)
            response.refreshToken?.let { sessionManager.saveRefreshToken(it) }
            sessionManager.saveUser(user)
            Result.success(user)
        } catch (e: HttpException) {
            Result.failure(Exception(parseErrorMessage(e)))
        } catch (e: IOException) {
            Result.failure(Exception("تعذر الاتصال بالخادم. تحقق من الإنترنت."))
        } catch (e: Exception) {
            Result.failure(Exception(e.message ?: "خطأ غير معروف"))
        }
    }

    // ═══════════════════════════════════════════
    // Update Patient Profile (تحديث الملف الطبي للمريض)
    // ═══════════════════════════════════════════
    suspend fun updatePatientProfile(
        fullName: String,
        phone: String,
        governorate: String,
        age: Int,
        bloodGroup: String,
        email: String? = null,
        password: String? = null
    ): Result<Boolean> = withContext(Dispatchers.IO) {
        try {
            val payload = mutableMapOf<String, Any>(
                "full_name" to fullName.trim(),
                "phone" to phone.trim(),
                "governorate" to governorate.trim(),
                "age" to age,
                "blood_group" to bloodGroup
            )
            if (!email.isNullOrBlank()) payload["email"] = email.trim()
            if (!password.isNullOrBlank()) payload["password"] = password.trim()

            apiClient.apiService.updatePatientProfile(payload)

            val current = sessionManager.getUser()
            if (current != null) {
                val updated = current.copy(
                    fullName = fullName.trim(),
                    phone = phone.trim(),
                    governorate = governorate.trim(),
                    age = age,
                    bloodGroup = bloodGroup,
                    email = if (!email.isNullOrBlank()) email.trim() else current.email
                )
                sessionManager.saveUser(updated)
            }
            Result.success(true)
        } catch (e: HttpException) {
            Result.failure(Exception(parseErrorMessage(e)))
        } catch (e: IOException) {
            Result.failure(Exception("تعذر الاتصال بالخادم. تحقق من الإنترنت."))
        } catch (e: Exception) {
            Result.failure(Exception(e.message ?: "خطأ غير معروف"))
        }
    }

    // ═══════════════════════════════════════════
    // Set / Change Password
    // ═══════════════════════════════════════════

    suspend fun setPassword(
        newPassword: String,
        currentPassword: String? = null
    ): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            apiClient.apiService.setPassword(
                SetPasswordRequest(
                    new_password = newPassword,
                    current_password = currentPassword
                )
            )

            sessionManager.getUser()?.let { user ->
                sessionManager.saveUser(user.copy(mustChangePasswordRaw = 0))
            }

            Result.success(Unit)

        } catch (e: HttpException) {
            Result.failure(Exception(parseErrorMessage(e)))
        } catch (e: IOException) {
            Result.failure(Exception("تعذر الاتصال بالخادم"))
        } catch (e: Exception) {
            Result.failure(Exception(e.message ?: "خطأ غير معروف"))
        }
    }

    suspend fun changePassword(
        currentPassword: String,
        newPassword: String
    ): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            apiClient.apiService.changePassword(
                ChangePasswordRequest(
                    current_password = currentPassword,
                    new_password = newPassword
                )
            )
            Result.success(Unit)
        } catch (e: HttpException) {
            Result.failure(Exception(parseErrorMessage(e)))
        } catch (e: IOException) {
            Result.failure(Exception("تعذر الاتصال بالخادم"))
        } catch (e: Exception) {
            Result.failure(Exception(e.message ?: "خطأ غير معروف"))
        }
    }

    // ═══════════════════════════════════════════
    // Get User Info
    // ═══════════════════════════════════════════

    suspend fun getMe(): Result<User> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.apiService.getMe()
            val user = response.data
                ?: return@withContext Result.failure(Exception("لم يتم استلام البيانات"))

            sessionManager.saveUser(user)
            Result.success(user)

        } catch (e: HttpException) {
            Result.failure(Exception(parseErrorMessage(e)))
        } catch (e: IOException) {
            Result.failure(Exception("تعذر الاتصال بالخادم"))
        } catch (e: Exception) {
            Result.failure(Exception(e.message ?: "خطأ غير معروف"))
        }
    }

    // ═══════════════════════════════════════════
    // Account Recovery (طلب استعادة الحساب)
    // ═══════════════════════════════════════════

    // ═══════════════════════════════════════════
    // Check Account Exists (التحقق من وجود الحساب)
    // ═══════════════════════════════════════════
    suspend fun checkAccountExists(login: String): Result<CheckAccountResponse> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiClient.apiService.checkAccountExists(
                    CheckAccountRequest(login = login.trim())
                )
                Result.success(response)
            } catch (e: HttpException) {
                Result.failure(Exception(parseErrorMessage(e)))
            } catch (e: IOException) {
                Result.failure(Exception("تعذر الاتصال بالخادم. تحقق من الإنترنت."))
            } catch (e: Exception) {
                Result.failure(Exception(e.message ?: "خطأ غير معروف"))
            }
        }

    // ═══════════════════════════════════════════
    // Request Recovery With Password (طلب الاستعادة + pw)
    // ═══════════════════════════════════════════
    suspend fun requestRecoveryWithPassword(
        login: String,
        oldPassword: String?,
        fullName: String?
    ): Result<RecoveryRequestResponse> =
        withContext(Dispatchers.IO) {
            try {
                val response = apiClient.apiService.requestRecoveryWithPassword(
                    RecoveryWithPasswordRequest(
                        login = login.trim(),
                        old_password = oldPassword,
                        full_name = fullName
                    )
                )

                if (response.success == false) {
                    return@withContext Result.failure(
                        Exception(response.message ?: "فشل الطلب")
                    )
                }

                Result.success(response)
            } catch (e: HttpException) {
                Result.failure(Exception(parseErrorMessage(e)))
            } catch (e: IOException) {
                Result.failure(Exception("تعذر الاتصال بالخادم. تحقق من الإنترنت."))
            } catch (e: Exception) {
                Result.failure(Exception(e.message ?: "خطأ غير معروف"))
            }
        }
    suspend fun requestAccountRecovery(
        fullName: String,
        phone: String
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.apiService.requestAccountRecovery(
                RecoveryRequest(
                    full_name = fullName.trim(),
                    phone = phone.trim()
                )
            )

            if (response.success == false) {
                return@withContext Result.failure(
                    Exception(response.message ?: "فشل إرسال الطلب")
                )
            }

            Result.success(response.message ?: "تم استلام طلبك بنجاح")

        } catch (e: HttpException) {
            Result.failure(Exception(parseErrorMessage(e)))
        } catch (e: IOException) {
            Result.failure(Exception("تعذر الاتصال بالخادم. تحقق من الإنترنت."))
        } catch (e: Exception) {
            Result.failure(Exception(e.message ?: "خطأ غير معروف"))
        }
    }
    // ═══════════════════════════════════════════
    // Check Recovery Status (التحقق من حالة طلب الاستعادة)
    // ═══════════════════════════════════════════

    suspend fun checkRecoveryStatus(phone: String): Result<RecoveryStatusResponse> =
        withContext(Dispatchers.IO) {
            try {
                // apiService.getRecoveryStatus يرجّع RecoveryStatusResponse مباشرة
                val response = apiClient.apiService.getRecoveryStatus(phone.trim())

                if (response.success == false) {
                    return@withContext Result.failure(
                        Exception(response.message ?: "فشل التحقق من حالة الطلب")
                    )
                }

                Result.success(response)

            } catch (e: HttpException) {
                Result.failure(Exception(parseErrorMessage(e)))
            } catch (e: IOException) {
                Result.failure(Exception("تعذر الاتصال بالخادم. تحقق من الإنترنت."))
            } catch (e: Exception) {
                Result.failure(Exception(e.message ?: "خطأ غير معروف"))
            }
        }

    // ═══════════════════════════════════════════
    // Logout
    // ═══════════════════════════════════════════

    suspend fun logout(): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            try {
                apiClient.apiService.logout()
            } catch (e: Exception) {
                // تجاهل
            }

            sessionManager.logout()
            Result.success(Unit)

        } catch (e: Exception) {
            sessionManager.logout()
            Result.success(Unit)
        }
    }

    fun clearSession() {
        sessionManager.logout()
    }

    // ═══════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════

    private fun parseErrorMessage(e: HttpException): String {
        return try {
            val body = e.response()?.errorBody()?.string()
            if (!body.isNullOrBlank()) {
                val gson = Gson()
                val error = gson.fromJson(body, ErrorResponse::class.java)
                error.message
            } else {
                defaultErrorMessage(e.code())
            }
        } catch (ex: Exception) {
            defaultErrorMessage(e.code())
        }
    }

    private fun defaultErrorMessage(code: Int): String {
        return when (code) {
            400 -> "طلب غير صحيح"
            401 -> "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            403 -> "غير مصرح لك بالوصول"
            404 -> "الحساب غير موجود"
            429 -> "محاولات كثيرة — حاول بعد قليل"
            500 -> "خطأ في الخادم"
            else -> "خطأ ($code)"
        }
    }

    // ═══════════════════════════════════════════
    // Reset Password (تعيين كلمة مرور جديدة)
    // ═══════════════════════════════════════════

    suspend fun resetPasswordWithRecovery(
        phone: String,
        newPassword: String
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.apiService.resetPasswordWithRecovery(
                ResetPasswordRequest(
                    phone = phone.trim(),
                    new_password = newPassword
                )
            )

            if (response.success == false) {
                return@withContext Result.failure(
                    Exception(response.message ?: "فشل تعيين كلمة المرور")
                )
            }

            Result.success(response.message ?: "تم تعيين كلمة المرور بنجاح")

        } catch (e: HttpException) {
            Result.failure(Exception(parseErrorMessage(e)))
        } catch (e: IOException) {
            Result.failure(Exception("تعذر الاتصال بالخادم. تحقق من الإنترنت."))
        } catch (e: Exception) {
            Result.failure(Exception(e.message ?: "خطأ غير معروف"))
        }
    }
}
