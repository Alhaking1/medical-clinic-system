package com.medical.clinic.staff.data.models

import com.google.gson.annotations.SerializedName

data class DoctorQueueItem(
    @SerializedName("id") val id: Int,
    @SerializedName("appointment_id") val appointmentId: Int?,
    @SerializedName("doctor_id") val doctorId: Int,
    @SerializedName("patient_name") val patientName: String,
    @SerializedName("patient_phone") val patientPhone: String?,
    @SerializedName("queue_number") val queueNumber: Int,
    @SerializedName("status") val status: String, // "waiting", "in_progress", "done", "cancelled", "no_show"
    @SerializedName("checked_in_at") val checkedInAt: String?,
    @SerializedName("started_at") val startedAt: String?,
    @SerializedName("finished_at") val finishedAt: String?,
    @SerializedName("booking_code") val bookingCode: String?,
    @SerializedName("payment_status") val paymentStatus: String?,
    @SerializedName("fee") val fee: Double?,
    @SerializedName("doctor_name") val doctorName: String?,
    @SerializedName("is_golden") val isGolden: Int? = 0,
    @SerializedName("transaction_id") val transactionId: String? = null,
    @SerializedName("patient_relationship") val patientRelationship: String? = null,
    @SerializedName("patient_age") val patientAge: Int? = null,
    @SerializedName("patient_gender") val patientGender: String? = null,
    @SerializedName("family_member_id") val familyMemberId: Int? = null
)

data class DoctorQueueMeta(
    @SerializedName("total") val total: Int,
    @SerializedName("waiting") val waiting: Int,
    @SerializedName("in_progress") val inProgress: Int,
    @SerializedName("done") val done: Int,
    @SerializedName("date") val date: String?
)

data class DoctorStatsData(
    @SerializedName("queue") val queue: QueueCounts?,
    @SerializedName("appointments") val appointments: AppointmentCounts?,
    @SerializedName("date") val date: String?
)

data class QueueCounts(
    @SerializedName("total") val total: Int = 0,
    @SerializedName("waiting") val waiting: Int = 0,
    @SerializedName("in_progress") val inProgress: Int = 0,
    @SerializedName("done") val done: Int = 0
)

data class AppointmentCounts(
    @SerializedName("total") val total: Int = 0,
    @SerializedName("completed") val completed: Int = 0,
    @SerializedName("no_show") val noShow: Int = 0
)

data class UpdateQueueStatusRequest(
    @SerializedName("status") val status: String // "waiting", "in_progress", "done"
)

data class AddQueuePatientRequest(
    @SerializedName("doctor_id") val doctorId: Int,
    @SerializedName("patient_name") val patientName: String,
    @SerializedName("patient_phone") val patientPhone: String?,
    @SerializedName("appointment_id") val appointmentId: Int? = null
)
