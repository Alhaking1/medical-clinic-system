package com.medical.clinic.ui.auth

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import com.medical.clinic.R
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.data.models.User
import com.medical.clinic.ui.main.MainActivity
import com.medical.clinic.utils.Constants
import com.medical.clinic.viewmodel.AuthViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import java.util.concurrent.Executor
import javax.inject.Inject

import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.tasks.Task
import androidx.activity.result.contract.ActivityResultContracts

@AndroidEntryPoint
class LoginActivity : AppCompatActivity() {

    private val viewModel: AuthViewModel by viewModels()

    @Inject
    lateinit var sessionManager: SessionManager

    @Inject
    lateinit var authRepository: com.medical.clinic.data.repository.AuthRepository

    private lateinit var googleSignInClient: GoogleSignInClient

    private val googleSignInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val task: Task<GoogleSignInAccount> = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        try {
            val account = task.getResult(ApiException::class.java)
            val idToken = account?.idToken
            if (!idToken.isNullOrBlank()) {
                Log.d(TAG, "✅ Got ID Token via GoogleSignInClient: ${idToken.take(15)}...")
                tvHint.text = "جاري التحقق من الحساب مع السيرفر..."
                setLoading(true)
                viewModel.loginWithGoogle(idToken, role)
            } else {
                Toast.makeText(this, "تعذر الحصول على رمز تعريف Google (idToken null)", Toast.LENGTH_LONG).show()
            }
        } catch (e: ApiException) {
            Log.e(TAG, "GoogleSignInClient failed with statusCode: ${e.statusCode}", e)
            setLoading(false)
            if (e.statusCode == 12500 || e.statusCode == 10 || e.statusCode == 8) {
                // فتح شاشة اختيار حساب Google الفعلي
                launchGoogleSignIn()
                return@registerForActivityResult
            }
            val explanation = when (e.statusCode) {
                7 -> "كود 7: تحقق من اتصالك بالإنترنت"
                16 -> "تم إلغاء عملية الدخول"
                else -> "خطأ Google: ${e.statusCode}"
            }
            Toast.makeText(this, explanation, Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            setLoading(false)
            Toast.makeText(this, "خطأ: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private lateinit var btnGoogleSignIn: Button
    private lateinit var btnBiometricLogin: Button
    private lateinit var btnGuestLogin: Button
    private lateinit var btnPasswordLogin: Button
    private lateinit var progressBar: ProgressBar
    private lateinit var tvForgotPassword: TextView
    private lateinit var tvCreateAccount: TextView
    private lateinit var tvHint: TextView
    private lateinit var etLogin: EditText
    private lateinit var etPassword: EditText

    private var role: String = Constants.ROLE_PATIENT
    private val TAG = "LoginActivity"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        role = intent.getStringExtra("role")
            ?.takeIf {
                it == Constants.ROLE_PATIENT ||
                    it == Constants.ROLE_DOCTOR ||
                    it == Constants.ROLE_SECRETARY
            }
            ?: Constants.ROLE_PATIENT
        setContentView(R.layout.activity_login)

        val gso = try {
            GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(Constants.GOOGLE_WEB_CLIENT_ID)
                .requestEmail()
                .requestProfile()
                .build()
        } catch (_: Exception) {
            GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestProfile()
                .build()
        }
        googleSignInClient = GoogleSignIn.getClient(this, gso)

        initViews()
        setupListeners()
        observeLoginState()
    }

    private fun initViews() {
        btnGoogleSignIn = findViewById(R.id.btnGoogleSignIn)
        btnBiometricLogin = findViewById(R.id.btnBiometricLogin)
        btnGuestLogin = findViewById(R.id.btnGuestLogin)
        btnPasswordLogin = findViewById(R.id.btnPasswordLogin)
        progressBar = findViewById(R.id.progressBar)
        tvForgotPassword = findViewById(R.id.tvForgotPassword)
        tvCreateAccount = findViewById(R.id.tvCreateAccount)
        tvHint = findViewById(R.id.tvHint)
        etLogin = findViewById(R.id.etLogin)
        etPassword = findViewById(R.id.etPassword)

        etLogin.setOnFocusChangeListener { _, hasFocus ->
            if (hasFocus) etLogin.error = null
        }
    }

    private fun setupListeners() {
        btnGoogleSignIn.setOnClickListener { launchGoogleSignIn() }
        btnBiometricLogin.setOnClickListener { launchBiometricAuth() }
        btnGuestLogin.setOnClickListener { handleGuestLogin() }
        btnPasswordLogin.setOnClickListener { onPasswordLoginClick() }

        tvForgotPassword.setOnClickListener {
            startActivity(Intent(this, ForgotPasswordActivity::class.java))
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        }

        tvCreateAccount.setOnClickListener {
            val intent = Intent(this, RegisterPatientActivity::class.java)
            startActivity(intent)
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        }
    }

    // ═══════════════════════════════════════════
    // Biometric Authentication (بصمة الإصبع أو الوجه)
    // ═══════════════════════════════════════════
    private fun launchBiometricAuth() {
        val biometricManager = BiometricManager.from(this)
        val canAuth = biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.BIOMETRIC_WEAK
        )

        when (canAuth) {
            BiometricManager.BIOMETRIC_SUCCESS -> {
                showBiometricPrompt()
            }
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> {
                Toast.makeText(this, "جهازك لا يحتوي على مستشعر بصمة", Toast.LENGTH_SHORT).show()
            }
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> {
                Toast.makeText(this, "مستشعر البصمة غير متاح حالياً", Toast.LENGTH_SHORT).show()
            }
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> {
                Toast.makeText(this, "يرجى تفعيل قفل البصمة في إعدادات هاتفك أولاً", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun showBiometricPrompt() {
        val executor: Executor = ContextCompat.getMainExecutor(this)
        val biometricPrompt = BiometricPrompt(this, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    
                    // إذا كان للمريض جلسة سابقة محفوظة نتوجه مباشرة
                    val savedToken = sessionManager.getToken()
                    if (!savedToken.isNullOrBlank()) {
                        Toast.makeText(this@LoginActivity, "تم التحقق بالبصمة بنجاح! مرحباً بعودتك", Toast.LENGTH_SHORT).show()
                        navigateToHome()
                    } else {
                        Toast.makeText(this@LoginActivity, "تم توثيق البصمة بنجاح! يرجى تسجيل الدخول برقمك لربط بصمتك بحسابك للمرات القادمة", Toast.LENGTH_LONG).show()
                    }
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    if (errorCode != BiometricPrompt.ERROR_USER_CANCELED && errorCode != BiometricPrompt.ERROR_NEGATIVE_BUTTON) {
                        Toast.makeText(this@LoginActivity, "فشل التحقق: $errString", Toast.LENGTH_SHORT).show()
                    }
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                    Toast.makeText(this@LoginActivity, "لم يتم التعرف على البصمة، حاول مجدداً", Toast.LENGTH_SHORT).show()
                }
            })

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("تسجيل الدخول السريع - طبيبك")
            .setSubtitle("تحقق من هويتك بواسطة بصمة الإصبع أو الوجه للمتابعة")
            .setNegativeButtonText("إلغاء")
            .build()

        biometricPrompt.authenticate(promptInfo)
    }

    // ═══════════════════════════════════════════
    // Google Sign-In (Direct Google Play Services SDK)
    // ═══════════════════════════════════════════
    private val googleAccountPickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK && result.data != null) {
            val accountName = result.data?.getStringExtra(android.accounts.AccountManager.KEY_ACCOUNT_NAME)
            if (!accountName.isNullOrBlank()) {
                val realName = resolveArabicNameForAccount(accountName)
                performLoginWithAccount(accountName, realName)
                return@registerForActivityResult
            }
        }
        // إذا ألغى المستخدم أو لم يختر، لا نسجل دخول تلقائي بل نتركه
        setLoading(false)
    }

    private fun launchGoogleSignIn() {
        try {
            // استخدام منتقي حسابات جوجل الرسمي للنظام بحيث تظهر دائماً نافذة اختيار الحساب
            val intent = android.accounts.AccountManager.newChooseAccountIntent(
                null,
                null,
                arrayOf("com.google"),
                null,
                null,
                null,
                null
            )
            googleAccountPickerLauncher.launch(intent)
        } catch (e: Exception) {
            Log.e(TAG, "newChooseAccountIntent failed, fallback to GoogleSignInClient", e)
            try {
                googleSignInClient.signOut().addOnCompleteListener {
                    googleSignInLauncher.launch(googleSignInClient.signInIntent)
                }
            } catch (err: Exception) {
                googleSignInLauncher.launch(googleSignInClient.signInIntent)
            }
        }
    }

    private fun getDeviceOwnerName(): String {
        return try {
            val deviceName = android.provider.Settings.Global.getString(contentResolver, "device_name")
            if (!deviceName.isNullOrBlank()) deviceName else "مجيب العباب"
        } catch (_: Exception) {
            "مجيب العباب"
        }
    }

    private fun resolveArabicNameForAccount(email: String): String {
        val lower = email.lowercase()
        return when {
            lower.startsWith("mjyb") || lower.startsWith("alababalabab") || lower.startsWith("albabalbab") -> {
                getDeviceOwnerName()
            }
            lower.startsWith("hamd") -> "حامد مجيب"
            lower.startsWith("halil") -> "خليل العباب"
            else -> {
                getDeviceOwnerName()
            }
        }
    }

    private fun performLoginWithAccount(email: String, name: String) {
        setLoading(true)
        tvHint.text = "جاري التحقق من بيانات الحساب والدخول..."

        lifecycleScope.launch {
            var restoredName = name
            var restoredPhone: String? = null
            var restoredStatus = "approved"
            var isExistingAccount = false

            // 1. تسجيل الدخول الرسمي عبر السيرفر للحصول على JWT صالح وهوية المريض الدقيقة
            var serverUser: User? = null
            val loginResult = authRepository.loginWithGoogleDirect(email, name)
            loginResult.onSuccess { user ->
                serverUser = user
                Log.d(TAG, "Google direct login successful with real JWT: ${user.fullName} (ID: ${user.id})")
            }.onFailure { err ->
                Log.w(TAG, "loginWithGoogleDirect failed: ${err.message}")
            }

            setLoading(false)

            if (serverUser == null) {
                Toast.makeText(this@LoginActivity, "تعذر تسجيل الدخول عبر الخادم. يرجى التحقق من الاتصال بالإنترنت والمحاولة مجدداً.", Toast.LENGTH_LONG).show()
                return@launch
            }

            val finalUser = serverUser!!
            sessionManager.saveUser(finalUser)

            val firstName = finalUser.fullName.trim().split(" ").firstOrNull() ?: finalUser.fullName
            Toast.makeText(this@LoginActivity, "أهلاً بك يا عزيزي $firstName ✨", Toast.LENGTH_SHORT).show()
            navigateToHome()
        }
    }

    // ═══════════════════════════════════════════
    // Password Login (الهاتف أو البريد)
    // ═══════════════════════════════════════════
    private fun onPasswordLoginClick() {
        val login = etLogin.text.toString().trim()
        val password = etPassword.text.toString()

        val validationError = validateLoginInput(login)
        if (validationError != null) {
            etLogin.error = validationError
            etLogin.requestFocus()
            return
        }

        if (password.length < 6) {
            etPassword.error = "كلمة المرور يجب أن تكون 6 خانات على الأقل"
            etPassword.requestFocus()
            return
        }

        tvHint.text = ""
        viewModel.login(login, password, role)
    }

    private fun validateLoginInput(input: String): String? {
        if (input.isEmpty()) {
            return "أدخل رقم الهاتف أو البريد الإلكتروني"
        }

        // أرقام الهواتف اليمنية (9 أرقام تبدأ بـ 7)
        if (input.all { it.isDigit() }) {
            if (input.length != 9) {
                return "رقم الهاتف اليمني يتكون من 9 أرقام"
            }
            if (!input.matches(Regex("^(70|71|73|77|78)\\d{7}$"))) {
                return "يجب أن يبدأ الرقم بـ 77 أو 73 أو 71 أو 70 أو 78"
            }
            return null
        }

        // البريد الإلكتروني
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(input).matches()) {
            return "صيغة البريد الإلكتروني غير صحيحة"
        }
        return null
    }

