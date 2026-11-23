package com.medical.clinic.staff.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.medical.clinic.staff.R
import com.medical.clinic.staff.data.local.SessionManager
import com.medical.clinic.staff.data.repository.AuthRepository
import com.medical.clinic.staff.data.utils.Constants
import com.medical.clinic.staff.data.utils.Resource
import com.medical.clinic.staff.databinding.ActivityGuestLoginBinding
import com.medical.clinic.staff.ui.main.MainActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class GuestLoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityGuestLoginBinding
    private var role: String = Constants.ROLE_DOCTOR

    @Inject
    lateinit var authRepository: AuthRepository

    @Inject
    lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityGuestLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        role = intent.getStringExtra(Constants.EXTRA_ROLE) ?: Constants.ROLE_DOCTOR
        updateUI()
        setupListeners()
    }

    private fun updateUI() {
        if (role == Constants.ROLE_DOCTOR) {
            binding.tvRoleBadge.text = "👨‍⚕️ طبيب"
        } else {
            binding.tvRoleBadge.text = "👩‍💼 سكرتيرة"
        }
    }

    private fun setupListeners() {
        binding.btnBack.setOnClickListener { finish() }

        com.medical.clinic.staff.ui.utils.InputValidationUtils.applyArabicNameRules(binding.etFullName, 25)
        com.medical.clinic.staff.ui.utils.InputValidationUtils.applyPhoneRules(binding.etPhone, 9)

        binding.btnSubmitGuest.setOnClickListener {
            val rawName = binding.etFullName.text?.toString() ?: ""
            val rawPhone = binding.etPhone.text?.toString() ?: ""

            val fullName = com.medical.clinic.staff.ui.utils.InputValidationUtils.sanitize(rawName)
            if (!com.medical.clinic.staff.ui.utils.InputValidationUtils.isStrictlyArabicName(fullName)) {
                binding.tilFullName.error = "الاسم يجب أن يكون بأحرف عربية فقط بدون رموز أو أرقام (بين 3 و 25 حرفاً)"
                return@setOnClickListener
            }
            binding.tilFullName.error = null

            val cleanPhone = rawPhone.trim().replace(Regex("^(\\+?967)"), "")
            if (!com.medical.clinic.staff.ui.utils.InputValidationUtils.isValidPhone(cleanPhone)) {
                binding.tilPhone.error = "رقم الهاتف يجب أن يتكون من 9 أرقام فقط تبدأ بـ 7"
                return@setOnClickListener
            }
            binding.tilPhone.error = null

            performGuestLogin(fullName, cleanPhone)
        }
    }

    private fun performGuestLogin(name: String, phone: String) {
        binding.btnSubmitGuest.isEnabled = false
        binding.btnSubmitGuest.text = ""
        binding.pbGuest.visibility = View.VISIBLE

        lifecycleScope.launch {
            val result = authRepository.loginAsGuest(name, phone, role)
            binding.btnSubmitGuest.isEnabled = true
            binding.btnSubmitGuest.text = getString(R.string.login_button)
            binding.pbGuest.visibility = View.GONE

            when (result) {
                is Resource.Success -> {
                    val user = result.data
                    if (user?.status == Constants.STATUS_PENDING) {
                        Toast.makeText(this@GuestLoginActivity, "حسابك قيد المراجعة والاعتماد ⏳ يمكنك تصفح التطبيق", Toast.LENGTH_LONG).show()
                        val intent = Intent(this@GuestLoginActivity, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        startActivity(intent)
                    } else if (user?.mustCompleteProfile == 1) {
                        if (role == Constants.ROLE_DOCTOR) {
                            startActivity(Intent(this@GuestLoginActivity, CompleteDoctorProfileActivity::class.java))
                        } else {
                            startActivity(Intent(this@GuestLoginActivity, CompleteSecretaryProfileActivity::class.java))
                        }
                    } else {
                        val intent = Intent(this@GuestLoginActivity, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        startActivity(intent)
                    }
                    finish()
                }
                is Resource.Error -> {
                    Toast.makeText(this@GuestLoginActivity, result.message, Toast.LENGTH_LONG).show()
                }
                else -> {}
            }
        }
    }
}
