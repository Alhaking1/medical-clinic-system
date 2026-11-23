package com.medical.clinic.staff.data.models

import com.google.gson.annotations.SerializedName

data class PasswordLoginRequest(
    @SerializedName("login") val login: String,
    @SerializedName("password") val password: String,
    @SerializedName("role") val role: String
)

data class GoogleLoginStaffRequest(
    @SerializedName("idToken") val idToken: String,
    @SerializedName("role") val role: String
)

data class GuestLoginStaffRequest(
    @SerializedName("full_name") val fullName: String,
    @SerializedName("phone") val phone: String,
    @SerializedName("role") val role: String
)

data class CheckAccountRequest(
    @SerializedName("phone") val phone: String,
    @SerializedName("role") val role: String? = null,
    @SerializedName("login") val login: String = phone
)

data class CheckAccountResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String? = null,
    @SerializedName("account_exists") val accountExists: Boolean = false,
    @SerializedName("has_old_password") val hasOldPassword: Boolean = false,
    @SerializedName("user_name") val userName: String? = null,
    @SerializedName("role") val role: String? = null,
    @SerializedName("pending_request") val pendingRequest: Boolean = false
)

data class RecoveryRequestPayload(
    @SerializedName("phone") val phone: String,
    @SerializedName("login") val login: String = phone,
    @SerializedName("method") val method: String, // "old_password" or "admin_approval"
    @SerializedName("old_password") val oldPassword: String? = null,
    @SerializedName("reason") val reason: String? = null
)

data class RecoveryStatusResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("has_request") val hasRequest: Boolean = false,
    @SerializedName("status") val status: String? = null, // "pending", "approved", "rejected"
    @SerializedName("user_name") val userName: String? = null,
    @SerializedName("message") val message: String? = null
)

data class ResetPasswordRequest(
    @SerializedName("phone") val phone: String,
    @SerializedName("new_password") val newPassword: String,
    @SerializedName("role") val role: String? = null
)

data class ChangePasswordRequest(
    @SerializedName("current_password") val currentPassword: String,
    @SerializedName("new_password") val newPassword: String
)

data class CompleteDoctorProfileRequest(
    @SerializedName("specialty") val specialty: String,
    @SerializedName("full_name") val fullName: String? = null,
    @SerializedName("phone") val phone: String?,
    @SerializedName("clinic_id") val clinicId: Int?,
    @SerializedName("governorate") val governorate: String?,
    @SerializedName("address") val address: String?,
    @SerializedName("bio") val bio: String?,
    @SerializedName("experience_years") val experienceYears: Int?,
    @SerializedName("consultation_fee") val consultationFee: Double?,
    @SerializedName("password") val password: String? = null
)

data class CompleteSecretaryProfileRequest(
    @SerializedName("clinic_id") val clinicId: Int? = null,
    @SerializedName("clinic_mode") val clinicMode: String = "join",
    @SerializedName("clinic_name") val clinicName: String? = null,
    @SerializedName("full_name") val fullName: String? = null,
    @SerializedName("phone") val phone: String?,
    @SerializedName("governorate") val governorate: String?,
    @SerializedName("address") val address: String?,
    @SerializedName("google_maps_url") val googleMapsUrl: String? = null,
    @SerializedName("password") val password: String? = null
)

data class AddClinicContactNumberRequest(
    @SerializedName("phone") val phone: String,
    @SerializedName("notes") val notes: String? = null
)

data class DoctorDirectChatRequest(
    @SerializedName("allow_direct_chat") val allowDirectChat: Int
)

data class ClinicItem(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String,
    @SerializedName("governorate") val governorate: String?,
    @SerializedName("address") val address: String?,
    @SerializedName("phone") val phone: String? = null,
    @SerializedName("google_maps_url") val googleMapsUrl: String? = null
)

data class CreateClinicRequest(
    @SerializedName("name") val name: String,
    @SerializedName("governorate") val governorate: String? = null,
    @SerializedName("address") val address: String? = null,
    @SerializedName("phone") val phone: String? = null,
    @SerializedName("google_maps_url") val googleMapsUrl: String? = null
)
