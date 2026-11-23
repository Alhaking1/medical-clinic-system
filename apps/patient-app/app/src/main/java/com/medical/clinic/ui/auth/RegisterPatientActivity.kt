package com.medical.clinic.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.ImageButton
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.medical.clinic.R
import com.medical.clinic.data.repository.AuthRepository
import com.medical.clinic.ui.main.MainActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class RegisterPatientActivity : AppCompatActivity() {

    @Inject lateinit var authRepository: AuthRepository

    private lateinit var btnBack: ImageButton
    private lateinit var tilFullName: TextInputLayout
    private lateinit var etFullName: TextInputEditText
    private lateinit var tilPhone: TextInputLayout
    private lateinit var etPhone: TextInputEditText
    private lateinit var tilPassword: TextInputLayout
    private lateinit var etPassword: TextInputEditText
    private lateinit var tilAge: TextInputLayout
    private lateinit var etAge: TextInputEditText
    private lateinit var actvGovernorate: AutoCompleteTextView
    private lateinit var actvBlood: AutoCompleteTextView
    private lateinit var actvGender: AutoCompleteTextView
    private lateinit var btnRegister: MaterialButton
    private lateinit var progressBar: ProgressBar
    private lateinit var tvLoginRedirect: TextView

    private val yemeniGovernorates = arrayOf("صنعاء", "عدن", "تعز", "إب", "الحديدة", "حضرموت", "ذمار", "مأرب", "عمران", "حجة", "لحج", "أبين", "صعدة", "شبوة", "المهرة")
    private val bloodGroups = arrayOf("O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-")
    private val genders = arrayOf("ذكر", "أنثى")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_register_patient)

        initViews()
        setupDropdowns()
        setupListeners()
    }

    private fun initViews() {
        btnBack = findViewById(R.id.btnBack)
        tilFullName = findViewById(R.id.tilFullName)
        etFullName = findViewById(R.id.etFullName)
        tilPhone = findViewById(R.id.tilPhone)
        etPhone = findViewById(R.id.etPhone)
        tilPassword = findViewById(R.id.tilPassword)
        etPassword = findViewById(R.id.etPassword)
        tilAge = findViewById(R.id.tilAge)
        etAge = findViewById(R.id.etAge)
        actvGovernorate = findViewById(R.id.actvGovernorate)
        actvBlood = findViewById(R.id.actvBlood)
        actvGender = findViewById(R.id.actvGender)
        btnRegister = findViewById(R.id.btnRegister)
        progressBar = findViewById(R.id.progressBar)
        tvLoginRedirect = findViewById(R.id.tvLoginRedirect)
    }

    private fun setupDropdowns() {
        actvGovernorate.setAdapter(ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, yemeniGovernorates))
        actvBlood.setAdapter(ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, bloodGroups))
        actvGender.setAdapter(ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, genders))
    }

    private fun setupListeners() {
        btnBack.setOnClickListener { finish() }

        tvLoginRedirect.setOnClickListener {
            finish()
        }

        btnRegister.setOnClickListener {
            performRegistration()
        }
    }

    private fun performRegistration() {
        tilFullName.error = null
        tilPhone.error = null
        tilPassword.error = null
        tilAge.error = null

        val fullName = etFullName.text.toString().trim()
        val phone = etPhone.text.toString().trim()
        val password = etPassword.text.toString()
        val ageStr = etAge.text.toString().trim()
        val governorate = actvGovernorate.text.toString().trim()
        val bloodGroup = actvBlood.text.toString().trim().ifBlank { "O+" }
        val gender = if (actvGender.text.toString().trim() == "أنثى") "female" else "male"

        // 1. التحقق من الاسم: ثلاثي أو رباعي على الأقل (3 كلمات على الأقل)
        val nameWords = fullName.split("\\s+".toRegex()).filter { it.isNotBlank() }
        if (nameWords.size < 3) {
            tilFullName.error = "يجب إدخال الاسم كاملاً (ثلاثي أو رباعي على الأقل)"
            etFullName.requestFocus()
            return
        }

        if (fullName.any { it.isDigit() || "!@#$%^&*()_+={}[]|\\:;\"'<>,.?/`~".contains(it) }) {
            tilFullName.error = "الاسم يجب أن يحتوي على أحرف فقط دون أرقام أو رموز"
            etFullName.requestFocus()
            return
        }

        // 2. التحقق من رقم الهاتف اليمني (9 أرقام، يبدأ بـ 77، 78، 71، 73، 70)
        val yemeniPhoneRegex = Regex("^(70|71|73|77|78)\\d{7}$")
        if (!yemeniPhoneRegex.matches(phone)) {
            tilPhone.error = "رقم الهاتف غير صالح. يجب أن يبدأ بـ 77 أو 78 أو 71 أو 73 أو 70 ويتكون من 9 أرقام"
            etPhone.requestFocus()
            return
        }

        // 3. التحقق من كلمة المرور (6 خانات على الأقل)
        if (password.length < 6) {
            tilPassword.error = "كلمة المرور يجب أن تتكون من 6 خانات على الأقل"
            etPassword.requestFocus()
            return
        }

        // 4. التحقق من العمر
        val age = ageStr.toIntOrNull()
        if (age == null || age !in 1..120) {
            tilAge.error = "يرجى إدخال عمر صحيح بين 1 و 120"
            etAge.requestFocus()
            return
        }

        // بدء الإرسال والتسجيل الفوري المباشر
        setLoading(true)

        lifecycleScope.launch {
            val result = authRepository.registerPatient(
                fullName = fullName,
                phone = phone,
                password = password,
                governorate = governorate,
                age = age,
                gender = gender,
                bloodGroup = bloodGroup
            )

            setLoading(false)

            result.onSuccess { user ->
                Toast.makeText(
                    this@RegisterPatientActivity,
                    "🎉 أهلاً بك يا ${user.fullName}! تم إنشاء الحساب بنجاح ودخولك فوراً",
                    Toast.LENGTH_LONG
                ).show()

                val intent = Intent(this@RegisterPatientActivity, MainActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()
            }.onFailure { error ->
                Toast.makeText(
                    this@RegisterPatientActivity,
                    "⚠️ ${error.message ?: "فشل إنشاء الحساب"}",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun setLoading(isLoading: Boolean) {
        btnRegister.isEnabled = !isLoading
        btnRegister.visibility = if (isLoading) View.INVISIBLE else View.VISIBLE
        progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
    }
}
