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
import com.medical.clinic.staff.data.utils.Resource
import com.medical.clinic.staff.databinding.ActivityChangePasswordBinding
import com.medical.clinic.staff.ui.main.MainActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class ChangePasswordActivity : AppCompatActivity() {

    private lateinit var binding: ActivityChangePasswordBinding

    @Inject
    lateinit var authRepository: AuthRepository

    @Inject
    lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityChangePasswordBinding.inflate(layoutInflater)
        setContentView(binding.root)

        com.medical.clinic.staff.ui.utils.InputValidationUtils.applyPasswordRules(binding.etCurrentPassword, 8)
        com.medical.clinic.staff.ui.utils.InputValidationUtils.applyPasswordRules(binding.etNewPassword, 8)
        com.medical.clinic.staff.ui.utils.InputValidationUtils.applyPasswordRules(binding.etConfirmPassword, 8)

        setupListeners()
    }

    private fun setupListeners() {
        binding.btnSubmitChange.setOnClickListener {
            val current = binding.etCurrentPassword.text?.toString()?.trim() ?: ""
            val newPass = binding.etNewPassword.text?.toString()?.trim() ?: ""
            val confirmPass = binding.etConfirmPassword.text?.toString()?.trim() ?: ""

            if (current.isEmpty()) {
                binding.tilCurrentPassword.error = getString(R.string.field_required)
                return@setOnClickListener
            }
            binding.tilCurrentPassword.error = null

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

            submitPasswordChange(current, newPass)
        }
    }

    private fun submitPasswordChange(current: String, newPass: String) {
        binding.btnSubmitChange.isEnabled = false
        binding.btnSubmitChange.text = ""
        binding.pbChange.visibility = View.VISIBLE

        lifecycleScope.launch {
            val res = authRepository.changePassword(current, newPass)
            binding.btnSubmitChange.isEnabled = true
            binding.btnSubmitChange.text = getString(R.string.save)
            binding.pbChange.visibility = View.GONE

            when (res) {
                is Resource.Success -> {
                    Toast.makeText(this@ChangePasswordActivity, "تم تغيير كلمة المرور بنجاح", Toast.LENGTH_SHORT).show()
                    val user = sessionManager.getUser()
                    if (user?.mustCompleteProfile == 1) {
                        if (sessionManager.isDoctor()) {
                            startActivity(Intent(this@ChangePasswordActivity, CompleteDoctorProfileActivity::class.java))
                        } else {
                            startActivity(Intent(this@ChangePasswordActivity, CompleteSecretaryProfileActivity::class.java))
                        }
                    } else {
                        val intent = Intent(this@ChangePasswordActivity, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        startActivity(intent)
                    }
                    finish()
                }
                is Resource.Error -> {
                    Toast.makeText(this@ChangePasswordActivity, res.message, Toast.LENGTH_LONG).show()
                }
                else -> {}
            }
        }
    }
}
