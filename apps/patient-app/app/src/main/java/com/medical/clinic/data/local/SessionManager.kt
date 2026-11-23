package com.medical.clinic.data.local

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.google.gson.Gson
import com.medical.clinic.data.models.Permissions
import com.medical.clinic.data.models.User
import com.medical.clinic.utils.Constants
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * إدارة الجلسة — تخزين آمن للتوكن وبيانات المستخدم
 */
@Singleton
class SessionManager @Inject constructor(
    @ApplicationContext private val context: Context
) {

    private val gson = Gson()

    private val masterKey: MasterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        Constants.ENCRYPTED_PREFS_NAME,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    // ═══════════════════════════════════════════
    // Token
    // ═══════════════════════════════════════════

    fun saveToken(token: String) {
        prefs.edit().putString(Constants.KEY_TOKEN, token).apply()
    }

    fun getToken(): String? = prefs.getString(Constants.KEY_TOKEN, null)

    fun saveRefreshToken(token: String) {
        prefs.edit().putString("key_refresh_token", token).apply()
    }

    fun getRefreshToken(): String? = prefs.getString("key_refresh_token", null)

    // ═══════════════════════════════════════════
    // User
    // ═══════════════════════════════════════════

    fun saveUser(user: User) {
        val json = gson.toJson(user)
        prefs.edit().putString(Constants.KEY_USER, json).commit()
    }

    fun getUser(): User? {
        val json = prefs.getString(Constants.KEY_USER, null) ?: return null
        return try {
            gson.fromJson(json, User::class.java)
        } catch (e: Exception) {
            null
        }
    }

    // ═══════════════════════════════════════════
    // Permissions
    // ═══════════════════════════════════════════

    fun savePermissions(permissions: Permissions) {
        val json = gson.toJson(permissions)
        prefs.edit().putString(Constants.KEY_PERMISSIONS, json).apply()
    }

    fun getPermissions(): Permissions {
        val json = prefs.getString(Constants.KEY_PERMISSIONS, null)
            ?: return Permissions.empty()
        return try {
            gson.fromJson(json, Permissions::class.java)
        } catch (e: Exception) {
            Permissions.empty()
        }
    }

    fun hasPermission(check: (Permissions) -> Boolean): Boolean {
        return check(getPermissions())
    }

    // ═══════════════════════════════════════════
    // Session State
    // ═══════════════════════════════════════════

    fun isLoggedIn(): Boolean = !getToken().isNullOrBlank()

    fun isDoctor(): Boolean = getUser()?.isDoctor == true

    fun isSecretary(): Boolean = getUser()?.isSecretary == true

    fun mustChangePassword(): Boolean = getUser()?.mustChangePassword == true

    fun isApproved(): Boolean = getUser()?.status == "approved"

    fun isPending(): Boolean = getUser()?.status == "pending"

    fun needsCompleteProfile(): Boolean = getUser()?.mustCompleteProfile == true

    fun getUserId(): Int? = getUser()?.id

    fun getUserType(): String? = getUser()?.type

    fun getUserStatus(): String? = getUser()?.status

    // ═══════════════════════════════════════════
    // Notifications
    // ═══════════════════════════════════════════

    fun saveLastUnreadCount(count: Int) {
        prefs.edit().putInt(Constants.KEY_LAST_UNREAD, count).apply()
    }

    fun getLastUnreadCount(): Int = prefs.getInt(Constants.KEY_LAST_UNREAD, 0)

    // ═══════════════════════════════════════════
    // Account Recovery (استعادة الحساب)
    // ═══════════════════════════════════════════

    fun saveRecoveryPhone(phone: String) {
        prefs.edit().putString(Constants.KEY_RECOVERY_PHONE, phone).apply()
    }

    fun getRecoveryPhone(): String? =
        prefs.getString(Constants.KEY_RECOVERY_PHONE, null)

    fun clearRecoveryPhone() {
        prefs.edit().remove(Constants.KEY_RECOVERY_PHONE).apply()
    }

    fun hasRecoveryRequest(): Boolean = !getRecoveryPhone().isNullOrBlank()
    // ═══════════════════════════════════════════
    // Logout
    // ═══════════════════════════════════════════

    fun logout() {
        val currentUser = getUser()
        val currentAppointments = getString("cached_patient_appointments")
        val currentRecords = getString("cached_patient_records")

        val editor = prefs.edit()

        // حفظ سجلات ومواعيد المستخدم الحالي بمفتاح خاص بحسابه قبل مسح الجلسة النشطة
        if (currentUser != null) {
            val keySuffix = (currentUser.email ?: currentUser.phone ?: currentUser.id.toString()).lowercase()
            if (!currentAppointments.isNullOrBlank()) {
                editor.putString("history_appointments_$keySuffix", currentAppointments)
            }
            if (!currentRecords.isNullOrBlank()) {
                editor.putString("history_records_$keySuffix", currentRecords)
            }
            editor.putString("history_user_$keySuffix", gson.toJson(currentUser))
        }

        // مسح بيانات الجلسة الحالية النشطة فقط (التوكن والمستخدم الحالي)
        editor.remove(Constants.KEY_TOKEN)
        editor.remove(Constants.KEY_USER)
        editor.remove(Constants.KEY_PERMISSIONS)
        editor.remove("cached_patient_appointments")
        editor.remove("cached_patient_records")
        editor.apply()
    }

    fun restoreUserHistory(emailOrPhone: String) {
        val keySuffix = emailOrPhone.lowercase().trim()
        val savedAppts = getString("history_appointments_$keySuffix")
        if (!savedAppts.isNullOrBlank()) {
            saveString("cached_patient_appointments", savedAppts)
        }
        val savedRecords = getString("history_records_$keySuffix")
        if (!savedRecords.isNullOrBlank()) {
            saveString("cached_patient_records", savedRecords)
        }
    }

    fun getArchivedUser(emailOrPhone: String): User? {
        val keySuffix = emailOrPhone.lowercase().trim()
        val json = getString("history_user_$keySuffix") ?: return null
        return try {
            gson.fromJson(json, User::class.java)
        } catch (_: Exception) {
            null
        }
    }

    fun clearAll() {
        prefs.edit().clear().apply()
    }

    fun saveString(key: String, value: String) {
        prefs.edit().putString(key, value).apply()
    }

    fun getString(key: String, default: String? = null): String? {
        return prefs.getString(key, default)
    }
}

