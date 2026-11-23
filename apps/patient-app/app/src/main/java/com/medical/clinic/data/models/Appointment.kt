package com.medical.clinic.data.models

import com.google.gson.annotations.SerializedName

data class Appointment(
    @SerializedName("id") val id: Int,
    @SerializedName("booking_code") val bookingCode: String? = null,
    @SerializedName("user_id") val userId: Int? = null,
    @SerializedName("doctor_id") val doctorId: Int? = null,
    @SerializedName("period_id") val periodId: Int? = null,
    @SerializedName("status") val status: String? = "pending", // pending, confirmed, cancelled, completed
    @SerializedName("payment_status") val paymentStatus: String? = "unpaid",
    @SerializedName("payment_method") val paymentMethod: String? = "cash",
    @SerializedName("queue_number") val queueNumber: Int? = null,
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("doctor_name") val doctorName: String? = null,
    @SerializedName("doctor_specialty") val doctorSpecialty: String? = null,
    @SerializedName("doctor_avatar") val doctorAvatar: String? = null,
    @SerializedName("doctor_fee") val doctorFee: Double? = null,
    @SerializedName("clinic_name") val clinicName: String? = null,
    @SerializedName("clinic_address") val clinicAddress: String? = null,
    @SerializedName("clinic_governorate") val clinicGovernorate: String? = null,
    @SerializedName("clinic_google_maps_url") val clinicGoogleMapsUrl: String? = null,
    @SerializedName("period_date") val periodDate: String? = null,
    @SerializedName("period_start_time") val periodStartTime: String? = null,
    @SerializedName("period_end_time") val periodEndTime: String? = null,
    @SerializedName("is_golden") val isGolden: Int? = 0,
    @SerializedName("transaction_id") val transactionId: String? = null,
    @SerializedName("is_reviewed") val isReviewed: Int? = 0,
    @SerializedName("review_id") val reviewId: Int? = null,
    @SerializedName("attendance_status") val attendanceStatus: String? = "pending",
    @SerializedName("location_verified_at") val locationVerifiedAt: String? = null,
    @SerializedName("family_member_id") val familyMemberId: Int? = null,
    @SerializedName("patient_name") val patientName: String? = null,
    @SerializedName("patient_relationship") val patientRelationship: String? = null,
    @SerializedName("patient_age") val patientAge: Int? = null,
    @SerializedName("patient_gender") val patientGender: String? = null
)
