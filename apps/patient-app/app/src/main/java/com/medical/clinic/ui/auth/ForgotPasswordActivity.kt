package com.medical.clinic.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.EditText
import android.widget.ImageButton
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
import com.medical.clinic.utils.Constants
import com.medical.clinic.viewmodel.AuthViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class ForgotPasswordActivity : AppCompatActivity() {

    private val viewModel: AuthViewModel by viewModels()

    private lateinit var btnBack: ImageButton
    private lateinit var btnGoogleSignIn: MaterialButton
    private lateinit var btnContinue: MaterialButton
    private lateinit var btnGuestLogin: MaterialButton
    private lateinit var etLogin: EditText
    private lateinit var progressBar: ProgressBar
    private lateinit var tvResult: TextView

    private var role: String = Constants.ROLE_DOCTOR

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_forgot_password)

        role = intent.getStringExtra("role") ?: Constants.ROLE_DOCTOR

        btnBack = findViewById(R.id.btnBack)
        btnGoogleSignIn = findViewById(R.id.btnGoogleSignIn)
        btnContinue = findViewById(R.id.btnContinue)
        btnGuestLogin = findViewById(R.id.btnGuestLogin)
        etLogin = findViewById(R.id.etLogin)
        progressBar = findViewById(R.id.progressBar)
        tvResult = findViewById(R.id.tvResult)

        btnBack.setOnClickListener {
            finish()
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        }

        etLogin.setOnFocusChangeListener { _, hasFocus ->
            if (hasFocus) etLogin.error = null
        }

        btnContinue.setOnClickListener { onContinueClick() }

        btnGoogleSignIn.setOnClickListener { openGoogleSignIn() }

        btnGuestLogin.setOnClickListener {
            // (A) → RoleSelectionActivity
            startActivity(Intent(this, RoleSelectionActivity::class.java))
            finish()
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        }

        observeCheckAccountState()
    }

    private fun onContinueClick() {
        val login = etLogin.text.toString().trim()

        if (login.isEmpty()) {
            etLogin.error = "أدخل رقم الهاتف أو البريد الإلكتروني"
            etLogin.requestFocus()
            return
        }

        // التحقق من الصيغة
        val isEmail = android.util.Patterns.EMAIL_ADDRESS.matcher(login).matches()
        val isPhone = login.matches(Regex("^(70|71|73|77|78)\\d{7}$"))

        if (!isEmail && !isPhone) {
            etLogin.error = "أدخل رقم هاتف صحيح (9 أرقام تبدأ بـ 70/71/73/77/78) أو بريدًا إلكترونيًا صحيحًا"
            etLogin.requestFocus()
            return
        }

        viewModel.checkAccountExists(login)
    }

    private fun observeCheckAccountState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.checkAccountState.collect { state ->
                    when (state) {
                        is AuthViewModel.CheckAccountState.Idle -> setLoading(false)
                        is AuthViewModel.CheckAccountState.Loading -> setLoading(true)
                        is AuthViewModel.CheckAccountState.Success -> {
                            setLoading(false)
                            handleCheckAccountResponse(state.response)
                        }
                        is AuthViewModel.CheckAccountState.Error -> {
                            setLoading(false)
                            Toast.makeText(
                                this@ForgotPasswordActivity,
                                "خطأ: ${state.message}",
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    }
                }
            }
        }
    }

    private fun handleCheckAccountResponse(response: com.medical.clinic.data.api.CheckAccountResponse) {
        val login = etLogin.text.toString().trim()

        if (!response.account_exists) {
            // 📝 الحساب غير موجود → RoleSelection
            Toast.makeText(
                this,
                "الحساب غير مسجل — سيتم توجيهك للتسجيل",
                Toast.LENGTH_LONG
            ).show()

            startActivity(
                Intent(this, RoleSelectionActivity::class.java)
                    .putExtra("from_recovery", true)
                    .putExtra("login", login)
            )
            finish()
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
            return
        }

        // ✅ الحساب موجود → انتقل إلى VerifyOldPasswordActivity
        val userRole = response.user_type ?: role

        startActivity(
            Intent(this, VerifyOldPasswordActivity::class.java)
                .putExtra("login", login)
                .putExtra("user_role", userRole)
                .putExtra("has_password", response.has_password)
                .putExtra("has_google", response.has_google)
                .putExtra("display_name", response.display_name)
        )
        finish()
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
    }

    private fun openGoogleSignIn() {
        // (C) → Google Sign-In
        // نستخدم launchGoogleSignIn الموجودة (سننقلها هنا أو نستخدمها من LoginActivity)
        Toast.makeText(
            this,
            "Google Sign-In — قريبًا",
            Toast.LENGTH_SHORT
        ).show()

        // TODO: نُطبق Google Sign-In هنا (نفس ما في LoginActivity)
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        btnContinue.isEnabled = !loading
        btnGoogleSignIn.isEnabled = !loading
        btnGuestLogin.isEnabled = !loading
        btnBack.isEnabled = !loading
        etLogin.isEnabled = !loading
    }
}