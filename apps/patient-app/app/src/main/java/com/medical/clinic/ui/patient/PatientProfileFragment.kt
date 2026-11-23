package com.medical.clinic.ui.patient

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.io.FileOutputStream

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.RadioGroup
import android.widget.Spinner
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.medical.clinic.R
import com.medical.clinic.data.api.ApiClient
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.ui.auth.LoginActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject
import android.widget.ImageView
import android.widget.ProgressBar
import com.bumptech.glide.Glide
import com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File


@AndroidEntryPoint
class PatientProfileFragment : Fragment() {
    private var ivProfileAvatar: ImageView? = null
    private var layoutAvatarContainer: View? = null
    private var progressAvatarUpload: ProgressBar? = null

        private val pickImageLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null) {
            processAndUploadAvatar(uri)
        }
    }


    @Inject
    lateinit var sessionManager: SessionManager

    @Inject
    lateinit var apiClient: ApiClient

    private lateinit var tvName: TextView
    private lateinit var tvPhone: TextView
    private lateinit var tvBadge: TextView
    private lateinit var tvBlood: TextView
    private lateinit var tvGovernorate: TextView
    private lateinit var tvAge: TextView
    private lateinit var btnLogout: MaterialButton
    private lateinit var rowEditProfile: View
    private lateinit var rowSupport: View
    private lateinit var rowPrivacyPolicy: View
    private lateinit var rowEmergency: View
    private lateinit var rowAbout: View
    private lateinit var rowDeleteAccount: View
    private lateinit var layoutAdvancedOptionsHeader: View
    private lateinit var layoutAdvancedOptionsContent: View
    private lateinit var tvAdvancedArrow: TextView
    private var tvProfileWalletBalance: TextView? = null
    private var cardPatientProfileWallet: View? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_patient_profile, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        tvName = view.findViewById(R.id.tvProfileName)
        tvPhone = view.findViewById(R.id.tvProfilePhone)
        tvBadge = view.findViewById(R.id.tvProfileBadge)
        tvBlood = view.findViewById(R.id.tvProfileBlood)
        tvGovernorate = view.findViewById(R.id.tvProfileGovernorate)
        tvAge = view.findViewById(R.id.tvProfileAge)
        btnLogout = view.findViewById(R.id.btnLogout)
        rowEditProfile = view.findViewById(R.id.rowEditProfile)
        rowSupport = view.findViewById(R.id.rowSupport)
        rowPrivacyPolicy = view.findViewById(R.id.rowPrivacyPolicy)
        rowEmergency = view.findViewById(R.id.rowEmergency)
        rowAbout = view.findViewById(R.id.rowAbout)
        rowDeleteAccount = view.findViewById(R.id.rowDeleteAccount)
        layoutAdvancedOptionsHeader = view.findViewById(R.id.layoutAdvancedOptionsHeader)
        layoutAdvancedOptionsContent = view.findViewById(R.id.layoutAdvancedOptionsContent)
        tvAdvancedArrow = view.findViewById(R.id.tvAdvancedArrow)
        tvProfileWalletBalance = view.findViewById(R.id.tvProfileWalletBalance)
        cardPatientProfileWallet = view.findViewById(R.id.cardPatientProfileWallet)
        ivProfileAvatar = view.findViewById(R.id.ivProfileAvatar)
        layoutAvatarContainer = view.findViewById(R.id.layoutAvatarContainer)
        progressAvatarUpload = view.findViewById(R.id.progressAvatarUpload)


        setupListeners()
        loadProfileData()
    }

    override fun onResume() {
        super.onResume()
        loadProfileData()
    }

    private fun loadProfileData() {
        viewLifecycleOwner.lifecycleScope.launch {
            val user = sessionManager.getUser()
            if (user != null) {
                                displayAvatar(user.bestAvatar)
                tvName.text = user.fullName.ifBlank { "مستخدم طبيبك" }
                tvPhone.text = user.phone ?: user.email ?: "+967"
                tvGovernorate.text = user.governorate ?: "صنعاء"
                tvAge.text = if (user.age != null && user.age > 0) "${user.age} سنة" else "غير محدد"
                tvBlood.text = user.bloodGroup ?: "O+"

                when {
                    user.status == "pending" -> {
                        tvBadge.text = "الملف قيد المراجعة من الإدارة ⏳"
                        tvBadge.setTextColor(Color.parseColor("#D97706"))
                    }
                    user.isProfileComplete -> {
                        tvBadge.text = "عضوية طبيبك المعتمدة ⭐"
                        tvBadge.setTextColor(Color.parseColor("#0D9488"))
                    }
                    else -> {
                        tvBadge.text = "⚠️ الملف غير مكتمل (انقر هنا للإكمال)"
                        tvBadge.setTextColor(Color.parseColor("#DC2626"))
                    }
                }

                val initialBal = user.balance ?: 0.0
                tvProfileWalletBalance?.text = "${String.format(java.util.Locale.US, "%,.2f", initialBal)} ر.ي"
                cardPatientProfileWallet?.visibility = View.VISIBLE

                btnLogout.text = "تسجيل الخروج"
                rowEditProfile.visibility = View.VISIBLE
                layoutAdvancedOptionsHeader.visibility = View.VISIBLE

                // جلب أحدث رصيد من السيرفر
                try {
                    val res = apiClient.apiService.getPatientProfile()
                    if (res.success && res.data != null) {
                        sessionManager.saveUser(res.data)
                        val updatedBal = res.data.balance ?: 0.0
                        tvProfileWalletBalance?.text = "${String.format(java.util.Locale.US, "%,.2f", updatedBal)} ر.ي"
                    }
                } catch (_: Exception) {}
            } else {
                // Guest mode
                                displayAvatar(null)
                tvName.text = "زائر كريم"
                tvPhone.text = "وضع التصفح السريع"
                tvGovernorate.text = "اليمن"
                tvAge.text = "--"
                tvBlood.text = "--"
                tvBadge.text = "تصفح كزائر"
                btnLogout.text = "تسجيل الدخول / إنشاء حساب"
                rowEditProfile.visibility = View.GONE
                cardPatientProfileWallet?.visibility = View.GONE
                layoutAdvancedOptionsHeader.visibility = View.GONE
                layoutAdvancedOptionsContent.visibility = View.GONE
            }
        }
    }

    private fun setupListeners() {
        val openProfileEditor = {
            val user = sessionManager.getUser()
            if (user != null) {
                startActivity(Intent(requireContext(), CompletePatientProfileActivity::class.java))
            } else {
                startActivity(Intent(requireContext(), LoginActivity::class.java))
            }
        }

                layoutAvatarContainer?.setOnClickListener {
            val user = sessionManager.getUser()
            if (user != null) {
                launchAvatarPicker()
            } else {
                startActivity(Intent(requireContext(), LoginActivity::class.java))
            }
        }

        tvBadge.setOnClickListener { openProfileEditor() }
        rowEditProfile.setOnClickListener { openProfileEditor() }
        view?.findViewById<View>(R.id.rowFamilyMembers)?.setOnClickListener { openFamilyManager() }

        view?.findViewById<View?>(R.id.btnViewWalletTransactions)?.setOnClickListener {
            showWalletTransactionsDialog()
        }

        // خيارات متقدمة قابلة للتوسيع بسهم صغير
        layoutAdvancedOptionsHeader.setOnClickListener {
            if (layoutAdvancedOptionsContent.visibility == View.VISIBLE) {
                layoutAdvancedOptionsContent.visibility = View.GONE
                tvAdvancedArrow.text = "▼"
            } else {
                layoutAdvancedOptionsContent.visibility = View.VISIBLE
                tvAdvancedArrow.text = "▲"
            }
        }

        rowEmergency.setOnClickListener {
            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:195"))
            startActivity(intent)
        }

        // الدعم الفني وخدمة العملاء والتحويلات على الرقم 781238648
        rowSupport.setOnClickListener {
            try {
                val intent = Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse("https://wa.me/967781238648?text=" + Uri.encode("مرحباً خدمة عملاء ودعم تطبيق طبيبك، أحتاج مساعدة:"))
                )
                startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "خدمة العملاء والتحويلات: 781238648", Toast.LENGTH_LONG).show()
            }
        }

        // سياسة الخصوصية وأمان البيانات (متطلب Google Play)
        rowPrivacyPolicy.setOnClickListener {
            showPrivacyPolicyDialog()
        }

        rowAbout.setOnClickListener {
            Toast.makeText(requireContext(), "طبيبك v2.0 — المنظومة الطبية الأولى لحجز مواعيد الأطباء في اليمن", Toast.LENGTH_LONG).show()
        }

        // حذف الحساب نهائياً (متطلب Google Play)
        rowDeleteAccount.setOnClickListener {
            showDeleteAccountConfirmationDialog()
        }

        btnLogout.setOnClickListener {
            viewLifecycleOwner.lifecycleScope.launch {
                try {
                    val gso = com.google.android.gms.auth.api.signin.GoogleSignInOptions.DEFAULT_SIGN_IN
                    val client = com.google.android.gms.auth.api.signin.GoogleSignIn.getClient(requireContext(), gso)
                    client.signOut()
                    client.revokeAccess()
                } catch (_: Exception) {}

                sessionManager.logout()
                val intent = Intent(requireContext(), LoginActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                requireActivity().finish()
            }
        }
    }

    private fun showPrivacyPolicyDialog() {
        AlertDialog.Builder(requireContext())
            .setTitle("🛡️ سياسة الخصوصية وأمان البيانات")
            .setMessage(
                """
                نحن في تطبيق «طبيبك» نلتزم بأعلى معايير حماية وخصوصية البيانات الطبية والشخصية وفق إرشادات ومعايير متجر Google Play:
                
                1. جمع البيانات: نقوم بجمع الاسم الكامل، رقم الهاتف، العمر، المحافظة، وفصيلة الدم حصراً لغرض التحقق من المريض وتنظيم حجز المواعيد وأدوار الكشف لدى الأطباء والعيادات.
                
                2. سرية الاتصال: لا نقوم بمشاركة أي أرقام هواتف خاصة بالأطباء أو المستشفيات أو المرضى مع أي أطراف خارجية، وجميع عمليات التواصل والدعم تتم عبر خدمة عملاء طبيبك المركزية (781238648).
                
                3. التشفير والحماية: جميع الاتصالات محمية ومشفرة عبر بروتوكولات آمنة، وكلمات المرور مشفرة بتقنية التجزئة غير القابلة للعكس.
                
                4. حق حذف الحساب: يمتلك المريض الحق الكامل في حذف حسابه وكافة بياناته وسجلاته الطبية نهائياً في أي وقت بضغطة زر واحدة من خلال خيار "حذف الحساب نهائياً".
                """.trimIndent()
            )
            .setPositiveButton("فهمت وموافق ✅", null)
            .show()
    }

    private fun showDeleteAccountConfirmationDialog() {
        AlertDialog.Builder(requireContext())
            .setTitle("⚠️ تأكيد حذف الحساب نهائياً")
            .setMessage("هل أنت متأكد من رغبتك في حذف حسابك من تطبيق طبيبك نهائياً؟\n\nسيتم مسح كافة بياناتك الشخصية، وسجلاتك الطبية، وتاريخ مواعيدك بالكامل من خوادمنا ولن تتمكن من استعادتها.")
            .setPositiveButton("نعم، احذف حسابي نهائياً 🗑️") { dialog, _ ->
                dialog.dismiss()
                performAccountDeletion()
            }
            .setNegativeButton("إلغاء والتراجع", null)
            .show()
    }

    private fun performAccountDeletion() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val res = apiClient.apiService.deletePatientAccount()
                sessionManager.logout()
                Toast.makeText(requireContext(), "✅ تم حذف حسابك وكافة بياناتك نهائياً من خوادمنا.", Toast.LENGTH_LONG).show()

                val intent = Intent(requireContext(), LoginActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                requireActivity().finish()
            } catch (e: Exception) {
                sessionManager.logout()
                Toast.makeText(requireContext(), "تم تسجيل الخروج وحذف الجلسة.", Toast.LENGTH_SHORT).show()
                val intent = Intent(requireContext(), LoginActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                requireActivity().finish()
            }
        }
    }

    private fun showWalletTransactionsDialog() {
        val user = sessionManager.getUser()
        val currentBalance = user?.balance ?: 0.0

        val context = requireContext()
        val container = android.widget.LinearLayout(context).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(40, 24, 40, 24)
        }

        val tvBalance = TextView(context).apply {
            text = "الرصيد المتاح: ${String.format(java.util.Locale.US, "%,.2f", currentBalance)} ر.ي"
            textSize = 18f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setTextColor(Color.parseColor("#0D9488"))
            gravity = android.view.Gravity.CENTER
            setPadding(0, 0, 0, 20)
        }
        container.addView(tvBalance)

        val btnDeposit = MaterialButton(context).apply {
            text = "➕ شحن رصيد المحفظة الآن"
            setBackgroundColor(Color.parseColor("#0D9488"))
            setTextColor(Color.WHITE)
            cornerRadius = 20
        }
        container.addView(btnDeposit)

        val tvHistoryTitle = TextView(context).apply {
            text = "📋 سجل العمليات الأخيرة:"
            textSize = 14f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setTextColor(Color.parseColor("#374151"))
            setPadding(0, 24, 0, 10)
        }
        container.addView(tvHistoryTitle)

        val tvHistoryContent = TextView(context).apply {
            text = "جاري تحميل سجل العمليات..."
            textSize = 13f
            setTextColor(Color.parseColor("#6B7280"))
            setLineSpacing(1.2f, 1.2f)
        }
        container.addView(tvHistoryContent)

        val dialog = AlertDialog.Builder(context)
            .setTitle("💳 محفظة طبيبك الطبية")
            .setView(container)
            .setPositiveButton("إغلاق", null)
            .create()

        btnDeposit.setOnClickListener {
            dialog.dismiss()
            showDepositRequestDialog()
        }

        // جلب سجل المعاملات من الخادم
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val res = apiClient.apiService.getPatientWallet()
                if (res.success && res.data != null) {
                    val bal = (res.data["balance"] as? Number)?.toDouble() ?: currentBalance
                    tvBalance.text = "الرصيد المتاح: ${String.format(java.util.Locale.US, "%,.2f", bal)} ر.ي"
                    tvProfileWalletBalance?.text = "${String.format(java.util.Locale.US, "%,.2f", bal)} ر.ي"

                    val txList = res.data["transactions"] as? List<Map<String, Any>>
                    if (txList.isNullOrEmpty()) {
                        tvHistoryContent.text = "لا توجد حركات سابقة حتى الآن.\nيمكنك شحن رصيدك بالضغط على الزر أعلاه ⬆️"
                    } else {
                        val sb = StringBuilder()
                        txList.take(5).forEach { tx ->
                            val amt = (tx["amount"] as? Number)?.toDouble() ?: 0.0
                            val desc = tx["description"] as? String ?: "عملية محفظة"
                            val type = tx["type"] as? String ?: ""
                            val sign = if (type == "deposit" || amt > 0) "+" else "-"
                            sb.append("• $sign${String.format(java.util.Locale.US, "%,.2f", kotlin.math.abs(amt))} ر.ي : $desc\n\n")
                        }
                        tvHistoryContent.text = sb.toString().trimEnd()
                    }
                }
            } catch (e: Exception) {
                tvHistoryContent.text = "يمكنك شحن رصيدك عبر زر شحن الرصيد أعلاه وسيقوم الأدمن باعتماده فوراً."
            }
        }

        dialog.show()
    }

    private fun showDepositRequestDialog() {
        val context = requireContext()
        val layout = android.widget.LinearLayout(context).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(40, 20, 40, 20)
        }

        val tvInstructions = TextView(context).apply {
            text = """
                📌 طرق التحويل المتاحة:
                • الكريمي المميز: 3012345678 (طبيبك للخدمات الطبية)
                • المحافظ الإلكترونية (جوالي / ون كاش / فلوسك): 781238648
                • شبكات الصرافة (النجم / الامتياز): باسم "طبيبك المركزي"
                
                بعد إتمام التحويل، أدخل المبلغ ورقم الحوالة/العملية بالأسفل وسيتم إضافة الرصيد إلى محفظتك فور موافقة الإدارة:
            """.trimIndent()
            textSize = 13f
            setTextColor(Color.parseColor("#374151"))
            setLineSpacing(1.2f, 1.2f)
            setPadding(0, 0, 0, 16)
        }
        layout.addView(tvInstructions)

        val spMethods = android.widget.Spinner(context)
        val methodOptions = arrayOf("حوالة صرافة (النجم / الامتياز)", "بنك الكريمي", "محفظة جوالي / ون كاش", "حوالة مصرفية أخرى")
        val spinnerAdapter = android.widget.ArrayAdapter(context, android.R.layout.simple_spinner_dropdown_item, methodOptions)
        spMethods.adapter = spinnerAdapter
        layout.addView(spMethods)

        val etAmount = android.widget.EditText(context).apply {
            hint = "المبلغ المحول (ر.ي) *"
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL
            setPadding(20, 24, 20, 24)
        }
        layout.addView(etAmount)

        val etReference = android.widget.EditText(context).apply {
            hint = "رقم الحوالة أو السند أو العملية *"
            inputType = android.text.InputType.TYPE_CLASS_TEXT
            setPadding(20, 24, 20, 24)
        }
        layout.addView(etReference)

        val etNotes = android.widget.EditText(context).apply {
            hint = "ملاحظات إضافية (اختياري، مثلاً اسم المحول)"
            inputType = android.text.InputType.TYPE_CLASS_TEXT
            setPadding(20, 24, 20, 24)
        }
        layout.addView(etNotes)

        AlertDialog.Builder(context)
            .setTitle("💰 طلب شحن المحفظة")
            .setView(layout)
            .setPositiveButton("إرسال الطلب للأدمن 📤") { dialog, _ ->
                val amountStr = etAmount.text.toString().trim()
                val refStr = etReference.text.toString().trim()
                val notesStr = etNotes.text.toString().trim()
                val methodStr = spMethods.selectedItem?.toString() ?: "حوالة"

                val rawAmountNum = amountStr.toDoubleOrNull()
                if (rawAmountNum == null || rawAmountNum == 0.0) {
                    Toast.makeText(context, "يرجى إدخال مبلغ صحيح", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val amountNum = kotlin.math.abs(rawAmountNum)
                if (refStr.isBlank()) {
                    Toast.makeText(context, "يرجى إدخال رقم الحوالة أو العملية", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val body = mapOf(
                            "amount" to amountNum,
                            "method" to methodStr,
                            "reference_number" to refStr,
                            "notes" to notesStr
                        )
                        val res = apiClient.apiService.submitWalletDepositRequest(body)
                        if (res.success) {
                            Toast.makeText(context, res.message ?: "تم إرسال طلب الشحن بنجاح! سيتم اعتماده قريباً ✅", Toast.LENGTH_LONG).show()
                        } else {
                            Toast.makeText(context, res.message ?: "تعذر إرسال الطلب", Toast.LENGTH_LONG).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(context, "حدث خطأ: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
            .setNegativeButton("إلغاء", null)
            .show()
    }

    private fun launchAvatarPicker() {
        pickImageLauncher.launch("image/*")
    }

    private fun processAndUploadAvatar(uri: Uri) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                progressAvatarUpload?.visibility = View.VISIBLE
                layoutAvatarContainer?.isEnabled = false

                val context = requireContext()

                // 1. فحص الحجم المسموح (الحد الأقصى 3 ميجابايت)
                val rawBytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                    ?: throw IllegalStateException("تعذر قراءة بيانات ملف الصورة المختارة")

                val maxSizeBytes = 3 * 1024 * 1024 // 3MB
                if (rawBytes.size > maxSizeBytes) {
                    val sizeMb = String.format(java.util.Locale.US, "%.2f", rawBytes.size / (1024.0 * 1024.0))
                    android.app.AlertDialog.Builder(context)
                        .setTitle("⚠️ حجم الصورة كبير جداً")
                        .setMessage("الحد الأقصى المسموح به لحجم الصورة هو 3 ميجابايت، بينما حجم الصورة المختارة هو " + sizeMb + " ميجابايت.\n\nيرجى اختيار صورة أصغر حجماً.")
                        .setPositiveButton("حسناً", null)
                        .show()
                    return@launch
                }

                // 2. فحص الهيدر السحري (Magic Bytes) للتحقق من كونها صورة حقيقية
                val isJpeg = rawBytes.size >= 3 && rawBytes[0] == 0xFF.toByte() && rawBytes[1] == 0xD8.toByte() && rawBytes[2] == 0xFF.toByte()
                val isPng = rawBytes.size >= 4 && rawBytes[0] == 0x89.toByte() && rawBytes[1] == 0x50.toByte() && rawBytes[2] == 0x4E.toByte() && rawBytes[3] == 0x47.toByte()
                val isWebp = rawBytes.size >= 12 && rawBytes[0] == 'R'.code.toByte() && rawBytes[1] == 'I'.code.toByte() && rawBytes[2] == 'F'.code.toByte() && rawBytes[3] == 'F'.code.toByte() && rawBytes[8] == 'W'.code.toByte() && rawBytes[9] == 'E'.code.toByte() && rawBytes[10] == 'B'.code.toByte() && rawBytes[11] == 'P'.code.toByte()

                if (!isJpeg && !isPng && !isWebp) {
                    android.app.AlertDialog.Builder(context)
                        .setTitle("⚠️ صيغة غير مدعومة")
                        .setMessage("الملف المختار ليس صورة صالحة. يرجى اختيار ملف صورة حقيقي بصيغة (JPG, PNG, WEBP).")
                        .setPositiveButton("حسناً", null)
                        .show()
                    return@launch
                }

                // 3. الفاحص الأمني الصارم ضد التلغيم والبرمجيات الخبيثة والأكواد المحقونة (Malware & Script Scanner)
                val rawString = String(rawBytes, java.nio.charset.StandardCharsets.ISO_8859_1).lowercase()
                val dangerousSignatures = listOf(
                    "<?php", "<script", "<html", "<svg", "javascript:",
                    "onerror=", "onload=", "eval(", "base64_decode",
                    "exec(", "system(", "passthru(", "shell_exec(",
                    "<!entity", "<!doctype", "/bin/sh", "/bin/bash",
                    "powershell", "cmd.exe", "mshta", "cscript"
                )

                val detectedPayload = dangerousSignatures.firstOrNull { rawString.contains(it) }
                if (detectedPayload != null) {
                    android.app.AlertDialog.Builder(context)
                        .setTitle("🚨 تنبيه أمني عاجل")
                        .setMessage("تم فحص الملف واكتشاف نصوص برمجية أو أكواد مشبوهة داخل الملف!\n\nتم رفض رفع الصورة فوراً لحماية أمان حسابك وهاتفك وبيانات المنصة الطبية.")
                        .setIcon(android.R.drawable.ic_dialog_alert)
                        .setPositiveButton("فهمت ذلك", null)
                        .show()
                    return@launch
                }

                // 4. إعادة بناء البكسلات النقية وتجريد الملف من أي كود أو بيانات خفية (Pure Pixel Reconstruction)
                val originalBitmap = BitmapFactory.decodeByteArray(rawBytes, 0, rawBytes.size)
                    ?: throw IllegalStateException("تعذر فك ترميز بكسلات الصورة. قد يكون الملف تالفاً.")

                val size = minOf(originalBitmap.width, originalBitmap.height)
                val x = (originalBitmap.width - size) / 2
                val y = (originalBitmap.height - size) / 2
                val croppedBitmap = Bitmap.createBitmap(originalBitmap, x, y, size, size)
                val finalBitmap = Bitmap.createScaledBitmap(croppedBitmap, 400, 400, true)

                // توليد ملف صورة نظيف 100% يحتوي على بكسلات نقية فقط دون أي إضافات
                val tempFile = File(context.cacheDir, "clean_avatar_" + System.currentTimeMillis() + ".jpg")
                FileOutputStream(tempFile).use { out ->
                    finalBitmap.compress(Bitmap.CompressFormat.JPEG, 92, out)
                }

                val requestBody = tempFile.asRequestBody("image/jpeg".toMediaTypeOrNull())
                val part = MultipartBody.Part.createFormData("image", tempFile.name, requestBody)

                val response = apiClient.apiService.uploadAvatar(part)
                if (response.isSuccessful && response.body()?.success == true) {
                    val avatarUrl = response.body()?.avatarUrl
                    Toast.makeText(context, "تم فحص وتحديث صورتك الشخصية بأمان بنجاح ✨", Toast.LENGTH_SHORT).show()
                    val currentUser = sessionManager.getUser()
                    if (currentUser != null && avatarUrl != null) {
                        val updatedUser = currentUser.copy(avatarUrl = avatarUrl)
                        sessionManager.saveUser(updatedUser)
                        displayAvatar(updatedUser.bestAvatar)
                    }
                } else {
                    val rawErr = response.errorBody()?.string()
                    val parsedMsg = try {
                        org.json.JSONObject(rawErr ?: "").optString("message", rawErr ?: "تعذر رفع الصورة")
                    } catch (_: Exception) {
                        rawErr ?: "فشل خادم التطبيق في رفع الصورة"
                    }
                    Toast.makeText(context, "فشل الرفع: " + parsedMsg, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "خطأ: " + (e.localizedMessage ?: "تعذر رفع الصورة"), Toast.LENGTH_LONG).show()
            } finally {
                progressAvatarUpload?.visibility = View.GONE
                layoutAvatarContainer?.isEnabled = true
            }
        }
    }

    private fun displayAvatar(url: String?) {
        val imageView = ivProfileAvatar ?: return
        if (!url.isNullOrBlank()) {
            val fullUrl = if (url.startsWith("http")) {
                url
            } else {
                com.medical.clinic.BuildConfig.BASE_URL.removeSuffix("/api/v1/").removeSuffix("/") + if (url.startsWith("/")) url else "/$url"
            }
            Glide.with(this)
                .load(fullUrl)
                .transition(DrawableTransitionOptions.withCrossFade(300))
                .circleCrop()
                .placeholder(R.drawable.ic_tabeebak_logo)
                .error(R.drawable.ic_tabeebak_logo)
                .into(imageView)
        } else {
            imageView.setImageResource(R.drawable.ic_tabeebak_logo)
        }
    }


    private fun openFamilyManager() {
        val context = requireContext()
        val progress = android.app.ProgressDialog(context).apply {
            setMessage("جاري تحميل قائمة العائلة...")
            setCancelable(false)
            show()
        }

        lifecycleScope.launch {
            var members: List<com.medical.clinic.data.models.FamilyMember> = emptyList()
            try {
                val res = apiClient.apiService.getFamilyMembers()
                if (res.success && res.data != null) {
                    members = res.data
                }
            } catch (_: Exception) {}
            progress.dismiss()

            showFamilyListDialog(members)
        }
    }

    private fun showFamilyListDialog(members: List<com.medical.clinic.data.models.FamilyMember>) {
        val context = requireContext()
        val items = mutableListOf<String>()
        members.forEach { m ->
            val ageStr = if (m.age != null) " ( سنة)" else ""
            items.add("👤  []$ageStr")
        }
        items.add("➕ إضافة فرد جديد للعائلة...")

        androidx.appcompat.app.AlertDialog.Builder(context)
            .setTitle("👨‍👩‍👧‍👦 أفراد العائلة المسجلين")
            .setItems(items.toTypedArray()) { _, which ->
                if (which == items.size - 1) {
                    showAddFamilyMemberDialogInProfile()
                } else {
                    val member = members[which]
                    showMemberOptionsDialog(member)
                }
            }
            .setNegativeButton("إغلاق", null)
            .show()
    }

    private fun showMemberOptionsDialog(member: com.medical.clinic.data.models.FamilyMember) {
        val context = requireContext()
        val options = arrayOf("🗑️ حذف من قائمة العائلة")
        androidx.appcompat.app.AlertDialog.Builder(context)
            .setTitle(member.name + " (" + member.relationship + ")")
            .setItems(options) { _, which ->
                if (which == 0) {
                    androidx.appcompat.app.AlertDialog.Builder(context)
                        .setTitle("تأكيد الحذف ⚠️")
                        .setMessage("هل أنت متأكد من حذف " + member.name + " من قائمة العائلة؟")
                        .setPositiveButton("نعم، حذف") { _, _ ->
                            lifecycleScope.launch {
                                try {
                                    apiClient.apiService.deleteFamilyMember(member.id)
                                    android.widget.Toast.makeText(context, "تم الحذف بنجاح", android.widget.Toast.LENGTH_SHORT).show()
                                    openFamilyManager()
                                } catch (e: Exception) {
                                    android.widget.Toast.makeText(context, "فشل الحذف: " + e.message, android.widget.Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                        .setNegativeButton("إلغاء", null)
                        .show()
                }
            }
            .setNegativeButton("رجوع", null)
            .show()
    }

    private fun showAddFamilyMemberDialogInProfile() {
        val context = requireContext()
        val dialogView = LayoutInflater.from(context).inflate(R.layout.dialog_add_family_member, null)
        val etName = dialogView.findViewById<android.widget.EditText>(R.id.etFamilyName)
        val spRelation = dialogView.findViewById<android.widget.Spinner>(R.id.spFamilyRelation)
        val etAge = dialogView.findViewById<android.widget.EditText>(R.id.etFamilyAge)
        val rgGender = dialogView.findViewById<RadioGroup>(R.id.rgFamilyGender)

        val relations = arrayOf("ابن", "ابنة", "زوجة", "زوج", "أب", "أم", "أخ", "أخت", "آخر")
        val adapter = android.widget.ArrayAdapter(context, android.R.layout.simple_spinner_dropdown_item, relations)
        spRelation.adapter = adapter

        androidx.appcompat.app.AlertDialog.Builder(context)
            .setTitle("➕ إضافة فرد جديد للعائلة")
            .setView(dialogView)
            .setPositiveButton("حفظ ✅") { _, _ ->
                val name = etName.text.toString().trim()
                val relation = spRelation.selectedItem?.toString() ?: "ابن"
                val age = etAge.text.toString().trim().toIntOrNull()
                val gender = if (rgGender.checkedRadioButtonId == R.id.rbGenderFemale) "female" else "male"

                if (name.isBlank()) {
                    android.widget.Toast.makeText(context, "يرجى كتابة الاسم", android.widget.Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                lifecycleScope.launch {
                    try {
                        val payload = mutableMapOf<String, Any>(
                            "name" to name,
                            "relationship" to relation,
                            "gender" to gender
                        )
                        if (age != null) payload["age"] = age

                        val res = apiClient.apiService.addFamilyMember(payload)
                        if (res.success) {
                            android.widget.Toast.makeText(context, "تمت الإضافة بنجاح 👨‍👩‍👧‍👦", android.widget.Toast.LENGTH_SHORT).show()
                            openFamilyManager()
                        } else {
                            android.widget.Toast.makeText(context, res.message ?: "تعذر الحفظ", android.widget.Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        android.widget.Toast.makeText(context, "خطأ: " + e.message, android.widget.Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("إلغاء", null)
            .show()
    }
}
