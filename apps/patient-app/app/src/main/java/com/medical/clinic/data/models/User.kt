package com.medical.clinic.data.models

import com.google.gson.annotations.SerializedName

/**
 * نموذج المستخدم الموحّد (مريض «طبيبك»)
 */
data class User(
    @SerializedName("id") val id: Int,
    @SerializedName("full_name") val fullName: String,
    @SerializedName("email") val email: String? = null,
    @SerializedName("phone") val phone: String? = null,
    @SerializedName("role") val role: String = "patient",
    @SerializedName("type") val type: String? = "patient",
    @SerializedName("status") val status: String? = "approved",
    @SerializedName("is_active") val isActive: Any? = null,

    @SerializedName("must_change_password") val mustChangePasswordRaw: Any? = null,
    @SerializedName("must_complete_profile") val mustCompleteProfileRaw: Any? = null,

    // Doctor-specific
    @SerializedName("specialty") val specialty: String? = null,
    @SerializedName("clinic_name") val clinicName: String? = null,
    @SerializedName("clinic_full_name") val clinicFullName: String? = null,
    @SerializedName("clinic_governorate") val clinicGovernorate: String? = null,
    @SerializedName("avatar") val avatar: String? = null,
    @SerializedName("consultation_fee") val consultationFee: Int? = null,
    @SerializedName("slot_duration") val slotDuration: Int? = null,

    // Secretary-specific
    @SerializedName("clinic_id") val clinicId: Int? = null,

    // Patient-specific
    @SerializedName("age") val age: Int? = null,
    @SerializedName("gender") val gender: String? = null,
    @SerializedName("governorate") val governorate: String? = null,
    @SerializedName("blood_group") val bloodGroup: String? = null,
    @SerializedName("picture") val picture: String? = null,
    @SerializedName("avatar_url") val avatarUrl: String? = null,
    @SerializedName("balance") val balance: Double? = 0.0
) {
    val bestAvatar: String?
        get() = avatarUrl ?: avatar ?: picture
    val isDoctor: Boolean
        get() = role == "doctor" || type == "doctor"

    val isSecretary: Boolean
        get() = role == "secretary" || type == "secretary"

    val isPatient: Boolean
        get() = role == "patient" || type == "patient"

    val displayName: String
        get() = if (isDoctor && specialty != null) "د. $fullName" else fullName

    // التحقق من اكتمال الملف الشخصي الطبي (الاسم ثلاثي/رباعي، أو موثق ومعتمد من النظام)
    val isProfileComplete: Boolean
        get() {
            // إذا كان المستخدم معتمد وموثق من الإدارة ولديه اسم مكتمل
            val words = fullName.trim().split("\\s+".toRegex()).filter { it.isNotBlank() }
            if (status == "approved" && words.size >= 2 && toBoolean(mustCompleteProfileRaw).not()) {
                return true
            }
            val hasValidPhone = !phone.isNullOrBlank() && phone.matches(Regex("^(70|71|73|77|78)\\d{7}$"))
            val hasValidAge = age != null && age > 0
            val hasGovernorate = !governorate.isNullOrBlank()
            return words.size >= 3 && hasValidPhone && hasValidAge && hasGovernorate
        }

    val mustChangePassword: Boolean
        get() = toBoolean(mustChangePasswordRaw)

    val mustCompleteProfile: Boolean
        get() = toBoolean(mustCompleteProfileRaw) || !isProfileComplete

    private fun toBoolean(value: Any?): Boolean {
        return when (value) {
            is Boolean -> value
            is Number -> value.toInt() == 1
            is String -> value == "1" || value.equals("true", ignoreCase = true)
            else -> false
        }
    }
}