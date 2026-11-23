package com.medical.clinic.ui.auth

import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.medical.clinic.R
import com.medical.clinic.data.local.SessionManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class PendingApprovalActivity : AppCompatActivity() {

    @Inject
    lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pending_approval)

        val user = sessionManager.getUser()

        findViewById<TextView>(R.id.tvUserInfo).text = buildString {
            append("👤 الاسم: ${user?.fullName ?: ""}\n")
            append("📧 البريد: ${user?.email ?: "غير محدد"}\n")
            append("📱 الهاتف: ${user?.phone ?: ""}\n")
            append("⏳ الحالة: قيد المراجعة")
        }

        // Animations
        val iconContainer = findViewById<View>(R.id.iconContainer)
        val tvTitle = findViewById<View>(R.id.tvTitle)
        val tvSubtitle = findViewById<View>(R.id.tvSubtitle)
        val infoCard = findViewById<View>(R.id.infoCard)
        val btnLogout = findViewById<Button>(R.id.btnLogout)

        listOf(iconContainer, tvTitle, tvSubtitle, infoCard, btnLogout).forEach {
            it.alpha = 0f
        }

        iconContainer.animate()
            .alpha(1f)
            .scaleX(1f).scaleY(1f)
            .setDuration(500)
            .setInterpolator(OvershootInterpolator())
            .setStartDelay(100)
            .start()

        tvTitle.animate().alpha(1f).setDuration(400).setStartDelay(300).start()
        tvSubtitle.animate().alpha(1f).setDuration(400).setStartDelay(400).start()
        infoCard.animate().alpha(1f).translationY(0f).setDuration(500).setStartDelay(600).start()
        btnLogout.animate().alpha(1f).setDuration(400).setStartDelay(800).start()

        // دوران الأيقونة (الساعة)
        val icon = findViewById<TextView>(R.id.tvIcon)
        val rotateAnimator = ObjectAnimator.ofFloat(icon, "rotation", 0f, 360f).apply {
            duration = 3000
            repeatCount = ValueAnimator.INFINITE
            interpolator = AccelerateDecelerateInterpolator()
        }
        rotateAnimator.start()

        // زر الخروج
        btnLogout.setOnClickListener {
            sessionManager.logout()
            val intent = Intent(this, RoleSelectionActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        }
    }
}