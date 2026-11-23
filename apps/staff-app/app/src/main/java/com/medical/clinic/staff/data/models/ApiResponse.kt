package com.medical.clinic.staff.data.models

import com.google.gson.annotations.SerializedName

data class ApiResponse<T>(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String? = null,
    @SerializedName("data") val data: T? = null,
    @SerializedName("error") val error: String? = null,
    @SerializedName("token") val token: String? = null,
    @SerializedName("refreshToken") val refreshToken: String? = null,
    @SerializedName("user") val user: User? = null,
    @SerializedName("is_new_user") val isNewUser: Boolean? = null,
    @SerializedName("must_complete_profile") val mustCompleteProfile: Boolean? = null,
    @SerializedName("user_status") val userStatus: String? = null,
    @SerializedName("retention_days") val retentionDays: Int? = null
)

data class BaseResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String? = null,
    @SerializedName("error") val error: String? = null
)

data class RefreshResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("token") val token: String? = null,
    @SerializedName("refreshToken") val refreshToken: String? = null,
    @SerializedName("message") val message: String? = null
)
