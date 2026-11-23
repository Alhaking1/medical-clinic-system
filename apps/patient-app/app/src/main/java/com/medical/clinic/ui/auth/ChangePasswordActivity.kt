package com.medical.clinic.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.medical.clinic.R
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.ui.main.MainActivity
import com.medical.clinic.viewmodel.AuthViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class ChangePasswordActivity : AppCompatActivity() {

    private val viewModel: AuthViewModel by viewModels()

    @Inject
    lateinit var sessionManager: SessionManager

    private lateinit var etCurrentPassword: EditText
    private lateinit var etNewPassword: EditText
    private lateinit var etConfirmPassword: EditText
    private lateinit var btnSave: Button
    private lateinit var progressBar: ProgressBar

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_change_password)

        etCurrentPassword = findViewById(R.id.etCurrentPassword)
        etNewPassword = findViewById(R.id.etNewPassword)
        etConfirmPassword = findViewById(R.id.etConfirmPassword)
        btnSave = findViewById(R.id.btnSave)
        progressBar = findViewById(R.id.progressBar)

        // إذا كان must_change_password = false، أخفِ حقل كلمة المرور الحالية
        val user = sessionManager.getUser()
        if (user?.mustChangePassword == false) {
            findViewById<View>(R.id.layoutCurrentPassword).visibility = View.VISIBLE
        } else {
            findViewById<View>(R.id.layoutCurrentPassword).visibility = View.GONE
        }

        btnSave.setOnClickListener {
            val current = etCurrentPassword.text.toString().trim()
            val newPass = etNewPassword.text.toString().trim()
            val confirm = etConfirmPassword.text.toString().trim()

            // التحقق
            if (user?.mustChangePassword == false && current.isEmpty()) {
                etCurrentPassword.error = "كلمة المرور الحالية مطلوبة"
                return@setOnClickListener
            }

            if (newPass.length < 8) {
                etNewPassword.error = "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
                return@setOnClickListener
            }

            if (!newPass.contains(Regex("[A-Z]"))) {
                etNewPassword.error = "يجب أن تحتوي على حرف كبير"
                return@setOnClickListener
            }

            if (!newPass.contains(Regex("[a-z]"))) {
                etNewPassword.error = "يجب أن تحتوي على حرف صغير"
                return@setOnClickListener
            }

            if (!newPass.contains(Regex("[0-9]"))) {
                etNewPassword.error = "يجب أن تحتوي على رقم"
                return@setOnClickListener
            }

            if (newPass != confirm) {
                etConfirmPassword.error = "كلمتا المرور غير متطابقتين"
                return@setOnClickListener
            }

            val currentPass = if (user?.mustChangePassword == false) current else null
            viewModel.setPassword(newPass, currentPass)
        }

        observePasswordState()
    }

    private fun observePasswordState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.passwordState.collect { state ->
                    when (state) {
                        is AuthViewModel.PasswordState.Idle -> setLoading(false)
                        is AuthViewModel.PasswordState.Loading -> setLoading(true)
                        is AuthViewModel.PasswordState.Success -> {
                            setLoading(false)
                            Toast.makeText(
                                this@ChangePasswordActivity,
                                "تم تغيير كلمة المرور بنجاح",
                                Toast.LENGTH_SHORT
                            ).show()

                            startActivity(Intent(this@ChangePasswordActivity, MainActivity::class.java))
                            finish()
                        }
                        is AuthViewModel.PasswordState.Error -> {
                            setLoading(false)
                            Toast.makeText(
                                this@ChangePasswordActivity,
                                state.message,
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    }
                }
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        btnSave.isEnabled = !loading
        btnSave.text = if (loading) "جاري الحفظ..." else "حفظ كلمة المرور"
    }
}