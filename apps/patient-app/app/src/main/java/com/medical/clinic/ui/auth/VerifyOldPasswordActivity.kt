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
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.medical.clinic.R
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.viewmodel.AuthViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class VerifyOldPasswordActivity : AppCompatActivity() {

    private val viewModel: AuthViewModel by viewModels()

    @Inject
    lateinit var sessionManager: SessionManager

    private lateinit var btnBack: ImageButton
    private lateinit var tvDisplayName: TextView
    private lateinit var tvSubtitle: TextView
    private lateinit var tilPassword: TextInputLayout
    private lateinit var etOldPassword: TextInputEditText
    private lateinit var tvGoogleNote: TextView
    private lateinit var etFullName: EditText
    private lateinit var btnVerify: MaterialButton
    private lateinit var progressBar: ProgressBar
    private lateinit var tvResult: TextView

    private var login: String = ""
    private var userRole: String = "doctor"
    private var hasPassword: Boolean = true
    private var hasGoogle: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_verify_password)

        login = intent.getStringExtra("login") ?: ""
        userRole = intent.getStringExtra("user_role") ?: "doctor"
        hasPassword = intent.getBooleanExtra("has_password", true)
        hasGoogle = intent.getBooleanExtra("has_google", false)
        val displayName = intent.getStringExtra("display_name")

        if (login.isBlank()) {
            Toast.makeText(this, "خطأ في البيانات", Toast.LENGTH_LONG).show()
            finish()
            return
        }

        btnBack = findViewById(R.id.btnBack)
        tvDisplayName = findViewById(R.id.tvDisplayName)
        tvSubtitle = findViewById(R.id.tvSubtitle)
        tilPassword = findViewById(R.id.tilPassword)
        etOldPassword = findViewById(R.id.etOldPassword)
        tvGoogleNote = findViewById(R.id.tvGoogleNote)
        etFullName = findViewById(R.id.etFullName)
        btnVerify = findViewById(R.id.btnVerify)
        progressBar = findViewById(R.id.progressBar)
        tvResult = findViewById(R.id.tvResult)

        btnBack.setOnClickListener {
            finish()
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        }

        // عرض اسم المستخدم
        tvDisplayName.text = displayName ?: ""

        // إذا الحساب Google فقط (بدون pw)
        if (!hasPassword && hasGoogle) {
            tvSubtitle.text = "حسابك مسجل بـ Google — لا تحتاج كلمة مرور"
            tvGoogleNote.visibility = View.VISIBLE
            tilPassword.visibility = View.GONE
            etFullName.visibility = View.GONE
            btnVerify.text = "🔓 متابعة لتعيين كلمة مرور جديدة"
        } else {
            // حساب عادي — يحتاج pw
            tvGoogleNote.visibility = View.GONE
            tilPassword.visibility = View.VISIBLE
            etFullName.visibility = View.VISIBLE
        }

        etOldPassword.setOnFocusChangeListener { _, hasFocus ->
            if (hasFocus) tilPassword.error = null
        }

        btnVerify.setOnClickListener { onVerifyClick() }

        observeRecoveryState()
    }

    private fun onVerifyClick() {
        val oldPassword = etOldPassword.text?.toString() ?: ""
        val fullName = etFullName.text?.toString()?.trim() ?: ""

        // إذا Google فقط → لا يحتاج pw
        if (!hasPassword && hasGoogle) {
            viewModel.requestRecoveryWithPassword(login, null, fullName)
            return
        }

        // حساب عادي → pw مطلوبة
        if (oldPassword.isEmpty()) {
            tilPassword.error = "أدخل كلمة المرور القديمة"
            return
        }

        // إذا كان الاسم فارغًا، أعطِ تنبيهًا
        if (fullName.isEmpty()) {
            // اسم افتراضي
            viewModel.requestRecoveryWithPassword(login, oldPassword, null)
            return
        }

        viewModel.requestRecoveryWithPassword(login, oldPassword, fullName)
    }

    private fun observeRecoveryState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.recoveryState.collect { state ->
                    when (state) {
                        is AuthViewModel.RecoveryState.Idle -> setLoading(false)
                        is AuthViewModel.RecoveryState.Loading -> setLoading(true)
                        is AuthViewModel.RecoveryState.Success -> {
                            setLoading(false)
                            handleResponse(state.response)
                        }
                        is AuthViewModel.RecoveryState.Error -> {
                            setLoading(false)
                            showError(state.message)
                        }
                    }
                }
            }
        }
    }

    private fun handleResponse(response: com.medical.clinic.data.api.RecoveryRequestResponse) {
        // حفظ الرقم
        sessionManager.saveRecoveryPhone(login)

        if (response.auto_approved == true) {
            // 🚀 اعتماد تلقائي → ResetPasswordActivity مباشرة
            Toast.makeText(
                this,
                "✅ ${response.message ?: "تم التحقق"}",
                Toast.LENGTH_LONG
            ).show()

            startActivity(
                Intent(this, ResetPasswordActivity::class.java)
                    .putExtra("phone", login)
                    .putExtra("detected_role", response.user_role ?: userRole)
                    .putExtra("auto_approved", true)
            )
            finish()
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)

        } else if (response.requires_admin_review == true) {
            // 📋 مراجعة أدمن → RecoveryStatusActivity
            Toast.makeText(
                this,
                "⏳ ${response.message ?: "قيد المراجعة"}",
                Toast.LENGTH_LONG
            ).show()

            startActivity(
                Intent(this, RecoveryStatusActivity::class.java)
                    .putExtra("phone", login)
            )
            finish()
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)

        } else if (response.action == "register_new") {
            // 📝 حساب جديد → RoleSelectionActivity
            Toast.makeText(
                this,
                "الحساب غير مسجل — سيتم توجيهك للتسجيل",
                Toast.LENGTH_LONG
            ).show()

            sessionManager.clearRecoveryPhone()

            startActivity(
                Intent(this, RoleSelectionActivity::class.java)
                    .putExtra("from_recovery", true)
                    .putExtra("login", login)
            )
            finish()
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)

        } else {
            showError(response.message ?: "خطأ غير متوقع")
        }
    }

    private fun showError(message: String) {
        tvResult.text = "❌ $message"
        tvResult.setTextColor(getColor(android.R.color.holo_red_light))
        tvResult.visibility = View.VISIBLE
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        btnVerify.isEnabled = !loading
        btnBack.isEnabled = !loading
        etOldPassword.isEnabled = !loading
        etFullName.isEnabled = !loading
    }
}