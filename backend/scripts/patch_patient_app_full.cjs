const fs = require('fs');
const path = require('path');

console.log('🚀 Patching Patient App for Family Profiles...');

// 1. Patch DoctorDetailsActivity.kt
const docDetailsPath = 'C:/Users/lenovo/AndroidProjects/MedicalClinicApp/app/src/main/java/com/medical/clinic/ui/patient/DoctorDetailsActivity.kt';
let docDetailsCode = fs.readFileSync(docDetailsPath, 'utf8').replace(/\r\n/g, '\n');

// 1a. Update invocation: call promptFamilyMemberSelection instead of processBooking
const oldConfirmCall = 'processBooking(paymentMethod, txId)';
const newConfirmCall = 'promptFamilyMemberSelection(paymentMethod, txId)';
if (docDetailsCode.includes(oldConfirmCall)) {
  docDetailsCode = docDetailsCode.replace(oldConfirmCall, newConfirmCall);
  console.log('✅ Updated confirmation button to promptFamilyMemberSelection');
}

// 1b. Update processBooking signature and payload
const oldProcessBookingSig = 'private fun processBooking(paymentMethod: String, txId: String) {';
const newProcessBookingSig = 'private fun processBooking(paymentMethod: String, txId: String, familyMemberId: Int? = null) {';

if (docDetailsCode.includes(oldProcessBookingSig)) {
  docDetailsCode = docDetailsCode.replace(oldProcessBookingSig, newProcessBookingSig);
  console.log('✅ Updated processBooking signature to accept familyMemberId');
}

const oldPayloadInit = `                val bookingPayload = mutableMapOf<String, Any>(
                    "doctor_id" to docId,
                    "period_id" to selectedPeriodId,
                    "payment_method" to paymentMethod,
                    "reason" to (if (txId.isNotBlank()) "سند التحويل: $txId" else "كشف عام")
                )`;

const newPayloadInit = `                val bookingPayload = mutableMapOf<String, Any>(
                    "doctor_id" to docId,
                    "period_id" to selectedPeriodId,
                    "payment_method" to paymentMethod,
                    "reason" to (if (txId.isNotBlank()) "سند التحويل: $txId" else "كشف عام")
                )
                if (familyMemberId != null && familyMemberId > 0) {
                    bookingPayload["family_member_id"] = familyMemberId
                }`;

if (docDetailsCode.includes(oldPayloadInit)) {
  docDetailsCode = docDetailsCode.replace(oldPayloadInit, newPayloadInit);
  console.log('✅ Added family_member_id to bookingPayload');
}

// 1c. Add promptFamilyMemberSelection & showAddNewFamilyMemberDialog helper methods before the last closing brace
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
                val ageStr = if (m.age != null) " (\ سنة)" else ""
                options.add("👨‍👩‍👧‍👦 \ - \$ageStr")
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
                            Toast.makeText(this@DoctorDetailsActivity, "تمت إضافة \ بنجاح 👨‍👩‍👧‍👦", Toast.LENGTH_SHORT).show()
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

if (!docDetailsCode.includes('promptFamilyMemberSelection')) {
  const lastIndex = docDetailsCode.lastIndexOf('}');
  docDetailsCode = docDetailsCode.slice(0, lastIndex) + familyMethods;
  console.log('✅ Added family methods to DoctorDetailsActivity.kt');
}

fs.writeFileSync(docDetailsPath, docDetailsCode.replace(/\n/g, '\r\n'), 'utf8');

// 2. Patch fragment_patient_profile.xml
const profileXmlPath = 'C:/Users/lenovo/AndroidProjects/MedicalClinicApp/app/src/main/res/layout/fragment_patient_profile.xml';
let profileXml = fs.readFileSync(profileXmlPath, 'utf8').replace(/\r\n/g, '\n');

