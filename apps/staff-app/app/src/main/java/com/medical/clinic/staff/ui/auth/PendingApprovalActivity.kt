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
import com.medical.clinic.staff.databinding.ActivityPendingApprovalBinding
import com.medical.clinic.staff.ui.main.MainActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class PendingApprovalActivity : AppCompatActivity() {

    private lateinit var binding: ActivityPendingApprovalBinding

    @Inject
    lateinit var authRepository: AuthRepository

    @Inject
    lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPendingApprovalBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupListeners()
    }

    private fun setupListeners() {
        binding.btnCheckApproval.setOnClickListener {
            checkApprovalStatus()
        }

        binding.btnLogout.setOnClickListener {
            sessionManager.clearSession()
            val intent = Intent(this, RoleSelectionActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            startActivity(intent)
            finish()
        }
    }

    private fun checkApprovalStatus() {
        binding.pbApproval.visibility = View.VISIBLE
        binding.btnCheckApproval.isEnabled = false

        lifecycleScope.launch {
            val res = authRepository.getMe()
            binding.pbApproval.visibility = View.GONE
            binding.btnCheckApproval.isEnabled = true

            when (res) {
                is Resource.Success -> {
                    val user = res.data
                    if (user?.status == Constants.STATUS_APPROVED) {
                        Toast.makeText(this@PendingApprovalActivity, "تم اعتماد حسابك بنجاح! أهلاً بك", Toast.LENGTH_LONG).show()
                        if (user.mustCompleteProfile == 1) {
                            if (sessionManager.isDoctor()) {
                                startActivity(Intent(this@PendingApprovalActivity, CompleteDoctorProfileActivity::class.java))
                            } else {
                                startActivity(Intent(this@PendingApprovalActivity, CompleteSecretaryProfileActivity::class.java))
                            }
                        } else {
                            val intent = Intent(this@PendingApprovalActivity, MainActivity::class.java).apply {
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                            }
                            startActivity(intent)
                        }
                        finish()
                    } else {
                        Toast.makeText(this@PendingApprovalActivity, "الحساب لا يزال قيد المراجعة لدى إدارة المنظومة", Toast.LENGTH_SHORT).show()
                    }
                }
                is Resource.Error -> {
                    Toast.makeText(this@PendingApprovalActivity, res.message, Toast.LENGTH_SHORT).show()
                }
                else -> {}
            }
        }
    }
}
