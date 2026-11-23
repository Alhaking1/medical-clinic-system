package com.medical.clinic.utils

/**
 * ثوابت التطبيق
 */
object Constants {

    // ═══════════════════════════════════════════
    // BASE URLs
    // ═══════════════════════════════════════════

    val BASE_URL_EMULATOR: String = com.medical.clinic.BuildConfig.BASE_URL
    val BASE_URL_LOCAL: String = com.medical.clinic.BuildConfig.BASE_URL

    // ═══════════════════════════════════════════
    // Google Sign-In
    // ═══════════════════════════════════════════
    const val GOOGLE_WEB_CLIENT_ID = "399127188969-459at9sedg9ech13b45m3cm2ok6oh2ra.apps.googleusercontent.com"

    // ═══════════════════════════════════════════
    // API Endpoints
    // ═══════════════════════════════════════════
    object Api {
        const val LOGIN_PASSWORD = "auth/login/password"
        const val SET_PASSWORD = "auth/set-password"
        const val CHANGE_PASSWORD = "auth/change-password"
        const val ME = "auth/me"
        const val LOGOUT = "auth/logout"

        const val TIME = "time"
        const val TIME_VALIDATE = "time/validate"

        const val QUEUE = "queue"
        const val CHECK_IN = "check-in"
        const val APPOINTMENTS = "appointments"
        const val PERIODS = "periods"
        const val PATIENTS = "patients"
        const val DOCTORS = "doctors"
        const val SECRETARIES = "secretaries"
        const val PAYMENTS = "payments"
        const val MEDICAL_RECORDS = "medical-records"
        const val CLINICS = "clinics"
    }

    // ═══════════════════════════════════════════
    // Timeouts
    // ═══════════════════════════════════════════
    const val CONNECT_TIMEOUT = 45L
    const val READ_TIMEOUT = 45L
    const val WRITE_TIMEOUT = 45L

    // ═══════════════════════════════════════════
    // Session
    // ═══════════════════════════════════════════
    const val ENCRYPTED_PREFS_NAME = "secure_prefs"
    const val KEY_TOKEN = "jwt_token"
    const val KEY_USER = "user_json"
    const val KEY_PERMISSIONS = "permissions_json"
    const val KEY_LAST_UNREAD = "last_unread_count"
    const val KEY_RECOVERY_PHONE = "recovery_phone"

    // ═══════════════════════════════════════════
    // Roles
    // ═══════════════════════════════════════════
    const val ROLE_DOCTOR = "doctor"
    const val ROLE_SECRETARY = "secretary"
    const val ROLE_ADMIN = "admin"
    const val ROLE_PATIENT = "patient"

    // ═══════════════════════════════════════════
    // Result Codes
    // ═══════════════════════════════════════════
    const val RESULT_OK = 200
    const val RESULT_CREATED = 201
    const val RESULT_BAD_REQUEST = 400
    const val RESULT_UNAUTHORIZED = 401
    const val RESULT_FORBIDDEN = 403
    const val RESULT_NOT_FOUND = 404
    const val RESULT_TOO_MANY_REQUESTS = 429
    const val RESULT_SERVER_ERROR = 500
}