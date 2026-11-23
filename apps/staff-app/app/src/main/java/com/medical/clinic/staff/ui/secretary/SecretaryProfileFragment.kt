package com.medical.clinic.staff.ui.secretary

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.medical.clinic.staff.data.local.SessionManager
import com.medical.clinic.staff.data.repository.AuthRepository
import com.medical.clinic.staff.data.utils.Resource
import com.medical.clinic.staff.databinding.FragmentSecretaryProfileBinding
import com.medical.clinic.staff.ui.auth.ChangePasswordActivity
import com.medical.clinic.staff.ui.auth.RoleSelectionActivity
import com.medical.clinic.staff.ui.legal.PrivacyPolicyActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject
import androidx.activity.result.contract.ActivityResultContracts
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.io.FileOutputStream
import java.io.File
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions


@AndroidEntryPoint
class SecretaryProfileFragment : Fragment() {
    private val pickImageLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: android.net.Uri? ->
        if (uri != null) {
            processAndUploadAvatar(uri)
        }
    }


    private var _binding: FragmentSecretaryProfileBinding? = null
    private val binding get() = _binding!!

    @Inject
    lateinit var sessionManager: SessionManager

    @Inject
    lateinit var authRepository: AuthRepository

    @Inject
    lateinit var apiService: com.medical.clinic.staff.data.api.ApiService

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSecretaryProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        displayUserInfo()
        setupListeners()
    }

    override fun onResume() {
        super.onResume()
        displayUserInfo()
        refreshUserStatusSilently()
    }

    private fun refreshUserStatusSilently() {
        if (!sessionManager.isGuestMode() && sessionManager.isLoggedIn()) {
            viewLifecycleOwner.lifecycleScope.launch {
                val res = authRepository.getMe()
                if (res is Resource.Success && res.data != null) {
                    sessionManager.saveUser(res.data)
                    displayUserInfo()
                }
            }
        }
    }

    private fun displayUserInfo() {
        val user = sessionManager.getUser()
        val isGuest = sessionManager.isGuestMode()
        val mustComplete = sessionManager.mustCompleteProfile() || user?.mustCompleteProfile == 1

        val name = user?.fullName
        
        val avatarUrl = user?.bestAvatar
        if (!avatarUrl.isNullOrBlank()) {
            val fullUrl = if (avatarUrl.startsWith("http")) avatarUrl else com.medical.clinic.staff.BuildConfig.BASE_URL.removeSuffix("/api/v1/").removeSuffix("/") + if (avatarUrl.startsWith("/")) avatarUrl else "/$avatarUrl"
            Glide.with(this)
                .load(fullUrl)
                .transition(DrawableTransitionOptions.withCrossFade(300))
                .circleCrop()
                .into(binding.ivProfileAvatar)
            binding.ivProfileAvatar.visibility = View.VISIBLE
            binding.tvSecretaryAvatarEmoji.visibility = View.GONE
        } else {
            binding.ivProfileAvatar.visibility = View.GONE
            binding.tvSecretaryAvatarEmoji.visibility = View.VISIBLE
        }

        binding.tvProfileSecName.text = if (!name.isNullOrBlank() && !name.contains("تجريبي")) name else "سكرتيرة (دخول تجريبي)"
        binding.tvProfileSecClinic.text = user?.clinicFullName ?: user?.clinicName ?: "العيادة: غير محددة"
        binding.tvProfileSecPhone.text = "الهاتف: ${user?.phone?.takeIf { it.isNotBlank() } ?: "غير مسجل"}"
        val emailText = user?.email?.takeIf { it.isNotBlank() } ?: "غير مسجل"
        binding.tvProfileSecEmail.text = "البريد: $emailText"

        when {
            user?.status == com.medical.clinic.staff.data.utils.Constants.STATUS_APPROVED && !mustComplete -> {
                binding.cardAccountStatusSec.strokeColor = android.graphics.Color.parseColor("#10B981")
                binding.cardAccountStatusSec.setCardBackgroundColor(android.graphics.Color.parseColor("#F0FDF4"))
                binding.tvStatusIconSec.text = "✅"
                binding.tvStatusTitleSec.text = "حالة الحساب: معتمد ومفعل"
                binding.tvStatusTitleSec.setTextColor(android.graphics.Color.parseColor("#065F46"))
                binding.tvStatusSubtitleSec.text = "تم اعتماد حسابك بنجاح من إدارة المنظومة. كافة الصلاحيات مفعلة."
                binding.btnCompleteProfileSec.visibility = View.VISIBLE
                binding.btnCompleteProfileSec.text = "تعديل بيانات العيادة والحساب ✏️"
                binding.btnRefreshStatusSec.visibility = View.GONE
            }
            user?.status == com.medical.clinic.staff.data.utils.Constants.STATUS_PENDING && !mustComplete -> {
                binding.cardAccountStatusSec.strokeColor = android.graphics.Color.parseColor("#F59E0B")
                binding.cardAccountStatusSec.setCardBackgroundColor(android.graphics.Color.parseColor("#FFFBEB"))
                binding.tvStatusIconSec.text = "⏳"
                binding.tvStatusTitleSec.text = "حالة الحساب: قيد المراجعة والاعتماد"
                binding.tvStatusTitleSec.setTextColor(android.graphics.Color.parseColor("#92400E"))
                binding.tvStatusSubtitleSec.text = "بياناتك مكتملة ومحفوظة وقيد المراجعة من الإدارة. يمكنك تصفح التطبيق بحرية."
                binding.btnCompleteProfileSec.visibility = View.VISIBLE
                binding.btnCompleteProfileSec.text = "تعديل بيانات العيادة ✏️"
                binding.btnRefreshStatusSec.visibility = View.VISIBLE
            }
            mustComplete || isGuest -> {
                binding.cardAccountStatusSec.strokeColor = android.graphics.Color.parseColor("#EF4444")
                binding.cardAccountStatusSec.setCardBackgroundColor(android.graphics.Color.parseColor("#FEF2F2"))
                binding.tvStatusIconSec.text = "⚠️"
                binding.tvStatusTitleSec.text = "حالة الحساب: يحتاج استكمال الملف"
                binding.tvStatusTitleSec.setTextColor(android.graphics.Color.parseColor("#991B1B"))
                binding.tvStatusSubtitleSec.text = "يرجى استكمال واعتماد ملف السكرتارية لتفعيل حجز المواعيد وإدارة المرضى."
                binding.btnCompleteProfileSec.visibility = View.VISIBLE
                binding.btnCompleteProfileSec.text = "📝 إكمال ملف السكرتارية الآن"
                binding.btnRefreshStatusSec.visibility = View.GONE
            }
            else -> {
                binding.cardAccountStatusSec.strokeColor = android.graphics.Color.parseColor("#10B981")
                binding.cardAccountStatusSec.setCardBackgroundColor(android.graphics.Color.parseColor("#F0FDF4"))
                binding.tvStatusIconSec.text = "✅"
                binding.tvStatusTitleSec.text = "حالة الحساب: مفعل"
                binding.tvStatusTitleSec.setTextColor(android.graphics.Color.parseColor("#065F46"))
                binding.tvStatusSubtitleSec.text = "أهلاً بك في المنظومة."
                binding.btnCompleteProfileSec.visibility = View.VISIBLE
                binding.btnCompleteProfileSec.text = "تعديل بيانات العيادة والحساب ✏️"
                binding.btnRefreshStatusSec.visibility = View.GONE
            }
        }
    }

    private fun setupListeners() {
        binding.layoutAvatarContainer.setOnClickListener {
            if (!sessionManager.isGuestMode() && sessionManager.isLoggedIn()) {
                pickImageLauncher.launch("image/*")
            } else {
                Toast.makeText(requireContext(), "يرجى تسجيل الدخول أولاً لتعديل الصورة", Toast.LENGTH_SHORT).show()
            }
        }

        binding.btnEditEmailSec.setOnClickListener {
            showEditEmailDialog()
        }

        binding.btnRefreshStatusSec.setOnClickListener {
            binding.btnRefreshStatusSec.isEnabled = false
            viewLifecycleOwner.lifecycleScope.launch {
                val res = authRepository.getMe()
                binding.btnRefreshStatusSec.isEnabled = true
                if (res is Resource.Success && res.data != null) {
                    val u = res.data
                    sessionManager.saveUser(u)
                    if (u.status == com.medical.clinic.staff.data.utils.Constants.STATUS_APPROVED) {
                        Toast.makeText(requireContext(), "🎉 مبارك! تم اعتماد حسابك وتفعيله بنجاح!", Toast.LENGTH_LONG).show()
                    } else {
                        Toast.makeText(requireContext(), "الحساب لا يزال قيد المراجعة لدى الإدارة ⏳", Toast.LENGTH_SHORT).show()
                    }
                    displayUserInfo()
                } else {
                    Toast.makeText(requireContext(), "تعذر تحديث الحالة: ${res.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }

        binding.btnCompleteProfileSec.setOnClickListener {
            val intent = Intent(requireContext(), com.medical.clinic.staff.ui.auth.CompleteSecretaryProfileActivity::class.java).apply {
                putExtra("is_guest", sessionManager.isGuestMode())
                putExtra("is_edit", true)
                putExtra(com.medical.clinic.staff.data.utils.Constants.EXTRA_ROLE, com.medical.clinic.staff.data.utils.Constants.ROLE_SECRETARY)
            }
            startActivity(intent)
        }

        binding.btnChangePasswordSec.setOnClickListener {
            com.medical.clinic.staff.ui.utils.ProfileGuard.checkOrPrompt(requireContext(), sessionManager) {
                startActivity(Intent(requireContext(), ChangePasswordActivity::class.java))
            }
        }

        binding.btnPrivacyPolicySec.setOnClickListener {
            startActivity(Intent(requireContext(), PrivacyPolicyActivity::class.java))
        }

        binding.btnLogoutSec.setOnClickListener {
            AlertDialog.Builder(requireContext())
                .setTitle("تسجيل الخروج")
                .setMessage("هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟")
                .setPositiveButton("تسجيل الخروج") { _, _ ->
                    sessionManager.clearSession()
                    val intent = Intent(requireContext(), RoleSelectionActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    }
                    startActivity(intent)
                    requireActivity().finish()
                }
                .setNegativeButton("إلغاء", null)
                .show()
        }

        binding.layoutAdvancedOptionsHeader.setOnClickListener {
            if (binding.layoutAdvancedOptionsContent.visibility == View.VISIBLE) {
                binding.layoutAdvancedOptionsContent.visibility = View.GONE
                binding.tvAdvancedArrow.text = "▼"
            } else {
                binding.layoutAdvancedOptionsContent.visibility = View.VISIBLE
                binding.tvAdvancedArrow.text = "▲"
            }
        }

        binding.btnDeleteAccountSec.setOnClickListener {
            AlertDialog.Builder(requireContext())
                .setTitle("🗑️ حذف الحساب والبيانات نهائياً")
                .setMessage("⚠️ تحذير مهم (متطلبات Google Play):\nسيتم حذف حسابك وجميع سجلاتك وبيانات العمل المرتبطة بك نهائياً من النظام، ولن تتمكن من استعادتها.\n\nهل تؤكد رغبتك في حذف الحساب؟")
                .setPositiveButton("نعم، حذف الحساب") { _, _ ->
                    performDeleteAccount()
                }
                .setNegativeButton("إلغاء", null)
                .show()
        }
    }

    private fun performDeleteAccount() {
        if (sessionManager.isGuestMode() || sessionManager.getToken().isNullOrBlank()) {
            sessionManager.clearAllData()
            Toast.makeText(requireContext(), "تم حذف الحساب المؤقت بنجاح", Toast.LENGTH_SHORT).show()
            val intent = Intent(requireContext(), RoleSelectionActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            startActivity(intent)
            requireActivity().finish()
            return
        }

        lifecycleScope.launch {
            val res = authRepository.deleteAccount()
            when (res) {
                is Resource.Success -> {
                    sessionManager.clearAllData()
                    Toast.makeText(requireContext(), res.data ?: "تم حذف الحساب بنجاح", Toast.LENGTH_LONG).show()
                    val intent = Intent(requireContext(), RoleSelectionActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    }
                    startActivity(intent)
                    requireActivity().finish()
                }
                is Resource.Error -> {
                    Toast.makeText(requireContext(), res.message ?: "فشل حذف الحساب", Toast.LENGTH_LONG).show()
                }
                else -> {}
            }
        }
    }

    private fun showEditEmailDialog() {
        val currentEmail = sessionManager.getUser()?.email ?: ""
        val input = android.widget.EditText(requireContext()).apply {
            inputType = android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
            hint = "example@domain.com"
            setText(currentEmail)
            setSelection(text.length)
        }

        androidx.appcompat.app.AlertDialog.Builder(requireContext())
            .setTitle("إضافة / تعديل البريد الإلكتروني ✉️")
            .setMessage("أدخل البريد الإلكتروني لتلقي الإشعارات والتنبيهات:")
            .setView(input)
            .setPositiveButton("حفظ") { _, _ ->
                val newEmail = input.text.toString().trim()
                if (newEmail.isNotEmpty() && android.util.Patterns.EMAIL_ADDRESS.matcher(newEmail).matches()) {
                    performUpdateEmail(newEmail)
                } else {
                    Toast.makeText(requireContext(), "يرجى إدخال بريد إلكتروني صحيح", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("إلغاء", null)
            .show()
    }

    private fun performUpdateEmail(email: String) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val res = apiService.updateEmail(mapOf("email" to email))
                if (res.isSuccessful && res.body()?.success == true) {
                    val updatedUser = res.body()?.data ?: res.body()?.user
                    if (updatedUser != null) {
                        sessionManager.saveUser(updatedUser)
                    }
                    displayUserInfo()
                    Toast.makeText(requireContext(), res.body()?.message ?: "تم حفظ البريد بنجاح ✅", Toast.LENGTH_SHORT).show()
                } else {
                    val err = res.body()?.message ?: "فشل تحديث البريد"
                    Toast.makeText(requireContext(), err, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "خطأ: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    
    private fun processAndUploadAvatar(uri: android.net.Uri) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                binding.progressAvatarUpload.visibility = View.VISIBLE
                binding.layoutAvatarContainer.isEnabled = false

                val context = requireContext()
                val inputStream = context.contentResolver.openInputStream(uri)
                    ?: throw IllegalStateException("تعذر قراءة ملف الصورة المختارة")

                val originalBitmap = BitmapFactory.decodeStream(inputStream)
                    ?: throw IllegalStateException("تعذر فك ترميز الصورة")

                val size = minOf(originalBitmap.width, originalBitmap.height)
                val x = (originalBitmap.width - size) / 2
                val y = (originalBitmap.height - size) / 2
                val croppedBitmap = Bitmap.createBitmap(originalBitmap, x, y, size, size)
                val finalBitmap = Bitmap.createScaledBitmap(croppedBitmap, 400, 400, true)

                val tempFile = File(context.cacheDir, "sec_avatar_${System.currentTimeMillis()}.jpg")
                FileOutputStream(tempFile).use { out ->
                    finalBitmap.compress(Bitmap.CompressFormat.JPEG, 90, out)
                }

                val requestBody = tempFile.asRequestBody("image/jpeg".toMediaTypeOrNull())
                val part = MultipartBody.Part.createFormData("image", tempFile.name, requestBody)

                val response = apiService.uploadAvatar(part)
                if (response.isSuccessful && response.body()?.success == true) {
                    val avatarUrl = response.body()?.avatarUrl
                    Toast.makeText(context, "تم تحديث الصورة الشخصية بنجاح ✨", Toast.LENGTH_SHORT).show()
                    val currentUser = sessionManager.getUser()
                    if (currentUser != null && avatarUrl != null) {
                        val updatedUser = currentUser.copy(avatarUrl = avatarUrl)
                        sessionManager.saveUser(updatedUser)
                        displayUserInfo()
                    }
                } else {
                    val rawErr = response.errorBody()?.string()
                    val parsedMsg = try {
                        org.json.JSONObject(rawErr ?: "").optString("message", rawErr ?: "تعذر رفع الصورة")
                    } catch (_: Exception) {
                        rawErr ?: "فشل خادم التطبيق في رفع الصورة"
                    }
                    Toast.makeText(context, "فشل الرفع: $parsedMsg", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "خطأ: ${e.localizedMessage ?: "تعذر رفع الصورة"}", Toast.LENGTH_LONG).show()
            } finally {
                _binding?.progressAvatarUpload?.visibility = View.GONE
                _binding?.layoutAvatarContainer?.isEnabled = true
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
