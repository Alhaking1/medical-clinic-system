package com.medical.clinic.staff.ui.secretary

import android.os.Bundle
import android.text.InputType
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.medical.clinic.staff.data.models.PeriodItem
import com.medical.clinic.staff.data.models.SecretaryDoctorItem
import com.medical.clinic.staff.data.repository.SecretaryRepository
import com.medical.clinic.staff.data.utils.Resource
import com.medical.clinic.staff.databinding.FragmentSecretaryPeriodsBinding
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class SecretaryPeriodsFragment : Fragment() {

    private data class WeeklyPeriodSlot(
        var startTime: String = "09:00",
        var endTime: String = "13:00"
    )

    private data class WeeklyDayConfig(
        val calendarDay: Int,
        val label: String,
        var enabled: Boolean = false,
        val slots: MutableList<WeeklyPeriodSlot> = mutableListOf(WeeklyPeriodSlot())
    )

    private data class WeeklyPeriodOccurrence(
        val date: String,
        val slot: WeeklyPeriodSlot
    )

    private var _binding: FragmentSecretaryPeriodsBinding? = null
    private val binding get() = _binding!!

    @Inject
    lateinit var secretaryRepository: SecretaryRepository

    @Inject
    lateinit var sessionManager: com.medical.clinic.staff.data.local.SessionManager

    @Inject
    lateinit var apiService: com.medical.clinic.staff.data.api.ApiService

    private lateinit var periodsAdapter: PeriodsAdapter
    private var doctorsList = listOf<SecretaryDoctorItem>()
    private var selectedDoctorId: Int? = null

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSecretaryPeriodsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupRecyclerView()
        setupListeners()
        loadDoctors()
    }

    private fun setupRecyclerView() {
        periodsAdapter = PeriodsAdapter(
            onEditCapacity = { item ->
                com.medical.clinic.staff.ui.utils.ProfileGuard.checkOrPrompt(requireContext(), sessionManager) {
                    showEditCapacityDialog(item)
                }
            }
        )
        binding.rvPeriods.layoutManager = LinearLayoutManager(requireContext())
        binding.rvPeriods.adapter = periodsAdapter
    }

    private fun setupListeners() {
        binding.btnAddPeriod.setOnClickListener {
            com.medical.clinic.staff.ui.utils.ProfileGuard.checkOrPrompt(requireContext(), sessionManager) {
                val docId = selectedDoctorId
                if (docId == null) {
                    Toast.makeText(requireContext(), "يرجى اختيار الطبيب أولاً", Toast.LENGTH_SHORT).show()
                } else {
                    showAddPeriodDialog(docId)
                }
            }
        }

        binding.btnWeeklyPeriodTemplate.setOnClickListener {
            com.medical.clinic.staff.ui.utils.ProfileGuard.checkOrPrompt(requireContext(), sessionManager) {
                selectedDoctorId?.let(::showWeeklyPeriodTemplateDialog)
                    ?: Toast.makeText(requireContext(), "يرجى اختيار الطبيب أولاً", Toast.LENGTH_SHORT).show()
            }
        }

        binding.swipeRefreshPeriods.setOnRefreshListener {
            selectedDoctorId?.let { loadPeriods(it) } ?: run {
                binding.swipeRefreshPeriods.isRefreshing = false
            }
        }

        binding.spDoctors.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (position >= 0 && position < doctorsList.size) {
                    val doc = doctorsList[position]
                    selectedDoctorId = doc.id
                    loadPeriods(doc.id)
                }
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
    }

    private fun loadDoctors() {
        if (sessionManager.isGuestMode()) {
            binding.layoutEmptyPeriods.visibility = View.VISIBLE
            return
        }

        // ⚡ كاش الأطباء المحلي للعمل بسلاسة في ظروف الإنترنت الضعيف
        sessionManager.getString("cached_sec_doctors")?.let { cachedJson ->
            try {
                val listType = object : com.google.gson.reflect.TypeToken<List<SecretaryDoctorItem>>() {}.type
                val cached = com.google.gson.Gson().fromJson<List<SecretaryDoctorItem>>(cachedJson, listType)
                if (!cached.isNullOrEmpty() && doctorsList.isEmpty()) {
                    doctorsList = cached
                    val names = doctorsList.map { "${it.fullName} (${it.specialty ?: ""})" }
                    val adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, names)
                    binding.spDoctors.adapter = adapter
                    selectedDoctorId = doctorsList[0].id
                    loadPeriods(doctorsList[0].id)
                }
            } catch (_: Exception) {}
        }

        viewLifecycleOwner.lifecycleScope.launch {
            val res = secretaryRepository.getSecretaryDoctors()
            if (res is Resource.Success && res.data != null) {
                doctorsList = res.data
                sessionManager.saveString("cached_sec_doctors", com.google.gson.Gson().toJson(doctorsList))
                if (doctorsList.isNotEmpty()) {
                    val names = doctorsList.map { "${it.fullName} (${it.specialty ?: ""})" }
                    val adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, names)
                    binding.spDoctors.adapter = adapter
                    selectedDoctorId = doctorsList[0].id
                    loadPeriods(doctorsList[0].id)
                } else {
                    binding.layoutEmptyPeriods.visibility = View.VISIBLE
                }
            } else if (doctorsList.isEmpty()) {
                Toast.makeText(requireContext(), res.message ?: "فشل جلب الأطباء", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun filterActivePeriods(list: List<PeriodItem>): List<PeriodItem> {
        val yemenTz = java.util.TimeZone.getTimeZone("GMT+3")
        val nowCal = java.util.Calendar.getInstance(yemenTz)
        val todayStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).apply {
            timeZone = yemenTz
        }.format(nowCal.time)
        val currentMinutes = nowCal.get(java.util.Calendar.HOUR_OF_DAY) * 60 + nowCal.get(java.util.Calendar.MINUTE)

        return list.filter { p ->
            val pDate = p.date.take(10)
            if (pDate < todayStr) {
                false
            } else if (pDate == todayStr) {
                val endMin = if (!p.endTime.isNullOrBlank()) {
                    val parts = p.endTime.split(":")
                    val h = parts.getOrNull(0)?.toIntOrNull() ?: 0
                    val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
                    h * 60 + m
                } else if (!p.startTime.isNullOrBlank()) {
                    val parts = p.startTime.split(":")
                    val h = parts.getOrNull(0)?.toIntOrNull() ?: 0
                    val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
                    h * 60 + m + 60
                } else {
                    1440
                }
                endMin > currentMinutes
            } else {
                true
            }
        }
    }

    private fun loadPeriods(doctorId: Int) {
        // ⚡ قراءة فترات الطبيب من الكاش المحلي أولاً مع فلترة المنتهية
        sessionManager.getString("cached_periods_doc_$doctorId")?.let { cachedJson ->
            try {
                val listType = object : com.google.gson.reflect.TypeToken<List<PeriodItem>>() {}.type
                val cachedList = com.google.gson.Gson().fromJson<List<PeriodItem>>(cachedJson, listType)
                val activeCached = filterActivePeriods(cachedList ?: emptyList())
                if (activeCached.isNotEmpty()) {
                    periodsAdapter.submitList(activeCached)
                    binding.layoutEmptyPeriods.visibility = View.GONE
                }
            } catch (_: Exception) {}
        }

        binding.swipeRefreshPeriods.isRefreshing = true
        viewLifecycleOwner.lifecycleScope.launch {
            val res = secretaryRepository.getDoctorPeriods(doctorId)
            binding.swipeRefreshPeriods.isRefreshing = false

            if (res is Resource.Success && res.data != null) {
                val activeList = filterActivePeriods(res.data)
                sessionManager.saveString("cached_periods_doc_$doctorId", com.google.gson.Gson().toJson(activeList))
                periodsAdapter.submitList(activeList)
                if (activeList.isEmpty()) {
                    binding.layoutEmptyPeriods.visibility = View.VISIBLE
                } else {
                    binding.layoutEmptyPeriods.visibility = View.GONE
                }
            } else {
                Toast.makeText(requireContext(), res.message ?: "فشل جلب الفترات", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showEditCapacityDialog(item: PeriodItem) {
        val input = EditText(requireContext()).apply {
            inputType = InputType.TYPE_CLASS_NUMBER
            filters = arrayOf(android.text.InputFilter.LengthFilter(3))
            setText(item.maxBookings.toString())
            setSelection(text.length)
        }

        AlertDialog.Builder(requireContext())
            .setTitle("تعديل السعة القصوى للمقاعد")
            .setMessage("أدخل السعة الجديدة. يجب أن تكون أكبر من عدد الحجوزات الحالية (${item.bookedCount}).")
            .setView(input)
            .setPositiveButton("حفظ") { _, _ ->
                val newCap = input.text.toString().toIntOrNull()
                if (newCap != null && newCap > 0) {
                    if (newCap <= item.bookedCount) {
                        Toast.makeText(requireContext(), "يجب أن تكون السعة الجديدة أكبر من عدد الحجوزات الحالية (${item.bookedCount} حجز)", Toast.LENGTH_LONG).show()
                    } else {
                        updateCapacity(item, newCap)
                    }
                } else {
                    Toast.makeText(requireContext(), "يرجى إدخال رقم صحيح", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("إلغاء", null)
            .show()
    }

    private fun updateCapacity(item: PeriodItem, newCapacity: Int) {
        if (newCapacity <= item.bookedCount) {
            Toast.makeText(
                requireContext(),
                "يجب أن تكون السعة الجديدة أكبر من عدد الحجوزات الحالية (${item.bookedCount} حجز)",
                Toast.LENGTH_LONG
            ).show()
            return
        }

        viewLifecycleOwner.lifecycleScope.launch {
            val res = secretaryRepository.updateMaxBookings(item.id, newCapacity)
            if (res is Resource.Success) {
                Toast.makeText(requireContext(), "تم تعديل السعة بنجاح", Toast.LENGTH_SHORT).show()
                selectedDoctorId?.let { loadPeriods(it) }
            } else {
                Toast.makeText(requireContext(), res.message ?: "فشل تعديل السعة", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showAddPeriodDialog(doctorId: Int) {
        val context = requireContext()
        val calendar = java.util.Calendar.getInstance()
        var selectedDate = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.ENGLISH).format(calendar.time)
        var selectedStartTime = "09:00"
        var selectedEndTime = "13:00"

        val container = android.widget.LinearLayout(context).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(40, 20, 40, 10)
        }

        // Date Picker Button
        val btnDate = com.google.android.material.button.MaterialButton(context).apply {
            text = "📅 تاريخ الفترة: $selectedDate"
            setOnClickListener {
                val dpd = android.app.DatePickerDialog(
                    context,
                    { _, y, m, d ->
                        val cal = java.util.Calendar.getInstance().apply { set(y, m, d) }
                        selectedDate = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.ENGLISH).format(cal.time)
                        text = "📅 تاريخ الفترة: $selectedDate"
                    },
                    calendar.get(java.util.Calendar.YEAR),
                    calendar.get(java.util.Calendar.MONTH),
                    calendar.get(java.util.Calendar.DAY_OF_MONTH)
                )
                dpd.datePicker.minDate = System.currentTimeMillis() - 1000
                dpd.show()
            }
        }
        container.addView(btnDate)

        // Time buttons layout
        val timeLayout = android.widget.LinearLayout(context).apply {
            orientation = android.widget.LinearLayout.HORIZONTAL
            setPadding(0, 12, 0, 12)
        }

        val btnStartTime = com.google.android.material.button.MaterialButton(context).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                marginEnd = 8
            }
            text = "⏰ البداية: $selectedStartTime"
            setOnClickListener {
                android.app.TimePickerDialog(
                    context,
                    { _, h, m ->
                        selectedStartTime = String.format(java.util.Locale.ENGLISH, "%02d:%02d", h, m)
                        text = "⏰ البداية: $selectedStartTime"
                    },
                    9, 0, false
                ).show()
            }
        }
        timeLayout.addView(btnStartTime)

        val btnEndTime = com.google.android.material.button.MaterialButton(context).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            text = "⏰ النهاية: $selectedEndTime"
            setOnClickListener {
                android.app.TimePickerDialog(
                    context,
                    { _, h, m ->
                        selectedEndTime = String.format(java.util.Locale.ENGLISH, "%02d:%02d", h, m)
                        text = "⏰ النهاية: $selectedEndTime"
                    },
                    13, 0, false
                ).show()
            }
        }
        timeLayout.addView(btnEndTime)
        container.addView(timeLayout)

        // Max bookings
        val tvCapLabel = android.widget.TextView(context).apply {
            text = "الحد الأقصى لعدد الحجوزات:"
            setPadding(0, 8, 0, 4)
        }
        container.addView(tvCapLabel)

        val etCapacity = EditText(context).apply {
            inputType = InputType.TYPE_CLASS_NUMBER
            setText("15")
            hint = "سعة الحجوزات (مثال: 15)"
        }
        container.addView(etCapacity)

        // Title / Notes
        val tvNotesLabel = android.widget.TextView(context).apply {
            text = "مسمى الفترة / ملاحظات:"
            setPadding(0, 12, 0, 4)
        }
        container.addView(tvNotesLabel)

        val etNotes = EditText(context).apply {
            hint = "مثال: فترة صباحية / مسائية"
            setText("فترة اعتيادية")
        }
        container.addView(etNotes)

        AlertDialog.Builder(context)
            .setTitle("➕ إضافة فترة دوام للطبيب")
            .setView(container)
            .setPositiveButton("إضافة وتفعيل") { _, _ ->
                val yemenTz = java.util.TimeZone.getTimeZone("GMT+3")
                val nowCal = java.util.Calendar.getInstance(yemenTz)
                val todayStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).apply {
                    timeZone = yemenTz
                }.format(nowCal.time)
                val currentMinutes = nowCal.get(java.util.Calendar.HOUR_OF_DAY) * 60 + nowCal.get(java.util.Calendar.MINUTE)

                if (selectedDate < todayStr) {
                    Toast.makeText(context, "⚠️ لا يمكن إضافة فترة لتاريخ سابق", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                if (selectedStartTime >= selectedEndTime) {
                    Toast.makeText(context, "⚠️ وقت البداية يجب أن يكون قبل وقت النهاية", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val endParts = selectedEndTime.split(":")
                val endMinutes = (endParts.getOrNull(0)?.toIntOrNull() ?: 0) * 60 + (endParts.getOrNull(1)?.toIntOrNull() ?: 0)
                if (selectedDate == todayStr && endMinutes <= currentMinutes) {
                    Toast.makeText(context, "⚠️ عذراً، انتهى وقت هذه الفترة اليوم. يرجى اختيار أوقات قادمة.", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val maxCap = etCapacity.text.toString().toIntOrNull() ?: 15
                val notes = etNotes.text.toString().trim()
                val payload = mapOf<String, Any>(
                    "doctor_id" to doctorId,
                    "date" to selectedDate,
                    "start_time" to selectedStartTime,
                    "end_time" to selectedEndTime,
                    "max_bookings" to maxCap,
                    "notes" to notes
                )
                createPeriod(doctorId, payload)
            }
            .setNegativeButton("إلغاء", null)
            .show()
    }

    private fun createPeriod(doctorId: Int, payload: Map<String, Any>) {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val res = apiService.createDirectPeriod(payload)
                if (res.isSuccessful && res.body()?.success == true) {
                    Toast.makeText(requireContext(), "تمت إضافة وتفعيل الفترة بنجاح ✅", Toast.LENGTH_SHORT).show()
                    loadPeriods(doctorId)
                } else {
                    Toast.makeText(requireContext(), res.body()?.message ?: "فشل إنشاء الفترة", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), com.medical.clinic.staff.data.utils.ErrorMapper.fromException(e), Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showWeeklyPeriodTemplateDialog(doctorId: Int) {
        val context = requireContext()
        val days = listOf(
            WeeklyDayConfig(java.util.Calendar.SATURDAY, "السبت"),
            WeeklyDayConfig(java.util.Calendar.SUNDAY, "الأحد"),
            WeeklyDayConfig(java.util.Calendar.MONDAY, "الاثنين"),
            WeeklyDayConfig(java.util.Calendar.TUESDAY, "الثلاثاء"),
            WeeklyDayConfig(java.util.Calendar.WEDNESDAY, "الأربعاء"),
            WeeklyDayConfig(java.util.Calendar.THURSDAY, "الخميس"),
            WeeklyDayConfig(java.util.Calendar.FRIDAY, "الجمعة")
        )

        val content = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(12), dp(16), dp(12))
        }
        content.addView(TextView(context).apply {
            text = "حدد أيام الدوام، ثم أضف فترة أو أكثر لكل يوم. سيتم إنشاء الفترات للأيام المطابقة خلال 28 يوماً، بسعة 15 حجزاً لكل فترة."
            textSize = 14f
            setPadding(0, 0, 0, dp(12))
        })

        val scrollView = ScrollView(context).apply {
            addView(content)
        }

        days.forEach { day ->
            val dayCard = com.google.android.material.card.MaterialCardView(context).apply {
                radius = dp(12).toFloat()
                cardElevation = dp(2).toFloat()
                setCardBackgroundColor(android.graphics.Color.WHITE)
                val params = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    bottomMargin = dp(10)
                }
                layoutParams = params
            }
            val dayContent = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(12), dp(8), dp(12), dp(12))
            }
            val daySwitch = com.google.android.material.materialswitch.MaterialSwitch(context).apply {
                text = day.label
                textSize = 15f
                isChecked = day.enabled
            }
            val slotsContainer = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
            }

            fun renderSlots() {
                slotsContainer.removeAllViews()
                day.slots.forEachIndexed { index, slot ->
                    val slotRow = LinearLayout(context).apply {
                        orientation = LinearLayout.HORIZONTAL
                        gravity = android.view.Gravity.CENTER_VERTICAL
                        setPadding(0, dp(4), 0, dp(4))
                    }
                    val periodButton = com.google.android.material.button.MaterialButton(context).apply {
                        text = "الفترة ${index + 1}: ${slot.startTime} - ${slot.endTime}"
                        textSize = 12f
                        layoutParams = LinearLayout.LayoutParams(
                            0,
                            dp(44),
                            1f
                        ).apply {
                            marginEnd = dp(4)
                        }
                        setOnClickListener {
                            val startParts = slot.startTime.split(":")
                            android.app.TimePickerDialog(
                                context,
                                { _, startHour, startMinute ->
                                    val selectedStart = String.format(
                                        java.util.Locale.US,
                                        "%02d:%02d",
                                        startHour,
                                        startMinute
                                    )
                                    val endParts = slot.endTime.split(":")
                                    android.app.TimePickerDialog(
                                        context,
                                        { _, endHour, endMinute ->
                                            slot.startTime = selectedStart
                                            slot.endTime = String.format(
                                                java.util.Locale.US,
                                                "%02d:%02d",
                                                endHour,
                                                endMinute
                                            )
                                            renderSlots()
                                        },
                                        endParts.getOrNull(0)?.toIntOrNull() ?: 13,
                                        endParts.getOrNull(1)?.toIntOrNull() ?: 0,
                                        true
                                    ).apply {
                                        setTitle("اختر وقت نهاية الفترة")
                                    }.show()
                                },
                                startParts.getOrNull(0)?.toIntOrNull() ?: 9,
                                startParts.getOrNull(1)?.toIntOrNull() ?: 0,
                                true
                            ).apply {
                                setTitle("اختر وقت بداية الفترة")
                            }.show()
                        }
                    }
                    slotRow.addView(periodButton)
                    if (day.slots.size > 1) {
                        val removeButton = com.google.android.material.button.MaterialButton(context).apply {
                            text = "حذف"
                            textSize = 11f
                            layoutParams = LinearLayout.LayoutParams(
                                LinearLayout.LayoutParams.WRAP_CONTENT,
                                dp(44)
                            ).apply {
                                marginStart = dp(4)
                            }
                            setOnClickListener {
                                day.slots.removeAt(index)
                                renderSlots()
                            }
                        }
                        slotRow.addView(removeButton)
                    }
                    slotsContainer.addView(slotRow)
                }
                slotsContainer.visibility = if (day.enabled) View.VISIBLE else View.GONE
            }

            val addSlotButton = com.google.android.material.button.MaterialButton(context).apply {
                text = "إضافة فترة لهذا اليوم"
                textSize = 12f
                setOnClickListener {
                    day.slots.add(WeeklyPeriodSlot())
                    renderSlots()
                }
            }
            dayContent.addView(daySwitch)
            dayContent.addView(slotsContainer)
            dayContent.addView(addSlotButton)
            daySwitch.setOnCheckedChangeListener { _, checked ->
                day.enabled = checked
                slotsContainer.visibility = if (checked) View.VISIBLE else View.GONE
                addSlotButton.visibility = if (checked) View.VISIBLE else View.GONE
            }
            renderSlots()
            addSlotButton.visibility = if (day.enabled) View.VISIBLE else View.GONE
            dayCard.addView(dayContent)
            content.addView(dayCard)
        }

        val dialog = AlertDialog.Builder(context)
            .setTitle("قالب الفترات الأسبوعي")
            .setView(scrollView)
            .setPositiveButton("إنشاء للأربعة أسابيع", null)
            .setNegativeButton("إلغاء", null)
            .create()

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val validationError = validateWeeklyDays(days)
                if (validationError != null) {
                    Toast.makeText(context, validationError, Toast.LENGTH_LONG).show()
                    return@setOnClickListener
                }
                dialog.dismiss()
                createWeeklyPeriods(doctorId, days)
            }
        }
        dialog.show()
    }

    private fun validateWeeklyDays(days: List<WeeklyDayConfig>): String? {
        val enabledDays = days.filter { it.enabled }
        if (enabledDays.isEmpty()) return "فعّل يوماً واحداً على الأقل في القالب"

        for (day in enabledDays) {
            if (day.slots.isEmpty()) return "أضف فترة واحدة على الأقل ليوم ${day.label}"
            val sortedSlots = day.slots.sortedBy { timeToMinutes(it.startTime) }
            for (slot in sortedSlots) {
                if (timeToMinutes(slot.startTime) >= timeToMinutes(slot.endTime)) {
                    return "وقت نهاية فترة يوم ${day.label} يجب أن يكون بعد وقت بدايتها"
                }
            }
            for (index in 1 until sortedSlots.size) {
                if (timeToMinutes(sortedSlots[index].startTime) < timeToMinutes(sortedSlots[index - 1].endTime)) {
                    return "فترات يوم ${day.label} متداخلة؛ عدّل أوقاتها أولاً"
                }
            }
        }
        return null
    }

    private fun createWeeklyPeriods(doctorId: Int, days: List<WeeklyDayConfig>) {
        viewLifecycleOwner.lifecycleScope.launch {
            val existingResult = secretaryRepository.getDoctorPeriods(doctorId)
            if (existingResult !is Resource.Success || existingResult.data == null) {
                Toast.makeText(
                    requireContext(),
                    existingResult.message ?: "تعذر التحقق من الفترات المسجلة مسبقاً",
                    Toast.LENGTH_LONG
                ).show()
                return@launch
            }

            val yemenTimeZone = java.util.TimeZone.getTimeZone("GMT+3")
            val calendar = java.util.Calendar.getInstance(yemenTimeZone).apply {
                set(java.util.Calendar.HOUR_OF_DAY, 0)
                set(java.util.Calendar.MINUTE, 0)
                set(java.util.Calendar.SECOND, 0)
                set(java.util.Calendar.MILLISECOND, 0)
            }
            val dateFormat = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).apply {
                timeZone = yemenTimeZone
            }
            val today = dateFormat.format(calendar.time)
            val currentTime = java.util.Calendar.getInstance(yemenTimeZone)
            val currentMinutes = currentTime.get(java.util.Calendar.HOUR_OF_DAY) * 60 +
                currentTime.get(java.util.Calendar.MINUTE)
            val daysByWeekday = days.filter { it.enabled }.associateBy { it.calendarDay }
            val occurrences = mutableListOf<WeeklyPeriodOccurrence>()
            var skippedPast = 0

            repeat(28) {
                val dayConfig = daysByWeekday[calendar.get(java.util.Calendar.DAY_OF_WEEK)]
                if (dayConfig != null) {
                    val date = dateFormat.format(calendar.time)
                    dayConfig.slots.forEach { slot ->
                        if (date == today && timeToMinutes(slot.endTime) <= currentMinutes) {
                            skippedPast++
                        } else {
                            occurrences.add(WeeklyPeriodOccurrence(date, slot))
                        }
                    }
                }
                calendar.add(java.util.Calendar.DAY_OF_YEAR, 1)
            }

            val existingKeys = existingResult.data.mapTo(mutableSetOf()) {
                "${it.date.take(10)}|${it.startTime.take(5)}|${it.endTime.take(5)}"
            }
            val toCreate = occurrences.filterNot {
                "${it.date}|${it.slot.startTime}|${it.slot.endTime}" in existingKeys
            }
            val skippedExisting = occurrences.size - toCreate.size
            if (toCreate.isEmpty()) {
                showWeeklyCreationSummary(0, skippedExisting, skippedPast, emptyList())
                return@launch
            }

            val progressText = TextView(requireContext()).apply {
                text = "جاري إنشاء الفترات..."
                setPadding(dp(20), dp(12), dp(20), dp(8))
            }
            val progressBar = android.widget.ProgressBar(
                requireContext(),
                null,
                android.R.attr.progressBarStyleHorizontal
            ).apply {
                max = toCreate.size
                progress = 0
                setPadding(dp(20), 0, dp(20), dp(16))
            }
            val progressContent = LinearLayout(requireContext()).apply {
                orientation = LinearLayout.VERTICAL
                addView(progressText)
                addView(progressBar)
            }
            val progressDialog = AlertDialog.Builder(requireContext())
                .setTitle("إنشاء الفترات")
                .setView(progressContent)
                .setCancelable(false)
                .create()
            progressDialog.show()

            var created = 0
            var failed = 0
            val failureMessages = mutableListOf<String>()
            toCreate.forEachIndexed { index, occurrence ->
                val payload = mapOf<String, Any>(
                    "doctor_id" to doctorId,
                    "date" to occurrence.date,
                    "start_time" to occurrence.slot.startTime,
                    "end_time" to occurrence.slot.endTime,
                    "max_bookings" to 15,
                    "notes" to "فترة من القالب الأسبوعي"
                )
                try {
                    val response = apiService.createDirectPeriod(payload)
                    if (response.isSuccessful && response.body()?.success == true) {
                        created++
                    } else {
                        failed++
                        if (failureMessages.size < 3) {
                            failureMessages.add(response.body()?.message ?: "فشل إنشاء ${occurrence.date} ${occurrence.slot.startTime}")
                        }
                    }
                } catch (error: Exception) {
                    failed++
                    if (failureMessages.size < 3) {
                        failureMessages.add(com.medical.clinic.staff.data.utils.ErrorMapper.fromException(error))
                    }
                }
                progressBar.progress = index + 1
                progressText.text = "تمت معالجة ${index + 1} من ${toCreate.size} فترة"
            }

            progressDialog.dismiss()
            selectedDoctorId?.let(::loadPeriods)
            showWeeklyCreationSummary(created, skippedExisting, skippedPast, failureMessages, failed)
        }
    }

    private fun showWeeklyCreationSummary(
        created: Int,
        skippedExisting: Int,
        skippedPast: Int,
        failureMessages: List<String>,
        failed: Int = failureMessages.size
    ) {
        val summary = buildString {
            append("تم إنشاء $created فترة.")
            if (skippedExisting > 0) append("\nتم تجاوز $skippedExisting فترة موجودة مسبقاً.")
            if (skippedPast > 0) append("\nتم تجاوز $skippedPast فترة انتهى وقتها اليوم.")
            if (failed > 0) {
                append("\nتعذر إنشاء $failed فترة.")
                failureMessages.forEach { append("\n• $it") }
            }
        }
        AlertDialog.Builder(requireContext())
            .setTitle(if (failed == 0) "اكتمل إنشاء القالب" else "اكتمل مع وجود أخطاء")
            .setMessage(summary)
            .setPositiveButton("حسناً", null)
            .show()
    }

    private fun timeToMinutes(time: String): Int {
        val parts = time.split(":")
        return (parts.getOrNull(0)?.toIntOrNull() ?: 0) * 60 +
            (parts.getOrNull(1)?.toIntOrNull() ?: 0)
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
