package com.medical.clinic.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.medical.clinic.R
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.data.models.User
import com.medical.clinic.ui.main.MainActivity
import com.medical.clinic.utils.Constants
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class GuestLoginActivity : AppCompatActivity() {

    @Inject lateinit var sessionManager: SessionManager

    private var role: String = Constants.ROLE_DOCTOR

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_guest_login)

        role = intent.getStringExtra("role") ?: Constants.ROLE_DOCTOR

        val tvTitle = findViewById<TextView>(R.id.tvTitle)
        val btnCompleteNow = findViewById<Button>(R.id.btnCompleteNow)
        val btnLater = findViewById<Button>(R.id.btnLater)

        // تخصيص حسب الدور
        tvTitle.text = if (role == Constants.ROLE_DOCTOR) {
            "دخول سريع - طبيب"
        } else {
            "دخول سريع - سكرتيرة"
        }

        // زر الرجوع
        findViewById<android.widget.ImageButton>(R.id.btnBack).setOnClickListener {
            finish()
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        }

        // Animations
        val iconContainer = findViewById<View>(R.id.iconContainer)
        iconContainer.alpha = 0f
        iconContainer.animate()
            .alpha(1f)
            .setDuration(500)
            .setStartDelay(100)
            .start()

        // ═══════════════════════════════════════════
        // زر 1: إكمال البيانات الآن
        // ═══════════════════════════════════════════
        btnCompleteNow.setOnClickListener {
            saveTempSession()
            
            val intent = if (role == Constants.ROLE_DOCTOR) {
                Intent(this, CompleteDoctorProfileActivity::class.java)
            } else {
                Intent(this, CompleteSecretaryProfileActivity::class.java)
            }
            startActivity(intent)
            finish()
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        }

        // ═══════════════════════════════════════════
        // زر 2: الإكمال لاحقاً → MainActivity
        // ═══════════════════════════════════════════
        btnLater.setOnClickListener {
            saveTempSession()
            
            startActivity(Intent(this, MainActivity::class.java))
            finish()
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        }
    }

    /**
     * حفظ جلسة مؤقتة (بدون token)
     * id = -1 → يدل على جلسة محلية مؤقتة
     */
    private fun saveTempSession() {
        val tempUser = User(
            id = -1,
            fullName = "",
            phone = null,
            role = role,
            type = role,
            status = "pending",
            mustCompleteProfileRaw = 1
        )
        sessionManager.saveUser(tempUser)
    }
}