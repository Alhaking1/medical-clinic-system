package com.medical.clinic.data.models

import androidx.annotation.Keep
import com.google.gson.annotations.SerializedName
import java.io.Serializable

@Keep
data class AvatarResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("message") val message: String? = null,
    @SerializedName("avatar_url") val avatarUrl: String? = null,
    @SerializedName("data") val data: AvatarData? = null
) : Serializable

@Keep
data class AvatarData(
    @SerializedName("avatar_url") val avatarUrl: String? = null,
    @SerializedName("full_url") val fullUrl: String? = null,
    @SerializedName("user_id") val userId: Int? = null,
    @SerializedName("role") val role: String? = null
) : Serializable
