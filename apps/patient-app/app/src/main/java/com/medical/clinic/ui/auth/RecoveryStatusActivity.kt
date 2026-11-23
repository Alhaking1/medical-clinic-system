package com.medical.clinic.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.google.android.material.button.MaterialButton
import com.medical.clinic.R
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.viewmodel.AuthViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class RecoveryStatusActivity : AppCompatActivity() {

    private val viewModel: AuthViewModel by viewModels()

    @Inject
    lateinit var sessionManager: SessionManager

    private lateinit var tvStatusIcon: TextView
    private lateinit var tvTitle: TextView
    private lateinit var tvStatus: TextView
    private lateinit var tvUserName: TextView
    private lateinit var tvDetails: TextView
    private lateinit var tvRejectionReason: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var btnRefresh: MaterialButton
    private lateinit var btnResetPassword: MaterialButton
    private lateinit var btnRetry: MaterialButton

    private var phone: String? = null
    private var currentUserRole: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_recovery_status)

        tvStatusIcon = findViewById(R.id.tvStatusIcon)
        tvTitle = findViewById(R.id.tvTitle)
        tvStatus = findViewById(R.id.tvStatus)
        tvUserName = findViewById(R.id.tvUserName)
        tvDetails = findViewById(R.id.tvDetails)
        tvRejectionReason = findViewById(R.id.tvRejectionReason)
        progressBar = findViewById(R.id.progressBar)
        btnRefresh = findViewById(R.id.btnRefresh)
        btnResetPassword = findViewById(R.id.btnResetPassword)
        btnRetry = findViewById(R.id.btnRetry)

        // استقبال الرقم من Intent أو من SessionManager
        phone = intent.getStringExtra("phone") ?: sessionManager.getRecoveryPhone()

        if (phone.isNullOrBlank()) {
            Toast.makeText(this, "لا يوجد طلب استعادة محفوظ", Toast.LENGTH_LONG).show()
            finish()
            return
        }

        btnRefresh.setOnClickListener { checkStatus() }
        btnResetPassword.setOnClickListener { openResetPassword() }
        btnRetry.setOnClickListener { clearAndRetry() }

        observeRecoveryStatusState()

        // فحص أولي
        checkStatus()

        // فحص دوري كل 30 ثانية
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                while (true) {
                    delay(30_000)
                    checkStatus(silent = true)
                }
            }
        }
    }

    private fun checkStatus(silent: Boolean = false) {
        val p = phone ?: return
        if (!silent) setLoading(true)
        viewModel.checkRecoveryStatus(p)
    }

    private fun observeRecoveryStatusState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.recoveryStatusState.collect { state ->
                    when (state) {
                        is AuthViewModel.RecoveryStatusState.Idle -> setLoading(false)
                        is AuthViewModel.RecoveryStatusState.Loading -> setLoading(true)
                        is AuthViewModel.RecoveryStatusState.Success -> {
                            setLoading(false)
                            renderStatus(state.data)
                        }
                        is AuthViewModel.RecoveryStatusState.Error -> {
                            setLoading(false)
                            Toast.makeText(
                                this@RecoveryStatusActivity,
                                "خطأ: ${state.message}",
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    }
                }
            }
        }
    }

    private fun renderStatus(data: com.medical.clinic.data.api.RecoveryStatusResponse) {
        if (!data.has_request) {
            // لا يوجد طلب — نعود لتسجيل الدخول
            sessionManager.clearRecoveryPhone()
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }

        // اسم المستخدم + الدور
        tvUserName.text = data.user_name ?: ""
        currentUserRole = data.user_role

        when (data.status) {
            "pending" -> {
                tvStatusIcon.text = "⏳"
                tvTitle.text = "طلبك قيد المراجعة"
                tvStatus.text = "⏳ قيد المراجعة"
                tvDetails.text = "سيتم مراجعة طلبك من قبل الإدارة.\nسيتم التواصل معك قريبًا."
                tvRejectionReason.visibility = View.GONE
                btnResetPassword.visibility = View.GONE
                btnRetry.visibility = View.GONE
            }

            "approved" -> {
                tvStatusIcon.text = "✅"
                tvTitle.text = "تم اعتماد طلبك!"
                tvStatus.text = "✅ معتمد"
                tvDetails.text = "يمكنك الآن تعيين كلمة مرور جديدة لحسابك."
                tvRejectionReason.visibility = View.GONE
                btnResetPassword.visibility = View.VISIBLE
                btnRetry.visibility = View.GONE
            }

            "rejected" -> {
                tvStatusIcon.text = "❌"
                tvTitle.text = "تم رفض طلبك"
                tvStatus.text = "❌ مرفوض"
                tvDetails.text = "عذرًا، لم تتم الموافقة على طلبك."
                tvRejectionReason.visibility = View.VISIBLE
                tvRejectionReason.text = "السبب: ${data.notes ?: "غير محدد"}"
                btnResetPassword.visibility = View.GONE
                btnRetry.visibility = View.VISIBLE
            }

            else -> {
                tvStatusIcon.text = "❓"
                tvTitle.text = "حالة غير معروفة"
                tvDetails.text = data.message ?: ""
            }
        }
    }

    private fun openResetPassword() {
        android.util.Log.d("RecoveryStatus", "🔵 openResetPassword() called, phone=$phone")
        
        if (phone.isNullOrBlank()) {
            android.util.Log.e("RecoveryStatus", "❌ phone is null/blank!")
            android.widget.Toast.makeText(this, "خطأ: لا يوجد رقم محفوظ", android.widget.Toast.LENGTH_LONG).show()
            return
        }
        
        try {
            android.util.Log.d("RecoveryStatus", "✅ Launching ResetPasswordActivity with phone=$phone")
            startActivity(
                Intent(this, ResetPasswordActivity::class.java)
                    .putExtra("phone", phone)
            )
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        } catch (e: Exception) {
            android.util.Log.e("RecoveryStatus", "❌ Failed: ${e.message}", e)
            android.widget.Toast.makeText(this, "خطأ: ${e.message}", android.widget.Toast.LENGTH_LONG).show()
        }
    }

    private fun clearAndRetry() {
        // امسح الرقم المحفوظ وارجع للصفحة الرئيسية
        sessionManager.clearRecoveryPhone()
        startActivity(Intent(this, LoginActivity::class.java))
        finish()
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        btnRefresh.isEnabled = !loading
        btnResetPassword.isEnabled = !loading
        btnRetry.isEnabled = !loading
    }
}