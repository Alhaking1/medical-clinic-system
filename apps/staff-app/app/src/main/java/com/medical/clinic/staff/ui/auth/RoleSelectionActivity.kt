package com.medical.clinic.staff.ui.auth

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.medical.clinic.staff.R
import com.medical.clinic.staff.data.utils.Constants
import com.medical.clinic.staff.databinding.ActivityRoleSelectionBinding
import dagger.hilt.android.AndroidEntryPoint

import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.medical.clinic.staff.data.local.SessionManager
import com.medical.clinic.staff.data.models.User
import com.medical.clinic.staff.ui.main.MainActivity
import javax.inject.Inject

@AndroidEntryPoint
class RoleSelectionActivity : AppCompatActivity() {

    private lateinit var binding: ActivityRoleSelectionBinding
    private var selectedRole: String? = null

    @Inject
    lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRoleSelectionBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupListeners()
    }

    private fun setupListeners() {
        binding.cardDoctor.setOnClickListener {
            selectRole(Constants.ROLE_DOCTOR)
        }

        binding.cardSecretary.setOnClickListener {
            selectRole(Constants.ROLE_SECRETARY)
        }

        binding.btnContinue.setOnClickListener {
            if (selectedRole == null) {
                Toast.makeText(this, getString(R.string.role_select_prompt), Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val role = selectedRole!!
            val cachedUser = sessionManager.getCachedUser(role)
            val cachedToken = sessionManager.getCachedToken(role)
            if (cachedUser != null && (!cachedToken.isNullOrBlank() || cachedUser.status == "guest")) {
                showRestoreAccountDialog(cachedUser, role)
            } else {
                navigateToLogin(role)
            }
        }
    }

    private fun showRestoreAccountDialog(cachedUser: User, role: String) {
        val roleTitle = if (role == Constants.ROLE_DOCTOR) "طبيب" else "سكرتيرة"
        val displayName = cachedUser.fullName ?: roleTitle

        MaterialAlertDialogBuilder(this)
            .setTitle("استعادة حساب $roleTitle")
            .setMessage("مرحباً بك ($displayName)\n\nتم العثور على بيانات حسابك محفوظة. هل ترغب في استعادة حسابك والدخول فوراً، أم تسجيل الدخول بحساب جديد؟")
            .setPositiveButton("استعادة حسابي") { dialog, _ ->
                dialog.dismiss()
                val restored = sessionManager.restoreCachedSession(role)
                if (restored) {
                    Toast.makeText(this, "تمت استعادة حسابك بنجاح ✅", Toast.LENGTH_SHORT).show()
                    val intent = Intent(this, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    }
                    startActivity(intent)
                    finish()
                } else {
                    navigateToLogin(role)
                }
            }
            .setNegativeButton("تسجيل جديد") { dialog, _ ->
                dialog.dismiss()
                navigateToLogin(role)
            }
            .show()
    }

    private fun navigateToLogin(role: String) {
        val intent = Intent(this, LoginActivity::class.java).apply {
            putExtra(Constants.EXTRA_ROLE, role)
        }
        startActivity(intent)
    }

    private fun selectRole(role: String) {
        selectedRole = role
        if (role == Constants.ROLE_DOCTOR) {
            binding.rbDoctor.isChecked = true
            binding.rbSecretary.isChecked = false
            binding.cardDoctor.strokeColor = ContextCompat.getColor(this, R.color.brand_primary)
            binding.cardDoctor.strokeWidth = 6
            binding.cardDoctor.cardElevation = 14f

            binding.cardSecretary.strokeColor = ContextCompat.getColor(this, R.color.divider)
            binding.cardSecretary.strokeWidth = 2
            binding.cardSecretary.cardElevation = 6f
        } else {
            binding.rbDoctor.isChecked = false
            binding.rbSecretary.isChecked = true
            binding.cardSecretary.strokeColor = ContextCompat.getColor(this, R.color.brand_primary)
            binding.cardSecretary.strokeWidth = 6
            binding.cardSecretary.cardElevation = 14f

            binding.cardDoctor.strokeColor = ContextCompat.getColor(this, R.color.divider)
            binding.cardDoctor.strokeWidth = 2
            binding.cardDoctor.cardElevation = 6f
        }
    }
}
