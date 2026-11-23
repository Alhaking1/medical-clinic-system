package com.medical.clinic.data.local

import android.content.Context
import android.content.SharedPreferences
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.medical.clinic.data.models.Appointment
import com.medical.clinic.data.models.MedicalRecord
import com.medical.clinic.data.models.User
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * 📦 محرك التخزين والعمل دون اتصال بالإنترنت (Offline-First Cache Engine)
 * يضمن وصول المريض لمواعيده وتذاكر الكشف والروشتات والملف الطبي حتى عند انقطاع الإنترنت التام.
 */
object OfflineCacheManager {

    private const val PREFS_NAME = "tabeebak_offline_vault"
    private const val KEY_APPOINTMENTS = "offline_cached_appointments"
    private const val KEY_MEDICAL_RECORDS = "offline_cached_medical_records"
    private const val KEY_USER_PROFILE = "offline_cached_user_profile"
    private const val KEY_LAST_SYNC = "offline_last_sync_timestamp"

    private val gson = Gson()

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    /**
     * 🌐 فحص توفر اتصال حقيقي بالإنترنت
     */
    fun isNetworkAvailable(context: Context): Boolean {
        return try {
            val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
            val activeNetwork = cm.activeNetwork ?: return false
            val caps = cm.getNetworkCapabilities(activeNetwork) ?: return false
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                    (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                     caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                     caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET))
        } catch (_: Exception) {
            false
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // 📅 تخزين واسترجاع المواعيد والتذاكر دون إنترنت
    // ══════════════════════════════════════════════════════════════════

    fun saveAppointments(context: Context, list: List<Appointment>) {
        try {
            val json = gson.toJson(list)
            getPrefs(context).edit()
                .putString(KEY_APPOINTMENTS, json)
                .putLong(KEY_LAST_SYNC, System.currentTimeMillis())
                .apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun getAppointments(context: Context): List<Appointment> {
        val json = getPrefs(context).getString(KEY_APPOINTMENTS, null) ?: return emptyList()
        return try {
            val type = object : TypeToken<List<Appointment>>() {}.type
            gson.fromJson<List<Appointment>>(json, type) ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // 💊 تخزين واسترجاع السجلات والروشتات الطبية دون إنترنت
    // ══════════════════════════════════════════════════════════════════

    fun saveMedicalRecords(context: Context, list: List<MedicalRecord>) {
        try {
            val json = gson.toJson(list)
            getPrefs(context).edit()
                .putString(KEY_MEDICAL_RECORDS, json)
                .apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun getMedicalRecords(context: Context): List<MedicalRecord> {
        val json = getPrefs(context).getString(KEY_MEDICAL_RECORDS, null) ?: return emptyList()
        return try {
            val type = object : TypeToken<List<MedicalRecord>>() {}.type
            gson.fromJson<List<MedicalRecord>>(json, type) ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // 👤 تخزين واسترجاع الملف الطبي الشخصي للمريض دون إنترنت
    // ══════════════════════════════════════════════════════════════════

    fun saveUserProfile(context: Context, user: User) {
        try {
            val json = gson.toJson(user)
            getPrefs(context).edit()
                .putString(KEY_USER_PROFILE, json)
                .apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun getUserProfile(context: Context): User? {
        val json = getPrefs(context).getString(KEY_USER_PROFILE, null) ?: return null
        return try {
            gson.fromJson(json, User::class.java)
        } catch (_: Exception) {
            null
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // ⏱️ توقيت آخر مزامنة ناجحة
    // ══════════════════════════════════════════════════════════════════

    fun getLastSyncFormatted(context: Context): String {
        val ts = getPrefs(context).getLong(KEY_LAST_SYNC, 0L)
        if (ts <= 0L) return "لم تتم المزامنة بعد"
        val diffMinutes = (System.currentTimeMillis() - ts) / (1000 * 60)
        return when {
            diffMinutes < 1 -> "مزامنة لحظية مكتملة ⚡"
            diffMinutes < 60 -> "آخر مزامنة: منذ $diffMinutes دقيقة"
            diffMinutes < 1440 -> "آخر مزامنة: منذ ${diffMinutes / 60} ساعة"
            else -> {
                val sdf = SimpleDateFormat("yyyy-MM-dd hh:mm a", Locale("ar"))
                "آخر مزامنة: " + sdf.format(Date(ts))
            }
        }
    }

    /**
     * مسح البيانات المحفوظة محلياً عند تسجيل الخروج
     */
    fun clearAll(context: Context) {
        getPrefs(context).edit().clear().apply()
    }
}
