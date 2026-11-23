package com.medical.clinic.data.models

import com.google.gson.annotations.SerializedName

data class MedicalRecord(
    @SerializedName("id") val id: Int,
    @SerializedName("appointment_id") val appointmentId: Int? = null,
    @SerializedName("user_id") val userId: Int? = null,
    @SerializedName("doctor_id") val doctorId: Int? = null,
    @SerializedName("diagnosis") val diagnosis: String? = null,
    @SerializedName("prescription") val prescription: String? = null,
    @SerializedName("lab_tests") val labTests: String? = null,
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("follow_up_date") val followUpDate: String? = null,
    @SerializedName("doctor_name") val doctorName: String? = null,
    @SerializedName("doctor_specialty") val doctorSpecialty: String? = null,
    @SerializedName("booking_code") val bookingCode: String? = null,
    @SerializedName("period_date") val periodDate: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
)
