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
class CompleteSecretaryProfileActivity : AppCompatActivity() {

    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var apiClient: ApiClient

    private lateinit var etFullName: EditText
    private lateinit var etPhone: EditText
    private lateinit var rgClinicMode: RadioGroup
    private lateinit var layoutCreateClinic: LinearLayout
    private lateinit var layoutJoinClinic: LinearLayout
    private lateinit var etClinicName: EditText
    private lateinit var spGovernorate: Spinner
    private lateinit var etAddress: EditText
    private lateinit var etMapsUrl: EditText
    private lateinit var etNotes: EditText
    private lateinit var spClinics: Spinner
    private lateinit var tvClinicsError: TextView
    private lateinit var btnSave: Button
    private lateinit var etPassword: EditText
    private lateinit var progressBar: ProgressBar

    private var clinicMode = "create"
    private var role: String = Constants.ROLE_SECRETARY

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
        setContentView(R.layout.activity_complete_secretary_profile)

        role = intent.getStringExtra("role") ?: Constants.ROLE_SECRETARY

        etFullName = findViewById(R.id.etFullName)
        etPhone = findViewById(R.id.etPhone)
        rgClinicMode = findViewById(R.id.rgClinicMode)
        layoutCreateClinic = findViewById(R.id.layoutCreateClinic)
        layoutJoinClinic = findViewById(R.id.layoutJoinClinic)
        etClinicName = findViewById(R.id.etClinicName)
        spGovernorate = findViewById(R.id.spGovernorate)
        etAddress = findViewById(R.id.etAddress)
        etMapsUrl = findViewById(R.id.etMapsUrl)
        etNotes = findViewById(R.id.etNotes)
        etPassword = findViewById(R.id.etPassword)
        spClinics = findViewById(R.id.spClinics)
        tvClinicsError = findViewById(R.id.tvClinicsError)
        btnSave = findViewById(R.id.btnSave)
        progressBar = findViewById(R.id.progressBar)

