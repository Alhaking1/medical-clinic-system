package com.medical.clinic.data.models

import com.google.gson.annotations.SerializedName

data class DoctorStats(
    val total: Int = 0,
    val completed: Int = 0,
    val confirmed: Int = 0,
    val waiting: Int = 0,
    val inProgress: Int = 0,
    val done: Int = 0,
    val newPatients: Int = 0,
    val totalRevenue: Int = 0
)

data class QueueStatsResponse(
    val success: Boolean,
    val data: QueueStatsData? = null
)

data class QueueStatsData(
    val queue: QueueStats? = null,
    val appointments: AppointmentStats? = null,
    val date: String? = null
)

data class QueueStats(
    @SerializedName("total") val total: Int = 0,
    @SerializedName("waiting") val waiting: Int = 0,
    @SerializedName("in_progress") val inProgress: Int = 0,
    @SerializedName("done") val done: Int = 0
)

data class AppointmentStats(
    @SerializedName("total") val total: Int = 0,
    @SerializedName("completed") val completed: Int = 0,
    @SerializedName("confirmed") val confirmed: Int = 0,
    @SerializedName("pending") val pending: Int = 0,
    @SerializedName("cancelled") val cancelled: Int = 0,
    @SerializedName("no_show") val noShow: Int = 0,
    @SerializedName("total_revenue") val totalRevenue: Int = 0
)

data class DoctorStatsResponse(
    val success: Boolean,
    val data: DoctorStatsData? = null
)

data class DoctorStatsData(
    val date: String? = null,
    @SerializedName("doctor_id") val doctorId: Int? = null,
    val appointments: AppointmentStats? = null,
    val queue: QueueStats? = null,
    @SerializedName("new_patients_today") val newPatientsToday: Int = 0
)