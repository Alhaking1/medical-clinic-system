package com.medical.clinic.staff.ui.splash

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.medical.clinic.staff.data.local.SessionManager
import com.medical.clinic.staff.data.repository.AuthRepository
import com.medical.clinic.staff.data.utils.Constants
import com.medical.clinic.staff.data.utils.Resource
import com.medical.clinic.staff.databinding.ActivitySplashBinding
import com.medical.clinic.staff.ui.auth.*
import com.medical.clinic.staff.ui.main.MainActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

@SuppressLint("CustomSplashScreen")
@AndroidEntryPoint
class SplashActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySplashBinding

    @Inject
    lateinit var sessionManager: SessionManager

    @Inject
    lateinit var authRepository: AuthRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySplashBinding.inflate(layoutInflater)
        setContentView(binding.root)

        lifecycleScope.launch {
            delay(1200) // Brief animation display
            if (sessionManager.isGuestMode()) {
                startActivity(Intent(this@SplashActivity, MainActivity::class.java))
                finish()
            } else if (sessionManager.isLoggedIn()) {
                refreshAndNavigate()
            } else {
                navigateToRoleSelection()
            }
        }
    }

    private suspend fun refreshAndNavigate() {
        val result = authRepository.getMe()
        val user = (if (result is Resource.Success && result.data != null) result.data else null)
            ?: sessionManager.getUser()

        if (user != null) {
            when {
                user.mustChangePassword == 1 -> {
                    startActivity(Intent(this@SplashActivity, ChangePasswordActivity::class.java))
                }
                user.status == Constants.STATUS_PENDING -> {
                    // الحساب قيد المراجعة: السماح بتصفح التطبيق بحرية
                    startActivity(Intent(this@SplashActivity, MainActivity::class.java))
                }
                user.mustCompleteProfile == 1 -> {
                    if (sessionManager.isDoctor()) {
                        startActivity(Intent(this@SplashActivity, CompleteDoctorProfileActivity::class.java))
                    } else {
                        startActivity(Intent(this@SplashActivity, CompleteSecretaryProfileActivity::class.java))
                    }
                }
                else -> {
                    startActivity(Intent(this@SplashActivity, MainActivity::class.java))
                }
            }
        } else {
            // Token is invalid and no cached user found
            sessionManager.clearSession()
            navigateToRoleSelection()
            return
        }
        finish()
    }

    private fun navigateToRoleSelection() {
        startActivity(Intent(this, RoleSelectionActivity::class.java))
        finish()
    }
}
