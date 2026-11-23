package com.medical.clinic.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.medical.clinic.R
import com.medical.clinic.data.api.ApiClient
import com.medical.clinic.data.api.ClinicItem
import com.medical.clinic.data.api.GuestLoginRequest
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.ui.main.MainActivity
import com.medical.clinic.utils.Constants
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class CompleteDoctorProfileActivity : AppCompatActivity() {

    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var apiClient: ApiClient

    private lateinit var etFullName: EditText
    private lateinit var spinnerSpecialty: Spinner
    private lateinit var etPhone: EditText
    private lateinit var spClinics: Spinner
    private lateinit var tvClinicsHint: TextView
    private lateinit var spGovernorate: Spinner
    private lateinit var etAddress: EditText
    private lateinit var etBio: EditText
    private lateinit var etPassword: EditText
    private lateinit var etExperience: EditText
    private lateinit var etFee: EditText
    private lateinit var btnSave: Button
    private lateinit var progressBar: ProgressBar

    private var role: String = Constants.ROLE_DOCTOR

    private val specialties = listOf(
        "اختر التخصص...",
        "قلب", "جلدية", "أطفال", "عيون", "عظام",
        "نساء وتوليد", "باطنية", "نفسية", "أنف وأذن وحنجرة",
        "أسنان", "مسالك بولية", "جراحة عامة", "تخدير", "أشعة", "مختبر", "أخرى"
    )

    private val governorates = listOf(
        "اختر المحافظة...",
        "صنعاء", "عدن", "تعز", "الحديدة", "حضرموت",
        "إب", "حجة", "ذمار", "صعدة", "لحج",
        "أبين", "شبوة", "المهرة", "البيضاء", "الجوف",
        "مأرب", "الضالع"
    )

    private var clinicsList: List<ClinicItem> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_complete_doctor_profile)

        role = intent.getStringExtra("role") ?: Constants.ROLE_DOCTOR

        etFullName = findViewById(R.id.etFullName)
        spinnerSpecialty = findViewById(R.id.spinnerSpecialty)
        etPhone = findViewById(R.id.etPhone)
        spClinics = findViewById(R.id.spClinics)
        tvClinicsHint = findViewById(R.id.tvClinicsHint)
        spGovernorate = findViewById(R.id.spGovernorate)
        etAddress = findViewById(R.id.etAddress)
        etBio = findViewById(R.id.etBio)
        etPassword = findViewById(R.id.etPassword)
        etExperience = findViewById(R.id.etExperience)
        etFee = findViewById(R.id.etFee)
        btnSave = findViewById(R.id.btnSave)
        progressBar = findViewById(R.id.progressBar)

        // Spinner التخصصات
        spinnerSpecialty.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            specialties
        )

        // Spinner المحافظات
        spGovernorate.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            governorates
        )

        // تحميل العيادات
        loadClinics()

        animateEntry()
        btnSave.setOnClickListener { saveProfile() }
    }

    private fun animateEntry() {
        val views = listOf<View>(
            findViewById(R.id.iconContainer),
            etFullName,
            spinnerSpecialty,
            etPhone,
            spClinics,
            spGovernorate,
            btnSave
        )

        views.forEachIndexed { index, view ->
            view.alpha = 0f
            view.translationY = 20f
            view.animate()
                .alpha(1f)
                .translationY(0f)
                .setDuration(400)
                .setStartDelay((index * 80).toLong())
                .start()
        }
    }

    private fun loadClinics() {
        lifecycleScope.launch {
            try {
                val response = apiClient.apiService.getClinicsForJoin()
                clinicsList = response.data ?: emptyList()

                if (clinicsList.isEmpty()) {
                    spClinics.visibility = View.GONE
                    tvClinicsHint.visibility = View.VISIBLE
                    tvClinicsHint.text = "⚠️ لا توجد عيادات متاحة حالياً. أكمل بياناتك ثم أخبر السكرتيرة لضمك لعيادتها."
                } else {
                    spClinics.visibility = View.VISIBLE
                    tvClinicsHint.visibility = View.GONE
                    val names = clinicsList.map {
                        "${it.name}${if (it.governorate != null) " - ${it.governorate}" else ""}"
                    }
                    spClinics.adapter = ArrayAdapter(
                        this@CompleteDoctorProfileActivity,
                        android.R.layout.simple_spinner_dropdown_item,
                        names
                    )
                }
            } catch (e: Exception) {
                spClinics.visibility = View.GONE
                tvClinicsHint.visibility = View.VISIBLE
                tvClinicsHint.text = "⚠️ فشل تحميل العيادات. يمكنك المتابعة بدون عيادة."
            }
        }
    }

    private fun saveProfile() {
        val fullName = etFullName.text.toString().trim()
        val specialtyPos = spinnerSpecialty.selectedItemPosition

        if (fullName.length < 3) {
            etFullName.error = "الاسم مطلوب"
            etFullName.requestFocus()
            return
        }

        if (specialtyPos == 0) {
            Toast.makeText(this, "الرجاء اختيار التخصص", Toast.LENGTH_SHORT).show()
            return
        }
        val specialty = specialties[specialtyPos]

        val phone = etPhone.text.toString().trim()
        if (phone.isEmpty() || !phone.matches(Regex("^7[0-9]{8}$"))) {
            etPhone.error = "رقم غير صحيح (9 أرقام تبدأ بـ 7)"
            etPhone.requestFocus()
            return
        }

        // ✅ كلمة المرور (اختيارية عند Google، إجبارية عند Guest)
        val password = etPassword.text.toString().trim()
        if (password.isEmpty() || password.length < 6) {
            etPassword.error = "كلمة المرور مطلوبة (6 أحرف على الأقل)"
            etPassword.requestFocus()
            return
        }

        val govPos = spGovernorate.selectedItemPosition
        val governorate = if (govPos > 0) governorates[govPos] else null

        setLoading(true)

        lifecycleScope.launch {
            try {
                // 1. guest-login-staff
                val loginResponse = apiClient.apiService.guestStaffLogin(
                    GuestLoginRequest(full_name = fullName, phone = phone, role = role)
                )

                if (loginResponse.token != null) {
                    sessionManager.saveToken(loginResponse.token)
                }
                loginResponse.user?.let { sessionManager.saveUser(it) }
                loginResponse.permissions?.let { sessionManager.savePermissions(it) }

                // 2. complete-profile
                val body = mutableMapOf<String, Any>(
                    "specialty" to specialty,
                    "phone" to phone,
                    "experience_years" to (etExperience.text.toString().toIntOrNull() ?: 0),
                    "consultation_fee" to (etFee.text.toString().toIntOrNull() ?: 0),
                    "password" to password
                )

                // clinic_id (اختياري)
                if (clinicsList.isNotEmpty() && spClinics.visibility == View.VISIBLE) {
                    val selectedPos = spClinics.selectedItemPosition
                    if (selectedPos >= 0 && selectedPos < clinicsList.size) {
                        body["clinic_id"] = clinicsList[selectedPos].id
                    }
                }

                if (governorate != null) body["governorate"] = governorate
                if (etAddress.text.isNotEmpty()) body["address"] = etAddress.text.toString().trim()
                if (etBio.text.isNotEmpty()) body["bio"] = etBio.text.toString().trim()

                val response = apiClient.apiService.completeDoctorProfile(body)
                setLoading(false)

                if (response.success) {
                    Toast.makeText(this@CompleteDoctorProfileActivity, "تم حفظ بياناتك. سيتم مراجعتها.", Toast.LENGTH_LONG).show()

                    val user = sessionManager.getUser()
                    if (user != null) {
                        sessionManager.saveUser(user.copy(mustCompleteProfileRaw = 0, status = "pending"))
                    }

                    startActivity(Intent(this@CompleteDoctorProfileActivity, MainActivity::class.java))
                    finish()
                    overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
                } else {
                    Toast.makeText(this@CompleteDoctorProfileActivity, response.message ?: "فشل الحفظ", Toast.LENGTH_LONG).show()
                }

            } catch (e: retrofit2.HttpException) {
                setLoading(false)
                val errorBody = e.response()?.errorBody()?.string()
                val message = try {
                    org.json.JSONObject(errorBody ?: "").optString("message", "خطأ")
                } catch (ex: Exception) {
                    "خطأ (${e.code()})"
                }
                Toast.makeText(this@CompleteDoctorProfileActivity, message, Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                setLoading(false)
                Toast.makeText(this@CompleteDoctorProfileActivity, "خطأ: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        btnSave.isEnabled = !loading
        btnSave.text = if (loading) "جاري الحفظ..." else "حفظ البيانات"
    }
}
