package com.medical.clinic.data.models

import com.google.gson.annotations.SerializedName

/**
 * استجابة موحدة لكل APIs
 */
data class ApiResponse<T>(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String? = null,
    @SerializedName("data") val data: T? = null,
    @SerializedName("meta") val meta: Meta? = null,
    @SerializedName("retention_days") val retentionDays: Int? = null
)

data class Meta(
    @SerializedName("total") val total: Int? = null,
    @SerializedName("count") val count: Int? = null,
    @SerializedName("date") val date: String? = null
)

/**
 * استجابة login/password و guest-login-staff
 */
data class LoginResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String? = null,
    @SerializedName("token") val token: String? = null,
    @SerializedName("refreshToken") val refreshToken: String? = null,
    @SerializedName("user") val user: User?,
    @SerializedName("permissions") val permissions: Permissions? = null,
    @SerializedName("is_new_user") val isNewUser: Boolean = false,

    // must_complete_profile يمكن أن يكون Int (0/1) أو Boolean
    @SerializedName("must_complete_profile") val mustCompleteProfileRaw: Any? = null,

    @SerializedName("user_status") val userStatus: String? = null
) {
    val mustCompleteProfile: Boolean
        get() = when (mustCompleteProfileRaw) {
            is Boolean -> mustCompleteProfileRaw
            is Number -> mustCompleteProfileRaw.toInt() == 1
            is String -> mustCompleteProfileRaw == "1" || mustCompleteProfileRaw == "true"
            else -> false
        }
}

/**
 * استجابة الأخطاء
 */
data class ErrorResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("message") val message: String,
    @SerializedName("user_status") val userStatus: String? = null,
    @SerializedName("needs_setup") val needsSetup: Boolean? = null
)

data class RefreshResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("token") val token: String? = null,
    @SerializedName("refreshToken") val refreshToken: String? = null,
    @SerializedName("message") val message: String? = null
)