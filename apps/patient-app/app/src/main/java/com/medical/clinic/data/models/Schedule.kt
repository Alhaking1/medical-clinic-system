package com.medical.clinic.data.models

import com.google.gson.annotations.SerializedName

/**
 * نموذج القالب الأسبوعي (doctor_schedules)
 *
 * القالب = يوم من الأسبوع (0-6) + وقت بداية/نهاية
 * عند إنشائه، النظام يولّد فترات تلقائياً لـ 90 يوم قادمة
 *
 * day_of_week:
 *   0 = الأحد
 *   1 = الاثنين
 *   2 = الثلاثاء
 *   3 = الأربعاء
 *   4 = الخميس
 *   5 = الجمعة
 *   6 = السبت
 */
data class Schedule(
    @SerializedName("id") val id: Int,
    @SerializedName("doctor_id") val doctorId: Int,
    @SerializedName("day_of_week") val dayOfWeek: Int,
    @SerializedName("start_time") val startTime: String,
    @SerializedName("end_time") val endTime: String,
    @SerializedName("max_bookings") val maxBookings: Int = 10,
    @SerializedName("is_active") val isActive: Int = 1,
    @SerializedName("created_at") val createdAt: String? = null
) {
    val active: Boolean
        get() = isActive == 1

    val dayArabic: String
        get() = when (dayOfWeek) {
            0 -> "الأحد"
            1 -> "الاثنين"
            2 -> "الثلاثاء"
            3 -> "الأربعاء"
            4 -> "الخميس"
            5 -> "الجمعة"
            6 -> "السبت"
            else -> "غير معروف"
        }

    val timeRange: String
        get() = "$startTime - $endTime"
}

/**
 * استجابة GET /periods/schedule/doctor/:doctorId
 */
data class ScheduleListResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: List<Schedule> = emptyList(),
    @SerializedName("message") val message: String? = null
)

/**
 * طلب POST /periods/schedule
 */
data class CreateScheduleRequest(
    @SerializedName("doctor_id") val doctorId: Int,
    @SerializedName("day_of_week") val dayOfWeek: Int,
    @SerializedName("start_time") val startTime: String,
    @SerializedName("end_time") val endTime: String,
    @SerializedName("max_bookings") val maxBookings: Int = 10
)

/**
 * طلب POST /periods/generate
 */
data class GeneratePeriodsRequest(
    @SerializedName("doctor_id") val doctorId: Int,
    @SerializedName("days") val days: Int = 90
)

/**
 * استجابة توليد الفترات
 */
data class GeneratePeriodsResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String? = null,
    @SerializedName("data") val data: GeneratePeriodsData? = null
)

data class GeneratePeriodsData(
    @SerializedName("created") val created: Int = 0,
    @SerializedName("skipped") val skipped: Int = 0
)