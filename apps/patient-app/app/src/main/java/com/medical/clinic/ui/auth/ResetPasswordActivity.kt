package com.medical.clinic.ui.auth

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
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
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.medical.clinic.R
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.viewmodel.AuthViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class ResetPasswordActivity : AppCompatActivity() {

    private val viewModel: AuthViewModel by viewModels()

    @Inject
    lateinit var sessionManager: SessionManager

    private lateinit var tilPassword: TextInputLayout
    private lateinit var tilConfirmPassword: TextInputLayout
    private lateinit var etPassword: TextInputEditText
    private lateinit var etConfirmPassword: TextInputEditText
    private lateinit var tvReqLength: TextView
    private lateinit var tvReqUpper: TextView
    private lateinit var tvReqLower: TextView
    private lateinit var tvReqNumber: TextView
    private lateinit var tvReqMatch: TextView
    private lateinit var btnReset: MaterialButton
    private lateinit var progressBar: ProgressBar
    private lateinit var tvResult: TextView

    private var phone: String? = null
    private var detectedRole: String = "doctor"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_reset_password)

        tilPassword = findViewById(R.id.tilPassword)
        tilConfirmPassword = findViewById(R.id.tilConfirmPassword)
        etPassword = findViewById(R.id.etPassword)
        etConfirmPassword = findViewById(R.id.etConfirmPassword)
        tvReqLength = findViewById(R.id.tvReqLength)
        tvReqUpper = findViewById(R.id.tvReqUpper)
        tvReqLower = findViewById(R.id.tvReqLower)
        tvReqNumber = findViewById(R.id.tvReqNumber)
        tvReqMatch = findViewById(R.id.tvReqMatch)
        btnReset = findViewById(R.id.btnReset)
        progressBar = findViewById(R.id.progressBar)
        tvResult = findViewById(R.id.tvResult)

        // استقبل phone و detected_role من Intent
        phone = intent.getStringExtra("phone") ?: sessionManager.getRecoveryPhone()
        detectedRole = intent.getStringExtra("detected_role") ?: "doctor"

        if (phone.isNullOrBlank()) {
            Toast.makeText(this, "لا يوجد رقم محفوظ", Toast.LENGTH_LONG).show()
            finish()
            return
        }

        // TextWatcher للتحقق الفوري
        val watcher = object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) {}
            override fun onTextChanged(s: CharSequence?, st: Int, b: Int, c: Int) {
                updateRequirements()
            }
            override fun afterTextChanged(s: Editable?) {}
        }

        etPassword.addTextChangedListener(watcher)
        etConfirmPassword.addTextChangedListener(watcher)

        btnReset.setOnClickListener { onSubmit() }

        observeResetPasswordState()
    }

    private fun updateRequirements() {
        val password = etPassword.text?.toString() ?: ""
        val confirm = etConfirmPassword.text?.toString() ?: ""

        updateReq(tvReqLength, password.length >= 8)
        updateReq(tvReqUpper, password.any { it.isUpperCase() })
        updateReq(tvReqLower, password.any { it.isLowerCase() })
        updateReq(tvReqNumber, password.any { it.isDigit() })
        updateReq(tvReqMatch, password.isNotEmpty() && password == confirm)
    }

    private fun updateReq(view: TextView, satisfied: Boolean) {
        if (satisfied) {
            view.text = view.text.toString().replace("⬜", "✅")
            view.setTextColor(getColor(R.color.brand_secondary))
        } else {
            view.text = view.text.toString().replace("✅", "⬜")
            view.setTextColor(getColor(R.color.on_surface_dark_tertiary))
        }
    }

    private fun onSubmit() {
        val password = etPassword.text?.toString() ?: ""
        val confirm = etConfirmPassword.text?.toString() ?: ""

        if (password.length < 8) {
            tilPassword.error = "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
            return
        }
        if (!password.any { it.isUpperCase() }) {
            tilPassword.error = "يجب إضافة حرف كبير (A-Z)"
            return
        }
        if (!password.any { it.isLowerCase() }) {
            tilPassword.error = "يجب إضافة حرف صغير (a-z)"
            return
        }
        if (!password.any { it.isDigit() }) {
            tilPassword.error = "يجب إضافة رقم واحد على الأقل"
            return
        }
        if (password != confirm) {
            tilConfirmPassword.error = "كلمتا المرور غير متطابقتين"
            return
        }

        tilPassword.error = null
        tilConfirmPassword.error = null

        viewModel.resetPasswordWithRecovery(phone!!, password)
    }

    private fun observeResetPasswordState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.resetPasswordState.collect { state ->
                    when (state) {
                        is AuthViewModel.ResetPasswordState.Idle -> setLoading(false)
                        is AuthViewModel.ResetPasswordState.Loading -> {
                            setLoading(true)
                            tvResult.visibility = View.GONE
                        }
                        is AuthViewModel.ResetPasswordState.Success -> {
                            setLoading(false)
                            // ابدأ الدخول التلقائي
                            autoLogin(state.message)
                        }
                        is AuthViewModel.ResetPasswordState.Error -> {
                            setLoading(false)
                            showError(state.message)
                        }
                    }
                }
            }
        }
    }

    private fun autoLogin(successMessage: String) {
        val p = phone ?: return
        val pw = etPassword.text?.toString() ?: return

        tvResult.text = "✅ $successMessage\nجاري تسجيل الدخول..."
        tvResult.setTextColor(getColor(R.color.brand_secondary))
        tvResult.visibility = View.VISIBLE

        // استمع لحالة loginState
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.loginState.collect { state ->
                    when (state) {
                        is AuthViewModel.LoginState.Success -> {
                            sessionManager.clearRecoveryPhone()
                            Toast.makeText(
                                this@ResetPasswordActivity,
                                "مرحبًا ${state.user.fullName ?: ""}",
                                Toast.LENGTH_LONG
                            ).show()

                            // انتقل مباشرة إلى MainActivity
                            startActivity(
                                Intent(this@ResetPasswordActivity, com.medical.clinic.ui.main.MainActivity::class.java)
                            )
                            finishAffinity()
                            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
                        }
                        is AuthViewModel.LoginState.Error -> {
                            Toast.makeText(
                                this@ResetPasswordActivity,
                                "فشل الدخول التلقائي — سجّل يدويًا",
                                Toast.LENGTH_LONG
                            ).show()

                            startActivity(
                                Intent(this@ResetPasswordActivity, LoginActivity::class.java)
                                    .putExtra("role", detectedRole)
                            )
                            finish()
                            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
                        }
                        else -> { /* Loading/Idle — تجاهل */ }
                    }
                }
            }
        }

        // استدعِ دالة الدخول
        viewModel.autoLoginAfterReset(p, pw, detectedRole)
    }

    private fun showError(message: String) {
        tvResult.text = "❌ $message"
        tvResult.setTextColor(getColor(android.R.color.holo_red_light))
        tvResult.visibility = View.VISIBLE
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        btnReset.isEnabled = !loading
        etPassword.isEnabled = !loading
        etConfirmPassword.isEnabled = !loading
    }
}