package com.medical.clinic.staff.ui.doctor

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
import com.medical.clinic.staff.databinding.FragmentDoctorProfileBinding
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
class DoctorProfileFragment : Fragment() {
    private val pickImageLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: android.net.Uri? ->
        if (uri != null) {
            processAndUploadAvatar(uri)
        }
    }


    private var _binding: FragmentDoctorProfileBinding? = null
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
        _binding = FragmentDoctorProfileBinding.inflate(inflater, container, false)
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
                if (res is Resource.Success) {
                    displayUserInfo()
                }
            }
        }
    }

    private fun toggleDirectChat(allow: Boolean) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val value = if (allow) 1 else 0
                val res = apiService.updateDoctorDirectChat(
                    com.medical.clinic.staff.data.models.DoctorDirectChatRequest(value)
                )
                if (res.isSuccessful && res.body()?.success == true) {
                    val msg = if (allow) "تم تفعيل استقبال رسائل المرضى المباشرة ✅" else "تم تعطيل المحادثات المباشرة وتحويلها لسكرتيرة العيادة 👩‍💼"
                    Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()
                    val curr = sessionManager.getUser()
                    if (curr != null) {
                        sessionManager.saveUser(curr.copy(allowDirectChat = value))
                    }
                } else {
                    Toast.makeText(requireContext(), "فشل تحديث الإعداد", Toast.LENGTH_SHORT).show()
                    binding.switchAllowDirectChat.setOnCheckedChangeListener(null)
                    binding.switchAllowDirectChat.isChecked = !allow
                    binding.switchAllowDirectChat.setOnCheckedChangeListener { _, isChecked -> toggleDirectChat(isChecked) }
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "خطأ: ${e.message}", Toast.LENGTH_SHORT).show()
                binding.switchAllowDirectChat.setOnCheckedChangeListener(null)
                binding.switchAllowDirectChat.isChecked = !allow
                binding.switchAllowDirectChat.setOnCheckedChangeListener { _, isChecked -> toggleDirectChat(isChecked) }
            }
        }
    }

    private fun displayUserInfo() {
        val b = _binding ?: return
        val user = sessionManager.getUser()
        val isGuest = sessionManager.isGuestMode()
        val mustComplete = sessionManager.mustCompleteProfile() || user?.mustCompleteProfile == 1

        val rawName = user?.fullName?.trim()
        val displayName = if (!rawName.isNullOrBlank() && !rawName.contains("تجريبي")) {
            if (!rawName.startsWith("د.") && !rawName.startsWith("دكتور") && !rawName.startsWith("الدكتور")) {
                "د. $rawName"
            } else {
                rawName
            }
        } else {
            "طبيب (دخول تجريبي)"
        }
        b.tvProfileDoctorName.text = displayName
        val avatarUrl = user?.bestAvatar
        if (!avatarUrl.isNullOrBlank()) {
            val fullUrl = if (avatarUrl.startsWith("http")) avatarUrl else com.medical.clinic.staff.BuildConfig.BASE_URL.removeSuffix("/api/v1/").removeSuffix("/") + if (avatarUrl.startsWith("/")) avatarUrl else "/$avatarUrl"
            Glide.with(this)
                .load(fullUrl)
                .transition(DrawableTransitionOptions.withCrossFade(300))
                .circleCrop()
                .into(b.ivProfileAvatar)
            b.ivProfileAvatar.visibility = View.VISIBLE
            b.tvDoctorAvatarEmoji.visibility = View.GONE
        } else {
            b.ivProfileAvatar.visibility = View.GONE
            b.tvDoctorAvatarEmoji.visibility = View.VISIBLE
        }

        b.tvProfileSpecialty.text = user?.specialty?.takeIf { it.isNotBlank() } ?: "⚠️ لم يتم تحديد التخصص بعد"
        b.tvProfileClinic.text = user?.clinicFullName ?: user?.clinicName ?: "العيادة: غير محددة"
        b.tvProfilePhone.text = "الهاتف: ${user?.phone?.takeIf { it.isNotBlank() } ?: "غير مسجل"}"
        b.tvProfileEmail.text = "البريد: ${user?.email?.takeIf { it.isNotBlank() } ?: "غير محدد"}"
        b.tvProfileFee.text = "رسوم الكشف: ${user?.consultationFee?.toInt() ?: 0} ر.ي"

        when {
            user?.status == com.medical.clinic.staff.data.utils.Constants.STATUS_APPROVED -> {
                b.cardAccountStatusDoctor.strokeColor = android.graphics.Color.parseColor("#10B981")
                b.cardAccountStatusDoctor.setCardBackgroundColor(android.graphics.Color.parseColor("#F0FDF4"))
                b.tvStatusIconDoctor.text = "✅"
                b.tvStatusTitleDoctor.text = "حالة الحساب: معتمد ومفعل"
                b.tvStatusTitleDoctor.setTextColor(android.graphics.Color.parseColor("#065F46"))
                b.tvStatusSubtitleDoctor.text = "تم اعتماد حسابك بنجاح من إدارة المنظومة. كافة الصلاحيات مفعلة."
                b.btnCompleteProfileDoctor.visibility = View.VISIBLE
                b.btnCompleteProfileDoctor.text = "تعديل واستكمال الملف الطبي 📝"
                b.btnRefreshStatusDoctor.visibility = View.GONE
            }
            user?.status == com.medical.clinic.staff.data.utils.Constants.STATUS_PENDING -> {
                b.cardAccountStatusDoctor.strokeColor = android.graphics.Color.parseColor("#F59E0B")
                b.cardAccountStatusDoctor.setCardBackgroundColor(android.graphics.Color.parseColor("#FFFBEB"))
                b.tvStatusIconDoctor.text = "⏳"
                b.tvStatusTitleDoctor.text = "حالة الحساب: قيد المراجعة والاعتماد"
                b.tvStatusTitleDoctor.setTextColor(android.graphics.Color.parseColor("#92400E"))
                b.tvStatusSubtitleDoctor.text = "بياناتك محفوظة وقيد المراجعة من الإدارة. يمكنك تصفح التطبيق بحرية."
                b.btnCompleteProfileDoctor.visibility = View.VISIBLE
                b.btnCompleteProfileDoctor.text = "تعديل بيانات الملف الطبي 📝"
                b.btnRefreshStatusDoctor.visibility = View.VISIBLE
            }
            mustComplete || isGuest -> {
                b.cardAccountStatusDoctor.strokeColor = android.graphics.Color.parseColor("#EF4444")
                b.cardAccountStatusDoctor.setCardBackgroundColor(android.graphics.Color.parseColor("#FEF2F2"))
                b.tvStatusIconDoctor.text = "⚠️"
                b.tvStatusTitleDoctor.text = "حالة الحساب: يحتاج استكمال الملف"
                b.tvStatusTitleDoctor.setTextColor(android.graphics.Color.parseColor("#991B1B"))
                b.tvStatusSubtitleDoctor.text = "يرجى استكمال واعتماد ملفك المهني لتتمكن من تفعيل المواعيد والكشوفات."
                b.btnCompleteProfileDoctor.visibility = View.VISIBLE
                b.btnCompleteProfileDoctor.text = "📝 إكمال الملف الطبي الآن"
                b.btnRefreshStatusDoctor.visibility = View.GONE
            }
            else -> {
                b.cardAccountStatusDoctor.strokeColor = android.graphics.Color.parseColor("#10B981")
                b.cardAccountStatusDoctor.setCardBackgroundColor(android.graphics.Color.parseColor("#F0FDF4"))
                b.tvStatusIconDoctor.text = "✅"
                b.tvStatusTitleDoctor.text = "حالة الحساب: مفعل"
                b.tvStatusTitleDoctor.setTextColor(android.graphics.Color.parseColor("#065F46"))
                b.tvStatusSubtitleDoctor.text = "أهلاً بك دكتور في المنظومة."
                b.btnCompleteProfileDoctor.visibility = View.VISIBLE
                b.btnCompleteProfileDoctor.text = "تعديل واستكمال الملف الطبي 📝"
                b.btnRefreshStatusDoctor.visibility = View.GONE
            }
        }

        b.switchAllowDirectChat.setOnCheckedChangeListener(null)
        b.switchAllowDirectChat.isChecked = (user?.allowDirectChat == 1)
        b.switchAllowDirectChat.setOnCheckedChangeListener { _, isChecked ->
            toggleDirectChat(isChecked)
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

        binding.btnRefreshStatusDoctor.setOnClickListener {
            binding.btnRefreshStatusDoctor.isEnabled = false
            viewLifecycleOwner.lifecycleScope.launch {
                val res = authRepository.getMe()
                binding.btnRefreshStatusDoctor.isEnabled = true
                if (res is Resource.Success && res.data != null) {
                    val u = res.data
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

        binding.btnCompleteProfileDoctor.setOnClickListener {
            val intent = Intent(requireContext(), com.medical.clinic.staff.ui.auth.CompleteDoctorProfileActivity::class.java).apply {
                putExtra("is_guest", sessionManager.isGuestMode())
                putExtra("is_edit", true)
                putExtra(com.medical.clinic.staff.data.utils.Constants.EXTRA_ROLE, com.medical.clinic.staff.data.utils.Constants.ROLE_DOCTOR)
            }
            startActivity(intent)
        }

        binding.btnChangePassword.setOnClickListener {
            com.medical.clinic.staff.ui.utils.ProfileGuard.checkOrPrompt(requireContext(), sessionManager) {
                startActivity(Intent(requireContext(), ChangePasswordActivity::class.java))
            }
        }

        binding.btnPrivacyPolicyDoctor.setOnClickListener {
            startActivity(Intent(requireContext(), PrivacyPolicyActivity::class.java))
        }

        binding.btnLogoutDoctor.setOnClickListener {
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

        binding.btnDeleteAccountDoctor.setOnClickListener {
            AlertDialog.Builder(requireContext())
                .setTitle("🗑️ حذف الحساب والبيانات نهائياً")
                .setMessage("⚠️ تحذير مهم (متطلبات Google Play):\nسيتم حذف حسابك وجميع سجلاتك الطبيّة وبيانات العيادة المرتبطة بك نهائياً من النظام، ولن تتمكن من استعادتها.\n\nهل تؤكد رغبتك في حذف الحساب؟")
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

    
    private fun processAndUploadAvatar(uri: android.net.Uri) {
        viewLifecycleOwner.lifecycleScope.launch {
            val b = _binding ?: return@launch
            try {
                b.progressAvatarUpload.visibility = View.VISIBLE
                b.layoutAvatarContainer.isEnabled = false

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

                val tempFile = File(context.cacheDir, "doc_avatar_${System.currentTimeMillis()}.jpg")
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
