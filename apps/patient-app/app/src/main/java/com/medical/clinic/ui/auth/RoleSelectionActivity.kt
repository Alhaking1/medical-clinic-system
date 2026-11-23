package com.medical.clinic.ui.auth

import android.animation.ObjectAnimator
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.animation.OvershootInterpolator
import androidx.appcompat.app.AppCompatActivity
import androidx.core.animation.doOnEnd
import com.medical.clinic.R
import com.medical.clinic.utils.Constants
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class RoleSelectionActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_role_selection)

        // Animations للدخول
        val logoContainer = findViewById<View>(R.id.logoContainer)
        val tvWelcome = findViewById<View>(R.id.tvWelcome)
        val tvSubtitle = findViewById<View>(R.id.tvSubtitle)
        val cardDoctor = findViewById<View>(R.id.cardDoctor)
        val cardSecretary = findViewById<View>(R.id.cardSecretary)

        // إخفاء مبدئي
        listOf(logoContainer, tvWelcome, tvSubtitle, cardDoctor, cardSecretary).forEach {
            it.alpha = 0f
        }

        // Logo — يظهر أولاً
        logoContainer.animate()
            .alpha(1f)
            .scaleX(1f).scaleY(1f)
            .setDuration(500)
            .setInterpolator(OvershootInterpolator())
            .setStartDelay(100)
            .start()

        // Welcome
        tvWelcome.animate()
            .alpha(1f)
            .translationY(0f)
            .setDuration(400)
            .setStartDelay(300)
            .start()

        tvSubtitle.animate()
            .alpha(1f)
            .setDuration(400)
            .setStartDelay(400)
            .start()

        // Cards — تظهر تباعاً
        cardDoctor.animate()
            .alpha(1f)
            .setDuration(500)
            .setStartDelay(600)
            .start()

        cardSecretary.animate()
            .alpha(1f)
            .setDuration(500)
            .setStartDelay(750)
            .start()

        // بطاقة الطبيب
        cardDoctor.setOnClickListener {
            animateClick(it) {
                openLogin(Constants.ROLE_DOCTOR)
            }
        }

        // بطاقة السكرتيرة
        cardSecretary.setOnClickListener {
            animateClick(it) {
                openLogin(Constants.ROLE_SECRETARY)
            }
        }
    }

    private fun animateClick(view: View, onComplete: () -> Unit) {
        ObjectAnimator.ofFloat(view, "scaleX", 1f, 0.95f, 1f).apply {
            duration = 200
            start()
        }
        ObjectAnimator.ofFloat(view, "scaleY", 1f, 0.95f, 1f).apply {
            duration = 200
            doOnEnd { onComplete() }
            start()
        }
    }

    private fun openLogin(role: String) {
        val intent = Intent(this, LoginActivity::class.java)
        intent.putExtra("role", role)
        startActivity(intent)
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
    }
}