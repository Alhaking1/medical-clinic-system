package com.medical.clinic.staff.data.api

import com.medical.clinic.staff.data.models.*
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    @Multipart
    @POST("users/upload-avatar")
    suspend fun uploadAvatar(
        @Part image: MultipartBody.Part
    ): Response<AvatarResponse>


    // ═══════════════════════════════════════════
    // AUTHENTICATION
    // ═══════════════════════════════════════════

    @POST("auth/login/password")
    suspend fun loginWithPassword(
        @Body req: PasswordLoginRequest
    ): Response<ApiResponse<User>>

    @POST("google-auth/google-login-staff")
    suspend fun loginWithGoogle(
        @Body req: GoogleLoginStaffRequest
    ): Response<ApiResponse<User>>

    @POST("google-auth/guest-login-staff")
    suspend fun loginAsGuest(
        @Body req: GuestLoginStaffRequest
    ): Response<ApiResponse<User>>

    @GET("auth/me")
    suspend fun getMe(): Response<ApiResponse<User>>

    @POST("auth/change-password")
    suspend fun changePassword(
        @Body req: ChangePasswordRequest
    ): Response<BaseResponse>

    @POST("auth/delete-account")
    suspend fun deleteAccount(): Response<BaseResponse>

    // ═══════════════════════════════════════════
    // ACCOUNT RECOVERY
    // ═══════════════════════════════════════════

    @POST("recovery/check-account")
    suspend fun checkAccount(
        @Body req: CheckAccountRequest
    ): Response<CheckAccountResponse>

    @POST("recovery/request")
    suspend fun submitRecoveryRequest(
        @Body req: RecoveryRequestPayload
    ): Response<BaseResponse>

    @GET("recovery/status/{phone}")
    suspend fun getRecoveryStatus(
        @Path("phone") phone: String
    ): Response<RecoveryStatusResponse>

    @POST("auth/reset-password")
    suspend fun resetPassword(
        @Body req: ResetPasswordRequest
    ): Response<BaseResponse>

    // ═══════════════════════════════════════════
    // ONBOARDING & PROFILE COMPLETION
    // ═══════════════════════════════════════════

    @GET("complete/clinics/list-for-join")
    suspend fun getClinicsForJoin(): Response<ApiResponse<List<ClinicItem>>>

    @POST("complete/clinics/create")
    suspend fun createClinic(
        @Body req: CreateClinicRequest
    ): Response<ApiResponse<ClinicItem>>

    @POST("complete/doctors/complete-profile")
    suspend fun completeDoctorProfile(
        @Body req: CompleteDoctorProfileRequest
    ): Response<ApiResponse<User>>

    @POST("complete/secretaries/complete-profile")
    suspend fun completeSecretaryProfile(
        @Body req: CompleteSecretaryProfileRequest
    ): Response<ApiResponse<User>>

    // ═══════════════════════════════════════════
    // DOCTOR QUEUE & STATS
    // ═══════════════════════════════════════════

    @GET("queue/doctor/{doctorId}")
    suspend fun getDoctorQueue(
        @Path("doctorId") doctorId: Int,
        @Query("date") date: String? = null,
        @Query("status") status: String? = null
    ): Response<ApiResponse<List<DoctorQueueItem>>>

    @GET("queue/doctor/{doctorId}/stats")
    suspend fun getDoctorStats(
        @Path("doctorId") doctorId: Int
    ): Response<ApiResponse<DoctorStatsData>>

    @PUT("queue/{id}")
    suspend fun updateQueueStatus(
        @Path("id") id: Int,
        @Body req: UpdateQueueStatusRequest
    ): Response<ApiResponse<DoctorQueueItem>>

    // ═══════════════════════════════════════════
    // SECRETARY & CLINIC MANAGEMENT
    // ═══════════════════════════════════════════

    @POST("queue")
    suspend fun addPatientToQueue(
        @Body req: AddQueuePatientRequest
    ): Response<ApiResponse<DoctorQueueItem>>

    @GET("periods/admin/doctor/{doctorId}")
    suspend fun getDoctorPeriods(
        @Path("doctorId") doctorId: Int
    ): Response<ApiResponse<List<PeriodItem>>>

    @PATCH("periods/{id}/stop")
    suspend fun stopPeriod(
        @Path("id") id: Int,
        @Body req: StopPeriodRequest
    ): Response<BaseResponse>

    @PATCH("periods/{id}/resume")
    suspend fun resumePeriod(
        @Path("id") id: Int
    ): Response<BaseResponse>

    @PATCH("periods/{id}/max-bookings")
    suspend fun updateMaxBookings(
        @Path("id") id: Int,
        @Body req: UpdateMaxBookingsRequest
    ): Response<BaseResponse>

    @GET("secretaries/me/doctors")
    suspend fun getSecretaryDoctors(): Response<ApiResponse<List<SecretaryDoctorItem>>>

    @GET("offers")
    suspend fun getOffers(): Response<ApiResponse<List<OfferItem>>>

    @GET("offers/my")
    suspend fun getSecretaryOffers(): Response<SecretaryOffersResponse>

    @POST("offers")
    suspend fun createOffer(
        @Body req: CreateOfferRequest
    ): Response<ApiResponse<OfferItem>>

    @POST("offers/{id}/repeat")
    suspend fun repeatOffer(
        @Path("id") id: Int,
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): Response<ApiResponse<OfferItem>>

    @Multipart
    @POST("offers/{id}/images")
    suspend fun uploadOfferImages(
        @Path("id") id: Int,
        @Part images: List<MultipartBody.Part>
    ): Response<BaseResponse>

    @DELETE("offers/{id}")
    suspend fun deleteOffer(
        @Path("id") id: Int
    ): Response<BaseResponse>

    @GET("secretaries/me/clinic-schedule")
    suspend fun getClinicSchedule(): Response<ApiResponse<ClinicScheduleData>>

    @PUT("secretaries/me/clinic-schedule")
    suspend fun updateClinicSchedule(
        @Body req: UpdateClinicScheduleRequest
    ): Response<ApiResponse<ClinicScheduleData>>

    @GET("secretaries/me/financial-stats")
    suspend fun getClinicFinancialStats(
        @Query("range") range: String? = null
    ): Response<ApiResponse<ClinicFinancialStats>>

    // ═══════════════════════════════════════════
    // CHAT (الدردشة والرسائل)
    // ═══════════════════════════════════════════

    @GET("chat/conversations")
    suspend fun getConversations(): Response<ApiResponse<List<ChatConversation>>>

    @GET("chat/conversations/{id}/messages")
    suspend fun getMessages(
        @Path("id") conversationId: Int
    ): Response<ApiResponse<List<ChatMessage>>>

    @POST("chat/conversations/{id}/messages")
    suspend fun sendMessage(
        @Path("id") conversationId: Int,
        @Body req: SendMessageRequest
    ): Response<ApiResponse<ChatMessage>>

    @POST("chat/validate")
    suspend fun validateChatMessage(
        @Body req: ValidateMessageRequest
    ): Response<ChatValidateResponse>

    // ═══════════════════════════════════════════
    // NOTIFICATIONS (الإشعارات والتنبيهات)
    // ═══════════════════════════════════════════

    @GET("notifications")
    suspend fun getNotifications(
        @Query("unread_only") unreadOnly: Int? = null
    ): Response<ApiResponse<List<NotificationItem>>>

    @GET("notifications/count")
    suspend fun getNotificationsCount(): Response<ApiResponse<NotificationCount>>

    @PATCH("notifications/{id}/read")
    suspend fun markNotificationRead(
        @Path("id") id: Int
    ): Response<BaseResponse>

    @PATCH("notifications/read-all")
    suspend fun markAllNotificationsRead(): Response<BaseResponse>

    // ═══════════════════════════════════════════
    // DOCTOR MULTI-CLINIC (إدارة العيادات المتعددة للطبيب)
    // ═══════════════════════════════════════════

    @GET("doctors/me/clinics")
    suspend fun getDoctorClinics(): Response<ApiResponse<List<ClinicItem>>>

    @POST("doctors/me/switch-clinic")
    suspend fun switchClinic(
        @Body req: Map<String, Int>
    ): Response<ApiResponse<User>>

    // ═══════════════════════════════════════════
    // PROFILE & EMAIL
    // ═══════════════════════════════════════════

    @POST("auth/update-email")
    suspend fun updateEmail(
        @Body body: Map<String, String>
    ): Response<ApiResponse<User>>

    // ═══════════════════════════════════════════
    // SECRETARY CLINIC DOCTORS & APPROVAL
    // ═══════════════════════════════════════════

    @GET("secretaries/me/pending-doctors")
    suspend fun getPendingDoctors(): Response<ApiResponse<List<SecretaryDoctorItem>>>

    @PATCH("secretaries/me/doctors/{doctorId}/approve")
    suspend fun approveDoctor(
        @Path("doctorId") doctorId: Int
    ): Response<BaseResponse>

    @PATCH("secretaries/me/doctors/{doctorId}/reject")
    suspend fun rejectDoctor(
        @Path("doctorId") doctorId: Int,
        @Body body: Map<String, String> = emptyMap()
    ): Response<BaseResponse>

    // ═══════════════════════════════════════════
    // PERIODS & SCHEDULE MANAGEMENT
    // ═══════════════════════════════════════════

    @POST("periods")
    suspend fun createDirectPeriod(
        @Body body: Map<String, @JvmSuppressWildcards Any>
    ): Response<ApiResponse<Any>>

    @DELETE("periods/{id}")
    suspend fun deletePeriod(
        @Path("id") id: Int
    ): Response<BaseResponse>

    // ═══════════════════════════════════════════
    // APPOINTMENTS & CONFIRMATION
    // ═══════════════════════════════════════════

    @GET("appointments")
    suspend fun getAppointments(
        @Query("date") date: String? = null,
        @Query("doctor_id") doctorId: Int? = null,
        @Query("status") status: String? = null
    ): Response<ApiResponse<List<StaffAppointmentItem>>>

        @PATCH("appointments/{id}/confirm")
    suspend fun confirmAppointment(
        @Path("id") id: Int
    ): Response<BaseResponse>

    @PATCH("appointments/{id}/attendance")
    suspend fun updateAppointmentAttendance(
        @Path("id") id: String,
        @Body body: Map<String, String>
    ): Response<BaseResponse>

    // ═══════════════════════════════════════════
    // DOCTOR CHAT & CLINIC CONTACTS
    // ═══════════════════════════════════════════

    @PATCH("doctors/me/direct-chat")
    suspend fun updateDoctorDirectChat(
        @Body body: DoctorDirectChatRequest
    ): Response<ApiResponse<Any>>

    @POST("secretaries/me/clinic/contact-numbers")
    suspend fun addClinicContactNumber(
        @Body body: AddClinicContactNumberRequest
    ): Response<ApiResponse<Any>>

    // ═══════════════════════════════════════════
    // PRESCRIPTIONS (الروشتة الطبية)
    // ═══════════════════════════════════════════

    @POST("prescriptions")
    suspend fun createPrescription(
        @Body body: CreatePrescriptionRequest
    ): Response<ApiResponse<PrescriptionResponseData>>

    @Streaming
    @GET("prescriptions/{id}/pdf")
    suspend fun downloadPrescriptionPdf(
        @Path("id") id: Int
    ): Response<okhttp3.ResponseBody>

    @GET("prescriptions/medications")
    suspend fun getMedications(
        @Query("search") search: String? = null
    ): Response<ApiResponse<List<MedicationBankItem>>>

    @POST("prescriptions/medications")
    suspend fun addMedicationToBank(
        @Body body: AddMedicationRequest
    ): Response<ApiResponse<MedicationBankItem>>
}
