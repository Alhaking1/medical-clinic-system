package com.medical.clinic.ui.patient

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.ImageButton
import android.widget.ProgressBar
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.medical.clinic.R
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.data.repository.AuthRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class CompletePatientProfileActivity : AppCompatActivity() {

    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var authRepository: AuthRepository

    private lateinit var btnBack: ImageButton
    private lateinit var tilFullName: TextInputLayout
    private lateinit var etFullName: TextInputEditText
    private lateinit var tilPhone: TextInputLayout
    private lateinit var etPhone: TextInputEditText
    private lateinit var tilAge: TextInputLayout
    private lateinit var etAge: TextInputEditText
    private lateinit var actvGovernorate: AutoCompleteTextView
    private lateinit var actvBlood: AutoCompleteTextView
    private lateinit var btnConnectGoogle: MaterialButton
    private lateinit var tilEmail: TextInputLayout
    private lateinit var etEmail: TextInputEditText
    private lateinit var tilPassword: TextInputLayout
    private lateinit var etPassword: TextInputEditText
    private lateinit var tilConfirmPassword: TextInputLayout
    private lateinit var etConfirmPassword: TextInputEditText
    private lateinit var btnSaveProfile: MaterialButton
    private lateinit var progressBar: ProgressBar

    private val yemeniGovernorates = arrayOf("صنعاء", "عدن", "تعز", "إب", "الحديدة", "حضرموت", "ذمار", "مأرب", "عمران", "حجة", "لحج", "أبين", "صعدة", "شبوة", "المهرة")
    private val bloodGroups = arrayOf("O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_complete_patient_profile)

        initViews()
        setupDropdowns()
        populateExistingData()
        setupListeners()
    }

    private fun initViews() {
        btnBack = findViewById(R.id.btnBack)
        tilFullName = findViewById(R.id.tilFullName)
        etFullName = findViewById(R.id.etFullName)
        tilPhone = findViewById(R.id.tilPhone)
        etPhone = findViewById(R.id.etPhone)
        tilAge = findViewById(R.id.tilAge)
        etAge = findViewById(R.id.etAge)
        actvGovernorate = findViewById(R.id.actvGovernorate)
        actvBlood = findViewById(R.id.actvBlood)
        btnConnectGoogle = findViewById(R.id.btnConnectGoogle)
        tilEmail = findViewById(R.id.tilEmail)
        etEmail = findViewById(R.id.etEmail)
        tilPassword = findViewById(R.id.tilPassword)
        etPassword = findViewById(R.id.etPassword)
        tilConfirmPassword = findViewById(R.id.tilConfirmPassword)
        etConfirmPassword = findViewById(R.id.etConfirmPassword)
        btnSaveProfile = findViewById(R.id.btnSaveProfile)
        progressBar = findViewById(R.id.progressBar)
    }

    private fun setupDropdowns() {
        actvGovernorate.setAdapter(ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, yemeniGovernorates))
        actvBlood.setAdapter(ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, bloodGroups))
    }

    private fun populateExistingData() {
        val user = sessionManager.getUser() ?: return
        if (user.fullName.isNotBlank()) etFullName.setText(user.fullName)
        if (!user.phone.isNullOrBlank()) etPhone.setText(user.phone)
        if (user.age != null && user.age > 0) etAge.setText(user.age.toString())
        if (!user.governorate.isNullOrBlank()) actvGovernorate.setText(user.governorate, false)
        if (!user.bloodGroup.isNullOrBlank()) actvBlood.setText(user.bloodGroup, false)
        if (!user.email.isNullOrBlank()) etEmail.setText(user.email)
    }

    private fun setupListeners() {
        btnBack.setOnClickListener { finish() }

        // زر ربط حساب Google
        btnConnectGoogle.setOnClickListener {
            val user = sessionManager.getUser()
            if (!user?.email.isNullOrBlank()) {
                etEmail.setText(user?.email)
                Toast.makeText(this, "✅ تم ربط الحساب من Google: ${user?.email}", Toast.LENGTH_SHORT).show()
            } else {
                try {
                    val googleIntent = android.accounts.AccountManager.newChooseAccountIntent(
                        null, null, arrayOf("com.google"), null, null, null, null
                    )
                    startActivityForResult(googleIntent, 1001)
                } catch (e: Exception) {
                    Toast.makeText(this, "يرجى كتابة البريد الإلكتروني لحساب Google في الخانة المخصصة أدناه", Toast.LENGTH_SHORT).show()
                    etEmail.requestFocus()
                }
            }
        }

        btnSaveProfile.setOnClickListener {
            saveProfile()
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 1001 && resultCode == RESULT_OK && data != null) {
            val accountName = data.getStringExtra(android.accounts.AccountManager.KEY_ACCOUNT_NAME)
            if (!accountName.isNullOrBlank()) {
                etEmail.setText(accountName)
                Toast.makeText(this, "✅ تم ربط حساب Google بنجاح: $accountName", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun saveProfile() {
        tilFullName.error = null
        tilPhone.error = null
        tilAge.error = null
        tilPassword.error = null
        tilConfirmPassword.error = null

        val fullName = etFullName.text.toString().trim()
        val phone = etPhone.text.toString().trim()
        val ageStr = etAge.text.toString().trim()
        val governorate = actvGovernorate.text.toString().trim()
        val bloodGroup = actvBlood.text.toString().trim().ifBlank { "O+" }
        val email = etEmail.text.toString().trim().ifBlank { null }
        val password = etPassword.text.toString().trim()
        val confirmPassword = etConfirmPassword.text.toString().trim()

        // 1. التحقق من الاسم: ثلاثي على الأقل
        val nameWords = fullName.split("\\s+".toRegex()).filter { it.isNotBlank() }
        if (nameWords.size < 3) {
            tilFullName.error = "يجب أن يكون الاسم ثلاثي على الأقل"
            etFullName.requestFocus()
            return
        }

        // 2. التحقق من الهاتف
        val yemeniPhoneRegex = Regex("^(70|71|73|77|78)\\d{7}$")
        if (!yemeniPhoneRegex.matches(phone)) {
            tilPhone.error = "يرجى إدخال رقم هاتف يمني صحيح (9 أرقام)"
            etPhone.requestFocus()
            return
        }

        // 3. التحقق من العمر
        val age = ageStr.toIntOrNull()
        if (age == null || age !in 1..120) {
            tilAge.error = "يرجى إدخال عمر صحيح بين 1 و 120"
            etAge.requestFocus()
            return
        }

        // 4. التحقق من كلمة المرور وتأكيدها لاستعادة الحساب
        if (password.length < 6) {
            tilPassword.error = "يجب ألا تقل كلمة المرور عن 6 خانات"
            etPassword.requestFocus()
            return
        }
        if (password != confirmPassword) {
            tilConfirmPassword.error = "كلمتا المرور غير متطابقتين"
            etConfirmPassword.requestFocus()
            return
        }

        setLoading(true)

        lifecycleScope.launch {
            val result = authRepository.updatePatientProfile(
                fullName = fullName,
                phone = phone,
                governorate = governorate,
                age = age,
                bloodGroup = bloodGroup,
                email = email,
                password = password
            )

            setLoading(false)

            result.onSuccess {
                Toast.makeText(this@CompletePatientProfileActivity, "✅ تم حفظ بيانات ملفك الطبي وكلمة مرور الحساب بنجاح! ملفك الآن قيد المراجعة والاعتماد.", Toast.LENGTH_LONG).show()
                setResult(RESULT_OK)
                finish()
            }.onFailure { error ->
                Toast.makeText(this@CompletePatientProfileActivity, "⚠️ ${error.message ?: "فشل حفظ البيانات"}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun setLoading(isLoading: Boolean) {
        btnSaveProfile.isEnabled = !isLoading
        btnSaveProfile.visibility = if (isLoading) View.INVISIBLE else View.VISIBLE
        progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
    }
}
