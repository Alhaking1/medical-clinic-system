package com.medical.clinic.data.models

import com.google.gson.annotations.SerializedName

/**
 * نموذج الفترة الفعلية (doctor_periods)
 *
 * الفترة = يوم محدد + وقت بداية/نهاية + عدد حجوزات أقصى
 * تُولَّد تلقائياً من القالب الأسبوعي، أو تُنشأ يدوياً
 */
data class Period(
    @SerializedName("id") val id: Int,
    @SerializedName("doctor_id") val doctorId: Int,
    @SerializedName("date") val date: String,                    // YYYY-MM-DD
    @SerializedName("start_time") val startTime: String,          // HH:MM
    @SerializedName("end_time") val endTime: String,              // HH:MM
    @SerializedName("max_bookings") val maxBookings: Int = 10,
    @SerializedName("booked_count") val bookedCount: Int = 0,
    @SerializedName("is_cancelled") val isCancelled: Int = 0,
    @SerializedName("is_stopped") val isStopped: Int = 0,        // 🆕 إيقاف مؤقت
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,

    // حقول مرافقة (من API)
    @SerializedName("slots_available") val slotsAvailable: Int? = null,
    @SerializedName("is_full") val isFull: Boolean? = null,

    // من JOIN
    @SerializedName("doctor_name") val doctorName: String? = null,
    @SerializedName("doctor_specialty") val doctorSpecialty: String? = null
) {
    // ═══════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════

    /** الفترة ملغاة */
    val cancelled: Boolean
        get() = isCancelled == 1

    /** الفترة موقوفة مؤقتاً */
    val stopped: Boolean
        get() = isStopped == 1

    /** الفترة ممتلئة */
    val full: Boolean
        get() = bookedCount >= maxBookings

    /** الأماكن المتاحة */
    val available: Int
        get() = maxOf(0, maxBookings - bookedCount)

    /** هل يمكن الحجز؟ */
    val canBook: Boolean
        get() = !cancelled && !stopped && !full

    /** الحالة بالعربية */
    val statusArabic: String
        get() = when {
            cancelled -> "ملغاة"
            stopped -> "موقوفة مؤقتاً"
            full -> "مكتملة"
            bookedCount > 0 -> "متاحة ($bookedCount/$maxBookings)"
            else -> "متاحة"
        }

    /** الوقت بشكل جميل */
    val timeRange: String
        get() = "$startTime - $endTime"
}

/**
 * استجابة GET /periods/doctor/:doctorId
 */
data class PeriodListResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: List<Period> = emptyList(),
    @SerializedName("message") val message: String? = null
)

/**
 * طلب PATCH /periods/:id/max-bookings
 */
data class MaxBookingsRequest(
    @SerializedName("max_bookings") val maxBookings: Int
)