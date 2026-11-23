package com.medical.clinic.ui.splash

import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.medical.clinic.R
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.data.repository.AuthRepository
import com.medical.clinic.ui.auth.ChangePasswordActivity
import com.medical.clinic.ui.auth.CompleteDoctorProfileActivity
import com.medical.clinic.ui.auth.CompleteSecretaryProfileActivity
import com.medical.clinic.ui.auth.LoginActivity
import com.medical.clinic.ui.auth.RecoveryStatusActivity
import com.medical.clinic.ui.main.MainActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class SplashActivity : AppCompatActivity() {

    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var authRepository: AuthRepository

    private val TAG = "SplashActivity"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        lifecycleScope.launch {
            // انتظار خفيف (1.2 ثانية) لعرض هوية وشعار «طبيبك»
            delay(1200)

            // 1. إذا كان المستخدم مسجلاً مسبقاً → جلب البيانات والانتقال للرئيسية
            if (sessionManager.isLoggedIn()) {
                Log.d(TAG, "✅ مسجل مسبقاً → الانتقال للشاشة الرئيسية")
                refreshAndNavigate()
                return@launch
            }

            // 2. التحقق من وجود طلب استعادة كلمة المرور
            val recoveryPhone = sessionManager.getRecoveryPhone()
            if (!recoveryPhone.isNullOrBlank()) {
                Log.d(TAG, "🔄 يوجد طلب استعادة محفوظ: $recoveryPhone")
                checkRecoveryAndNavigate(recoveryPhone)
                return@launch
            }

            // 3. غير مسجل → الانتقال لشاشة تسجيل الدخول بدون أي نوافذ منبثقة إجبارية
            Log.d(TAG, "ℹ️ غير مسجل → شاشة تسجيل الدخول")
            navigateToLogin()
        }
    }

    private fun refreshAndNavigate() {
        lifecycleScope.launch {
            try {
                val result = authRepository.getMe()
                if (result.isSuccess) {
                    Log.d(TAG, "✅ تم تحديث بيانات المستخدم من الخادم")
                }
            } catch (e: Exception) {
                Log.e(TAG, "getMe failed: ${e.message}")
            }
            navigate()
        }
    }

    private fun navigate() {
        val user = sessionManager.getUser()

        val intent = when {
            !sessionManager.isLoggedIn() ->
                Intent(this, LoginActivity::class.java)

            sessionManager.mustChangePassword() ->
                Intent(this, ChangePasswordActivity::class.java)

            user?.status == "approved" ->
                Intent(this, MainActivity::class.java)

            user?.mustCompleteProfile == true -> {
                if (user.isDoctor) {
                    Intent(this, CompleteDoctorProfileActivity::class.java)
                } else {
                    Intent(this, CompleteSecretaryProfileActivity::class.java)
                }
            }

            user?.status == "pending" ->
                Intent(this, MainActivity::class.java)

            else ->
                Intent(this, LoginActivity::class.java)
        }

        startActivity(intent)
        finish()
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
    }

    private fun navigateToLogin() {
        startActivity(Intent(this, LoginActivity::class.java))
        finish()
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
    }

    private fun checkRecoveryAndNavigate(phone: String) {
        lifecycleScope.launch {
            try {
                val result = authRepository.checkRecoveryStatus(phone)
                if (result.isSuccess) {
                    val data = result.getOrNull()
                    if (data != null && data.has_request) {
                        Log.d(TAG, "✅ يوجد طلب استعادة — التوجيه إلى RecoveryStatusActivity")
                        startActivity(
                            Intent(this@SplashActivity, RecoveryStatusActivity::class.java)
                                .putExtra("phone", phone)
                        )
                        finish()
                        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
                        return@launch
                    }
                }

                sessionManager.clearRecoveryPhone()
                navigateToLogin()

            } catch (e: Exception) {
                Log.e(TAG, "❌ فشل التحقق من طلب الاستعادة: ${e.message}")
                navigateToLogin()
            }
        }
    }
}