const familyCardXml = `
            <!-- بطاقة أفراد العائلة والتابعين -->
            <androidx.cardview.widget.CardView
                android:id="@+id/cardFamilyMembers"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:layout_marginBottom="12dp"
                app:cardCornerRadius="18dp"
                app:cardElevation="2dp"
                android:clickable="true"
                android:focusable="true"
                android:foreground="?attr/selectableItemBackground"
                app:cardBackgroundColor="@color/surface_dark_elevated">

                <LinearLayout
                    android:id="@+id/rowFamilyMembers"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:orientation="horizontal"
                    android:gravity="center_vertical"
                    android:padding="16dp">

                    <TextView
                        android:layout_width="42dp"
                        android:layout_height="42dp"
                        android:gravity="center"
                        android:background="@drawable/bg_circle_primary"
                        android:backgroundTint="#EFF6FF"
                        android:text="👨‍👩‍👧‍👦"
                        android:textSize="20sp" />

                    <LinearLayout
                        android:layout_width="0dp"
                        android:layout_height="wrap_content"
                        android:layout_weight="1"
                        android:orientation="vertical"
                        android:layout_marginStart="14dp">

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="أفراد العائلة والتابعين"
                            android:textColor="@color/on_surface_dark"
                            android:textSize="15sp"
                            android:textStyle="bold" />

                        <TextView
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="إدارة ملفات الأبناء والوالدين والزوجة لحجز المواعيد لهم"
                            android:textColor="@color/brand_primary_light"
                            android:textSize="11sp"
                            android:layout_marginTop="2dp" />
                    </LinearLayout>

                    <TextView
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="←"
                        android:textColor="@color/brand_primary_light"
                        android:textSize="18sp"
                        android:textStyle="bold" />
                </LinearLayout>
            </androidx.cardview.widget.CardView>
`;