    // ═══════════════════════════════════════════
    // Guest Login (تصفح كزائر بدون حساب)
    // ═══════════════════════════════════════════
    private fun handleGuestLogin() {
        Toast.makeText(this, "مرحباً بك كزائر في طبيبك!", Toast.LENGTH_SHORT).show()
        navigateToHome()
    }

    // ═══════════════════════════════════════════
    // Observe State
    // ═══════════════════════════════════════════
    private fun observeLoginState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.loginState.collect { state ->
                    when (state) {
                        is AuthViewModel.LoginState.Idle -> setLoading(false)
                        is AuthViewModel.LoginState.Loading -> setLoading(true)
                        is AuthViewModel.LoginState.Success -> {
                            setLoading(false)
                            val user = state.user
                            Toast.makeText(
                                this@LoginActivity,
                                "مرحباً ${user.fullName}",
                                Toast.LENGTH_SHORT
                            ).show()
                            navigateToHome()
                        }
                        is AuthViewModel.LoginState.Error -> {
                            setLoading(false)
                            tvHint.text = state.message
                            Toast.makeText(
                                this@LoginActivity,
                                state.message,
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    }
                }
            }
        }
    }

    private fun navigateToHome() {
        val intent = Intent(this, MainActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
    }

    private fun setLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        btnGoogleSignIn.isEnabled = !loading
        btnBiometricLogin.isEnabled = !loading
        btnGuestLogin.isEnabled = !loading
        btnPasswordLogin.isEnabled = !loading
        tvForgotPassword.isEnabled = !loading
        tvCreateAccount.isEnabled = !loading
    }
}
