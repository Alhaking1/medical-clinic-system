package com.medical.clinic.staff.data.models

import com.google.gson.annotations.SerializedName

data class NotificationItem(
    @SerializedName("id") val id: Int,
    @SerializedName("user_id") val userId: Int,
    @SerializedName("user_type") val userType: String,
    @SerializedName("title") val title: String,
    @SerializedName("body") val body: String? = null,
    @SerializedName("type") val type: String = "info",
    @SerializedName("data") val data: String? = null,
    @SerializedName("is_read") val isRead: Int = 0,
    @SerializedName("created_at") val createdAt: String? = null
)

data class NotificationCount(
    @SerializedName("unread") val unread: Int = 0
)
