package com.medical.clinic.data.models

import com.google.gson.annotations.SerializedName
import java.io.Serializable

data class AssistantResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("type") val type: String? = "GENERAL_GUIDE", // EMERGENCY, APP_GUIDE, CLINICAL_TRIAGE, GENERAL_GUIDE
    @SerializedName("badge") val badge: String? = null,
    @SerializedName("specialty") val specialty: String? = null,
    @SerializedName("reply") val reply: String = "",
    @SerializedName("doctors") val doctors: List<AssistantDoctorCard>? = null,
    @SerializedName("actions") val actions: List<AssistantAction>? = null
)

data class AssistantDoctorCard(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String,
    @SerializedName("specialty") val specialty: String,
    @SerializedName("clinic") val clinic: String,
    @SerializedName("fee") val fee: Double?,
    @SerializedName("avatar") val avatar: String? = null
) : Serializable

data class AssistantAction(
    @SerializedName("type") val type: String, // NAVIGATE, PROMPT, CALL
    @SerializedName("target") val target: String? = null, // DOCTORS, FAMILY, WALLET, APPOINTMENTS, RECORDS, 191
    @SerializedName("label") val label: String,
    @SerializedName("text") val text: String? = null
)

data class AssistantChatMessage(
    val id: String = java.util.UUID.randomUUID().toString(),
    val sender: String, // "user" or "assistant"
    val text: String,
    val type: String? = null,
    val badge: String? = null,
    val doctors: List<AssistantDoctorCard>? = null,
    val actions: List<AssistantAction>? = null,
    val timestamp: Long = System.currentTimeMillis()
)
