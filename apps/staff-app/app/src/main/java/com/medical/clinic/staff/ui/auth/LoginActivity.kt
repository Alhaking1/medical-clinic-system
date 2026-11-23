package com.medical.clinic.staff.ui.auth

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.medical.clinic.staff.R
import com.medical.clinic.staff.data.local.SessionManager
import com.medical.clinic.staff.data.repository.AuthRepository
import com.medical.clinic.staff.data.models.User
import com.medical.clinic.staff.data.utils.Constants
import com.medical.clinic.staff.data.utils.Resource
import com.medical.clinic.staff.databinding.ActivityLoginBinding
import com.medical.clinic.staff.ui.main.MainActivity
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.CustomCredential
import androidx.credentials.Credential
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private var role: String = Constants.ROLE_DOCTOR
    private var googleSignInInProgress = false

    @Inject
    lateinit var authRepository: AuthRepository

    @Inject
    lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        role = intent.getStringExtra(Constants.EXTRA_ROLE) ?: Constants.ROLE_DOCTOR
        updateRoleUI()
        setupListeners()
    }

    private fun updateRoleUI() {
        if (role == Constants.ROLE_DOCTOR) {
            binding.tvRoleBadge.text = "👨‍⚕️ طبيب"
            binding.tvLoginTitle.text = getString(R.string.login_title_doctor)
        } else {
            binding.tvRoleBadge.text = "👩‍💼 سكرتيرة"
            binding.tvLoginTitle.text = getString(R.string.login_title_secretary)
        }
    }

    private fun setupListeners() {
        binding.cardBtnBack.setOnClickListener { finish() }
        binding.btnBack.setOnClickListener { finish() }

        // Fast Guest Login: Opens MainActivity immediately without requiring profile completion
        binding.btnGuestLogin.setOnClickListener {
            sessionManager.setGuestMode(true, role)
            val guestUser = User(
                id = 0,
                fullName = if (role == Constants.ROLE_DOCTOR) "طبيب (دخول تجريبي)" else "سكرتيرة (دخول تجريبي)",
                role = role,
                type = role,
                status = "guest",
                mustCompleteProfile = 1
            )
            sessionManager.saveUser(guestUser)

            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            startActivity(intent)
            finish()
        }

        binding.btnGoogleLogin.setOnClickListener {
            launchGoogleSignIn()
        }

        binding.tvForgotPassword.setOnClickListener {
            val intent = Intent(this, ForgotPasswordActivity::class.java).apply {
                putExtra(Constants.EXTRA_ROLE, role)
            }
            startActivity(intent)
        }

        binding.tvLoginPrivacyPolicy.setOnClickListener {
            startActivity(Intent(this, com.medical.clinic.staff.ui.legal.PrivacyPolicyActivity::class.java))
        }

        com.medical.clinic.staff.ui.utils.InputValidationUtils.applyPasswordRules(binding.etPassword, 8)

        binding.btnLogin.setOnClickListener {
            val identifier = com.medical.clinic.staff.ui.utils.InputValidationUtils.sanitize(binding.etLogin.text?.toString())
            val password = binding.etPassword.text?.toString()?.trim() ?: ""

            if (identifier.isEmpty()) {
                binding.tilLogin.error = getString(R.string.field_required)
                return@setOnClickListener
            }
            binding.tilLogin.error = null

            if (password.isEmpty()) {
                binding.tilPassword.error = getString(R.string.field_required)
                return@setOnClickListener
            }
            if (password.length > 8) {
                binding.tilPassword.error = "كلمة المرور يجب ألا تزيد عن 8 أحرف أو أرقام"
                return@setOnClickListener
            }
            binding.tilPassword.error = null

            performLogin(identifier, password)
        }
    }

    private fun launchGoogleSignIn() {
        if (googleSignInInProgress) return
        googleSignInInProgress = true
        binding.btnGoogleLogin.isEnabled = false
        binding.btnLogin.isEnabled = false
        binding.pbLogin.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                val credentialManager = CredentialManager.create(this@LoginActivity)
                val googleIdOption = GetGoogleIdOption.Builder()
                    .setServerClientId(Constants.GOOGLE_WEB_CLIENT_ID)
                    .setFilterByAuthorizedAccounts(false)
                    .build()
                val request = GetCredentialRequest.Builder()
                    .addCredentialOption(googleIdOption)
                    .build()

                val googleCredential = getGoogleIdTokenCredential(credentialManager, request)
                when (val result = authRepository.loginWithGoogle(googleCredential.idToken, role)) {
                    is Resource.Success -> handleLoginSuccess(result.data)
                    is Resource.Error -> {
                        Log.w(TAG, "Google authentication was rejected by the server: ${result.message}")
                        Toast.makeText(this@LoginActivity, result.message, Toast.LENGTH_LONG).show()
                    }
                    else -> Unit
                }
            } catch (e: GetCredentialCancellationException) {
                Log.i(TAG, "Google account selection was canceled", e)
                Toast.makeText(this@LoginActivity, "لم يكتمل اختيار حساب Google", Toast.LENGTH_LONG).show()
            } catch (e: NoCredentialException) {
                val message = e.message.orEmpty()
                if (message.contains("Developer console is not set up correctly", ignoreCase = true) ||
                    message.contains("not registered to use OAuth2.0", ignoreCase = true)
                ) {
                    Log.e(TAG, "Google OAuth client is not registered for this app", e)
                    Toast.makeText(
                        this@LoginActivity,
                        "إعداد Google OAuth غير صحيح. تحقق من تسجيل اسم الحزمة وبصمة SHA-1 في مشروع Google Cloud الصحيح.",
                        Toast.LENGTH_LONG
                    ).show()
                } else {
                    Log.w(TAG, "No Google credential is available", e)
                    Toast.makeText(
                        this@LoginActivity,
                        "لم يتم العثور على حساب Google متاح على الجهاز. أضف حساباً إلى الجهاز أو سجّل الدخول برقم الهاتف وكلمة المرور",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } catch (e: GoogleIdTokenParsingException) {
                Log.e(TAG, "Could not parse Google ID token", e)
                Toast.makeText(this@LoginActivity, "تعذر قراءة رمز تسجيل الدخول من Google", Toast.LENGTH_LONG).show()
            } catch (e: GetCredentialException) {
                Log.e(TAG, "Google credential request failed: ${e.type}", e)
                Toast.makeText(
                    this@LoginActivity,
                    "تعذر إكمال تسجيل الدخول عبر Google (${e.localizedMessage ?: "تأكد من الاتصال"}). يمكنك استخدام رقم الهاتف",
                    Toast.LENGTH_LONG
                ).show()
            } catch (e: Exception) {
                Log.e(TAG, "Unexpected Google sign-in failure", e)
                Toast.makeText(this@LoginActivity, "تعذر إكمال تسجيل الدخول عبر Google", Toast.LENGTH_LONG).show()
            } finally {
                googleSignInInProgress = false
                if (!isFinishing && !isDestroyed) {
                    binding.btnGoogleLogin.isEnabled = true
                    binding.btnLogin.isEnabled = true
                    binding.pbLogin.visibility = View.GONE
                }
            }
        }
    }

    private suspend fun getGoogleIdTokenCredential(
        credentialManager: CredentialManager,
        request: GetCredentialRequest
    ): GoogleIdTokenCredential {
        val result = credentialManager.getCredential(
            context = this@LoginActivity,
            request = request
        )
        val credential: Credential = result.credential
        if (credential !is CustomCredential ||
            credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
        ) {
            throw IllegalStateException("نوع بيانات اعتماد Google غير معروف")
        }
        return GoogleIdTokenCredential.createFrom(credential.data)
    }

    private fun performLogin(identifier: String, pass: String) {
        binding.btnLogin.isEnabled = false
        binding.btnLogin.text = ""
        binding.pbLogin.visibility = View.VISIBLE

        lifecycleScope.launch {
            val result = authRepository.loginWithPassword(identifier, pass, role)
            binding.btnLogin.isEnabled = true
            binding.btnLogin.text = getString(R.string.login_button)
            binding.pbLogin.visibility = View.GONE

            when (result) {
                is Resource.Success -> {
                    handleLoginSuccess(result.data)
                }
                is Resource.Error -> {
                    Toast.makeText(this@LoginActivity, result.message, Toast.LENGTH_LONG).show()
                }
                else -> {}
            }
        }
    }

    private fun handleLoginSuccess(user: User?) {
        if (user?.mustChangePassword == 1) {
            startActivity(Intent(this@LoginActivity, ChangePasswordActivity::class.java))
        } else if (user?.status == Constants.STATUS_PENDING) {
            Toast.makeText(this@LoginActivity, "حسابك قيد المراجعة والاعتماد ⏳ يمكنك تصفح التطبيق", Toast.LENGTH_LONG).show()
            val intent = Intent(this@LoginActivity, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            startActivity(intent)
        } else if (user?.mustCompleteProfile == 1) {
            if (role == Constants.ROLE_DOCTOR) {
                startActivity(Intent(this@LoginActivity, CompleteDoctorProfileActivity::class.java))
            } else {
                startActivity(Intent(this@LoginActivity, CompleteSecretaryProfileActivity::class.java))
            }
        } else {
            val intent = Intent(this@LoginActivity, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            startActivity(intent)
        }
        finish()
    }

    companion object {
        private const val TAG = "LoginActivity"
    }
}
