const fs = require('fs');
const path = require('path');

// 1. Fix PatientProfileFragment.kt
const pPath = 'C:/Users/lenovo/AndroidProjects/MedicalClinicApp/app/src/main/java/com/medical/clinic/ui/patient/PatientProfileFragment.kt';
let pCode = fs.readFileSync(pPath, 'utf8');
pCode = pCode.replace(
  'view.findViewById<View>(R.id.rowFamilyMembers)?.setOnClickListener { openFamilyManager() }',
  'view?.findViewById<View>(R.id.rowFamilyMembers)?.setOnClickListener { openFamilyManager() }'
);
fs.writeFileSync(pPath, pCode, 'utf8');
console.log('✅ Fixed PatientProfileFragment.kt view?. null safety');

// 2. Add promptFamilyMemberSelection & showAddNewFamilyMemberDialog to DoctorDetailsActivity.kt
const dPath = 'C:/Users/lenovo/AndroidProjects/MedicalClinicApp/app/src/main/java/com/medical/clinic/ui/patient/DoctorDetailsActivity.kt';
let dCode = fs.readFileSync(dPath, 'utf8').replace(/\r\n/g, '\n');

const familyMethods = `
    private fun promptFamilyMemberSelection(paymentMethod: String, txId: String) {
        val user = sessionManager.getUser()
        val userName = user?.fullName ?: "نفسي"

        val progress = android.app.ProgressDialog(this).apply {
            setMessage("جاري تحميل بيانات العائلة...")
            setCancelable(false)
            show()
        }

        lifecycleScope.launch {
            var familyList: List<com.medical.clinic.data.models.FamilyMember> = emptyList()
            try {
                val res = apiClient.apiService.getFamilyMembers()
                if (res.success && !res.data.isNullOrEmpty()) {
                    familyList = res.data
                }
            } catch (_: Exception) {}

            progress.dismiss()

            val options = mutableListOf<String>()
            options.add("👤 حجز لنفسي ($userName)")
            familyList.forEach { m ->
                val ageStr = if (m.age != null) " (\${m.age} سنة)" else ""
                options.add("👨‍👩‍👧‍👦 \${m.name} - \${m.relationship}\$ageStr")
            }
            options.add("➕ إضافة فرد عائلة جديد...")

            AlertDialog.Builder(this@DoctorDetailsActivity)
                .setTitle("لمن هذا الموعد الطبي؟ 📋")
                .setItems(options.toTypedArray()) { _, which ->
                    when (which) {
                        0 -> {
                            // حجز لصاحب الحساب
                            processBooking(paymentMethod, txId, null)
                        }
                        options.size - 1 -> {
                            // إضافة فرد جديد
                            showAddNewFamilyMemberDialog { newMemberId ->
                                processBooking(paymentMethod, txId, newMemberId)
                            }
                        }
                        else -> {
                            // اختيار أحد الأفراد
                            val selectedMember = familyList[which - 1]
                            processBooking(paymentMethod, txId, selectedMember.id)
                        }
                    }
                }
                .setNegativeButton("إلغاء", null)
                .show()
        }
    }

    private fun showAddNewFamilyMemberDialog(onMemberAdded: (Int) -> Unit) {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_add_family_member, null)
        val etName = dialogView.findViewById<android.widget.EditText>(R.id.etFamilyName)
        val spRelation = dialogView.findViewById<android.widget.Spinner>(R.id.spFamilyRelation)
        val etAge = dialogView.findViewById<android.widget.EditText>(R.id.etFamilyAge)
        val rgGender = dialogView.findViewById<RadioGroup>(R.id.rgFamilyGender)

        val relations = arrayOf("ابن", "ابنة", "زوجة", "زوج", "أب", "أم", "أخ", "أخت", "آخر")
        val adapter = android.widget.ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, relations)
        spRelation.adapter = adapter

        AlertDialog.Builder(this)
            .setTitle("➕ إضافة فرد جديد للعائلة")
            .setView(dialogView)
            .setPositiveButton("إضافة ومتابعة الحجز ✅") { _, _ ->
                val name = etName.text.toString().trim()
                val relation = spRelation.selectedItem?.toString() ?: "ابن"
                val ageText = etAge.text.toString().trim()
                val age = ageText.toIntOrNull()
                val gender = if (rgGender.checkedRadioButtonId == R.id.rbGenderFemale) "female" else "male"

                if (name.isBlank()) {
                    Toast.makeText(this, "⚠️ يرجى إدخال اسم المريض", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                lifecycleScope.launch {
                    val progress = android.app.ProgressDialog(this@DoctorDetailsActivity).apply {
                        setMessage("جاري حفظ بيانات فرد العائلة...")
                        setCancelable(false)
                        show()
                    }
                    try {
                        val payload = mutableMapOf<String, Any>(
                            "name" to name,
                            "relationship" to relation,
                            "gender" to gender
                        )
                        if (age != null) payload["age"] = age

                        val res = apiClient.apiService.addFamilyMember(payload)
                        progress.dismiss()
                        if (res.success && res.data != null) {
                            Toast.makeText(this@DoctorDetailsActivity, "تمت إضافة \${res.data.name} بنجاح 👨‍👩‍👧‍👦", Toast.LENGTH_SHORT).show()
                            onMemberAdded(res.data.id)
                        } else {
                            Toast.makeText(this@DoctorDetailsActivity, res.message ?: "تعذر إضافة فرد العائلة", Toast.LENGTH_LONG).show()
                        }
                    } catch (e: Exception) {
                        progress.dismiss()
                        Toast.makeText(this@DoctorDetailsActivity, "خطأ في الاتصال: \${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
            .setNegativeButton("إلغاء", null)
            .show()
    }
}
`;

// Insert before the last closing brace
const lastClosingBrace = dCode.lastIndexOf('}');
if (lastClosingBrace !== -1) {
  dCode = dCode.slice(0, lastClosingBrace) + familyMethods;
  fs.writeFileSync(dPath, dCode.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✅ Added promptFamilyMemberSelection & showAddNewFamilyMemberDialog to DoctorDetailsActivity.kt');
}
