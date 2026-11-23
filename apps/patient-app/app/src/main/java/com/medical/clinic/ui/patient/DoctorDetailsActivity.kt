package com.medical.clinic.ui.patient

import android.app.DatePickerDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.Spinner
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.lifecycle.lifecycleScope
import com.medical.clinic.R
import com.medical.clinic.data.api.ApiClient
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.data.models.DoctorItem
import com.medical.clinic.data.models.PeriodItem
import com.medical.clinic.ui.main.MainActivity
import com.medical.clinic.utils.DateTimeUtils
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone
import javax.inject.Inject

@AndroidEntryPoint
class DoctorDetailsActivity : AppCompatActivity() {

    @Inject
    lateinit var apiClient: ApiClient

    @Inject
    lateinit var sessionManager: SessionManager

    private var doctor: DoctorItem? = null
    private var selectedPeriodId: Int = -1
    private var doctorPeriods: List<PeriodItem> = emptyList()

    private var selectedBookingCalendar: Calendar = Calendar.getInstance(TimeZone.getTimeZone("GMT+3"))

    private lateinit var tvTotalPrice: TextView
    private lateinit var rgPayment: RadioGroup
    private lateinit var rgPeriods: RadioGroup
    private lateinit var etTxId: EditText
    private var layoutGoldenNotice: LinearLayout? = null
    private var tvSelectedBookingDate: TextView? = null
    private var layoutNoPeriodsForDate: View? = null
    private var pbLoadingPeriods: ProgressBar? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_doctor_details)

        doctor = intent.getSerializableExtra("doctor") as? DoctorItem

        val toolbar = findViewById<Toolbar>(R.id.toolbarDoctor)
        setSupportActionBar(toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        toolbar.setNavigationOnClickListener { finish() }

        val tvName = findViewById<TextView>(R.id.tvBookingDoctorName)
        val tvSpecialty = findViewById<TextView>(R.id.tvBookingDoctorSpecialty)
        val tvHospital = findViewById<TextView>(R.id.tvBookingDoctorHospital)
        val tvExperience = findViewById<TextView>(R.id.tvBookingDoctorExperience)
        val tvBio = findViewById<TextView>(R.id.tvBookingDoctorBio)
        tvTotalPrice = findViewById(R.id.tvTotalPrice)
        val btnConfirm = findViewById<Button>(R.id.btnConfirmBooking)
        rgPayment = findViewById(R.id.rgPayment)
        rgPeriods = findViewById(R.id.rgPeriods)
        etTxId = findViewById(R.id.etTransactionId)
        layoutGoldenNotice = findViewById(R.id.layoutGoldenNotice)
        tvSelectedBookingDate = findViewById(R.id.tvSelectedBookingDate)
        layoutNoPeriodsForDate = findViewById(R.id.layoutNoPeriodsForDate)
        pbLoadingPeriods = findViewById(R.id.pbLoadingPeriods)

        findViewById<View>(R.id.btnChangeBookingDate)?.setOnClickListener {
            showDatePicker()
        }

        findViewById<View>(R.id.btnNextBookingDate)?.setOnClickListener {
            advanceToNextDay()
        }

        findViewById<View>(R.id.btnEmptyNextDay)?.setOnClickListener {
            advanceToNextDay()
        }

        tvName.text = doctor?.displayName ?: "د. الطبيب الاستشاري"
        val ivAvatar = findViewById<ImageView>(R.id.ivBookingDoctorAvatar)
        val tvEmoji = findViewById<View>(R.id.tvBookingDoctorEmoji)
        val docAvatar = doctor?.avatar
        if (ivAvatar != null) {
            if (!docAvatar.isNullOrBlank()) {
                val fullUrl = if (docAvatar.startsWith("http")) docAvatar else com.medical.clinic.BuildConfig.BASE_URL.removeSuffix("/api/v1/").removeSuffix("/") + if (docAvatar.startsWith("/")) docAvatar else "/$docAvatar"
                com.bumptech.glide.Glide.with(this)
                    .load(fullUrl)
                    .transition(com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions.withCrossFade(300))
                    .circleCrop()
                    .into(ivAvatar)
                ivAvatar.visibility = View.VISIBLE
                tvEmoji?.visibility = View.GONE
            } else {
                ivAvatar.visibility = View.GONE
                tvEmoji?.visibility = View.VISIBLE
            }
        }

        tvSpecialty.text = doctor?.specialty ?: "استشاري"

        val clinicDisplay = buildString {
            append(doctor?.clinicName ?: "العيادة الطبية")
            val status = doctor?.clinicStatusLabel
            val hours = doctor?.clinicWorkingHours
            if (!status.isNullOrBlank() || !hours.isNullOrBlank()) {
                append(" • ")
                if (!status.isNullOrBlank()) append("$status ")
                if (!hours.isNullOrBlank()) append("($hours)")
            }
        }
        tvHospital.text = clinicDisplay

        val currentDoc = doctor
        val expYears = currentDoc?.experienceYears ?: 10
        val docRating = currentDoc?.rating
        val ratingText = if (docRating != null && docRating > 0f) "تقييم $docRating" else "التقييم: لا شيء"
        tvExperience.text = "⭐ خبرة $expYears عاماً • $ratingText"

        val bioText = doctor?.bio
        if (!bioText.isNullOrBlank()) {
            tvBio.text = bioText
            tvBio.visibility = View.VISIBLE
        } else {
            tvBio.text = "استشاري متميز معتمد في منظومة طبيبك لتقديم أفضل رعاية صحية."
        }

        updatePriceDisplay()

        rgPayment.setOnCheckedChangeListener { _, checkedId ->
            updatePriceDisplay()
            val isOnline = (checkedId == R.id.rbPayOnline)
            val isWallet = (checkedId == R.id.rbPayWallet)
            layoutGoldenNotice?.visibility = if (isOnline || isWallet) View.VISIBLE else View.GONE
            etTxId.visibility = if (isOnline) View.VISIBLE else View.GONE
        }

        updateBookingDateDisplay()
        loadDoctorPeriodsForSelectedDate()
        refreshPatientWalletBalance()

        // نسخ رقم الحوالات فوراً عند النقر
        val copyNumberAction = View.OnClickListener {
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("رقم التحويل", "781238648")
            clipboard.setPrimaryClip(clip)
            Toast.makeText(this, "📋 تم نسخ رقم التحويل (781238648) بنجاح! يمكنك الآن لصقه في تطبيق بنكك أو محفظتك.", Toast.LENGTH_SHORT).show()
        }
        findViewById<View>(R.id.cardPaymentInfo)?.setOnClickListener(copyNumberAction)
        findViewById<View>(R.id.tvKuraimiAccount)?.setOnClickListener(copyNumberAction)
        findViewById<View>(R.id.tvWalletsAccount)?.setOnClickListener(copyNumberAction)

        // فتح المحادثة الفورية مع الطبيب أو السكرتيرة حسب صلاحيات الطبيب
        val btnChat = findViewById<com.google.android.material.button.MaterialButton>(R.id.btnDoctorChat)
        if (currentDoc != null) {
            val allowDirect = currentDoc.allowDirectChat == 1
            if (allowDirect) {
                btnChat?.text = "مراسلة الطبيب مباشرة 💬"
            } else {
                btnChat?.text = "مراسلة العيادة / الطبيب 💬"
            }
        }

        btnChat?.setOnClickListener {
            if (!sessionManager.isLoggedIn()) {
                Toast.makeText(this, "⚠️ يرجى تسجيل الدخول أولاً للبدء في المحادثة", Toast.LENGTH_SHORT).show()
                val intent = Intent(this, com.medical.clinic.ui.auth.LoginActivity::class.java)
                startActivity(intent)
                return@setOnClickListener
            }
            val doc = doctor ?: return@setOnClickListener
            val allowDirect = doc.allowDirectChat == 1

            if (allowDirect) {
                com.medical.clinic.ui.chat.ChatActivity.start(
                    context = this,
                    doctorId = doc.id,
                    secretaryId = 0,
                    targetType = "doctor",
                    name = doc.displayName,
                    clinicName = doc.clinicName ?: "العيادة الطبية"
                )
            } else {
                val secTitle = "سكرتيرة عيادة ${doc.clinicName ?: "العيادة"}"
                AlertDialog.Builder(this)
                    .setTitle("مراسلة العيادة 🏥")
                    .setMessage("عذراً، الطبيب لا يستقبل رسائل مباشرة حالياً عبر التطبيق.\n\nيمكنك التواصل مع سكرتيرة العيادة مباشرة للاستفسارات وتنسيق المواعيد.")
                    .setPositiveButton("مراسلة السكرتيرة 👩‍💼") { _, _ ->
                        com.medical.clinic.ui.chat.ChatActivity.start(
                            context = this,
                            doctorId = doc.id,
                            secretaryId = doc.secretaryId ?: 0,
                            targetType = "secretary",
                            name = secTitle,
                            clinicName = doc.clinicName ?: "العيادة الطبية"
                        )
                    }
                    .setNegativeButton("إلغاء", null)
                    .show()
            }
        }

        btnConfirm.setOnClickListener {
            if (!sessionManager.isLoggedIn()) {
                Toast.makeText(this, "⚠️ يرجى تسجيل الدخول أولاً لتتمكن من حجز الموعد", Toast.LENGTH_LONG).show()
                val intent = Intent(this, com.medical.clinic.ui.auth.LoginActivity::class.java)
                startActivity(intent)
                return@setOnClickListener
            }

            val user = sessionManager.getUser()
            if (user == null || !user.isProfileComplete) {
                AlertDialog.Builder(this)
                    .setTitle("⚠️ إكمال الملف الطبي مطلوب")
                    .setMessage("عزيزي المريض، لإتمام حجز الموعد وضمان صحة السجل الطبي، يجب إكمال بيانات ملفك الشخصي أولاً.")
                    .setPositiveButton("إكمال الملف الآن ✅") { dialog, _ ->
                        dialog.dismiss()
                        val intent = Intent(this, CompletePatientProfileActivity::class.java)
                        startActivity(intent)
                    }
                    .setNegativeButton("إلغاء", null)
                    .show()
                return@setOnClickListener
            }

            // فحص وجود فترة صالحة مختارة
            if (selectedPeriodId <= 0 || doctorPeriods.isEmpty()) {
                AlertDialog.Builder(this)
                    .setTitle("⚠️ لا توجد فترة متاحة")
                    .setMessage("لا توجد فترات عمل متاحة للحجز في هذا التاريخ. يرجى اختيار تاريخ يوم تالٍ تتوفر فيه فترات دوام.")
                    .setPositiveButton("الانتقال لليوم التالي ⏭️") { _, _ ->
                        advanceToNextDay()
                    }
                    .setNegativeButton("إلغاء", null)
                    .show()
                return@setOnClickListener
            }

            val checkedId = rgPayment.checkedRadioButtonId
            val paymentMethod = when (checkedId) {
                R.id.rbPayWallet -> "wallet"
                R.id.rbPayOnline -> "online"
                else -> "cash"
            }
            val txId = etTxId.text.toString().trim()

            if (paymentMethod == "online" && txId.isBlank()) {
                etTxId.error = "⚠️ يرجى إدخال رقم الحوالة لتأكيد الدفع ونيل الحجز الذهبي"
                etTxId.requestFocus()
                Toast.makeText(this, "يرجى كتابة رقم الحوالة أو السند لنيل أولوية المقعد الذهبي", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }

            // فحص رصيد المحفظة قبل الإرسال إذا اختار الدفع من المحفظة
            if (paymentMethod == "wallet") {
                val currentBal = user.balance ?: 0.0
                val currentFee = calculateFinalBookingFee()
                if (currentBal < currentFee) {
                    AlertDialog.Builder(this)
                        .setTitle("⚠️ رصيد المحفظة غير كافٍ")
                        .setMessage("عزيزي المريض، رصيدك في المحفظة هو (${String.format(java.util.Locale.US, "%,.2f", currentBal)} ر.ي) وهو أقل من سعر الحجز (${String.format(java.util.Locale.US, "%,.2f", currentFee.toDouble())} ر.ي).\n\nيرجى شحن محفظتك من صفحة ملفك الشخصي أو اختيار وسيلة دفع أخرى.")
                        .setPositiveButton("شحن المحفظة 💳") { dialog, _ ->
                            dialog.dismiss()
                            finish() // العودة للملف الشخصي للشحن
                        }
                        .setNegativeButton("تغيير طريقة الدفع", null)
                        .show()
                    return@setOnClickListener
                }
            }

            promptFamilyMemberSelection(paymentMethod, txId)
        }
    }

    private fun updateBookingDateDisplay() {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.ENGLISH).apply {
            timeZone = TimeZone.getTimeZone("GMT+3")
        }
        val dateStr = sdf.format(selectedBookingCalendar.time)
        val formattedDate = DateTimeUtils.formatArabicDate(dateStr)
        tvSelectedBookingDate?.text = "موعد الحجز: $formattedDate"
    }

    private fun showDatePicker() {
        val y = selectedBookingCalendar.get(Calendar.YEAR)
        val m = selectedBookingCalendar.get(Calendar.MONTH)
        val d = selectedBookingCalendar.get(Calendar.DAY_OF_MONTH)

        val dpd = DatePickerDialog(this, { _, year, month, dayOfMonth ->
            selectedBookingCalendar.set(Calendar.YEAR, year)
            selectedBookingCalendar.set(Calendar.MONTH, month)
            selectedBookingCalendar.set(Calendar.DAY_OF_MONTH, dayOfMonth)
            updateBookingDateDisplay()
            loadDoctorPeriodsForSelectedDate()
        }, y, m, d)

        dpd.datePicker.minDate = System.currentTimeMillis() - 1000
        dpd.show()
    }

    private fun advanceToNextDay() {
        selectedBookingCalendar.add(Calendar.DAY_OF_MONTH, 1)
        updateBookingDateDisplay()
        loadDoctorPeriodsForSelectedDate()
    }

    private fun calculateFinalBookingFee(): Int {
        val baseFee = doctor?.consultationFee ?: 5000
        val offerDiscount = doctor?.offerDiscountPercent ?: 0
        val feeAfterOffer = if (offerDiscount > 0) {
            Math.max(0, (baseFee * (100 - offerDiscount) / 100))
        } else {
            doctor?.discountedFee ?: baseFee
        }

        val checkedId = rgPayment.checkedRadioButtonId
        return if (checkedId == R.id.rbPayOnline || checkedId == R.id.rbPayWallet) {
            (feeAfterOffer * 0.95).toInt()
        } else {
            feeAfterOffer
        }
    }

    private fun refreshPatientWalletBalance() {
        if (!sessionManager.isLoggedIn()) return
        lifecycleScope.launch {
            try {
                val res = apiClient.apiService.getPatientProfile()
                if (res.success && res.data != null) {
                    sessionManager.saveUser(res.data)
                    updateWalletRadioButtonText(res.data.balance ?: 0.0)
                }
            } catch (_: Exception) {
                val u = sessionManager.getUser()
                updateWalletRadioButtonText(u?.balance ?: 0.0)
            }
        }
    }

    private fun updateWalletRadioButtonText(balance: Double) {
        val rbWallet = findViewById<RadioButton>(R.id.rbPayWallet)
        rbWallet?.text = "💳 الدفع من رصيد المحفظة (الرصيد: ${String.format(java.util.Locale.US, "%,.2f", balance)} ر.ي - خصم 5% + مقعد ذهبي)"
    }

    private fun updatePriceDisplay() {
        val baseFee = doctor?.consultationFee ?: 5000
        val offerDiscount = doctor?.offerDiscountPercent ?: 0
        val feeAfterOffer = if (offerDiscount > 0) {
            Math.max(0, (baseFee * (100 - offerDiscount) / 100))
        } else {
            doctor?.discountedFee ?: baseFee
        }

        val isDiscountEligible = (rgPayment.checkedRadioButtonId == R.id.rbPayOnline || rgPayment.checkedRadioButtonId == R.id.rbPayWallet)

        if (offerDiscount > 0) {
            if (isDiscountEligible) {
                val finalFee = (feeAfterOffer * 0.95).toInt()
                tvTotalPrice.text = "$finalFee ر.ي (خصم عرض $offerDiscount% + 5% إلكتروني/محفظة 🔥)"
                tvTotalPrice.setTextColor(Color.parseColor("#0D9488"))
            } else {
                tvTotalPrice.text = "$feeAfterOffer ر.ي (خصم عرض $offerDiscount% 🔥)"
                tvTotalPrice.setTextColor(Color.parseColor("#DC2626"))
            }
        } else {
            val discountedFee = (baseFee * 0.95).toInt()
            if (isDiscountEligible) {
                val methodLabel = if (rgPayment.checkedRadioButtonId == R.id.rbPayWallet) "رصيد المحفظة" else "تحويل إلكتروني"
                tvTotalPrice.text = "$discountedFee ر.ي (خصم 5% عبر $methodLabel)"
                tvTotalPrice.setTextColor(Color.parseColor("#0D9488"))
            } else {
                tvTotalPrice.text = "$baseFee ر.ي (نقداً)"
                tvTotalPrice.setTextColor(Color.parseColor("#042F2E"))
            }
        }
    }

    private fun loadDoctorPeriodsForSelectedDate() {
        val docId = doctor?.id ?: return
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.ENGLISH).apply {
            timeZone = TimeZone.getTimeZone("GMT+3")
        }
        val targetDateStr = sdf.format(selectedBookingCalendar.time)

        pbLoadingPeriods?.visibility = View.VISIBLE
        rgPeriods.visibility = View.GONE
        layoutNoPeriodsForDate?.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val res = apiClient.apiService.getDoctorAvailablePeriods(docId, targetDateStr)
                pbLoadingPeriods?.visibility = View.GONE

                if (res.success && !res.data.isNullOrEmpty()) {
                    doctorPeriods = res.data
                    populatePeriodRadioButtons(doctorPeriods)
                    layoutNoPeriodsForDate?.visibility = View.GONE
                    rgPeriods.visibility = View.VISIBLE
                } else {
                    doctorPeriods = emptyList()
                    selectedPeriodId = -1
                    rgPeriods.removeAllViews()
                    rgPeriods.visibility = View.GONE
                    layoutNoPeriodsForDate?.visibility = View.VISIBLE
                }
            } catch (e: Exception) {
                pbLoadingPeriods?.visibility = View.GONE
                doctorPeriods = emptyList()
                selectedPeriodId = -1
                rgPeriods.removeAllViews()
                rgPeriods.visibility = View.GONE
                layoutNoPeriodsForDate?.visibility = View.VISIBLE
            }
        }
    }

    private fun populatePeriodRadioButtons(periods: List<PeriodItem>) {
        rgPeriods.removeAllViews()
        selectedPeriodId = -1

        var firstSelectableSet = false
        for (period in periods) {
            val rb = RadioButton(this).apply {
                id = View.generateViewId()
                tag = period.id
                text = period.displayText
                setTextColor(Color.parseColor("#1F2937"))
                textSize = 13f
                setPadding(24, 24, 24, 24)
                setBackgroundResource(R.drawable.bg_input_field)
                val params = RadioGroup.LayoutParams(
                    RadioGroup.LayoutParams.MATCH_PARENT,
                    RadioGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    bottomMargin = 16
                }
                layoutParams = params
                isEnabled = !period.isFull
                if (!firstSelectableSet && !period.isFull) {
                    isChecked = true
                    selectedPeriodId = period.id
                    firstSelectableSet = true
                }
            }
            rgPeriods.addView(rb)
        }

        rgPeriods.setOnCheckedChangeListener { group, checkedId ->
            val checkedRb = group.findViewById<RadioButton>(checkedId)
            val pId = checkedRb?.tag as? Int
            if (pId != null) {
                selectedPeriodId = pId
            }
        }
    }

    private fun processBooking(paymentMethod: String, txId: String, familyMemberId: Int? = null) {
        val docId = doctor?.id ?: 1

        lifecycleScope.launch {
            try {
                val bookingPayload = mutableMapOf<String, Any>(
                    "doctor_id" to docId,
                    "period_id" to selectedPeriodId,
                    "payment_method" to paymentMethod,
                    "reason" to (if (txId.isNotBlank()) "سند التحويل: $txId" else "كشف عام")
                )
                if (familyMemberId != null && familyMemberId > 0) {
                    bookingPayload["family_member_id"] = familyMemberId
                }
                if (txId.isNotBlank()) {
                    bookingPayload["transaction_id"] = txId
                }

                val response = apiClient.apiService.bookAppointment(bookingPayload)
                var serverCode: String? = null
                var serverQueue: Int? = null
                var serverGolden: Int? = null

                if (response.success && response.data != null) {
                    try {
                        val map = response.data as? Map<*, *>
                        serverCode = map?.get("booking_code")?.toString()
                        serverQueue = (map?.get("queue_number") as? Number)?.toInt()
                        serverGolden = (map?.get("is_golden") as? Number)?.toInt()
                    } catch (e: Exception) {}
                    showSuccessBookingDialog(paymentMethod, txId, serverCode, serverQueue, serverGolden)
                } else {
                    val errorMsg = response.message ?: "عذراً، تعذر إتمام الحجز. يرجى اختيار موعد قادم."
                    AlertDialog.Builder(this@DoctorDetailsActivity)
                        .setTitle("تنبيه الحجز ⚠️")
                        .setMessage(errorMsg)
                        .setPositiveButton("حسناً", null)
                        .show()
                }

            } catch (e: Exception) {
                var errorMsg = "حدث خطأ أثناء حجز الموعد. يرجى التحقق من اتصالك والمحاولة لاحقاً."
                if (e is retrofit2.HttpException) {
                    try {
                        val errorBody = e.response()?.errorBody()?.string()
                        if (!errorBody.isNullOrBlank()) {
                            val json = org.json.JSONObject(errorBody)
                            errorMsg = json.optString("message", errorMsg)
                        }
                    } catch (_: Exception) {}
                }
                AlertDialog.Builder(this@DoctorDetailsActivity)
                    .setTitle("تعذر إتمام الحجز ⚠️")
                    .setMessage(errorMsg)
                    .setPositiveButton("حسناً", null)
                    .show()
            }
        }
    }

    private fun showSuccessBookingDialog(
        paymentMethod: String,
        txId: String,
        serverBookingCode: String?,
        serverQueueNumber: Int?,
        serverIsGolden: Int?
    ) {
        val bookingCode = serverBookingCode ?: ("TB-" + (1000..9999).random())
        val queueNumber = serverQueueNumber ?: if (paymentMethod == "online") 1 else (4..12).random()

        val title: String
        val message: String

        if (paymentMethod == "online") {
            title = "👑 تم استلام طلب الحجز ورقم الحوالة!"
            message = "رمز الحجز: $bookingCode\n" +
                    "رقم الحوالة المدخل: $txId\n" +
                    "رقم المقعد المبدئي: #$queueNumber\n\n" +
                    "⚡ إشعار ميزة الحجز الذهبي:\n" +
                    "عند مراجعة الإدارة وتأكيد استلام الحوالة، سيتم تثبيت المقعد الأولي ذو الأولوية (الحجز الذهبي 👑) للدخول أولاً في العيادة!\n" +
                    "وفي حال لم يتم تأكيد الدفع، سيكون دورك في العيادة حسب الترتيب المتسلسل العادي."
        } else {
            title = "🎉 تم حجز موعدك بنجاح!"
            message = "رمز الحجز: $bookingCode\n" +
                    "رقم دورك في الطابور: #$queueNumber\n\n" +
                    "📌 تم تحديد مقعدك بالترتيب المتسلسل حسب وقت حجزك، وسيكون السداد نقداً عند مكتب الاستقبال بالعيادة."
        }

        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("الذهاب لمواعيدي ✅") { dialog, _ ->
                dialog.dismiss()
                val intent = Intent(this, MainActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP
                startActivity(intent)
                finish()
            }
            .setCancelable(false)
            .show()
    }

    private fun promptFamilyMemberSelection(paymentMethod: String, txId: String) {
        val user = sessionManager.getUser()
        val userName = user?.fullName ?: "نفسي"

        val progress = android.app.ProgressDialog(this).apply {
            setMessage("جاري تحميل بيانات العائلة...")
            setCancelable(false)
            show()
        }

        lifecycleScope.launch {
            var familyList: List<com.medical.clinic.data.models.FamilyMember> = emptyList()
            try {
                val res = apiClient.apiService.getFamilyMembers()
                if (res.success && !res.data.isNullOrEmpty()) {
                    familyList = res.data
                }
            } catch (_: Exception) {}

            progress.dismiss()

            val options = mutableListOf<String>()
            options.add("👤 حجز لنفسي ($userName)")
            familyList.forEach { m ->
                val ageStr = if (m.age != null) " (${m.age} سنة)" else ""
                options.add("👨‍👩‍👧‍👦 ${m.name} - ${m.relationship}$ageStr")
            }
            options.add("➕ إضافة فرد عائلة جديد...")

            AlertDialog.Builder(this@DoctorDetailsActivity)
                .setTitle("لمن هذا الموعد الطبي؟ 📋")
                .setItems(options.toTypedArray()) { _, which ->
                    when (which) {
                        0 -> {
                            // حجز لصاحب الحساب
                            processBooking(paymentMethod, txId, null)
                        }
                        options.size - 1 -> {
                            // إضافة فرد جديد
                            showAddNewFamilyMemberDialog { newMemberId ->
                                processBooking(paymentMethod, txId, newMemberId)
                            }
                        }
                        else -> {
                            // اختيار أحد الأفراد
                            val selectedMember = familyList[which - 1]
                            processBooking(paymentMethod, txId, selectedMember.id)
                        }
                    }
                }
                .setNegativeButton("إلغاء", null)
                .show()
        }
    }

    private fun showAddNewFamilyMemberDialog(onMemberAdded: (Int) -> Unit) {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_add_family_member, null)
        val etName = dialogView.findViewById<android.widget.EditText>(R.id.etFamilyName)
        val spRelation = dialogView.findViewById<android.widget.Spinner>(R.id.spFamilyRelation)
        val etAge = dialogView.findViewById<android.widget.EditText>(R.id.etFamilyAge)
        val rgGender = dialogView.findViewById<RadioGroup>(R.id.rgFamilyGender)

        val relations = arrayOf("ابن", "ابنة", "زوجة", "زوج", "أب", "أم", "أخ", "أخت", "آخر")
        val adapter = android.widget.ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, relations)
        spRelation.adapter = adapter

        AlertDialog.Builder(this)
            .setTitle("➕ إضافة فرد جديد للعائلة")
            .setView(dialogView)
            .setPositiveButton("إضافة ومتابعة الحجز ✅") { _, _ ->
                val name = etName.text.toString().trim()
                val relation = spRelation.selectedItem?.toString() ?: "ابن"
                val ageText = etAge.text.toString().trim()
                val age = ageText.toIntOrNull()
                val gender = if (rgGender.checkedRadioButtonId == R.id.rbGenderFemale) "female" else "male"

                if (name.isBlank()) {
                    Toast.makeText(this, "⚠️ يرجى إدخال اسم المريض", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                lifecycleScope.launch {
                    val progress = android.app.ProgressDialog(this@DoctorDetailsActivity).apply {
                        setMessage("جاري حفظ بيانات فرد العائلة...")
                        setCancelable(false)
                        show()
                    }
                    try {
                        val payload = mutableMapOf<String, Any>(
                            "name" to name,
                            "relationship" to relation,
                            "gender" to gender
                        )
                        if (age != null) payload["age"] = age

                        val res = apiClient.apiService.addFamilyMember(payload)
                        progress.dismiss()
                        if (res.success && res.data != null) {
                            Toast.makeText(this@DoctorDetailsActivity, "تمت إضافة ${res.data.name} بنجاح 👨‍👩‍👧‍👦", Toast.LENGTH_SHORT).show()
                            onMemberAdded(res.data.id)
                        } else {
                            Toast.makeText(this@DoctorDetailsActivity, res.message ?: "تعذر إضافة فرد العائلة", Toast.LENGTH_LONG).show()
                        }
                    } catch (e: Exception) {
                        progress.dismiss()
                        Toast.makeText(this@DoctorDetailsActivity, "خطأ في الاتصال: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
            .setNegativeButton("إلغاء", null)
            .show()
    }
}
