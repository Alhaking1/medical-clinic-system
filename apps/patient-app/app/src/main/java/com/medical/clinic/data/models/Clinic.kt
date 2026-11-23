package com.medical.clinic.data.models

import com.google.gson.annotations.SerializedName
import java.io.Serializable

data class Clinic(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String,
    @SerializedName("governorate") val governorate: String? = null,
    @SerializedName("address") val address: String? = null,
    @SerializedName("phone") val phone: String? = null,
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("is_active") val isActive: Int? = 1,
    @SerializedName("google_maps_url") val googleMapsUrl: String? = null,
    @SerializedName("is_24_hours") val is24Hours: Int? = 0,
    @SerializedName("schedule_type") val scheduleType: String? = "daily",
    @SerializedName("open_time") val openTime: String? = "08:00",
    @SerializedName("close_time") val closeTime: String? = "22:00",
    @SerializedName("is_open") val isOpen: Boolean? = true,
    @SerializedName("status_label") val statusLabel: String? = null,
    @SerializedName("working_hours_display") val workingHoursDisplay: String? = null,
    @SerializedName("image") val image: String? = null
) : Serializable
