package com.medical.clinic.data.models

import com.google.gson.annotations.SerializedName
import java.io.Serializable

data class OfferItem(
    @SerializedName("id") val id: Int,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String? = null,
    @SerializedName("doctor_id") val doctorId: Int? = null,
    @SerializedName("clinic_id") val clinicId: Int? = null,
    @SerializedName("doctor_name") val doctorName: String? = null,
    @SerializedName("doctor_specialty") val doctorSpecialty: String? = null,
    @SerializedName("doctor_avatar") val doctorAvatar: String? = null,
    @SerializedName("clinic_name") val clinicName: String? = null,
    @SerializedName("original_price") val originalPrice: Int? = 0,
    @SerializedName("discounted_price") val discountedPrice: Int? = 0,
    @SerializedName("discount_percent") val discountPercent: Int? = 0,
    @SerializedName("image_url") val imageUrl: String? = null,
    @SerializedName("end_date") val endDate: String? = null,
    @SerializedName("remaining_time_display") val remainingTimeDisplay: String? = null,
    @SerializedName("is_expired") val isExpired: Int? = 0,
    @SerializedName("status") val status: String? = "approved"
) : Serializable {
    val formattedOriginalPrice: String get() = "${originalPrice ?: 0} ر.ي"
    val formattedDiscountedPrice: String get() = "${discountedPrice ?: 0} ر.ي"
    val discountBadge: String get() = "خصم ${discountPercent ?: 0}% 🔥"
}
