package com.medical.clinic.staff.utils

import android.content.Context
import android.content.res.Configuration
import androidx.appcompat.app.AppCompatDelegate

/**
 * مدير الوضع الليلي والنهاري (طبيبك كادر - Staff Theme Engine)
 */
object ThemeManager {

    private const val PREFS_NAME = "medical_staff_theme_prefs"
    private const val KEY_THEME_MODE = "theme_mode"

    enum class ThemeMode(val value: String, val titleAr: String) {
        LIGHT("light", "الوضع الفاتح ☀️"),
        DARK("dark", "الوضع الليلي 🌙"),
        SYSTEM("system", "تلقائي (حسب النظام) ⚙️")
    }

    fun getThemeMode(context: Context): ThemeMode {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val modeStr = prefs.getString(KEY_THEME_MODE, ThemeMode.SYSTEM.value)
        return ThemeMode.values().find { it.value == modeStr } ?: ThemeMode.SYSTEM
    }

    fun setThemeMode(context: Context, mode: ThemeMode) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_THEME_MODE, mode.value).apply()
        applyTheme(context)
    }

    fun toggleTheme(context: Context): ThemeMode {
        val current = isNightActive(context)
        val nextMode = if (current) ThemeMode.LIGHT else ThemeMode.DARK
        setThemeMode(context, nextMode)
        return nextMode
    }

    fun applyTheme(context: Context) {
        val mode = getThemeMode(context)
        val nightMode = when (mode) {
            ThemeMode.LIGHT -> AppCompatDelegate.MODE_NIGHT_NO
            ThemeMode.DARK -> AppCompatDelegate.MODE_NIGHT_YES
            ThemeMode.SYSTEM -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        }
        AppCompatDelegate.setDefaultNightMode(nightMode)
    }

    fun isNightActive(context: Context): Boolean {
        val mode = getThemeMode(context)
        return when (mode) {
            ThemeMode.DARK -> true
            ThemeMode.LIGHT -> false
            ThemeMode.SYSTEM -> {
                val nightFlags = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
                nightFlags == Configuration.UI_MODE_NIGHT_YES
            }
        }
    }
}
