package com.medical.clinic.staff.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.medical.clinic.staff.R
import com.medical.clinic.staff.data.local.SessionManager
import com.medical.clinic.staff.data.models.ClinicItem
import com.medical.clinic.staff.data.models.CompleteDoctorProfileRequest
import com.medical.clinic.staff.data.repository.AuthRepository
import com.medical.clinic.staff.data.utils.Constants
import com.medical.clinic.staff.data.utils.Resource
import com.medical.clinic.staff.databinding.ActivityCompleteDoctorProfileBinding
import com.medical.clinic.staff.ui.main.MainActivity
import com.medical.clinic.staff.ui.utils.ClinicDialogHelper
import com.medical.clinic.staff.ui.utils.InputValidationUtils
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class CompleteDoctorProfileActivity : AppCompatActivity() {

    private lateinit var binding: ActivityCompleteDoctorProfileBinding
    private var clinicsList: MutableList<ClinicItem> = mutableListOf()
    private var selectedClinic: ClinicItem? = null
    private var isGuest: Boolean = false

    @Inject
    lateinit var authRepository: AuthRepository

    @Inject
    lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCompleteDoctorProfileBinding.inflate(layoutInflater)
        setContentView(binding.root)

        isGuest = intent.getBooleanExtra("is_guest", false)
        val isEdit = intent.getBooleanExtra("is_edit", false)

        val currentUser = sessionManager.getUser()
        if (!isEdit && currentUser != null && currentUser.mustCompleteProfile == 0 && !sessionManager.isGuestMode()) {
            if (currentUser.status == Constants.STATUS_APPROVED) {
                Toast.makeText(this, "حسابك معتمد ومفعل مسبقاً", Toast.LENGTH_SHORT).show()
                val intent = Intent(this, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                }
                startActivity(intent)
                finish()
                return
            } else if (currentUser.status == Constants.STATUS_PENDING) {
                Toast.makeText(this, "حسابك قيد المراجعة والاعتماد — يمكنك تصفح التطبيق", Toast.LENGTH_SHORT).show()
                val intent = Intent(this, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                }
                startActivity(intent)
                finish()
                return
            }
        }

        InputValidationUtils.applyArabicNameRules(binding.etFullName, 25)
        InputValidationUtils.applyPhoneRules(binding.etPhone, 9)
        InputValidationUtils.applySafeTextRules(binding.etBio, 200)

        prefillExistingData()
        loadClinics()
        setupListeners()
    }

    private fun prefillExistingData() {
        val user = sessionManager.getUser()
        if (user != null) {
            if (user.fullName != null && !user.fullName.contains("تجريبي") && !user.fullName.contains("ضيف")) {
                binding.etFullName.setText(user.fullName)
            }
            if (user.phone != null && user.phone.isNotBlank()) {
                binding.etPhone.setText(user.phone)
            }
            binding.etSpecialty.setText(user.specialty ?: "")
            if (user.consultationFee != null && user.consultationFee > 0) {
                binding.etFee.setText(user.consultationFee.toInt().toString())
                binding.etFee.isEnabled = false
                binding.etFee.alpha = 0.7f
                binding.tilFee.helperText = "🔒 تم تحديد سعر الكشف مسبقاً، التعديل متاح عبر إدارة المنصة فقط"
            } else {
                binding.etFee.isEnabled = true
                binding.tilFee.helperText = "⚠️ يمكن تحديد السعر مرة واحدة فقط وبعدها يقفل ولا يعدله إلا الأدمن"
            }
            val clinic = user.clinicFullName ?: user.clinicName
            if (!clinic.isNullOrBlank()) {
                binding.etClinic.setText(clinic)
            }
        }
    }

    private fun loadClinics() {
        lifecycleScope.launch {
            val res = authRepository.getClinicsForJoin()
            if (res is Resource.Success && res.data != null) {
                clinicsList.clear()
                clinicsList.addAll(res.data)
            }
        }
    }

    private fun setupListeners() {
        binding.cardBtnBack.setOnClickListener { finish() }
        binding.btnBack.setOnClickListener { finish() }

        // Specialty Selector Dialog
        val openSpecialtyPicker = {
            ClinicDialogHelper.showSelectSpecialtyDialog(this) { selected ->
                binding.etSpecialty.setText(selected)
                binding.tilSpecialty.error = null
            }
        }
        binding.etSpecialty.setOnClickListener { openSpecialtyPicker() }
        binding.tilSpecialty.setEndIconOnClickListener { openSpecialtyPicker() }

        // Clinic Selector Dialog
        val openClinicPicker = {
            ClinicDialogHelper.showSelectClinicDialog(
                context = this,
                clinics = clinicsList,
                onSelected = { clinic ->
                    selectedClinic = clinic
                    binding.etClinic.setText(clinic.name)
                    binding.tilClinic.error = null
                },
                onCreateNew = {
                    openCreateClinicDialog()
                }
            )
        }
        binding.etClinic.setOnClickListener { openClinicPicker() }
        binding.tilClinic.setEndIconOnClickListener { openClinicPicker() }

        // Create New Clinic Button
        binding.btnCreateNewClinic.setOnClickListener {
            openCreateClinicDialog()
        }

        binding.btnSaveDoctorProfile.setOnClickListener {
            val rawFullName = binding.etFullName.text?.toString() ?: ""
            val rawPhone = binding.etPhone.text?.toString() ?: ""
            val specialty = InputValidationUtils.sanitize(binding.etSpecialty.text?.toString())
            val fee = binding.etFee.text?.toString()?.toDoubleOrNull()
            val experience = binding.etExperience.text?.toString()?.toIntOrNull()
            val bio = InputValidationUtils.sanitize(binding.etBio.text?.toString()).takeIf { it.isNotBlank() }

            val fullName = InputValidationUtils.sanitize(rawFullName)
            if (!InputValidationUtils.isStrictlyArabicName(fullName)) {
                binding.tilFullName.error = "الاسم يجب أن يكون بأحرف عربية فقط بدون رموز أو أرقام (بين 3 و 25 حرفاً)"
                return@setOnClickListener
            }
            binding.tilFullName.error = null

            val cleanPhone = rawPhone.trim().replace(Regex("^(\\+?967)"), "")
            if (!InputValidationUtils.isValidPhone(cleanPhone)) {
                binding.tilPhone.error = "رقم الهاتف يجب أن يتكون من 9 أرقام فقط تبدأ بـ 7"
                return@setOnClickListener
            }
            binding.tilPhone.error = null

            if (specialty.isEmpty()) {
                binding.tilSpecialty.error = "يرجى اختيار التخصص الطبي"
                return@setOnClickListener
            }
            binding.tilSpecialty.error = null

            val rawPassword = binding.etDoctorPassword.text?.toString() ?: ""
            val rawConfirmPassword = binding.etDoctorConfirmPassword.text?.toString() ?: ""

            if (rawPassword.isNotBlank()) {
                if (rawPassword.length < 6) {
                    binding.tilDoctorPassword.error = "كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل"
                    return@setOnClickListener
                }
                if (rawPassword != rawConfirmPassword) {
                    binding.tilDoctorConfirmPassword.error = "كلمتا المرور غير متطابقتين"
                    return@setOnClickListener
                }
            }
            binding.tilDoctorPassword.error = null
            binding.tilDoctorConfirmPassword.error = null

            val req = CompleteDoctorProfileRequest(
                specialty = specialty,
                fullName = fullName,
                phone = cleanPhone,
                clinicId = selectedClinic?.id,
                governorate = selectedClinic?.governorate ?: "صنعاء",
                address = selectedClinic?.address,
                bio = bio,
                experienceYears = experience,
                consultationFee = fee,
                password = rawPassword.takeIf { it.isNotBlank() }
            )

            submitProfile(fullName, cleanPhone, req)
        }
    }

    private fun openCreateClinicDialog() {
        ClinicDialogHelper.showCreateClinicDialog(
            context = this,
            scope = lifecycleScope,
            authRepository = authRepository,
            onCreated = { newClinic ->
                clinicsList.add(0, newClinic)
                selectedClinic = newClinic
                binding.etClinic.setText(newClinic.name)
                binding.tilClinic.error = null
            }
        )
    }

    private fun submitProfile(fullName: String, cleanPhone: String, req: CompleteDoctorProfileRequest) {
        binding.btnSaveDoctorProfile.isEnabled = false
        binding.btnSaveDoctorProfile.text = ""
        binding.pbProfile.visibility = View.VISIBLE

        lifecycleScope.launch {
            if (isGuest || !sessionManager.isLoggedIn() || sessionManager.isGuestMode()) {
                val guestRes = authRepository.loginAsGuest(fullName, cleanPhone, Constants.ROLE_DOCTOR)
                if (guestRes is Resource.Error) {
                    binding.btnSaveDoctorProfile.isEnabled = true
                    binding.btnSaveDoctorProfile.text = getString(R.string.save_profile)
                    binding.pbProfile.visibility = View.GONE
                    Toast.makeText(this@CompleteDoctorProfileActivity, guestRes.message ?: "فشل تسجيل الدخول", Toast.LENGTH_LONG).show()
                    return@launch
                }
            }

            // Save doctor profile
            val res = authRepository.completeDoctorProfile(req)
            binding.btnSaveDoctorProfile.isEnabled = true
            binding.btnSaveDoctorProfile.text = getString(R.string.save_profile)
            binding.pbProfile.visibility = View.GONE

            when (res) {
                is Resource.Success -> {
                    sessionManager.setGuestMode(false)
                    val user = res.data
                    if (user?.status == Constants.STATUS_PENDING) {
                        Toast.makeText(this@CompleteDoctorProfileActivity, "تم حفظ الملف بنجاح! حسابك قيد المراجعة والاعتماد من الإدارة ⏳ يمكنك تصفح التطبيق", Toast.LENGTH_LONG).show()
                        val intent = Intent(this@CompleteDoctorProfileActivity, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        startActivity(intent)
                    } else {
                        Toast.makeText(this@CompleteDoctorProfileActivity, "تم حفظ وتفعيل الملف بنجاح! مرحباً دكتور 🩺", Toast.LENGTH_SHORT).show()
                        val intent = Intent(this@CompleteDoctorProfileActivity, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        startActivity(intent)
                    }
                    finish()
                }
                is Resource.Error -> {
                    Toast.makeText(this@CompleteDoctorProfileActivity, res.message, Toast.LENGTH_LONG).show()
                }
                else -> {}
            }
        }
    }
}
