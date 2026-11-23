package com.medical.clinic.data.models

import com.google.gson.annotations.SerializedName

data class FamilyMember(
    @SerializedName("id") val id: Int = 0,
    @SerializedName("user_id") val userId: Int? = null,
    @SerializedName("name") val name: String,
    @SerializedName("relationship") val relationship: String,
    @SerializedName("gender") val gender: String = "male",
    @SerializedName("age") val age: Int? = null,
    @SerializedName("birth_date") val birthDate: String? = null,
    @SerializedName("blood_group") val bloodGroup: String? = null,
    @SerializedName("chronic_diseases") val chronicDiseases: String? = null,
    @SerializedName("allergies") val allergies: String? = null,
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
)
