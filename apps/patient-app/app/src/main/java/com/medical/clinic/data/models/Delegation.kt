package com.medical.clinic.data.models

import com.google.gson.annotations.SerializedName

/**
 * نموذج التفويض بين السكرتيرات
 *
 * الاستخدام:
 * - from_secretary_id: السكرتيرة المُفوِّضة (التي ترسل الطلب)
 * - to_secretary_id: السكرتيرة المُفوَّضة (التي تستقبل الطلب)
 * - doctor_id: الطبيب المفوَّض
 * - valid_from / valid_until: المدة الزمنية
 * - max_bookings: حد الحجوزات (اختياري)
 * - status: pending | accepted | rejected | expired | cancelled
 */
data class Delegation(
    @SerializedName("id") val id: Int,
    @SerializedName("from_secretary_id") val fromSecretaryId: Int,
    @SerializedName("to_secretary_id") val toSecretaryId: Int,
    @SerializedName("doctor_id") val doctorId: Int,
    @SerializedName("valid_from") val validFrom: String,
    @SerializedName("valid_until") val validUntil: String,
    @SerializedName("max_bookings") val maxBookings: Int? = null,
    @SerializedName("status") val status: String,
    @SerializedName("message") val message: String? = null,
    @SerializedName("response_message") val responseMessage: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("responded_at") val respondedAt: String? = null,

    // حقول مرافقة (JOIN)
    @SerializedName("doctor_name") val doctorName: String? = null,
    @SerializedName("doctor_specialty") val doctorSpecialty: String? = null,
    @SerializedName("from_secretary_name") val fromSecretaryName: String? = null,
    @SerializedName("to_secretary_name") val toSecretaryName: String? = null
) {
    val isPending: Boolean
        get() = status == "pending"

    val isAccepted: Boolean
        get() = status == "accepted"

    val isRejected: Boolean
        get() = status == "rejected"

    val isCancelled: Boolean
        get() = status == "cancelled"

    val statusArabic: String
        get() = when (status) {
            "pending" -> "قيد المراجعة"
            "accepted" -> "مقبول"
            "rejected" -> "مرفوض"
            "cancelled" -> "ملغى"
            "expired" -> "منتهي"
            else -> status
        }
}

/**
 * استجابة GET /secretaries/me/delegations
 */
data class DelegationListResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: DelegationListData? = null,
    @SerializedName("message") val message: String? = null
)

data class DelegationListData(
    @SerializedName("outgoing") val outgoing: List<Delegation> = emptyList(),
    @SerializedName("incoming") val incoming: List<Delegation> = emptyList(),
    @SerializedName("pending_count") val pendingCount: Int = 0
)

/**
 * طلب POST /secretaries/me/delegations
 */
data class CreateDelegationRequest(
    @SerializedName("to_secretary_id") val toSecretaryId: Int,
    @SerializedName("doctor_id") val doctorId: Int,
    @SerializedName("valid_from") val validFrom: String,
    @SerializedName("valid_until") val validUntil: String,
    @SerializedName("max_bookings") val maxBookings: Int? = null,
    @SerializedName("message") val message: String? = null
)

/**
 * طلب PATCH /me/delegations/:id/accept|reject
 */
data class RespondDelegationRequest(
    @SerializedName("response_message") val responseMessage: String? = null
)