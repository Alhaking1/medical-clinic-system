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
import com.medical.clinic.staff.data.models.CompleteSecretaryProfileRequest
import com.medical.clinic.staff.data.repository.AuthRepository
import com.medical.clinic.staff.data.utils.Constants
import com.medical.clinic.staff.data.utils.Resource
import com.medical.clinic.staff.databinding.ActivityCompleteSecretaryProfileBinding
import com.medical.clinic.staff.ui.main.MainActivity
import com.medical.clinic.staff.ui.utils.ClinicDialogHelper
import com.medical.clinic.staff.ui.utils.InputValidationUtils
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class CompleteSecretaryProfileActivity : AppCompatActivity() {

    private lateinit var binding: ActivityCompleteSecretaryProfileBinding
    private var clinicsList: MutableList<ClinicItem> = mutableListOf()
    private var selectedClinic: ClinicItem? = null
    private var isGuest: Boolean = false

    @Inject
    lateinit var authRepository: AuthRepository

    @Inject
    lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCompleteSecretaryProfileBinding.inflate(layoutInflater)
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

        InputValidationUtils.applyArabicNameRules(binding.etSecretaryFullName, 25)
        InputValidationUtils.applyPhoneRules(binding.etSecretaryPhone, 9)
        InputValidationUtils.applySafeTextRules(binding.etGovernorate, 50)
        InputValidationUtils.applySafeTextRules(binding.etAddress, 100)

        prefillExistingData()
        loadClinics()
        setupListeners()
    }

    private fun prefillExistingData() {
        val user = sessionManager.getUser()
        if (user != null) {
            if (user.fullName != null && !user.fullName.contains("تجريبي") && !user.fullName.contains("ضيف")) {
                binding.etSecretaryFullName.setText(user.fullName)
            }
            if (user.phone != null && user.phone.isNotBlank()) {
                binding.etSecretaryPhone.setText(user.phone)
            }
            val clinic = user.clinicFullName ?: user.clinicName
            if (!clinic.isNullOrBlank()) {
                binding.etSecretaryClinic.setText(clinic)
            }
            if (user.clinicId != null && user.clinicId > 0) {
                val clinicAddr = user.clinicAddress ?: user.address
                selectedClinic = ClinicItem(
                    id = user.clinicId,
                    name = clinic ?: "العيادة الحالية",
                    governorate = user.clinicGovernorate,
                    address = clinicAddr
                )
                binding.etSecretaryClinic.isEnabled = false
                binding.tilSecretaryClinic.isEnabled = false
                binding.tilSecretaryClinic.helperText = "🔒 العيادة مسجلة ومثبتة - تغيير العيادة يتم حصراً عبر إدارة المنصة"
                binding.btnCreateNewClinicSec.visibility = View.GONE

                // الحقول المكتملة مسبقاً تُقفل، بينما الحقول الناقصة يُتاح للسكرتيرة إضافتها
                if (!user.clinicGovernorate.isNullOrBlank()) {
                    binding.etGovernorate.setText(user.clinicGovernorate)
                    binding.etGovernorate.isEnabled = false
                    binding.tilGovernorate.isEnabled = false
                    binding.tilGovernorate.helperText = "🔒 المحافظة مثبتة مسبقاً"
                } else {
                    binding.tilGovernorate.visibility = View.VISIBLE
                    binding.etGovernorate.isEnabled = true
                }

                if (!clinicAddr.isNullOrBlank()) {
                    binding.etAddress.setText(clinicAddr)
                    binding.etAddress.isEnabled = false
                    binding.tilAddress.isEnabled = false
                    binding.tilAddress.helperText = "🔒 العنوان مثبت مسبقاً"
                } else {
                    binding.tilAddress.visibility = View.VISIBLE
                    binding.etAddress.isEnabled = true
                }

                binding.btnAddClinicAuxPhone.visibility = View.VISIBLE
                binding.btnAddClinicAuxPhone.setOnClickListener {
                    showAddAuxPhoneDialog()
                }
            }
        }
    }

    private fun showAddAuxPhoneDialog() {
        val input = android.widget.EditText(this).apply {
            hint = "7XXXXXXXX"
            inputType = android.text.InputType.TYPE_CLASS_PHONE
            filters = arrayOf(android.text.InputFilter.LengthFilter(9))
        }
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("إضافة رقم تواصل إضافي للعيادة 📞")
            .setMessage("أدخل رقم هاتف إضافي للتواصل مع العيادة. سيتم إرساله لإدارة المنصة للمراجعة والاعتماد:")
            .setView(input)
            .setPositiveButton("إرسال للإدارة") { _, _ ->
                val phone = input.text.toString().trim()
                if (!InputValidationUtils.isValidPhone(phone)) {
                    Toast.makeText(this, "يرجى إدخال رقم هاتف يمني صحيح (9 أرقام تبدأ بـ 7)", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                lifecycleScope.launch {
                    val res = authRepository.addClinicContactNumber(phone)
                    if (res is Resource.Success) {
                        Toast.makeText(this@CompleteSecretaryProfileActivity, "تم إرسال رقم التواصل لإدارة المنصة بنجاح ✅", Toast.LENGTH_LONG).show()
                    } else {
                        Toast.makeText(this@CompleteSecretaryProfileActivity, res.message ?: "فشل الإرسال", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("إلغاء", null)
            .show()
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

        // Clinic Selector Dialog
        val openClinicPicker = {
            val user = sessionManager.getUser()
            if (user?.clinicId != null && user.clinicId > 0) {
                Toast.makeText(this, "🔒 العيادة مثبتة مسبقاً. تغيير العيادة يتم فقط عبر إدارة المنصة", Toast.LENGTH_SHORT).show()
            } else {
                ClinicDialogHelper.showSelectClinicDialog(
                    context = this,
                    clinics = clinicsList,
                    onSelected = { clinic ->
                        selectedClinic = clinic
                        binding.etSecretaryClinic.setText(clinic.name)
                        binding.tilSecretaryClinic.error = null
                        if (!clinic.governorate.isNullOrBlank()) {
                            binding.etGovernorate.setText(clinic.governorate)
                        }
                        if (!clinic.address.isNullOrBlank()) {
                            binding.etAddress.setText(clinic.address)
                        }
                    },
                    onCreateNew = {
                        openCreateClinicDialog()
                    }
                )
            }
        }
        binding.etSecretaryClinic.setOnClickListener { openClinicPicker() }
        binding.tilSecretaryClinic.setEndIconOnClickListener { openClinicPicker() }

        // Create New Clinic Button
        binding.btnCreateNewClinicSec.setOnClickListener {
            openCreateClinicDialog()
        }

        binding.btnSaveSecretaryProfile.setOnClickListener {
            val rawFullName = binding.etSecretaryFullName.text?.toString() ?: ""
            val rawPhone = binding.etSecretaryPhone.text?.toString() ?: ""
            val governorate = InputValidationUtils.sanitize(binding.etGovernorate.text?.toString()).takeIf { it.isNotBlank() }
            val address = InputValidationUtils.sanitize(binding.etAddress.text?.toString()).takeIf { it.isNotBlank() }
            val rawPassword = binding.etSecretaryPassword.text?.toString() ?: ""
            val rawConfirmPassword = binding.etSecretaryConfirmPassword.text?.toString() ?: ""

            val fullName = InputValidationUtils.sanitize(rawFullName)
            if (!InputValidationUtils.isStrictlyArabicName(fullName)) {
                binding.tilSecretaryFullName.error = "الاسم يجب أن يكون بأحرف عربية فقط بدون رموز أو أرقام (بين 3 و 25 حرفاً)"
                return@setOnClickListener
            }
            binding.tilSecretaryFullName.error = null

            val cleanPhone = rawPhone.trim().replace(Regex("^(\\+?967)"), "")
            if (!InputValidationUtils.isValidPhone(cleanPhone)) {
                binding.tilSecretaryPhone.error = "أدخل رقم هاتف يمني صحيح (9 أرقام تبدأ بـ 7)"
                return@setOnClickListener
            }
            binding.tilSecretaryPhone.error = null

            if (selectedClinic == null) {
                binding.tilSecretaryClinic.error = "يرجى اختيار أو إنشاء العيادة أولاً"
                Toast.makeText(this, "يرجى اختيار العيادة أولاً", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            binding.tilSecretaryClinic.error = null

            if (rawPassword.isNotBlank()) {
                if (rawPassword.length < 6) {
                    binding.tilSecretaryPassword.error = "كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل"
                    return@setOnClickListener
                }
                if (rawPassword != rawConfirmPassword) {
                    binding.tilSecretaryConfirmPassword.error = "كلمتا المرور غير متطابقتين"
                    return@setOnClickListener
                }
            }
            binding.tilSecretaryPassword.error = null
            binding.tilSecretaryConfirmPassword.error = null

            val req = CompleteSecretaryProfileRequest(
                clinicId = selectedClinic!!.id,
                clinicMode = "join",
                fullName = fullName,
                phone = cleanPhone,
                governorate = governorate ?: selectedClinic?.governorate ?: "صنعاء",
                address = address ?: selectedClinic?.address,
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
                binding.etSecretaryClinic.setText(newClinic.name)
                binding.tilSecretaryClinic.error = null
                if (!newClinic.governorate.isNullOrBlank()) {
                    binding.etGovernorate.setText(newClinic.governorate)
                }
                if (!newClinic.address.isNullOrBlank()) {
                    binding.etAddress.setText(newClinic.address)
                }
            }
        )
    }

    private fun submitProfile(fullName: String, cleanPhone: String, req: CompleteSecretaryProfileRequest) {
        binding.btnSaveSecretaryProfile.isEnabled = false
        binding.btnSaveSecretaryProfile.text = ""
        binding.pbSecretaryProfile.visibility = View.VISIBLE

        lifecycleScope.launch {
            if (isGuest || !sessionManager.isLoggedIn() || sessionManager.isGuestMode()) {
                val guestRes = authRepository.loginAsGuest(fullName, cleanPhone, Constants.ROLE_SECRETARY)
                if (guestRes is Resource.Error) {
                    binding.btnSaveSecretaryProfile.isEnabled = true
                    binding.btnSaveSecretaryProfile.text = getString(R.string.save_profile)
                    binding.pbSecretaryProfile.visibility = View.GONE
                    Toast.makeText(this@CompleteSecretaryProfileActivity, guestRes.message ?: "فشل تسجيل الدخول", Toast.LENGTH_LONG).show()
                    return@launch
                }
            }

            // Save secretary profile
            val res = authRepository.completeSecretaryProfile(req)
            binding.btnSaveSecretaryProfile.isEnabled = true
            binding.btnSaveSecretaryProfile.text = getString(R.string.save_profile)
            binding.pbSecretaryProfile.visibility = View.GONE

            when (res) {
                is Resource.Success -> {
                    sessionManager.setGuestMode(false)
                    val user = res.data
                    if (user?.status == Constants.STATUS_PENDING) {
                        Toast.makeText(this@CompleteSecretaryProfileActivity, "تم حفظ الملف بنجاح! حسابك قيد المراجعة والاعتماد من الإدارة ⏳ يمكنك تصفح التطبيق", Toast.LENGTH_LONG).show()
                        val intent = Intent(this@CompleteSecretaryProfileActivity, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        startActivity(intent)
                    } else {
                        Toast.makeText(this@CompleteSecretaryProfileActivity, "تم حفظ وتفعيل الملف بنجاح! أهلاً بك 👩‍💼", Toast.LENGTH_SHORT).show()
                        val intent = Intent(this@CompleteSecretaryProfileActivity, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        startActivity(intent)
                    }
                    finish()
                }
                is Resource.Error -> {
                    Toast.makeText(this@CompleteSecretaryProfileActivity, res.message, Toast.LENGTH_LONG).show()
                }
                else -> {}
            }
        }
    }
}
