package com.medical.clinic.data.models

import com.google.gson.annotations.SerializedName
import com.medical.clinic.utils.DateTimeUtils
import java.io.Serializable

data class PeriodItem(
    @SerializedName("id") val id: Int,
    @SerializedName("doctor_id") val doctorId: Int,
    @SerializedName("date") val date: String,
    @SerializedName("start_time") val startTime: String,
    @SerializedName("end_time") val endTime: String,
    @SerializedName("max_bookings") val maxBookings: Int = 10,
    @SerializedName("booked_count") val bookedCount: Int = 0,
    @SerializedName("slots_available") val slotsAvailable: Int = 10,
    @SerializedName("is_full") val isFull: Boolean = false,
    @SerializedName("notes") val notes: String? = null
) : Serializable {
    val displayText: String
        get() {
            val remaining = if (slotsAvailable > 0) "متبقي $slotsAvailable مقاعد" else "مكتمل"
            val formattedDate = DateTimeUtils.formatArabicDate(date)
            val timeRange = DateTimeUtils.formatArabicTimeRange(startTime, endTime)
            return "$formattedDate | $timeRange ($remaining)"
        }
}
