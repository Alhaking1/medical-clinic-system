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
import com.medical.clinic.staff.databinding.ActivityRecoveryStatusBinding
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class RecoveryStatusActivity : AppCompatActivity() {

    private lateinit var binding: ActivityRecoveryStatusBinding
    private var phone: String = ""

    @Inject
    lateinit var authRepository: AuthRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRecoveryStatusBinding.inflate(layoutInflater)
        setContentView(binding.root)

        phone = intent.getStringExtra(Constants.EXTRA_PHONE) ?: ""
        setupListeners()
        fetchStatus()
    }

    private fun setupListeners() {
        binding.btnBack.setOnClickListener { finish() }

        binding.btnRefresh.setOnClickListener {
            fetchStatus()
        }

        binding.btnResetPasswordNow.setOnClickListener {
            val intent = Intent(this, ResetPasswordActivity::class.java).apply {
                putExtra(Constants.EXTRA_PHONE, phone)
            }
            startActivity(intent)
            finish()
        }
    }

    private fun fetchStatus() {
        binding.pbStatus.visibility = View.VISIBLE
        binding.btnRefresh.isEnabled = false

        lifecycleScope.launch {
            val res = authRepository.getRecoveryStatus(phone)
            binding.pbStatus.visibility = View.GONE
            binding.btnRefresh.isEnabled = true

            when (res) {
                is Resource.Success -> {
                    val data = res.data
                    if (data != null && data.hasRequest) {
                        when (data.status) {
                            "approved" -> {
                                binding.tvStatusIcon.text = "✅"
                                binding.tvStatusTitle.text = getString(R.string.recovery_status_approved)
                                binding.tvStatusDesc.text = "تهانينا! تمت مراجعة واعتماد طلبك من قبل إدارة العيادة. يمكنك الآن تعيين كلمة مرور جديدة."
                                binding.btnResetPasswordNow.visibility = View.VISIBLE
                            }
                            "rejected" -> {
                                binding.tvStatusIcon.text = "❌"
                                binding.tvStatusTitle.text = getString(R.string.recovery_status_rejected)
                                binding.tvStatusDesc.text = "نأسف، تم رفض طلب الاستعادة من قبل الإدارة. يرجى التواصل مع إدارة العيادة هاتفياً."
                                binding.btnResetPasswordNow.visibility = View.GONE
                            }
                            else -> {
                                binding.tvStatusIcon.text = "⏳"
                                binding.tvStatusTitle.text = getString(R.string.recovery_status_pending)
                                binding.tvStatusDesc.text = "طلبك قيد المراجعة لدى إدارة العيادة. سيتم إشعارك فور اعتماده، ويمكنك الضغط على تحديث في أي وقت."
                                binding.btnResetPasswordNow.visibility = View.GONE
                            }
                        }
                    } else {
                        Toast.makeText(this@RecoveryStatusActivity, "لا يوجد طلب استعادة مسجل لهذا الرقم", Toast.LENGTH_SHORT).show()
                    }
                }
                is Resource.Error -> {
                    Toast.makeText(this@RecoveryStatusActivity, res.message, Toast.LENGTH_SHORT).show()
                }
                else -> {}
            }
        }
    }
}
