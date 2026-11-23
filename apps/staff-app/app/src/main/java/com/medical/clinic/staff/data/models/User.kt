package com.medical.clinic.staff.data.models

import com.google.gson.annotations.SerializedName

data class User(
    @SerializedName("id") val id: Int = 0,
    @SerializedName("full_name") val fullName: String? = null,
    @SerializedName("email") val email: String? = null,
    @SerializedName("phone") val phone: String? = null,
    @SerializedName("role") val role: String? = null,
    @SerializedName("type") val type: String? = null,
    @SerializedName("status") val status: String? = "approved",
    @SerializedName("specialty") val specialty: String? = null,
    @SerializedName("clinic_name") val clinicName: String? = null,
    @SerializedName("clinic_id") val clinicId: Int? = null,
    @SerializedName("clinic_full_name") val clinicFullName: String? = null,
    @SerializedName("clinic_governorate") val clinicGovernorate: String? = null,
    @SerializedName("clinic_address") val clinicAddress: String? = null,
    @SerializedName("address") val address: String? = null,
    @SerializedName("avatar") val avatar: String? = null,
    @SerializedName("avatar_url") val avatarUrl: String? = null,
    @SerializedName("consultation_fee") val consultationFee: Double? = 0.0,
    @SerializedName("slot_duration") val slotDuration: Int? = 15,
    @SerializedName("must_change_password") val mustChangePassword: Int? = 0,
    @SerializedName("must_complete_profile") val mustCompleteProfile: Int? = 0,
    @SerializedName("allow_direct_chat") val allowDirectChat: Int? = 0,
    @SerializedName("is_active") val isActive: Int? = 1
) {
    val bestAvatar: String?
        get() = avatarUrl ?: avatar
}
