package com.medical.clinic.staff.ui.secretary

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import android.graphics.Typeface
import androidx.appcompat.app.AlertDialog
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.medical.clinic.staff.data.models.SecretaryDoctorItem
import com.medical.clinic.staff.data.models.StaffAppointmentItem
import com.medical.clinic.staff.data.repository.DoctorRepository
import com.medical.clinic.staff.data.repository.SecretaryRepository
import com.medical.clinic.staff.data.utils.Resource
import com.medical.clinic.staff.databinding.FragmentSecretaryDashboardBinding
import com.medical.clinic.staff.data.local.SessionManager
import com.medical.clinic.staff.ui.utils.ProfileGuard
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class SecretaryDashboardFragment : Fragment() {

    private var _binding: FragmentSecretaryDashboardBinding? = null
    private val binding get() = _binding!!

    @Inject
    lateinit var secretaryRepository: SecretaryRepository

    @Inject
    lateinit var doctorRepository: DoctorRepository

    @Inject
    lateinit var sessionManager: SessionManager

    @Inject
    lateinit var apiService: com.medical.clinic.staff.data.api.ApiService

    private var doctorsList = listOf<SecretaryDoctorItem>()
    private var allAppointments = listOf<StaffAppointmentItem>()
    private var currentAppointmentFilter: String = "all"

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSecretaryDashboardBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        com.medical.clinic.staff.ui.utils.InputValidationUtils.applyArabicNameRules(binding.etWalkInName, 25)
        com.medical.clinic.staff.ui.utils.InputValidationUtils.applyPhoneRules(binding.etWalkInPhone, 9)
        loadData()
        setupListeners()
    }

    private fun loadData() {
        if (sessionManager.isGuestMode()) {
            binding.tvSecDocCount.text = "0"
            binding.tvSecOffersCount.text = "0"
            binding.tvSecScheduleStatusBadge.text = "وضع التجربة (يتطلب إكمال الملف)"
            return
        }

        // ⚡ تحميل الكاش المحلي مسبقاً لتسريع الاستجابة أثناء ضعف الإنترنت في اليمن
        sessionManager.getString("cached_sec_schedule")?.let { cachedSchedJson ->
            try {
                val cached = com.google.gson.Gson().fromJson(cachedSchedJson, com.medical.clinic.staff.data.models.ClinicScheduleData::class.java)
                if (cached != null) updateScheduleCard(cached)
            } catch (_: Exception) {}
        }

        viewLifecycleOwner.lifecycleScope.launch {
            // Load doctors
            val docRes = secretaryRepository.getSecretaryDoctors()
            if (docRes is Resource.Success && docRes.data != null) {
                doctorsList = docRes.data
                sessionManager.saveString("cached_sec_doctors", com.google.gson.Gson().toJson(doctorsList))
                binding.tvSecDocCount.text = "${doctorsList.size}"
                val names = doctorsList.map { "${it.fullName} (${it.specialty ?: ""})" }
                val adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, names)
                binding.spWalkInDoctor.adapter = adapter
            }

            // Load offers
            val offersRes = secretaryRepository.getOffers()
            if (offersRes is Resource.Success && offersRes.data != null) {
                binding.tvSecOffersCount.text = "${offersRes.data.size}"
            }

            // Load clinic schedule
            try {
                val schedRes = apiService.getClinicSchedule()
                if (schedRes.isSuccessful && schedRes.body()?.success == true && schedRes.body()?.data != null) {
                    val schedData = schedRes.body()!!.data!!
                    sessionManager.saveString("cached_sec_schedule", com.google.gson.Gson().toJson(schedData))
                    updateScheduleCard(schedData)
                }
            } catch (_: Exception) {}

            // Load pending doctor requests, clinic appointments and financial stats
            loadPendingDoctors()
            loadAppointments()
            loadFinancialStats()
            binding.swipeRefreshDashboard.isRefreshing = false
        }
    }

    private fun updateScheduleCard(data: com.medical.clinic.staff.data.models.ClinicScheduleData) {
        if (data.is24Hours == 1) {
            binding.tvSecScheduleStatusBadge.text = "🟢 مفتوح الآن (دوام متواصل 24 ساعة)"
            binding.tvSecScheduleDetails.text = "دوام متواصل طوال اليوم بدون إغلاق. متاح للحجز واستقبال المرضى 24/7."
        } else {
            val status = data.statusLabel ?: if (data.isOpen == true) "مفتوح الآن 🟢" else "مغلق حالياً 🔴"
            val rawHours = data.workingHoursDisplay ?: "من ${data.openTime ?: "08:00"} إلى ${data.closeTime ?: "22:00"}"
            val hours = if (rawHours.contains("NaN")) "من 08:00 ص إلى 11:00 م" else rawHours
            binding.tvSecScheduleStatusBadge.text = "$status ($hours)"
            binding.tvSecScheduleDetails.text = "القالب: ${if (data.scheduleType == "weekly") "أسبوعي مخصص" else "يومي موحد"} | أوقات العمل: $hours"
        }
    }

    private fun setupListeners() {
        binding.swipeRefreshDashboard.setOnRefreshListener {
            loadData()
        }

        val toggleWalkInForm = {
            if (binding.layoutWalkInForm.visibility == View.VISIBLE) {
                binding.layoutWalkInForm.visibility = View.GONE
                binding.tvWalkInHeaderIcon.text = "➕"
                binding.tvWalkInToggleArrow.text = "فتح ❯"
                binding.tvWalkInHeaderSubtitle.text = "انقر هنا لإظهار نموذج تسجيل المريض مباشرة 🔽"
            } else {
                binding.layoutWalkInForm.visibility = View.VISIBLE
                binding.tvWalkInHeaderIcon.text = "➖"
                binding.tvWalkInToggleArrow.text = "إغلاق ❮"
                binding.tvWalkInHeaderSubtitle.text = "خاص بالمرضى الحاضرين مباشرة بدون تطبيق 🔼"
            }
        }
        binding.layoutToggleWalkInHeader.setOnClickListener { toggleWalkInForm() }

        // 🔍 النقر على بطاقة المواعيد لعرض تفاصيل المرضى والعدد والمقاعد المتبقية
        binding.cardAppointmentsSection.setOnClickListener {
            AppointmentDetailsDialogHelper.showBookingsAndCapacityDialog(requireContext(), allAppointments)
        }
        binding.tvAppointmentsCountBadge.setOnClickListener {
            AppointmentDetailsDialogHelper.showBookingsAndCapacityDialog(requireContext(), allAppointments)
        }

        binding.chipGroupAppointmentFilter.setOnCheckedStateChangeListener { _, checkedIds ->
            val checkedId = checkedIds.firstOrNull() ?: com.medical.clinic.staff.R.id.chipFilterAll
            currentAppointmentFilter = when (checkedId) {
                com.medical.clinic.staff.R.id.chipFilterUpcoming -> "upcoming"
                com.medical.clinic.staff.R.id.chipFilterCompleted -> "completed"
                com.medical.clinic.staff.R.id.chipFilterPast -> "past"
                com.medical.clinic.staff.R.id.chipFilterNoShow -> "no_show"
                com.medical.clinic.staff.R.id.chipFilterCancelled -> "cancelled"
                else -> "all"
            }
            applyAppointmentFilter()
        }

        binding.chipGroupFinancialRange.setOnCheckedStateChangeListener { _, checkedIds ->
            val checkedId = checkedIds.firstOrNull() ?: com.medical.clinic.staff.R.id.chipFinAll
            val range = when (checkedId) {
                com.medical.clinic.staff.R.id.chipFinToday -> "today"
                com.medical.clinic.staff.R.id.chipFinWeek -> "week"
                com.medical.clinic.staff.R.id.chipFinMonth -> "month"
                else -> "all"
            }
            loadFinancialStats(range)
        }

        binding.cardClinicSchedule.setOnClickListener {
            ProfileGuard.checkOrPrompt(requireContext(), sessionManager) {
                com.medical.clinic.staff.ui.utils.ClinicDialogHelper.showClinicScheduleDialog(
                    context = requireContext(),
                    scope = viewLifecycleOwner.lifecycleScope,
                    apiService = apiService,
                    onSaved = { sched ->
                        updateScheduleCard(sched)
                    }
                )
            }
        }
        binding.btnAddWalkInToQueue.setOnClickListener {
            ProfileGuard.checkOrPrompt(requireContext(), sessionManager) {
                val rawName = binding.etWalkInName.text?.toString() ?: ""
                val name = com.medical.clinic.staff.ui.utils.InputValidationUtils.sanitize(rawName)

                if (!com.medical.clinic.staff.ui.utils.InputValidationUtils.isStrictlyArabicName(name)) {
                    binding.tilWalkInName.error = "اسم المريض يجب أن يكون بأحرف عربية فقط (بين 3 و 25 حرفاً)"
                    return@checkOrPrompt
                }
                binding.tilWalkInName.error = null

                val rawPhone = binding.etWalkInPhone.text?.toString()?.trim() ?: ""
                val cleanPhone = rawPhone.replace(Regex("^(\\+?967)"), "")
                if (cleanPhone.isNotEmpty() && !com.medical.clinic.staff.ui.utils.InputValidationUtils.isValidPhone(cleanPhone)) {
                    binding.tilWalkInPhone.error = "رقم هاتف المريض يجب أن يتكون من 9 أرقام تبدأ بـ 7"
                    return@checkOrPrompt
                }
                binding.tilWalkInPhone.error = null

                val docPos = binding.spWalkInDoctor.selectedItemPosition
                if (docPos < 0 || docPos >= doctorsList.size) {
                    Toast.makeText(requireContext(), "يرجى اختيار الطبيب", Toast.LENGTH_SHORT).show()
                    return@checkOrPrompt
                }
                val doctorId = doctorsList[docPos].id

                addWalkInPatient(doctorId, name, cleanPhone.takeIf { it.isNotEmpty() })
            }
        }
    }

    private fun addWalkInPatient(doctorId: Int, name: String, phone: String?) {
        binding.btnAddWalkInToQueue.isEnabled = false
        viewLifecycleOwner.lifecycleScope.launch {
            val res = doctorRepository.addPatientToQueue(doctorId, name, phone)
            binding.btnAddWalkInToQueue.isEnabled = true

            if (res is Resource.Success && res.data != null) {
                Toast.makeText(requireContext(), "تمت إضافة المريض بنجاح، رقم الدور: #${res.data.queueNumber}", Toast.LENGTH_LONG).show()
                binding.etWalkInName.text?.clear()
                binding.etWalkInPhone.text?.clear()
            } else {
                Toast.makeText(requireContext(), res.message ?: "فشل إضافة المريض", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // ═══════════════════════════════════════════
    // CLINIC FINANCIAL & REVENUE SECTION
    // ═══════════════════════════════════════════

    private fun loadFinancialStats(range: String = "all") {
        // قراءة الكاش المحلي أولاً للكل فقط
        if (range == "all") {
            sessionManager.getString("cached_sec_financials")?.let { cachedJson ->
                try {
                    val cached = com.google.gson.Gson().fromJson(cachedJson, com.medical.clinic.staff.data.models.ClinicFinancialStats::class.java)
                    if (cached != null) displayFinancialStats(cached)
                } catch (_: Exception) {}
            }
        }

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val res = apiService.getClinicFinancialStats(range)
                if (res.isSuccessful && res.body()?.success == true && res.body()?.data != null) {
                    val stats = res.body()!!.data!!
                    if (range == "all") {
                        sessionManager.saveString("cached_sec_financials", com.google.gson.Gson().toJson(stats))
                    }
                    displayFinancialStats(stats)
                }
            } catch (_: Exception) {}
        }
    }

    private fun displayFinancialStats(stats: com.medical.clinic.staff.data.models.ClinicFinancialStats) {
        val formatMoney = { num: Double ->
            "${String.format(java.util.Locale.US, "%,.0f", num)} ر.ي"
        }

        binding.tvSecCommissionNotice.text = "عمولة المنصة: ${stats.commissionRate}% (للاطلاع فقط وغير قابلة للتعديل)"
        binding.tvSecTotalNetRevenueBadge.text = formatMoney(stats.totalNetRevenue)
        binding.tvSecTotalApptCount.text = "${stats.totalAppointments} حجز"
        binding.tvSecTotalNetRevenue.text = formatMoney(stats.totalNetRevenue)

        binding.layoutDoctorsFinancialContainer.removeAllViews()

        if (stats.doctors.isEmpty()) {
            binding.tvNoDoctorsFinancial.visibility = View.VISIBLE
        } else {
            binding.tvNoDoctorsFinancial.visibility = View.GONE
            for (doc in stats.doctors) {
                binding.layoutDoctorsFinancialContainer.addView(createDoctorFinancialCard(doc, stats.commissionRate))
            }
        }
    }

    private fun createDoctorFinancialCard(doc: com.medical.clinic.staff.data.models.DoctorFinancialItem, commRate: Double): View {
        val context = requireContext()
        val card = com.google.android.material.card.MaterialCardView(context).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = 12
            }
            radius = 14f * resources.displayMetrics.density
            cardElevation = 1.5f * resources.displayMetrics.density
            strokeWidth = (1 * resources.displayMetrics.density).toInt()
            setStrokeColor(android.graphics.Color.parseColor("#E2E8F0"))
            setCardBackgroundColor(android.graphics.Color.parseColor("#F8FAFC"))
        }

        val content = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(20, 16, 20, 16)
        }

        // Row 1: Doctor Name & Net Revenue Badge
        val row1 = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
        }

        val tvName = TextView(context).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            text = "👨‍⚕️ د. ${doc.doctorName}"
            textSize = 14.5f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(ContextCompat.getColor(context, com.medical.clinic.staff.R.color.on_surface_dark))
        }
        row1.addView(tvName)

        val tvDoctorNet = TextView(context).apply {
            text = "العائد: ${String.format(java.util.Locale.US, "%,.0f", doc.netRevenue)} ر.ي"
            textSize = 12.5f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(ContextCompat.getColor(context, com.medical.clinic.staff.R.color.brand_primary))
        }
        row1.addView(tvDoctorNet)
        content.addView(row1)

        // Row 2: Specialty + Pricing details after commission deduction
        val tvPricing = TextView(context).apply {
            val originalFee = String.format(java.util.Locale.US, "%,.0f", doc.consultationFee)
            val netPerBooking = String.format(java.util.Locale.US, "%,.0f", doc.netFeePerBooking)
            text = "${doc.specialty ?: "طبيب"} • سعر الحجز: $originalFee ر.ي (صافي الحجز بعد الخصم: $netPerBooking ر.ي)"
            textSize = 11.5f
            setTextColor(ContextCompat.getColor(context, com.medical.clinic.staff.R.color.on_surface_dark_tertiary))
            setPadding(0, 4, 0, 0)
        }
        content.addView(tvPricing)

        // Row 3: Bookings count & Gross vs Net Breakdown
        val rowStats = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, 10, 0, 0)
        }

        val tvApptCount = TextView(context).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            text = "عدد الحجوزات: ${doc.appointmentsCount} حجز"
            textSize = 12f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(ContextCompat.getColor(context, com.medical.clinic.staff.R.color.on_surface_dark_secondary))
        }
        rowStats.addView(tvApptCount)

        val tvCommissionDeducted = TextView(context).apply {
            text = "عمولة الإدارة المخصومة: ${String.format(java.util.Locale.US, "%,.0f", doc.adminCommission)} ر.ي"
            textSize = 11f
            setTextColor(ContextCompat.getColor(context, com.medical.clinic.staff.R.color.on_surface_dark_tertiary))
        }
        rowStats.addView(tvCommissionDeducted)
        content.addView(rowStats)

        card.addView(content)
        return card
    }

    // ═══════════════════════════════════════════
    // PENDING DOCTORS APPROVAL SECTION
    // ═══════════════════════════════════════════

    private fun loadPendingDoctors() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val res = apiService.getPendingDoctors()
                if (res.isSuccessful && res.body()?.success == true) {
                    val list = res.body()?.data ?: emptyList()
                    binding.tvPendingCountBadge.text = "${list.size} طلب"
                    binding.layoutPendingDoctorsContainer.removeAllViews()

                    if (list.isEmpty()) {
                        binding.tvNoPendingDoctors.visibility = View.VISIBLE
                    } else {
                        binding.tvNoPendingDoctors.visibility = View.GONE
                        for (doc in list) {
                            binding.layoutPendingDoctorsContainer.addView(createPendingDoctorCard(doc))
                        }
                    }
                }
            } catch (_: Exception) {}
        }
    }

    private fun createPendingDoctorCard(doc: SecretaryDoctorItem): View {
        val context = requireContext()
        val card = com.google.android.material.card.MaterialCardView(context).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = 16
            }
            radius = 16f * resources.displayMetrics.density
            cardElevation = 2f * resources.displayMetrics.density
            strokeWidth = (1 * resources.displayMetrics.density).toInt()
            setStrokeColor(android.graphics.Color.parseColor("#E2E8F0"))
            setCardBackgroundColor(android.graphics.Color.WHITE)
        }

        val contentLayout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 20, 24, 20)
        }

        val infoRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
        }

        val tvIcon = TextView(context).apply {
            text = "👨‍⚕️"
            textSize = 24f
            setPadding(0, 0, 16, 0)
        }
        infoRow.addView(tvIcon)

        val textLayout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        val tvName = TextView(context).apply {
            text = "د. ${doc.fullName}"
            textSize = 15f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(ContextCompat.getColor(context, com.medical.clinic.staff.R.color.on_surface_dark))
        }
        textLayout.addView(tvName)

        val tvDetails = TextView(context).apply {
            text = "${doc.specialty ?: "طبيب عام"} • ${doc.phone ?: ""}"
            textSize = 12f
            setTextColor(ContextCompat.getColor(context, com.medical.clinic.staff.R.color.on_surface_dark_tertiary))
            setPadding(0, 4, 0, 0)
        }
        textLayout.addView(tvDetails)
        infoRow.addView(textLayout)
        contentLayout.addView(infoRow)

        val btnRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, 16, 0, 0)
        }

        val btnApprove = com.google.android.material.button.MaterialButton(context).apply {
            layoutParams = LinearLayout.LayoutParams(0, (40 * resources.displayMetrics.density).toInt(), 1f).apply {
                marginEnd = 8
            }
            text = "قبول وتوثيق ✅"
            textSize = 12f
            setBackgroundColor(ContextCompat.getColor(context, com.medical.clinic.staff.R.color.brand_primary))
            setOnClickListener {
                ProfileGuard.checkOrPrompt(context, sessionManager) {
                    performApproveDoctor(doc.id, doc.fullName)
                }
            }
        }
        btnRow.addView(btnApprove)

        val btnReject = com.google.android.material.button.MaterialButton(
            context,
            null,
            com.google.android.material.R.attr.materialButtonOutlinedStyle
        ).apply {
            layoutParams = LinearLayout.LayoutParams(0, (40 * resources.displayMetrics.density).toInt(), 1f)
            text = "رفض ❌"
            textSize = 12f
            setTextColor(ContextCompat.getColor(context, com.medical.clinic.staff.R.color.brand_danger))
            strokeColor = android.content.res.ColorStateList.valueOf(
                ContextCompat.getColor(context, com.medical.clinic.staff.R.color.brand_danger)
            )
            setOnClickListener {
                ProfileGuard.checkOrPrompt(context, sessionManager) {
                    performRejectDoctor(doc.id, doc.fullName)
                }
            }
        }
        btnRow.addView(btnReject)
        contentLayout.addView(btnRow)

        card.addView(contentLayout)
        return card
    }

    private fun performApproveDoctor(doctorId: Int, name: String) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val res = apiService.approveDoctor(doctorId)
                if (res.isSuccessful && res.body()?.success == true) {
                    Toast.makeText(requireContext(), "تم توثيق واعتماد الطبيب $name بنجاح 🎉", Toast.LENGTH_SHORT).show()
                    loadData()
                } else {
                    Toast.makeText(requireContext(), res.body()?.message ?: "فشل اعتماد الطبيب", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "خطأ: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun performRejectDoctor(doctorId: Int, name: String) {
        AlertDialog.Builder(requireContext())
            .setTitle("تأكيد رفض الطلب")
            .setMessage("هل أنت متأكد من رفض انضمام الطبيب $name للعيادة؟")
            .setPositiveButton("رفض") { _, _ ->
                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val res = apiService.rejectDoctor(doctorId)
                        if (res.isSuccessful && res.body()?.success == true) {
                            Toast.makeText(requireContext(), "تم رفض طلب الانضمام", Toast.LENGTH_SHORT).show()
                            loadData()
                        } else {
                            Toast.makeText(requireContext(), res.body()?.message ?: "فشل الرفض", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(requireContext(), "خطأ: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("إلغاء", null)
            .show()
    }

    // ═══════════════════════════════════════════
    // APPOINTMENTS & CONFIRMATIONS SECTION
    // ═══════════════════════════════════════════

    private fun loadAppointments() {
        // ⚡ قراءة الحجوزات من الكاش المحلي أولاً
        sessionManager.getString("cached_sec_appointments")?.let { cachedJson ->
            try {
                val listType = object : com.google.gson.reflect.TypeToken<List<StaffAppointmentItem>>() {}.type
                val cachedList = com.google.gson.Gson().fromJson<List<StaffAppointmentItem>>(cachedJson, listType)
                if (!cachedList.isNullOrEmpty()) {
                    allAppointments = cachedList
                    applyAppointmentFilter()
                }
            } catch (_: Exception) {}
        }

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val res = apiService.getAppointments()
                if (res.isSuccessful && res.body()?.success == true) {
                    val list = res.body()?.data ?: emptyList()
                    sessionManager.saveString("cached_sec_appointments", com.google.gson.Gson().toJson(list))
                    allAppointments = list
                    applyAppointmentFilter()
                }
            } catch (_: Exception) {}
        }
    }

    private fun applyAppointmentFilter() {
        val yemenTz = java.util.TimeZone.getTimeZone("GMT+3")
        val nowCal = java.util.Calendar.getInstance(yemenTz)
        val todayStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).apply {
            timeZone = yemenTz
        }.format(nowCal.time)
        val currentMinutes = nowCal.get(java.util.Calendar.HOUR_OF_DAY) * 60 + nowCal.get(java.util.Calendar.MINUTE)

        val filtered = allAppointments.filter { appt ->
            val apptDate = appt.periodDate?.take(10) ?: ""
            val endMin = if (!appt.periodEndTime.isNullOrBlank()) {
                val parts = appt.periodEndTime.split(":")
                val h = parts.getOrNull(0)?.toIntOrNull() ?: 0
                val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
                h * 60 + m
            } else if (!appt.slotTime.isNullOrBlank()) {
                val parts = appt.slotTime.split(":")
                val h = parts.getOrNull(0)?.toIntOrNull() ?: 0
                val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
                h * 60 + m + 30
            } else {
                1440
            }
            val isPastDateTime = (apptDate.isNotEmpty() && apptDate < todayStr) ||
                    (apptDate == todayStr && endMin <= currentMinutes)

            when (currentAppointmentFilter) {
                "upcoming" -> {
                    // قادمة: لم تنتهِ بعد وغير ملغية وليست no_show
                    appt.status != "cancelled" && appt.status != "no_show" && appt.status != "completed" && !isPastDateTime
                }
                "completed" -> {
                    // منتهية / مكتملة
                    appt.status == "completed"
                }
                "past" -> {
                    // السابقة: تواريخ أو أوقات سابقة
                    isPastDateTime || appt.status == "completed"
                }
                "no_show" -> {
                    // لم يحضر
                    appt.status == "no_show"
                }
                "cancelled" -> {
                    // ملغي
                    appt.status == "cancelled"
                }
                else -> true // الكل
            }
        }.sortedWith(
            // جدولة حسب التاريخ والوقت تنازلياً أو تصاعدياً
            compareByDescending<StaffAppointmentItem> { it.periodDate ?: "" }
                .thenByDescending { it.slotTime ?: it.periodStartTime ?: "" }
        )

        displayAppointments(filtered)
    }

    private fun displayAppointments(list: List<StaffAppointmentItem>) {
        binding.tvAppointmentsCountBadge.text = "${list.size} حجز"
        binding.layoutAppointmentsContainer.removeAllViews()

        if (list.isEmpty()) {
            binding.tvNoAppointments.visibility = View.VISIBLE
        } else {
            binding.tvNoAppointments.visibility = View.GONE
            for (appt in list) {
                binding.layoutAppointmentsContainer.addView(createAppointmentCard(appt))
            }
        }
    }

    private fun createAppointmentCard(appt: StaffAppointmentItem): View {
        val context = requireContext()
        val card = com.google.android.material.card.MaterialCardView(context).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = 16
            }
            radius = 16f * resources.displayMetrics.density
            cardElevation = 2f * resources.displayMetrics.density
            strokeWidth = (1 * resources.displayMetrics.density).toInt()
            setStrokeColor(android.graphics.Color.parseColor("#E2E8F0"))
            setCardBackgroundColor(android.graphics.Color.WHITE)
        }

        val contentLayout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 20, 24, 20)
        }

        // Header: Patient Name & Status Badge
        val topRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
        }

        val tvPatName = TextView(context).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            text = "👤 ${appt.patientName ?: "مريض (بدون اسم)"}"
            textSize = 15f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(ContextCompat.getColor(context, com.medical.clinic.staff.R.color.on_surface_dark))
        }
        topRow.addView(tvPatName)

        val tvStatus = TextView(context).apply {
            val (statusText, bgRes, colorRes) = when (appt.status) {
                "confirmed" -> Triple("مؤكد ✅", com.medical.clinic.staff.R.drawable.bg_status_accepted, com.medical.clinic.staff.R.color.brand_primary)
                "completed" -> Triple("مكتمل / منتهي 🟢", com.medical.clinic.staff.R.drawable.bg_status_accepted, com.medical.clinic.staff.R.color.brand_primary)
                "cancelled" -> Triple("ملغي ❌", com.medical.clinic.staff.R.drawable.bg_status_cancelled, com.medical.clinic.staff.R.color.brand_danger)
                "no_show" -> Triple("لم يحضر 🚫", com.medical.clinic.staff.R.drawable.bg_status_cancelled, com.medical.clinic.staff.R.color.brand_danger)
                else -> Triple("قيد الانتظار ⏳", com.medical.clinic.staff.R.drawable.bg_status_pending, com.medical.clinic.staff.R.color.status_waiting)
            }
            text = statusText
            textSize = 11f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(ContextCompat.getColor(context, colorRes))
            setBackgroundResource(bgRes)
            setPadding(16, 6, 16, 6)
        }
        topRow.addView(tvStatus)
        contentLayout.addView(topRow)

        // Details: Doctor name + Date + Time + Queue number
        val dateDisplay = if (!appt.periodDate.isNullOrBlank()) appt.periodDate.take(10) else "اليوم"
        val timeDisplay = when {
            !appt.slotTime.isNullOrBlank() -> appt.slotTime
            !appt.periodStartTime.isNullOrBlank() -> "${appt.periodStartTime} - ${appt.periodEndTime ?: ""}"
            else -> ""
        }
        val doctorDisplay = appt.doctorName ?: "الطبيب"
        val queueDisplay = if (appt.queueNumber != null && appt.queueNumber > 0) "• دور: #${appt.queueNumber}" else ""

        val tvSub = TextView(context).apply {
            text = "مع د. $doctorDisplay | 📅 $dateDisplay $timeDisplay $queueDisplay"
            textSize = 12f
            setTextColor(ContextCompat.getColor(context, com.medical.clinic.staff.R.color.on_surface_dark_secondary))
            setPadding(0, 6, 0, 0)
        }
        contentLayout.addView(tvSub)

        // If status is pending, show Confirm Appointment button
        if (appt.status == "pending") {
            val btnConfirm = com.google.android.material.button.MaterialButton(context).apply {
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    (40 * resources.displayMetrics.density).toInt()
                ).apply {
                    topMargin = 14
                }
                text = "تأكيد الحجز للمريض ✅"
                textSize = 12f
                setBackgroundColor(ContextCompat.getColor(context, com.medical.clinic.staff.R.color.brand_primary))
                setOnClickListener {
                    ProfileGuard.checkOrPrompt(context, sessionManager) {
                        performConfirmAppointment(appt.id)
                    }
                }
            }
            contentLayout.addView(btnConfirm)
        }

        card.addView(contentLayout)
        return card
    }

    private fun performConfirmAppointment(appointmentId: Int) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val res = apiService.confirmAppointment(appointmentId)
                if (res.isSuccessful && res.body()?.success == true) {
                    Toast.makeText(requireContext(), "تم تأكيد واعتماد الحجز وإشعار المريض بنجاح ✅", Toast.LENGTH_SHORT).show()
                    loadAppointments()
                } else {
                    Toast.makeText(requireContext(), res.body()?.message ?: "فشل تأكيد الحجز", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "خطأ: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