        // Spinner المحافظات
        spGovernorate.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            governorates
        )

        // Radio buttons
        rgClinicMode.setOnCheckedChangeListener { _, checkedId ->
            if (checkedId == R.id.rbCreateClinic) {
                clinicMode = "create"
                layoutCreateClinic.visibility = View.VISIBLE
                layoutJoinClinic.visibility = View.GONE
            } else {
                clinicMode = "join"
                layoutCreateClinic.visibility = View.GONE
                layoutJoinClinic.visibility = View.VISIBLE
                loadClinics()
            }
        }

        animateEntry()
        btnSave.setOnClickListener { saveProfile() }
    }

    private fun animateEntry() {
        val views = listOf<View>(
            findViewById(R.id.iconContainer),
            findViewById(R.id.tvTitle),
            etFullName,
            etPhone,
            rgClinicMode,
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
                    tvClinicsError.text = "لا توجد عيادات متاحة حالياً"
                    tvClinicsError.visibility = View.VISIBLE
                } else {
                    tvClinicsError.visibility = View.GONE
                    val names = clinicsList.map {
                        "${it.name}${if (it.governorate != null) " - ${it.governorate}" else ""}"
                    }
                    spClinics.adapter = ArrayAdapter(
                        this@CompleteSecretaryProfileActivity,
                        android.R.layout.simple_spinner_dropdown_item,
                        names
                    )
                }
            } catch (e: Exception) {
                tvClinicsError.text = "فشل تحميل العيادات"
                tvClinicsError.visibility = View.VISIBLE
            }
        }
    }

    private fun saveProfile() {
        val fullName = etFullName.text.toString().trim()
        val phone = etPhone.text.toString().trim()

        // ═══════════════════════════════════════════
        // التحقق
        // ═══════════════════════════════════════════
        if (fullName.length < 3) {
            etFullName.error = "الاسم مطلوب (3 أحرف على الأقل)"
            etFullName.requestFocus()
            return
        }

        if (phone.isEmpty() || !phone.matches(Regex("^7[0-9]{8}$"))) {
            etPhone.error = "رقم غير صحيح (9 أرقام تبدأ بـ 7)"
            etPhone.requestFocus()
            return
        }

        // ✅ كلمة المرور (إجبارية)
        val password = etPassword.text.toString().trim()
        if (password.isEmpty() || password.length < 6) {
            etPassword.error = "كلمة المرور مطلوبة (6 أحرف على الأقل)"
            etPassword.requestFocus()
            return
        }

        // ⚠️ govPos خارج if (للوصول إليها في body)
        val govPos = spGovernorate.selectedItemPosition

        if (clinicMode == "create") {
            val name = etClinicName.text.toString().trim()

            if (name.isEmpty()) {
                etClinicName.error = "اسم العيادة مطلوب"
                etClinicName.requestFocus()
                return
            }
            if (govPos == 0) {
                Toast.makeText(this, "الرجاء اختيار المحافظة", Toast.LENGTH_SHORT).show()
                return
            }
        } else {
            if (clinicsList.isEmpty()) {
                Toast.makeText(this, "لا توجد عيادات للانضمام إليها", Toast.LENGTH_SHORT).show()
                return
            }
        }

        setLoading(true)

        lifecycleScope.launch {
            try {
                // ═══════════════════════════════════════════
                // 1. guest-login-staff
                // ═══════════════════════════════════════════
                val loginResponse = apiClient.apiService.guestStaffLogin(
                    GuestLoginRequest(
                        full_name = fullName,
                        phone = phone,
                        role = role
                    )
                )

                if (loginResponse.token != null) {
                    sessionManager.saveToken(loginResponse.token)
                }
                loginResponse.user?.let { sessionManager.saveUser(it) }
                loginResponse.permissions?.let { sessionManager.savePermissions(it) }

                // ═══════════════════════════════════════════
                // 2. complete-profile
                // ═══════════════════════════════════════════
                val body = mutableMapOf<String, Any>(
                    "phone" to phone,
                    "password" to password,
                    "clinic_mode" to clinicMode
                )

                if (clinicMode == "create") {
                    body["clinic_name"] = etClinicName.text.toString().trim()
                    if (govPos > 0) body["governorate"] = governorates[govPos]
                    if (etAddress.text.isNotEmpty()) body["address"] = etAddress.text.toString().trim()
                    if (etMapsUrl.text.isNotEmpty()) body["google_maps_url"] = etMapsUrl.text.toString().trim()
                    if (etNotes.text.isNotEmpty()) body["notes"] = etNotes.text.toString().trim()
                } else {
                    val selectedPos = spClinics.selectedItemPosition
                    if (selectedPos >= 0 && selectedPos < clinicsList.size) {
                        body["clinic_id"] = clinicsList[selectedPos].id
                    }
                }

                val response = apiClient.apiService.completeSecretaryProfile(body)
                setLoading(false)

                if (response.success) {
                    Toast.makeText(
                        this@CompleteSecretaryProfileActivity,
                        "تم حفظ بياناتك. سيتم مراجعتها.",
                        Toast.LENGTH_LONG
                    ).show()

                    val user = sessionManager.getUser()
                    if (user != null) {
                        sessionManager.saveUser(
                            user.copy(
                                mustCompleteProfileRaw = 0,
                                status = "pending"
                            )
                        )
                    }

                    startActivity(Intent(
                        this@CompleteSecretaryProfileActivity,
                        MainActivity::class.java
                    ))
                    finish()
                    overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
                } else {
                    Toast.makeText(
                        this@CompleteSecretaryProfileActivity,
                        response.message ?: "فشل الحفظ",
                        Toast.LENGTH_LONG
                    ).show()
                }

            } catch (e: retrofit2.HttpException) {
                setLoading(false)
                val errorBody = e.response()?.errorBody()?.string()
                val message = try {
                    org.json.JSONObject(errorBody ?: "").optString("message", "خطأ")
                } catch (ex: Exception) {
                    "خطأ (${e.code()})"
                }
                Toast.makeText(
                    this@CompleteSecretaryProfileActivity,
                    message,
                    Toast.LENGTH_LONG
                ).show()
            } catch (e: Exception) {
                setLoading(false)
                Toast.makeText(
                    this@CompleteSecretaryProfileActivity,
                    "خطأ: ${e.message}",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        btnSave.isEnabled = !loading
        btnSave.text = if (loading) "جاري الحفظ..." else "حفظ البيانات"
    }
}
