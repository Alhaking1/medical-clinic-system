package com.medical.clinic.staff.data.models

import com.google.gson.annotations.SerializedName

data class PrescriptionItemPayload(
    @SerializedName("medication_name") val medicationName: String,
    @SerializedName("dosage") val dosage: String = "جرعة اعتيادية",
    @SerializedName("frequency") val frequency: String = "مرتين يومياً",
    @SerializedName("duration") val duration: String = "5 أيام",
    @SerializedName("instructions") val instructions: String? = null
)

data class CreatePrescriptionRequest(
    @SerializedName("appointment_id") val appointmentId: Int,
    @SerializedName("patient_id") val patientId: Int? = null,
    @SerializedName("diagnosis") val diagnosis: String,
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("items") val items: List<PrescriptionItemPayload>
)

data class PrescriptionResponseData(
    @SerializedName("id") val id: Int,
    @SerializedName("appointment_id") val appointmentId: Int,
    @SerializedName("patient_id") val patientId: Int,
    @SerializedName("diagnosis") val diagnosis: String,
    @SerializedName("notes") val notes: String?,
    @SerializedName("pdf_url") val pdfUrl: String?,
    @SerializedName("items") val items: List<PrescriptionItemPayload>? = null
)

data class MedicationBankItem(
    @SerializedName("id") val id: Int,
    @SerializedName("doctor_id") val doctorId: Int?,
    @SerializedName("name") val name: String,
    @SerializedName("active_ingredient") val activeIngredient: String?,
    @SerializedName("default_dosage") val defaultDosage: String?
)

data class AddMedicationRequest(
    @SerializedName("name") val name: String,
    @SerializedName("active_ingredient") val activeIngredient: String? = null,
    @SerializedName("default_dosage") val defaultDosage: String? = null
)