if (!profileXml.includes('cardFamilyMembers')) {
  profileXml = profileXml.replace('<!-- 2. بطاقة الدعم الفني وخدمة العملاء -->', familyCardXml + '\n            <!-- 2. بطاقة الدعم الفني وخدمة العملاء -->');
  fs.writeFileSync(profileXmlPath, profileXml.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✅ fragment_patient_profile.xml updated with Family Card');
}

// 3. Patch PatientProfileFragment.kt
const profileFragPath = 'C:/Users/lenovo/AndroidProjects/MedicalClinicApp/app/src/main/java/com/medical/clinic/ui/patient/PatientProfileFragment.kt';
let profileFragCode = fs.readFileSync(profileFragPath, 'utf8').replace(/\r\n/g, '\n');

if (!profileFragCode.includes('rowFamilyMembers')) {
  // Bind rowFamilyMembers and click listener
  profileFragCode = profileFragCode.replace(
    'rowEditProfile.setOnClickListener { openProfileEditor() }',
    `rowEditProfile.setOnClickListener { openProfileEditor() }
        view.findViewById<View>(R.id.rowFamilyMembers)?.setOnClickListener { openFamilyManager() }`
  );

  const familyManagerMethod = `
    private fun openFamilyManager() {
        val context = requireContext()
        val progress = android.app.ProgressDialog(context).apply {
            setMessage("جاري تحميل قائمة العائلة...")
            setCancelable(false)
            show()
        }

        lifecycleScope.launch {
            var members: List<com.medical.clinic.data.models.FamilyMember> = emptyList()
            try {
                val res = apiClient.apiService.getFamilyMembers()
                if (res.success && res.data != null) {
                    members = res.data
                }
            } catch (_: Exception) {}
            progress.dismiss()

            showFamilyListDialog(members)
        }
    }

    private fun showFamilyListDialog(members: List<com.medical.clinic.data.models.FamilyMember>) {
        val context = requireContext()
        val items = mutableListOf<String>()
        members.forEach { m ->
            val ageStr = if (m.age != null) " (\ سنة)" else ""
            items.add("👤 \ [\]$ageStr")
        }
        items.add("➕ إضافة فرد جديد للعائلة...")

        androidx.appcompat.app.AlertDialog.Builder(context)
            .setTitle("👨‍👩‍👧‍👦 أفراد العائلة المسجلين")
            .setItems(items.toTypedArray()) { _, which ->
                if (which == items.size - 1) {
                    showAddFamilyMemberDialogInProfile()
                } else {
                    val member = members[which]
                    showMemberOptionsDialog(member)
                }
            }
            .setNegativeButton("إغلاق", null)
            .show()
    }

    private fun showMemberOptionsDialog(member: com.medical.clinic.data.models.FamilyMember) {
        val context = requireContext()
        val options = arrayOf("🗑️ حذف من قائمة العائلة")
        androidx.appcompat.app.AlertDialog.Builder(context)
            .setTitle(member.name + " (" + member.relationship + ")")
            .setItems(options) { _, which ->
                if (which == 0) {
                    androidx.appcompat.app.AlertDialog.Builder(context)
                        .setTitle("تأكيد الحذف ⚠️")
                        .setMessage("هل أنت متأكد من حذف " + member.name + " من قائمة العائلة؟")
                        .setPositiveButton("نعم، حذف") { _, _ ->
                            lifecycleScope.launch {
                                try {
                                    apiClient.apiService.deleteFamilyMember(member.id)
                                    android.widget.Toast.makeText(context, "تم الحذف بنجاح", android.widget.Toast.LENGTH_SHORT).show()
                                    openFamilyManager()
                                } catch (e: Exception) {
                                    android.widget.Toast.makeText(context, "فشل الحذف: " + e.message, android.widget.Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                        .setNegativeButton("إلغاء", null)
                        .show()
                }
            }
            .setNegativeButton("رجوع", null)
            .show()
    }

    private fun showAddFamilyMemberDialogInProfile() {
        val context = requireContext()
        val dialogView = LayoutInflater.from(context).inflate(R.layout.dialog_add_family_member, null)
        val etName = dialogView.findViewById<android.widget.EditText>(R.id.etFamilyName)
        val spRelation = dialogView.findViewById<android.widget.Spinner>(R.id.spFamilyRelation)
        val etAge = dialogView.findViewById<android.widget.EditText>(R.id.etFamilyAge)
        val rgGender = dialogView.findViewById<RadioGroup>(R.id.rgFamilyGender)

        val relations = arrayOf("ابن", "ابنة", "زوجة", "زوج", "أب", "أم", "أخ", "أخت", "آخر")
        val adapter = android.widget.ArrayAdapter(context, android.R.layout.simple_spinner_dropdown_item, relations)
        spRelation.adapter = adapter

        androidx.appcompat.app.AlertDialog.Builder(context)
            .setTitle("➕ إضافة فرد جديد للعائلة")
            .setView(dialogView)
            .setPositiveButton("حفظ ✅") { _, _ ->
                val name = etName.text.toString().trim()
                val relation = spRelation.selectedItem?.toString() ?: "ابن"
                val age = etAge.text.toString().trim().toIntOrNull()
                val gender = if (rgGender.checkedRadioButtonId == R.id.rbGenderFemale) "female" else "male"

                if (name.isBlank()) {
                    android.widget.Toast.makeText(context, "يرجى كتابة الاسم", android.widget.Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                lifecycleScope.launch {
                    try {
                        val payload = mutableMapOf<String, Any>(
                            "name" to name,
                            "relationship" to relation,
                            "gender" to gender
                        )
                        if (age != null) payload["age"] = age

                        val res = apiClient.apiService.addFamilyMember(payload)
                        if (res.success) {
                            android.widget.Toast.makeText(context, "تمت الإضافة بنجاح 👨‍👩‍👧‍👦", android.widget.Toast.LENGTH_SHORT).show()
                            openFamilyManager()
                        } else {
                            android.widget.Toast.makeText(context, res.message ?: "تعذر الحفظ", android.widget.Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        android.widget.Toast.makeText(context, "خطأ: " + e.message, android.widget.Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("إلغاء", null)
            .show()
    }
}
`;
  const lastIndex = profileFragCode.lastIndexOf('}');
  profileFragCode = profileFragCode.slice(0, lastIndex) + familyManagerMethod;
  fs.writeFileSync(profileFragPath, profileFragCode.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✅ PatientProfileFragment.kt patched with Family Manager');
}

// 4. Patch AppointmentsAdapter.kt
const adapterPath = 'C:/Users/lenovo/AndroidProjects/MedicalClinicApp/app/src/main/java/com/medical/clinic/ui/patient/AppointmentsAdapter.kt';
let adapterCode = fs.readFileSync(adapterPath, 'utf8').replace(/\r\n/g, '\n');

if (!adapterCode.includes('item.patientRelationship')) {
  // In bind method:
  adapterCode = adapterCode.replace(
    'tvHospital.text = item.clinicName ?: "العيادة الطبية"',
    `tvHospital.text = if (!item.patientRelationship.isNullOrBlank() && item.patientRelationship != "صاحب الحساب") {
                val rel = item.patientRelationship
                val pName = item.patientName ?: "المريض"
                val pAge = if (item.patientAge != null) " - \${item.patientAge} سنة" else ""
                "\${item.clinicName ?: "العيادة"} • 👨‍👩‍👧‍👦 \${pName} (\${rel}\${pAge})"
            } else {
                item.clinicName ?: "العيادة الطبية"
            }`
  );

  // In showTicketDialog:
  adapterCode = adapterCode.replace(
    'tvClinic.text = item.clinicName ?: "العيادة"',
    `tvClinic.text = if (!item.patientRelationship.isNullOrBlank() && item.patientRelationship != "صاحب الحساب") {
                "\${item.clinicName ?: "العيادة"} • المريض: \${item.patientName ?: "المريض"} (\${item.patientRelationship})"
            } else {
                item.clinicName ?: "العيادة"
            }`
  );
  fs.writeFileSync(adapterPath, adapterCode.replace(/\n/g, '\r\n'), 'utf8');
  console.log('✅ AppointmentsAdapter.kt patched with dependent relationship badges');
}

console.log('🎉 Patient App successfully patched!');
