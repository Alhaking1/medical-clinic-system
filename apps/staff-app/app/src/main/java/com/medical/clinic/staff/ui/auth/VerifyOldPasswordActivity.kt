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
import com.medical.clinic.staff.databinding.ActivityVerifyOldPasswordBinding
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class VerifyOldPasswordActivity : AppCompatActivity() {

    private lateinit var binding: ActivityVerifyOldPasswordBinding
    private var phone: String = ""
    private var role: String? = null

    @Inject
    lateinit var authRepository: AuthRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityVerifyOldPasswordBinding.inflate(layoutInflater)
        setContentView(binding.root)

        phone = intent.getStringExtra(Constants.EXTRA_PHONE) ?: ""
        role = intent.getStringExtra(Constants.EXTRA_ROLE)

        com.medical.clinic.staff.ui.utils.InputValidationUtils.applyPasswordRules(binding.etOldPassword, 8)

        setupListeners()
    }

    private fun setupListeners() {
        binding.btnBack.setOnClickListener { finish() }

        binding.btnVerify.setOnClickListener {
            val oldPass = binding.etOldPassword.text?.toString()?.trim() ?: ""
            if (oldPass.isEmpty()) {
                binding.tilOldPassword.error = getString(R.string.field_required)
                return@setOnClickListener
            }
            if (oldPass.length > 8) {
                binding.tilOldPassword.error = "كلمة المرور يجب ألا تزيد عن 8 أحرف أو أرقام"
                return@setOnClickListener
            }
            binding.tilOldPassword.error = null
            val safePass = com.medical.clinic.staff.ui.utils.InputValidationUtils.sanitize(oldPass)
            verifyOldPassword(safePass)
        }
    }

    private fun verifyOldPassword(oldPass: String) {
        binding.btnVerify.isEnabled = false
        binding.btnVerify.text = ""
        binding.pbVerify.visibility = View.VISIBLE

        lifecycleScope.launch {
            val res = authRepository.submitRecovery(
                RecoveryRequestPayload(
                    phone = phone,
                    method = "old_password",
                    oldPassword = oldPass
                )
            )
            binding.btnVerify.isEnabled = true
            binding.btnVerify.text = getString(R.string.verify_and_continue)
            binding.pbVerify.visibility = View.GONE

            when (res) {
                is Resource.Success -> {
                    Toast.makeText(this@VerifyOldPasswordActivity, "تم التحقق بنجاح", Toast.LENGTH_SHORT).show()
                    val intent = Intent(this@VerifyOldPasswordActivity, ResetPasswordActivity::class.java).apply {
                        putExtra(Constants.EXTRA_PHONE, phone)
                        putExtra(Constants.EXTRA_ROLE, role)
                    }
                    startActivity(intent)
                    finish()
                }
                is Resource.Error -> {
                    Toast.makeText(this@VerifyOldPasswordActivity, res.message, Toast.LENGTH_LONG).show()
                }
                else -> {}
            }
        }
    }
}
