package com.medical.clinic.staff.data.models

import com.google.gson.annotations.SerializedName
import java.io.Serializable

data class ChatConversation(
    @SerializedName("id") val id: Int = 0,
    @SerializedName("patient_id") val patientId: Int = 0,
    @SerializedName("doctor_id") val doctorId: Int? = null,
    @SerializedName("secretary_id") val secretaryId: Int? = null,
    @SerializedName("clinic_id") val clinicId: Int? = null,
    @SerializedName("target_type") val targetType: String = "doctor",
    @SerializedName("last_message") val lastMessage: String? = null,
    @SerializedName("last_message_at") val lastMessageAt: String? = null,
    @SerializedName("unread_count") val unreadCount: Int = 0,
    @SerializedName("doctor_name") val doctorName: String? = null,
    @SerializedName("doctor_specialty") val doctorSpecialty: String? = null,
    @SerializedName("doctor_avatar") val doctorAvatar: String? = null,
    @SerializedName("secretary_name") val secretaryName: String? = null,
    @SerializedName("clinic_name") val clinicName: String? = null,
    @SerializedName("patient_name") val patientName: String? = null
) : Serializable

data class ChatMessage(
    @SerializedName("id") val id: Int = 0,
    @SerializedName("conversation_id") val conversationId: Int = 0,
    @SerializedName("sender_type") val senderType: String = "",
    @SerializedName("sender_id") val senderId: Int = 0,
    @SerializedName("message_text") val messageText: String = "",
    @SerializedName("is_read") val isRead: Int = 0,
    @SerializedName("created_at") val createdAt: String = ""
) : Serializable

data class SendMessageRequest(
    @SerializedName("message_text") val messageText: String
)

data class ValidateMessageRequest(
    @SerializedName("message") val message: String
)

data class ChatValidateResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("isValid") val isValid: Boolean = false,
    @SerializedName("reason") val reason: String? = null,
    @SerializedName("detectedWords") val detectedWords: List<String> = emptyList(),
    @SerializedName("alertMessage") val alertMessage: String? = null
)
