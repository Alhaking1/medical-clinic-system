package com.medical.clinic.staff.data.local

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.medical.clinic.staff.data.models.User
import com.medical.clinic.staff.data.utils.Constants
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionManager @Inject constructor(
    @ApplicationContext context: Context,
    private val gson: Gson
) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("medical_staff_session", Context.MODE_PRIVATE)

    fun saveToken(token: String) {
        prefs.edit().putString(Constants.PREF_TOKEN, token).apply()
        val currentRole = getRole()
        if (currentRole == Constants.ROLE_DOCTOR) {
            prefs.edit().putString("cached_doctor_token", token).apply()
        } else if (currentRole == Constants.ROLE_SECRETARY) {
            prefs.edit().putString("cached_secretary_token", token).apply()
        }
    }

    fun getToken(): String? {
        return prefs.getString(Constants.PREF_TOKEN, null)
    }
    fun saveRefreshToken(token: String) {
        prefs.edit().putString("pref_refresh_token", token).apply()
    }

    fun getRefreshToken(): String? {
        return prefs.getString("pref_refresh_token", null)
    }


    fun saveUser(user: User) {
        val json = gson.toJson(user)
        val editor = prefs.edit().putString(Constants.PREF_USER, json)
        val role = user.role ?: user.type
        if (role == Constants.ROLE_DOCTOR) {
            editor.putString("cached_doctor_user", json)
            getToken()?.let { editor.putString("cached_doctor_token", it) }
        } else if (role == Constants.ROLE_SECRETARY) {
            editor.putString("cached_secretary_user", json)
            getToken()?.let { editor.putString("cached_secretary_token", it) }
        }
        editor.apply()
        user.role?.let { saveRole(it) }
    }

    fun getUser(): User? {
        val json = prefs.getString(Constants.PREF_USER, null) ?: return null
        return try {
            gson.fromJson(json, User::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun getCachedUser(role: String): User? {
        val key = if (role == Constants.ROLE_DOCTOR) "cached_doctor_user" else "cached_secretary_user"
        val json = prefs.getString(key, null) ?: return null
        return try {
            gson.fromJson(json, User::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun getCachedToken(role: String): String? {
        val key = if (role == Constants.ROLE_DOCTOR) "cached_doctor_token" else "cached_secretary_token"
        return prefs.getString(key, null)
    }

    fun restoreCachedSession(role: String): Boolean {
        val cachedUser = getCachedUser(role) ?: return false
        val cachedToken = getCachedToken(role)
        if (cachedUser.status != "guest" && cachedToken.isNullOrBlank()) {
            return false
        }
        val editor = prefs.edit()
        editor.putString(Constants.PREF_USER, gson.toJson(cachedUser))
        if (!cachedToken.isNullOrBlank()) {
            editor.putString(Constants.PREF_TOKEN, cachedToken)
        }
        editor.putString(Constants.PREF_ROLE, role)
        if (cachedUser.status == "guest") {
            editor.putBoolean("is_guest_mode", true)
        } else {
            editor.putBoolean("is_guest_mode", false)
        }
        editor.apply()
        return true
    }

    fun saveRole(role: String) {
        prefs.edit().putString(Constants.PREF_ROLE, role).apply()
    }

    fun getRole(): String? {
        val role = prefs.getString(Constants.PREF_ROLE, null)
        if (role != null) return role
        return getUser()?.role ?: getUser()?.type
    }

    fun setGuestMode(isGuest: Boolean, role: String? = null) {
        prefs.edit().putBoolean("is_guest_mode", isGuest).apply()
        if (role != null) saveRole(role)
    }

    fun isGuestMode(): Boolean {
        return prefs.getBoolean("is_guest_mode", false)
    }

    fun isLoggedIn(): Boolean {
        return !getToken().isNullOrBlank() || isGuestMode()
    }

    fun isDoctor(): Boolean {
        return getRole() == Constants.ROLE_DOCTOR
    }

    fun isSecretary(): Boolean {
        return getRole() == Constants.ROLE_SECRETARY
    }

    fun mustChangePassword(): Boolean {
        return getUser()?.mustChangePassword == 1
    }

    fun mustCompleteProfile(): Boolean {
        return getUser()?.mustCompleteProfile == 1
    }

    fun isPending(): Boolean {
        return getUser()?.status == Constants.STATUS_PENDING
    }

    fun clearSession(keepCache: Boolean = true) {
        if (keepCache) {
            val cachedDocUser = prefs.getString("cached_doctor_user", null)
            val cachedDocToken = prefs.getString("cached_doctor_token", null)
            val cachedSecUser = prefs.getString("cached_secretary_user", null)
            val cachedSecToken = prefs.getString("cached_secretary_token", null)

            prefs.edit().clear().apply()

            val editor = prefs.edit()
            cachedDocUser?.let { editor.putString("cached_doctor_user", it) }
            cachedDocToken?.let { editor.putString("cached_doctor_token", it) }
            cachedSecUser?.let { editor.putString("cached_secretary_user", it) }
            cachedSecToken?.let { editor.putString("cached_secretary_token", it) }
            editor.apply()
        } else {
            prefs.edit().clear().apply()
        }
    }

    fun clearAllData() {
        prefs.edit().clear().apply()
    }

    fun saveString(key: String, value: String) {
        prefs.edit().putString(key, value).apply()
    }

    fun getString(key: String, default: String? = null): String? {
        return prefs.getString(key, default)
    }
}
