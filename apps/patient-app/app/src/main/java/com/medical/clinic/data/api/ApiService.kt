package com.medical.clinic.data.api

import com.medical.clinic.data.models.AvatarResponse
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.Multipart
import retrofit2.http.Part

import androidx.annotation.Keep
import com.google.gson.annotations.SerializedName
import java.io.Serializable

import com.medical.clinic.data.models.ApiResponse
import com.medical.clinic.data.models.DoctorStatsResponse
import com.medical.clinic.data.models.QueueStatsResponse
import com.medical.clinic.data.models.QueueItem
import com.medical.clinic.data.models.QueueListResponse
import com.medical.clinic.data.models.QueueUpdateRequest
import com.medical.clinic.data.models.LoginResponse
import com.medical.clinic.data.models.User
import com.medical.clinic.data.models.Period
import com.medical.clinic.data.models.PeriodListResponse
import com.medical.clinic.data.models.MaxBookingsRequest
import com.medical.clinic.data.models.Schedule
import com.medical.clinic.data.models.ScheduleListResponse
import com.medical.clinic.data.models.CreateScheduleRequest
import com.medical.clinic.data.models.GeneratePeriodsRequest
import com.medical.clinic.data.models.GeneratePeriodsResponse
import com.medical.clinic.data.models.Delegation
import com.medical.clinic.data.models.DelegationListResponse
import com.medical.clinic.data.models.CreateDelegationRequest
import com.medical.clinic.data.models.RespondDelegationRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.PATCH
import retrofit2.http.DELETE
import retrofit2.http.Query
interface ApiService {
    @Multipart
    @POST("users/upload-avatar")
    suspend fun uploadAvatar(
        @Part image: MultipartBody.Part
    ): Response<AvatarResponse>


    // ═══════════════════════════════════════════
    // Auth
    // ═══════════════════════════════════════════

    @POST("auth/login/password")
    suspend fun loginPassword(
        @Body body: LoginPasswordRequest
    ): LoginResponse

    @POST("google-auth/guest-login-staff")
    suspend fun guestStaffLogin(
        @Body body: GuestLoginRequest
    ): LoginResponse

    @POST("google-auth/google-login-staff")
    suspend fun googleLoginStaff(
        @Body body: GoogleLoginStaffRequest
    ): LoginResponse

    @POST("auth/set-password")
    suspend fun setPassword(
        @Body body: SetPasswordRequest
    ): ApiResponse<Any>

    @POST("auth/change-password")
    suspend fun changePassword(
        @Body body: ChangePasswordRequest
    ): ApiResponse<Any>

    // ═══════════════════════════════════════════
    // Doctor Stats
    // ═══════════════════════════════════════════

    @GET("queue/doctor/{doctorId}/stats")
    suspend fun getQueueStats(@Path("doctorId") doctorId: Int,
        @Query("date") date: String? = null): QueueStatsResponse

    @GET("doctors/{doctorId}/stats/today")
    suspend fun getDoctorStatsToday(@Path("doctorId") doctorId: Int): DoctorStatsResponse

    // ═══════════════════════════════════════════
    // Queue
    // ═══════════════════════════════════════════

    @GET("queue/doctor/{doctorId}")
    suspend fun getDoctorQueue(@Path("doctorId") doctorId: Int): QueueListResponse

    @PUT("queue/{id}")
    suspend fun updateQueueStatus(
        @Path("id") id: Int,
        @Body body: QueueUpdateRequest
    ): ApiResponse<QueueItem>

    // ═══════════════════════════════════════════
    // Notifications
    // ═══════════════════════════════════════════

    @GET("notifications")
    suspend fun getNotifications(
        @Query("unread_only") unreadOnly: Int? = null
    ): ApiResponse<List<NotificationItem>>

    @GET("notifications/count")
    suspend fun getNotificationsCount(): ApiResponse<NotificationCount>

