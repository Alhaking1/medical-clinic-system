package com.medical.clinic.staff.data.models

import com.google.gson.annotations.SerializedName

data class PeriodItem(
    @SerializedName("id") val id: Int,
    @SerializedName("doctor_id") val doctorId: Int,
    @SerializedName("date") val date: String,
    @SerializedName("start_time") val startTime: String,
    @SerializedName("end_time") val endTime: String,
    @SerializedName("max_bookings") var maxBookings: Int,
    @SerializedName("booked_count") val bookedCount: Int = 0,
    @SerializedName("is_stopped") var isStopped: Int = 0,
    @SerializedName("is_cancelled") val isCancelled: Int = 0,
    @SerializedName("notes") var notes: String? = null
)

data class StopPeriodRequest(
    @SerializedName("notes") val notes: String? = null
)

data class UpdateMaxBookingsRequest(
    @SerializedName("max_bookings") val maxBookings: Int
)

data class OfferImageItem(
    @SerializedName("id") val id: Int,
    @SerializedName("image_path") val imagePath: String,
    @SerializedName("sort_order") val sortOrder: Int? = 0
)

data class OfferItem(
    @SerializedName("id") val id: Int,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String? = null,
    @SerializedName("doctor_id") val doctorId: Int? = null,
    @SerializedName("doctor_name") val doctorName: String? = null,
    @SerializedName("doctor_specialty") val doctorSpecialty: String? = null,
    @SerializedName("clinic_name") val clinicName: String? = null,
    @SerializedName("discount_percent") val discountPercent: Int? = null,
    @SerializedName("discount_percentage") val discountPercentage: Double? = null,
    @SerializedName("original_price") val originalPrice: Double? = null,
    @SerializedName("discounted_price") val discountedPrice: Double? = null,
    @SerializedName("start_date") val startDate: String? = null,
    @SerializedName("end_date") val endDate: String? = null,
    @SerializedName("is_active") val isActive: Int = 1,
    @SerializedName("status") val status: String? = "pending",
    @SerializedName("rejection_reason") val rejectionReason: String? = null,
    @SerializedName("remaining_time_display") val remainingTimeDisplay: String? = null,
    @SerializedName("is_expired") val isExpired: Int = 0,
    @SerializedName("image_url") val imageUrl: String? = null,
    @SerializedName("images") val images: List<OfferImageItem>? = null
)

data class SecretaryOffersResponse(
    @SerializedName("data") val data: List<OfferItem>? = emptyList(),
    @SerializedName("current") val current: List<OfferItem>? = emptyList(),
    @SerializedName("completed") val completed: List<OfferItem>? = emptyList()
)

data class CreateOfferRequest(
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String?,
    @SerializedName("doctor_id") val doctorId: Int? = null,
    @SerializedName("discount_percent") val discountPercent: Int? = null,
    @SerializedName("discount_percentage") val discountPercentage: Double? = null,
    @SerializedName("duration_days") val durationDays: Int? = null,
    @SerializedName("start_date") val startDate: String? = null,
    @SerializedName("end_date") val endDate: String? = null
)

data class SecretaryDoctorItem(
    @SerializedName("id") val id: Int,
    @SerializedName("full_name") val fullName: String,
    @SerializedName("specialty") val specialty: String?,
    @SerializedName("phone") val phone: String?,
    @SerializedName("avatar") val avatar: String?,
    @SerializedName("status") val status: String? = "approved",
    @SerializedName("consultation_fee") val consultationFee: Double? = 0.0,
    @SerializedName("period_max_bookings") val periodMaxBookings: Int? = null,
    @SerializedName("period_booked_count") val periodBookedCount: Int? = null
)

data class ClinicScheduleData(
    @SerializedName("clinic_id") val clinicId: Int? = null,
    @SerializedName("clinic_name") val clinicName: String? = null,
    @SerializedName("is_24_hours") val is24Hours: Int? = 0,
    @SerializedName("schedule_type") val scheduleType: String? = "daily",
    @SerializedName("open_time") val openTime: String? = "08:00",
    @SerializedName("close_time") val closeTime: String? = "22:00",
    @SerializedName("weekly_schedule") val weeklySchedule: String? = null,
    @SerializedName("is_open") val isOpen: Boolean? = true,
    @SerializedName("status_label") val statusLabel: String? = null,
    @SerializedName("working_hours_display") val workingHoursDisplay: String? = null
)

data class UpdateClinicScheduleRequest(
    @SerializedName("is_24_hours") val is24Hours: Int? = null,
    @SerializedName("schedule_type") val scheduleType: String? = null,
    @SerializedName("open_time") val openTime: String? = null,
    @SerializedName("close_time") val closeTime: String? = null,
    @SerializedName("weekly_schedule") val weeklySchedule: String? = null
)

data class StaffAppointmentItem(
    @SerializedName("id") val id: Int,
    @SerializedName("booking_code") val bookingCode: String? = null,
    @SerializedName("patient_name") val patientName: String? = null,
    @SerializedName("patient_phone") val patientPhone: String? = null,
    @SerializedName("doctor_name") val doctorName: String? = null,
    @SerializedName("period_date") val periodDate: String? = null,
    @SerializedName("period_start_time") val periodStartTime: String? = null,
    @SerializedName("period_end_time") val periodEndTime: String? = null,
    @SerializedName("slot_time") val slotTime: String? = null,
    @SerializedName("queue_number") val queueNumber: Int? = 1,
    @SerializedName("status") var status: String? = "pending",
    @SerializedName("payment_status") val paymentStatus: String? = "unpaid",
    @SerializedName("consultation_fee") val consultationFee: Double? = 0.0,
    @SerializedName("period_max_bookings") val periodMaxBookings: Int? = null,
    @SerializedName("period_booked_count") val periodBookedCount: Int? = null
)

data class DoctorFinancialItem(
    @SerializedName("doctor_id") val doctorId: Int,
    @SerializedName("doctor_name") val doctorName: String,
    @SerializedName("specialty") val specialty: String?,
    @SerializedName("consultation_fee") val consultationFee: Double,
    @SerializedName("net_fee_per_booking") val netFeePerBooking: Double,
    @SerializedName("appointments_count") val appointmentsCount: Int,
    @SerializedName("gross_revenue") val grossRevenue: Double,
    @SerializedName("admin_commission") val adminCommission: Double,
    @SerializedName("net_revenue") val netRevenue: Double
)

data class ClinicFinancialStats(
    @SerializedName("clinic_id") val clinicId: Int,
    @SerializedName("clinic_name") val clinicName: String,
    @SerializedName("commission_rate") val commissionRate: Double,
    @SerializedName("total_appointments") val totalAppointments: Int,
    @SerializedName("total_gross_revenue") val totalGrossRevenue: Double,
    @SerializedName("total_admin_commission") val totalAdminCommission: Double,
    @SerializedName("total_net_revenue") val totalNetRevenue: Double,
    @SerializedName("doctors") val doctors: List<DoctorFinancialItem> = emptyList()
)
