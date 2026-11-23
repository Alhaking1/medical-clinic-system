package com.medical.clinic.staff.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.medical.clinic.staff.R
import com.medical.clinic.staff.data.models.RecoveryRequestPayload
import com.medical.clinic.staff.data.repository.AuthRepository
import com.medical.clinic.staff.data.utils.Constants
import com.medical.clinic.staff.data.utils.Resource
import com.medical.clinic.staff.databinding.ActivityForgotPasswordBinding
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class ForgotPasswordActivity : AppCompatActivity() {

    private lateinit var binding: ActivityForgotPasswordBinding
    private var role: String? = null
    private var verifiedPhone: String = ""

    @Inject
    lateinit var authRepository: AuthRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityForgotPasswordBinding.inflate(layoutInflater)
        setContentView(binding.root)

        role = intent.getStringExtra(Constants.EXTRA_ROLE)
        setupListeners()
    }

    private fun setupListeners() {
        binding.btnBack.setOnClickListener { finish() }

        com.medical.clinic.staff.ui.utils.InputValidationUtils.applyPhoneRules(binding.etPhone, 9)

        binding.btnCheckAccount.setOnClickListener {
            val phone = com.medical.clinic.staff.ui.utils.InputValidationUtils.sanitize(binding.etPhone.text?.toString())
            val cleanPhone = phone.replace(Regex("^(\\+?967)"), "")
            if (!com.medical.clinic.staff.ui.utils.InputValidationUtils.isValidPhone(cleanPhone)) {
                binding.tilPhone.error = "أدخل رقم هاتف صحيح (9 أرقام تبدأ بـ 7)"
                return@setOnClickListener
            }
            binding.tilPhone.error = null
            checkAccount(cleanPhone)
        }

        binding.cardOldPasswordMethod.setOnClickListener {
            val intent = Intent(this, VerifyOldPasswordActivity::class.java).apply {
                putExtra(Constants.EXTRA_PHONE, verifiedPhone)
                putExtra(Constants.EXTRA_ROLE, role)
            }
            startActivity(intent)
        }

        binding.cardAdminMethod.setOnClickListener {
            submitAdminRequest()
        }

        binding.btnViewStatus.setOnClickListener {
            val intent = Intent(this, RecoveryStatusActivity::class.java).apply {
                putExtra(Constants.EXTRA_PHONE, verifiedPhone)
            }
            startActivity(intent)
        }
    }

    private fun checkAccount(phone: String) {
        binding.btnCheckAccount.isEnabled = false
        binding.btnCheckAccount.text = ""
        binding.pbCheck.visibility = View.VISIBLE

        lifecycleScope.launch {
            val res = authRepository.checkAccount(phone, role)
            binding.btnCheckAccount.isEnabled = true
            binding.btnCheckAccount.text = getString(R.string.check_account)
            binding.pbCheck.visibility = View.GONE

            when (res) {
                is Resource.Success -> {
                    val data = res.data
                    if (data != null && data.accountExists) {
                        verifiedPhone = phone
                        binding.layoutOptions.visibility = View.VISIBLE
                        binding.tvAccountWelcome.text = "مرحباً ${data.userName ?: ""}"

                        // If user has pending request, offer to view status
                        if (data.pendingRequest) {
                            binding.btnViewStatus.visibility = View.VISIBLE
                        } else {
                            binding.btnViewStatus.visibility = View.GONE
                        }

                        // If no old password on file, hide old password card
                        if (!data.hasOldPassword) {
                            binding.cardOldPasswordMethod.visibility = View.GONE
                        } else {
                            binding.cardOldPasswordMethod.visibility = View.VISIBLE
                        }
                    } else {
                        Toast.makeText(this@ForgotPasswordActivity, data?.message ?: "الحساب غير موجود", Toast.LENGTH_LONG).show()
                    }
                }
                is Resource.Error -> {
                    Toast.makeText(this@ForgotPasswordActivity, res.message, Toast.LENGTH_LONG).show()
                }
                else -> {}
            }
        }
    }

    private fun submitAdminRequest() {
        binding.cardAdminMethod.isEnabled = false
        lifecycleScope.launch {
            val res = authRepository.submitRecovery(
                RecoveryRequestPayload(
                    phone = verifiedPhone,
                    method = "admin_approval",
                    reason = "طلب استعادة من تطبيق الكادر الطبي"
                )
            )
            binding.cardAdminMethod.isEnabled = true
            when (res) {
                is Resource.Success -> {
                    Toast.makeText(this@ForgotPasswordActivity, res.data, Toast.LENGTH_LONG).show()
                    val intent = Intent(this@ForgotPasswordActivity, RecoveryStatusActivity::class.java).apply {
                        putExtra(Constants.EXTRA_PHONE, verifiedPhone)
                    }
                    startActivity(intent)
                    finish()
                }
                is Resource.Error -> {
                    Toast.makeText(this@ForgotPasswordActivity, res.message, Toast.LENGTH_LONG).show()
                }
                else -> {}
            }
        }
    }
}
