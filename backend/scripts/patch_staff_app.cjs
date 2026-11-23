const fs = require('fs');
const path = require('path');

// 1. DoctorModels.kt
const mPath = 'C:/Users/lenovo/AndroidProjects/MedicalClinicStaffApp/app/src/main/java/com/medical/clinic/staff/data/models/DoctorModels.kt';
let mCode = fs.readFileSync(mPath, 'utf8').replace(/\r\n/g, '\n');
if (!mCode.includes('patientRelationship')) {
  mCode = mCode.replace(
    '@SerializedName("transaction_id") val transactionId: String? = null',
    `@SerializedName("transaction_id") val transactionId: String? = null,
    @SerializedName("patient_relationship") val patientRelationship: String? = null,
    @SerializedName("patient_age") val patientAge: Int? = null,
    @SerializedName("patient_gender") val patientGender: String? = null,
    @SerializedName("family_member_id") val familyMemberId: Int? = null`
  );
  fs.writeFileSync(mPath, mCode.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✅ Staff DoctorModels.kt updated');
}

// 2. QueueAdapter.kt
const qPath = 'C:/Users/lenovo/AndroidProjects/MedicalClinicStaffApp/app/src/main/java/com/medical/clinic/staff/ui/doctor/QueueAdapter.kt';
let qCode = fs.readFileSync(qPath, 'utf8').replace(/\r\n/g, '\n');
if (!qCode.includes('item.patientRelationship')) {
  qCode = qCode.replace(
    'binding.tvPatientName.text = item.patientName',
    `val relBadge = if (!item.patientRelationship.isNullOrBlank() && item.patientRelationship != "صاحب الحساب") {
                val age = if (item.patientAge != null) " - \${item.patientAge} سنة" else ""
                " [👨‍👩‍👧‍👦 \${item.patientRelationship}\$age]"
            } else ""
            binding.tvPatientName.text = "\${item.patientName}\$relBadge"`
  );
  fs.writeFileSync(qPath, qCode.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✅ Staff QueueAdapter.kt updated');
}