    @PATCH("notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: Int): ApiResponse<Any>

    @PATCH("notifications/read-all")
    suspend fun markAllNotificationsRead(): ApiResponse<Any>

    @GET("auth/me")
    suspend fun getMe(): ApiResponse<User>

    @POST("auth/logout")
    suspend fun logout(): ApiResponse<Any>

    // ═══════════════════════════════════════════
    // Complete Profile
    // ═══════════════════════════════════════════

    @POST("complete/doctors/complete-profile")
    suspend fun completeDoctorProfile(
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): ApiResponse<Any>

    @POST("complete/secretaries/complete-profile")
    suspend fun completeSecretaryProfile(
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): ApiResponse<Any>

    @GET("complete/clinics/list-for-join")
    suspend fun getClinicsForJoin(): ClinicsListResponse

    // ═══════════════════════════════════════════
    // Time + Health
    // ═══════════════════════════════════════════

    @GET("time")
    suspend fun getTime(): ApiResponse<TimeResponse>

    @GET("health")
    suspend fun getHealth(): ApiResponse<Any>
    // ═══════════════════════════════════════════
    // Secretaries — Doctors Management
    // ═══════════════════════════════════════════

    @GET("secretaries/me/doctors")
    suspend fun getMyDoctors(): ApiResponse<MyDoctorsResponse>

    @POST("secretaries/me/doctors")
    suspend fun linkDoctors(@Body body: LinkDoctorsRequest): ApiResponse<Any>

    @DELETE("secretaries/me/doctors/{doctorId}")
    suspend fun unlinkDoctor(@Path("doctorId") doctorId: Int): ApiResponse<Any>
    // ═══════════════════════════════════════════
    // Secretaries — Pending Doctors
    // ═══════════════════════════════════════════

    @GET("secretaries/me/pending-doctors")
    suspend fun getPendingDoctors(): ApiResponse<PendingDoctorsResponse>

    @PATCH("secretaries/me/doctors/{doctorId}/approve")
    suspend fun approveDoctorBySecretary(@Path("doctorId") doctorId: Int): ApiResponse<Any>

    @PATCH("secretaries/me/doctors/{doctorId}/reject")
    suspend fun rejectDoctorBySecretary(
        @Path("doctorId") doctorId: Int,
        @Body body: RejectDoctorRequest
    ): ApiResponse<Any>


    // ═══════════════════════════════════════════
    // 🆕 Periods
    // ═══════════════════════════════════════════

    @GET("periods/admin/doctor/{doctorId}")
    suspend fun getPeriodsForDoctor(
        @Path("doctorId") doctorId: Int
    ): PeriodListResponse

    @PATCH("periods/{id}/stop")
    suspend fun stopPeriod(
        @Path("id") periodId: Int,
        @Body body: Map<String, @JvmSuppressWildcards Any> = emptyMap()
    ): ApiResponse<Any>

    @PATCH("periods/{id}/resume")
    suspend fun resumePeriod(
        @Path("id") periodId: Int
    ): ApiResponse<Any>

    @PATCH("periods/{id}/max-bookings")
    suspend fun updateMaxBookings(
        @Path("id") periodId: Int,
        @Body body: MaxBookingsRequest
    ): ApiResponse<Any>

    // ═══════════════════════════════════════════
    // 🆕 Schedules (Weekly Templates)
    // ═══════════════════════════════════════════

    @GET("periods/schedule/doctor/{doctorId}")
    suspend fun getSchedulesForDoctor(
        @Path("doctorId") doctorId: Int
    ): ScheduleListResponse

    @POST("periods/schedule")
    suspend fun createSchedule(
        @Body body: CreateScheduleRequest
    ): ApiResponse<Any>

    @DELETE("periods/schedule/{id}")
    suspend fun deleteSchedule(
        @Path("id") scheduleId: Int
    ): ApiResponse<Any>

    @POST("periods/regenerate")
    suspend fun regeneratePeriods(
        @Body body: GeneratePeriodsRequest
    ): GeneratePeriodsResponse

    // ═══════════════════════════════════════════
    // 🆕 Delegations
    // ═══════════════════════════════════════════

    @POST("secretaries/me/delegations")
    suspend fun createDelegation(
        @Body body: CreateDelegationRequest
    ): ApiResponse<Any>

    @GET("secretaries/me/delegations")
    suspend fun getMyDelegations(
        @Query("status") status: String? = null,
        @Query("direction") direction: String? = null
    ): DelegationListResponse

    @PATCH("secretaries/me/delegations/{id}/accept")
    suspend fun acceptDelegation(
        @Path("id") delegationId: Int,
        @Body body: RespondDelegationRequest = RespondDelegationRequest()
    ): ApiResponse<Any>

    @PATCH("secretaries/me/delegations/{id}/reject")
    suspend fun rejectDelegation(
        @Path("id") delegationId: Int,
        @Body body: RespondDelegationRequest = RespondDelegationRequest()
    ): ApiResponse<Any>

    @DELETE("secretaries/me/delegations/{id}")
    suspend fun cancelDelegation(
        @Path("id") delegationId: Int
    ): ApiResponse<Any>

    // ═══════════════════════════════════════════
    // 🆕 Colleagues (السكرتيرات في نفس العيادة)
    // ═══════════════════════════════════════════

    @GET("secretaries/me/colleagues")
    suspend fun getColleagues(): ColleaguesResponse
    @POST("auth/recovery-request")
    suspend fun requestAccountRecovery(
        @Body body: RecoveryRequest
    ): ApiResponse<Any>

    @POST("recovery/check-account")
    suspend fun checkAccountExists(
        @Body body: CheckAccountRequest
    ): CheckAccountResponse

    @POST("recovery/request")
    suspend fun requestRecoveryWithPassword(
        @Body body: RecoveryWithPasswordRequest
    ): RecoveryRequestResponse
    @GET("recovery/status/{phone}")
    suspend fun getRecoveryStatus(
        @Path("phone") phone: String
    ): RecoveryStatusResponse

    // ═══════════════════════════════════════════
    // 🆕 Chat (المحادثات والرسائل)
    // ═══════════════════════════════════════════

    @GET("chat/conversations")
    suspend fun getConversations(): ApiResponse<List<ChatConversation>>

    @POST("chat/conversations")
    suspend fun createConversation(
        @Body body: CreateConversationRequest
    ): ApiResponse<ChatConversation>

    @GET("chat/conversations/{id}/messages")
    suspend fun getMessages(
        @Path("id") conversationId: Int
    ): ApiResponse<List<ChatMessage>>

    @POST("chat/conversations/{id}/messages")
    suspend fun sendMessage(
        @Path("id") conversationId: Int,
        @Body body: SendMessageRequest
    ): ApiResponse<ChatMessage>

    @POST("chat/validate")
    suspend fun validateChatMessage(
        @Body body: ValidateMessageRequest
    ): ChatValidateResponse

    @POST("auth/reset-password")
    suspend fun resetPasswordWithRecovery(
        @Body body: ResetPasswordRequest
    ): ApiResponse<Any>

    // ═══════════════════════════════════════════
    // Patient Endpoints (طبيبك)
    // ═══════════════════════════════════════════

    @GET("clinics")
    suspend fun getClinics(): ApiResponse<List<com.medical.clinic.data.models.Clinic>>

    @GET("doctors")
    suspend fun getDoctors(
        @Query("specialty") specialty: String? = null,
        @Query("clinic") clinic: String? = null
    ): ApiResponse<List<com.medical.clinic.data.models.DoctorItem>>

    @GET("doctors/{id}")
    suspend fun getDoctorById(
        @Path("id") id: Int
    ): ApiResponse<com.medical.clinic.data.models.DoctorItem>

    @GET("periods")
    suspend fun getPeriods(
        @Query("doctor_id") doctorId: Int,
        @Query("date") date: String? = null
    ): ApiResponse<List<com.medical.clinic.data.models.Period>>

        @POST("appointments/{id}/verify-location")
    suspend fun verifyAppointmentLocation(
        @Path("id") appointmentId: Int,
        @Body body: Map<String, Double>
    ): ApiResponse<Any>

    @GET("queue/live-status/{appointmentId}")
    suspend fun getLiveQueueStatus(
        @Path("appointmentId") appointmentId: Int
    ): ApiResponse<com.medical.clinic.data.models.LiveQueueStatus>

    @POST("appointments/{id}/review")
    suspend fun submitAppointmentReview(
        @Path("id") appointmentId: Int,
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): ApiResponse<Any>

    @POST("appointments")
    suspend fun bookAppointment(
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): ApiResponse<Any>

    @GET("appointments/my")
    suspend fun getMyAppointments(): ApiResponse<List<com.medical.clinic.data.models.Appointment>>

    @GET("medical-records/my")
    suspend fun getMyMedicalRecords(): ApiResponse<List<com.medical.clinic.data.models.MedicalRecord>>

    @POST("auth/google-login")
    suspend fun googleLoginPatient(
        @Body body: Map<String, String>
    ): LoginResponse

    @POST("auth/google-direct-login")
    suspend fun googleDirectLogin(
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): LoginResponse

    @POST("auth/register/patient")
    suspend fun registerPatient(
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): LoginResponse

    @GET("patients/me")
    suspend fun getPatientProfile(): ApiResponse<User>

    @GET("patients/me/wallet")
    suspend fun getPatientWallet(): ApiResponse<Map<String, @JvmSuppressWildcards Any>>

    @POST("patients/me/wallet/deposit-request")
    suspend fun submitWalletDepositRequest(
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): ApiResponse<Any>

    @PUT("patients/me")
    suspend fun updatePatientProfile(
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): ApiResponse<Any>

    @DELETE("patients/me")
    suspend fun deletePatientAccount(): ApiResponse<Any>

    @GET("offers")
    suspend fun getOffers(): ApiResponse<List<com.medical.clinic.data.models.OfferItem>>

    // ═══════════════════════════════════════════
    // 👨‍👩‍👧‍👦 إدارة أفراد العائلة (Family Members)
    // ═══════════════════════════════════════════
        @POST("assistant/chat")
    suspend fun sendAssistantMessage(
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): com.medical.clinic.data.models.AssistantResponse

    @GET("family")
    suspend fun getFamilyMembers(): ApiResponse<List<com.medical.clinic.data.models.FamilyMember>>

    @POST("family")
    suspend fun addFamilyMember(
        @Body member: Map<String, @JvmSuppressWildcards Any>
    ): ApiResponse<com.medical.clinic.data.models.FamilyMember>

    @PUT("family/{id}")
    suspend fun updateFamilyMember(
        @Path("id") id: Int,
        @Body member: Map<String, @JvmSuppressWildcards Any>
    ): ApiResponse<com.medical.clinic.data.models.FamilyMember>

    @DELETE("family/{id}")
    suspend fun deleteFamilyMember(
        @Path("id") id: Int
    ): ApiResponse<Any>

    @GET("periods/doctor/{doctorId}")
    suspend fun getDoctorAvailablePeriods(
        @Path("doctorId") doctorId: Int,
        @Query("date") date: String
    ): ApiResponse<List<com.medical.clinic.data.models.PeriodItem>>
}

data class CheckAccountRequest(
    val login: String
)

data class CheckAccountResponse(
    val success: Boolean,
    val account_exists: Boolean = false,
    val action: String? = null,
    val user_type: String? = null,
    val role: String? = null,
    val has_password: Boolean = false,
    val has_google: Boolean = false,
    val has_email: Boolean = false,
    val requires_password_verification: Boolean = false,
    val is_google_only: Boolean = false,
    val user_name: String? = null,
    val display_name: String? = null,
    val status: String? = null,
    val message: String? = null
)

data class RecoveryWithPasswordRequest(
    val login: String,
    val old_password: String? = null,
    val full_name: String? = null
)

data class RecoveryRequestResponse(
    val success: Boolean = false,
    val auto_approved: Boolean? = null,
    val requires_admin_review: Boolean? = null,
    val action: String? = null,
    val user_role: String? = null,
    val message: String? = null
)
// ═══════════════════════════════════════════
// Request Bodies
// ═══════════════════════════════════════════

data class LoginPasswordRequest(
    val login: String,     // phone أو email
    val password: String,
    val role: String
)

data class GuestLoginRequest(
    val full_name: String,
    val phone: String,
    val role: String
)

data class GoogleLoginStaffRequest(
    val idToken: String,
    val role: String
)

data class SetPasswordRequest(
    val new_password: String,
    val current_password: String? = null
)

data class ChangePasswordRequest(
    val current_password: String,
    val new_password: String
)
// ═══════════════════════════════════════════
// Response Bodies
// ═══════════════════════════════════════════

data class ClinicsListResponse(
    val success: Boolean,
    val data: List<ClinicItem>? = null
)

data class ClinicItem(
    val id: Int,
    val name: String,
    val governorate: String? = null,
    val address: String? = null,
    val is_active: Int? = null
)

data class NotificationItem(
    val id: Int,
    val user_id: Int,
    val user_type: String,
    val title: String,
    val body: String? = null,
    val type: String = "info",
    val data: String? = null,
    val is_read: Int = 0,
    val created_at: String? = null
)

data class NotificationCount(
    val unread: Int = 0
)

data class TimeResponse(
    val timestamp_utc: String,
    val timestamp_unix: Long,
    val timezone: String,
    val local_iso: String,
    val local_date: String,
    val local_time_only: String,
    val hijri_date: String? = null,
    val day_of_week: String,
    val offset: String
)


// ═══════════════════════════════════════════
// Secretaries — Data Classes
// ═══════════════════════════════════════════

data class MyDoctorsResponse(
    val all: List<DoctorItem> = emptyList(),
    val linked: List<DoctorItem> = emptyList(),
    val clinic_id: Int? = null
)

data class DoctorItem(
    val id: Int,
    val full_name: String,
    val specialty: String? = null,
    val phone: String? = null,
    val avatar: String? = null,
    val status: String? = null,
    val is_linked: Int? = null
)

data class LinkDoctorsRequest(
    val doctor_ids: List<Int>
)


// ═══════════════════════════════════════════
// Pending Doctors — Data Classes
// ═══════════════════════════════════════════

data class PendingDoctorsResponse(
    val data: List<PendingDoctorItem>? = null,
    val clinic_id: Int? = null,
    val clinic_name: String? = null
)

data class PendingDoctorItem(
    val id: Int,
    val full_name: String,
    val specialty: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val avatar: String? = null,
    val status: String? = null,
    val must_complete_profile: Int? = null,
    val clinic_name: String? = null,
    val created_at: String? = null
)

data class RejectDoctorRequest(
    val reason: String? = null
)


// ═══════════════════════════════════════════
// Colleagues — Data Classes
// ═══════════════════════════════════════════

data class ColleaguesResponse(
    val success: Boolean = false,
    val data: List<Colleague> = emptyList(),
    val clinic_id: Int? = null,
    val message: String? = null
)

data class Colleague(
    val id: Int,
    val full_name: String,
    val phone: String? = null,
    val email: String? = null,
    val avatar: String? = null,
    val status: String? = null
)

data class RecoveryRequest(
    val full_name: String,
    val phone: String
)

data class RecoveryStatusResponse(
    val success: Boolean,
    val has_request: Boolean,
    val request_id: Int? = null,
    val status: String? = null,
    val user_name: String? = null,
    val user_role: String? = null,
    val created_at: String? = null,
    val reviewed_at: String? = null,
    val notes: String? = null,
    val message: String? = null
)

data class ResetPasswordRequest(
    val phone: String,
    val new_password: String
)


// ═══════════════════════════════════════════
// 🆕 Chat Models
// ═══════════════════════════════════════════

@Keep
data class ChatConversation(
    @SerializedName("id") val id: Int = 0,
    @SerializedName("patient_id") val patient_id: Int = 0,
    @SerializedName("doctor_id") val doctor_id: Int? = null,
    @SerializedName("secretary_id") val secretary_id: Int? = null,
    @SerializedName("clinic_id") val clinic_id: Int? = null,
    @SerializedName("target_type") val target_type: String = "doctor",
    @SerializedName("last_message") val last_message: String? = null,
    @SerializedName("last_message_at") val last_message_at: String? = null,
    @SerializedName("unread_count") val unread_count: Int = 0,
    @SerializedName("patient_unread_count") val patient_unread_count: Int = 0,
    @SerializedName("staff_unread_count") val staff_unread_count: Int = 0,
    @SerializedName("doctor_name") val doctor_name: String? = null,
    @SerializedName("doctor_specialty") val doctor_specialty: String? = null,
    @SerializedName("doctor_avatar") val doctor_avatar: String? = null,
    @SerializedName("secretary_name") val secretary_name: String? = null,
    @SerializedName("clinic_name") val clinic_name: String? = null,
    @SerializedName("patient_name") val patient_name: String? = null
) : Serializable

@Keep
data class CreateConversationRequest(
    @SerializedName("doctor_id") val doctor_id: Int? = null,
    @SerializedName("secretary_id") val secretary_id: Int? = null,
    @SerializedName("target_type") val target_type: String = "doctor"
)

@Keep
data class ChatMessage(
    @SerializedName("id") val id: Int = 0,
    @SerializedName("conversation_id") val conversation_id: Int = 0,
    @SerializedName("sender_type") val sender_type: String = "",
    @SerializedName("sender_id") val sender_id: Int = 0,
    @SerializedName("message_text") val message_text: String = "",
    @SerializedName("is_read") val is_read: Int = 0,
    @SerializedName("created_at") val created_at: String = ""
) : Serializable

@Keep
data class SendMessageRequest(
    @SerializedName("message_text") val message_text: String
)

@Keep
data class ValidateMessageRequest(
    @SerializedName("message") val message: String
)

@Keep
data class ChatValidateResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("isValid") val isValid: Boolean = false,
    @SerializedName("reason") val reason: String? = null,
    @SerializedName("detectedWords") val detectedWords: List<String> = emptyList(),
    @SerializedName("alertMessage") val alertMessage: String? = null
)
