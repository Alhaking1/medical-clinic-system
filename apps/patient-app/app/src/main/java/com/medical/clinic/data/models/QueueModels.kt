package com.medical.clinic.data.models

import com.google.gson.annotations.SerializedName

/**
 * عنصر في الطابور
 */
data class QueueItem(
    @SerializedName("id") val id: Int,
    @SerializedName("appointment_id") val appointmentId: Int? = null,
    @SerializedName("doctor_id") val doctorId: Int = 0,
    @SerializedName("patient_name") val patientName: String? = null,
    @SerializedName("patient_phone") val patientPhone: String? = null,
    @SerializedName("queue_number") val queueNumber: Int = 0,
    @SerializedName("status") val status: String = "waiting",
    @SerializedName("booking_code") val bookingCode: String? = null,
    @SerializedName("appointment_status") val appointmentStatus: String? = null,
    @SerializedName("payment_status") val paymentStatus: String? = null,
    @SerializedName("fee") val fee: Int? = null,
    @SerializedName("doctor_name") val doctorName: String? = null,
    @SerializedName("checked_in_at") val checkedInAt: String? = null,
    @SerializedName("started_at") val startedAt: String? = null,
    @SerializedName("finished_at") val finishedAt: String? = null
) {
    val isWaiting: Boolean get() = status == "waiting"
    val isInProgress: Boolean get() = status == "in_progress"
    val isDone: Boolean get() = status == "done"
}

/**
 * استجابة قائمة الطابور
 */
data class QueueListResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("data") val data: List<QueueItem>? = null,
    @SerializedName("meta") val meta: QueueListMeta? = null
)

data class QueueListMeta(
    @SerializedName("total") val total: Int = 0,
    @SerializedName("waiting") val waiting: Int = 0,
    @SerializedName("in_progress") val inProgress: Int = 0,
    @SerializedName("done") val done: Int = 0,
    @SerializedName("date") val date: String? = null
)

/**
 * طلب تحديث حالة عنصر في الطابور
 * status: waiting | in_progress | done
 */
data class QueueUpdateRequest(
    @SerializedName("status") val status: String
)