package com.medical.clinic.staff.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.medical.clinic.staff.R
import com.medical.clinic.staff.data.repository.AuthRepository
import com.medical.clinic.staff.data.utils.Constants
import com.medical.clinic.staff.data.utils.Resource
import com.medical.clinic.staff.databinding.ActivityResetPasswordBinding
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class ResetPasswordActivity : AppCompatActivity() {

    private lateinit var binding: ActivityResetPasswordBinding
    private var phone: String = ""
    private var role: String? = null

    @Inject
    lateinit var authRepository: AuthRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityResetPasswordBinding.inflate(layoutInflater)
        setContentView(binding.root)

        phone = intent.getStringExtra(Constants.EXTRA_PHONE) ?: ""
        role = intent.getStringExtra(Constants.EXTRA_ROLE)

        com.medical.clinic.staff.ui.utils.InputValidationUtils.applyPasswordRules(binding.etNewPassword, 8)
        com.medical.clinic.staff.ui.utils.InputValidationUtils.applyPasswordRules(binding.etConfirmPassword, 8)

        setupListeners()
    }

    private fun setupListeners() {
        binding.btnBack.setOnClickListener { finish() }

        binding.btnSubmitReset.setOnClickListener {
            val newPass = binding.etNewPassword.text?.toString()?.trim() ?: ""
            val confirmPass = binding.etConfirmPassword.text?.toString()?.trim() ?: ""

            if (newPass.length < 6 || newPass.length > 8) {
                binding.tilNewPassword.error = "كلمة المرور يجب أن تكون بين 6 و 8 خانات"
                return@setOnClickListener
            }
            binding.tilNewPassword.error = null

            if (newPass != confirmPass) {
                binding.tilConfirmPassword.error = getString(R.string.passwords_dont_match)
                return@setOnClickListener
            }
            binding.tilConfirmPassword.error = null

            submitNewPassword(newPass)
        }
    }

    private fun submitNewPassword(newPass: String) {
        binding.btnSubmitReset.isEnabled = false
        binding.btnSubmitReset.text = ""
        binding.pbReset.visibility = View.VISIBLE

        lifecycleScope.launch {
            val res = authRepository.resetPassword(phone, newPass, role)
            binding.btnSubmitReset.isEnabled = true
            binding.btnSubmitReset.text = getString(R.string.save)
            binding.pbReset.visibility = View.GONE

            when (res) {
                is Resource.Success -> {
                    Toast.makeText(this@ResetPasswordActivity, getString(R.string.reset_password_success), Toast.LENGTH_LONG).show()
                    val intent = Intent(this@ResetPasswordActivity, LoginActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        putExtra(Constants.EXTRA_ROLE, role ?: Constants.ROLE_DOCTOR)
                    }
                    startActivity(intent)
                    finish()
                }
                is Resource.Error -> {
                    Toast.makeText(this@ResetPasswordActivity, res.message, Toast.LENGTH_LONG).show()
                }
                else -> {}
            }
        }
    }
}
