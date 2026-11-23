package com.medical.clinic.data.models

import com.google.gson.annotations.SerializedName
import java.io.Serializable

data class DoctorItem(
    @SerializedName("id") val id: Int,
    @SerializedName("full_name") val fullName: String,
    @SerializedName("specialty") val specialty: String,
    @SerializedName("clinic_name") val clinicName: String? = null,
    @SerializedName("governorate") val governorate: String? = null,
    @SerializedName("address") val address: String? = null,
    @SerializedName("avatar") val avatar: String? = null,
    @SerializedName("bio") val bio: String? = null,
    @SerializedName("experience_years") val experienceYears: Int? = 0,
    @SerializedName("consultation_fee") val consultationFee: Int? = 0,
    @SerializedName("slot_duration") val slotDuration: Int? = 20,
    @SerializedName("rating") val rating: Float? = null,
    @SerializedName("available_seats") val availableSeats: Int? = 10,
    @SerializedName("google_maps_url") val googleMapsUrl: String? = null,
    @SerializedName("is_active") val isActive: Int? = 1,
    @SerializedName("status") val status: String? = "approved",
    @SerializedName("allow_direct_chat") val allowDirectChat: Int? = 0,
    @SerializedName("secretary_id") val secretaryId: Int? = null,
    @SerializedName("secretary_name") val secretaryName: String? = null,
    @SerializedName("clinic_is_open") val clinicIsOpen: Boolean? = true,
    @SerializedName("clinic_status_label") val clinicStatusLabel: String? = null,
    @SerializedName("clinic_working_hours") val clinicWorkingHours: String? = null,
    @SerializedName("has_active_offer") val hasActiveOffer: Boolean? = false,
    @SerializedName("offer_title") val offerTitle: String? = null,
    @SerializedName("offer_discount_percent") val offerDiscountPercent: Int? = 0,
    @SerializedName("discounted_fee") val discountedFee: Int? = null
) : Serializable {
    val formattedFee: String
        get() = "${consultationFee ?: 0} ر.ي"

    val displayName: String
        get() = if (fullName.startsWith("د.")) fullName else "د. $fullName"

    val formattedSeats: String
        get() {
            val seats = availableSeats ?: 8
            return if (seats <= 0) "المقاعد مكتملة اليوم" else "متاح $seats مقاعد للحجز"
        }
}
