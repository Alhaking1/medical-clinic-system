package com.medical.clinic.staff.data.repository

import com.medical.clinic.staff.data.api.ApiService
import com.medical.clinic.staff.data.local.SessionManager
import com.medical.clinic.staff.data.models.*
import com.medical.clinic.staff.data.utils.Resource
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: ApiService,
    private val sessionManager: SessionManager
) {

    suspend fun loginWithPassword(login: String, pass: String, role: String): Resource<User> =
        withContext(Dispatchers.IO) {
            try {
                val response = api.loginWithPassword(PasswordLoginRequest(login, pass, role))
                if (response.isSuccessful && response.body()?.success == true) {
                    val body = response.body()!!
                    val user = body.user ?: body.data
                    body.token?.let { sessionManager.saveToken(it) }
                    body.refreshToken?.let { sessionManager.saveRefreshToken(it) }
                    user?.let {
                        sessionManager.saveUser(it)
                        sessionManager.saveRole(it.role ?: role)
                    }
                    if (user != null) {
                        Resource.Success(user, body.message)
                    } else {
                        Resource.Error("لم يتم العثور على بيانات المستخدم")
                    }
                } else {
                    val err = parseErrorMessage(response.errorBody()?.string())
                        ?: response.body()?.message ?: "فشل تسجيل الدخول"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(e.localizedMessage ?: "حدث خطأ في الاتصال بالخادم")
            }
        }

    suspend fun loginWithGoogle(idToken: String, role: String): Resource<User> =
        withContext(Dispatchers.IO) {
            try {
                val response = api.loginWithGoogle(GoogleLoginStaffRequest(idToken, role))
                if (response.isSuccessful && response.body()?.success == true) {
                    val body = response.body()!!
                    val user = body.user ?: body.data
                    body.token?.let { sessionManager.saveToken(it) }
                    body.refreshToken?.let { sessionManager.saveRefreshToken(it) }
                    user?.let {
                        sessionManager.saveUser(it)
                        sessionManager.saveRole(it.role ?: role)
                    }
                    if (user != null) {
                        Resource.Success(user, body.message)
                    } else {
                        Resource.Error("لم يتم العثور على بيانات المستخدم")
                    }
                } else {
                    val err = parseErrorMessage(response.errorBody()?.string())
                        ?: response.body()?.message ?: "فشل تسجيل الدخول بواسطة Google"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(e.localizedMessage ?: "حدث خطأ في الاتصال بالخادم")
            }
        }

    suspend fun loginAsGuest(fullName: String, phone: String, role: String): Resource<User> =
        withContext(Dispatchers.IO) {
            try {
                val response = api.loginAsGuest(GuestLoginStaffRequest(fullName, phone, role))
                if (response.isSuccessful && response.body()?.success == true) {
                    val body = response.body()!!
                    val user = body.user ?: body.data
                    body.token?.let { sessionManager.saveToken(it) }
                    body.refreshToken?.let { sessionManager.saveRefreshToken(it) }
                    user?.let {
                        sessionManager.saveUser(it)
                        sessionManager.saveRole(it.role ?: role)
                    }
                    if (user != null) {
                        Resource.Success(user, body.message)
                    } else {
                        Resource.Error("لم يتم العثور على بيانات المستخدم")
                    }
                } else {
                    val err = parseErrorMessage(response.errorBody()?.string())
                        ?: response.body()?.message ?: "فشل الدخول السريع"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(e.localizedMessage ?: "حدث خطأ في الاتصال بالخادم")
            }
        }

    suspend fun getMe(): Resource<User> = withContext(Dispatchers.IO) {
        try {
            val response = api.getMe()
            if (response.isSuccessful && response.body()?.success == true) {
                val user = response.body()!!.data ?: response.body()!!.user
                if (user != null) {
                    sessionManager.saveUser(user)
                    Resource.Success(user)
                } else {
                    Resource.Error("لم يتم العثور على بيانات المستخدم")
                }
            } else {
                Resource.Error(response.body()?.message ?: "فشل تحديث البيانات")
            }
        } catch (e: Exception) {
            Resource.Error(e.localizedMessage ?: "فشل تحديث البيانات")
        }
    }

    suspend fun checkAccount(phone: String, role: String? = null): Resource<CheckAccountResponse> =
        withContext(Dispatchers.IO) {
            try {
                val response = api.checkAccount(CheckAccountRequest(phone = phone, role = role))
                if (response.isSuccessful && response.body() != null) {
                    Resource.Success(response.body()!!)
                } else {
                    val err = parseErrorMessage(response.errorBody()?.string()) ?: "الحساب غير موجود"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(e.localizedMessage ?: "حدث خطأ في الاتصال")
            }
        }

    suspend fun submitRecovery(req: RecoveryRequestPayload): Resource<String> =
        withContext(Dispatchers.IO) {
            try {
                val response = api.submitRecoveryRequest(req)
                if (response.isSuccessful && response.body()?.success == true) {
                    Resource.Success(response.body()?.message ?: "تم إرسال الطلب بنجاح")
                } else {
                    val err = parseErrorMessage(response.errorBody()?.string())
                        ?: response.body()?.message ?: "فشل إرسال الطلب"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(e.localizedMessage ?: "حدث خطأ في الاتصال")
            }
        }

    suspend fun getRecoveryStatus(phone: String): Resource<RecoveryStatusResponse> =
        withContext(Dispatchers.IO) {
            try {
                val response = api.getRecoveryStatus(phone)
                if (response.isSuccessful && response.body() != null) {
                    Resource.Success(response.body()!!)
                } else {
                    Resource.Error(response.body()?.message ?: "تعذر جلب حالة الطلب")
                }
            } catch (e: Exception) {
                Resource.Error(e.localizedMessage ?: "تعذر جلب حالة الطلب")
            }
        }

    suspend fun resetPassword(phone: String, newPass: String, role: String?): Resource<String> =
        withContext(Dispatchers.IO) {
            try {
                val response = api.resetPassword(ResetPasswordRequest(phone, newPass, role))
                if (response.isSuccessful && response.body()?.success == true) {
                    Resource.Success(response.body()?.message ?: "تم تغيير كلمة المرور بنجاح")
                } else {
                    val err = parseErrorMessage(response.errorBody()?.string())
                        ?: response.body()?.message ?: "فشل تعيين كلمة المرور"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(e.localizedMessage ?: "تعذر الاتصال")
            }
        }

    suspend fun changePassword(current: String, newPass: String): Resource<String> =
        withContext(Dispatchers.IO) {
            try {
                val response = api.changePassword(ChangePasswordRequest(current, newPass))
                if (response.isSuccessful && response.body()?.success == true) {
                    Resource.Success(response.body()?.message ?: "تم تغيير كلمة المرور")
                } else {
                    val err = parseErrorMessage(response.errorBody()?.string())
                        ?: response.body()?.message ?: "فشل تغيير كلمة المرور"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(e.localizedMessage ?: "تعذر الاتصال")
            }
        }

    suspend fun deleteAccount(): Resource<String> =
        withContext(Dispatchers.IO) {
            try {
                val response = api.deleteAccount()
                if (response.isSuccessful && response.body()?.success == true) {
                    sessionManager.clearSession()
                    Resource.Success(response.body()?.message ?: "تم حذف الحساب بنجاح")
                } else {
                    val err = parseErrorMessage(response.errorBody()?.string())
                        ?: response.body()?.message ?: "فشل حذف الحساب"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(e.localizedMessage ?: "تعذر الاتصال بالخادم")
            }
        }

    suspend fun getClinicsForJoin(): Resource<List<ClinicItem>> =
        withContext(Dispatchers.IO) {
            try {
                val response = api.getClinicsForJoin()
                if (response.isSuccessful && response.body()?.data != null) {
                    Resource.Success(response.body()!!.data!!)
                } else {
                    Resource.Error("تعذر تحميل العيادات")
                }
            } catch (e: Exception) {
                Resource.Error(e.localizedMessage ?: "تعذر تحميل العيادات")
            }
        }

    suspend fun createClinic(
        name: String,
        governorate: String?,
        address: String?,
        phone: String?,
        googleMapsUrl: String? = null
    ): Resource<ClinicItem> =
        withContext(Dispatchers.IO) {
            try {
                val response = api.createClinic(CreateClinicRequest(name, governorate, address, phone, googleMapsUrl))
                if (response.isSuccessful && response.body()?.data != null) {
                    Resource.Success(response.body()!!.data!!, response.body()?.message ?: "تم إنشاء العيادة بنجاح")
                } else {
                    val err = parseErrorMessage(response.errorBody()?.string())
                        ?: response.body()?.message ?: "فشل إنشاء العيادة"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(e.localizedMessage ?: "تعذر الاتصال بالخادم")
            }
        }

    suspend fun completeDoctorProfile(req: CompleteDoctorProfileRequest): Resource<User> =
        withContext(Dispatchers.IO) {
            try {
                val response = api.completeDoctorProfile(req)
                if (response.isSuccessful && response.body()?.success == true) {
                    val user = response.body()!!.data ?: response.body()!!.user
                    if (user != null) sessionManager.saveUser(user)
                    Resource.Success(user ?: sessionManager.getUser()!!)
                } else {
                    val err = parseErrorMessage(response.errorBody()?.string())
                        ?: response.body()?.message ?: "فشل إكمال الملف"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(e.localizedMessage ?: "تعذر الاتصال")
            }
        }

    suspend fun completeSecretaryProfile(req: CompleteSecretaryProfileRequest): Resource<User> =
        withContext(Dispatchers.IO) {
            try {
                val response = api.completeSecretaryProfile(req)
                if (response.isSuccessful && response.body()?.success == true) {
                    val user = response.body()!!.data ?: response.body()!!.user
                    if (user != null) sessionManager.saveUser(user)
                    Resource.Success(user ?: sessionManager.getUser()!!)
                } else {
                    val err = parseErrorMessage(response.errorBody()?.string())
                        ?: response.body()?.message ?: "فشل إكمال الملف"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(e.localizedMessage ?: "تعذر الاتصال")
            }
        }

    suspend fun addClinicContactNumber(phone: String, notes: String? = null): Resource<String> =
        withContext(Dispatchers.IO) {
            try {
                val response = api.addClinicContactNumber(AddClinicContactNumberRequest(phone, notes))
                if (response.isSuccessful && response.body()?.success == true) {
                    Resource.Success(response.body()?.message ?: "تم إضافة رقم التواصل بنجاح")
                } else {
                    val err = parseErrorMessage(response.errorBody()?.string()) ?: response.body()?.message ?: "فشل إضافة رقم التواصل"
                    Resource.Error(err)
                }
            } catch (e: Exception) {
                Resource.Error(e.localizedMessage ?: "تعذر الاتصال")
            }
        }

    private fun parseErrorMessage(errorBody: String?): String? {
        if (errorBody.isNullOrBlank()) return null
        return try {
            val json = JSONObject(errorBody)
            json.optString("message").takeIf { it.isNotBlank() }
                ?: json.optString("error").takeIf { it.isNotBlank() }
        } catch (e: Exception) {
            null
        }
    }
}
