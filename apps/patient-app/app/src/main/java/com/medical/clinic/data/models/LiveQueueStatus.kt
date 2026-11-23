package com.medical.clinic.data.models

import com.google.gson.annotations.SerializedName

data class LiveQueueStatus(
    @SerializedName("appointment_id") val appointmentId: Int,
    @SerializedName("doctor_id") val doctorId: Int? = null,
    @SerializedName("doctor_name") val doctorName: String? = null,
    @SerializedName("clinic_name") val clinicName: String? = null,
    @SerializedName("my_queue_number") val myQueueNumber: Int = 1,
    @SerializedName("current_serving_number") val currentServingNumber: Int = 1,
    @SerializedName("patients_ahead") val patientsAhead: Int = 0,
    @SerializedName("estimated_wait_minutes") val estimatedWaitMinutes: Int = 0,
    @SerializedName("status_text") val statusText: String? = null
)
