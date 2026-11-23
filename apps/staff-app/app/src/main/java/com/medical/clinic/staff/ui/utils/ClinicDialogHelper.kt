package com.medical.clinic.staff.ui.utils

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Looper
import android.provider.Settings
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.medical.clinic.staff.R
import com.medical.clinic.staff.data.models.ClinicItem
import com.medical.clinic.staff.data.repository.AuthRepository
import com.medical.clinic.staff.data.utils.Constants
import com.medical.clinic.staff.data.utils.Resource
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

object ClinicDialogHelper {

    fun showSelectClinicDialog(
        context: Context,
        clinics: List<ClinicItem>,
        onSelected: (ClinicItem) -> Unit,
        onCreateNew: () -> Unit
    ) {
        val view = LayoutInflater.from(context).inflate(R.layout.dialog_select_clinic, null)
        val etSearch = view.findViewById<EditText>(R.id.etClinicSearch)
        val lvClinics = view.findViewById<ListView>(R.id.lvClinics)
        val btnCreateNew = view.findViewById<Button>(R.id.btnDialogCreateNewClinic)
        val tvEmpty = view.findViewById<TextView>(R.id.tvEmptyClinics)

        val filteredList = clinics.toMutableList()

        val adapter = object : ArrayAdapter<ClinicItem>(context, android.R.layout.simple_list_item_2, android.R.id.text1, filteredList) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                val row = super.getView(position, convertView, parent)
                val item = getItem(position)
                val text1 = row.findViewById<TextView>(android.R.id.text1)
                val text2 = row.findViewById<TextView>(android.R.id.text2)

                text1.text = item?.name ?: ""
                text1.textSize = 15f
                text1.setTextColor(context.getColor(R.color.on_surface_dark))

                val subText = listOfNotNull(item?.governorate, item?.address).filter { it.isNotBlank() }.joinToString(" - ")
                text2.text = if (subText.isNotBlank()) subText else "المحافظة: غير محددة"
                text2.textSize = 12f
                text2.setTextColor(context.getColor(R.color.on_surface_dark_tertiary))

                return row
            }
        }
        lvClinics.adapter = adapter

        val dialog = AlertDialog.Builder(context)
            .setView(view)
            .create()

        btnCreateNew.setOnClickListener {
            dialog.dismiss()
            onCreateNew()
        }

        etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                val query = s?.toString()?.trim() ?: ""
                filteredList.clear()
                if (query.isEmpty()) {
                    filteredList.addAll(clinics)
                } else {
                    filteredList.addAll(clinics.filter {
                        it.name.contains(query, ignoreCase = true) ||
                                (it.governorate?.contains(query, ignoreCase = true) == true) ||
                                (it.address?.contains(query, ignoreCase = true) == true)
                    })
                }
                adapter.notifyDataSetChanged()
                tvEmpty.visibility = if (filteredList.isEmpty()) View.VISIBLE else View.GONE
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        lvClinics.setOnItemClickListener { _, _, position, _ ->
            if (position in filteredList.indices) {
                onSelected(filteredList[position])
                dialog.dismiss()
            }
        }

        dialog.show()
    }

    fun showCreateClinicDialog(
        context: Context,
        scope: CoroutineScope,
        authRepository: AuthRepository,
        onCreated: (ClinicItem) -> Unit
    ) {
        val view = LayoutInflater.from(context).inflate(R.layout.dialog_create_clinic, null)
        val etName = view.findViewById<EditText>(R.id.etNewClinicName)
        val spGov = view.findViewById<Spinner>(R.id.spNewClinicGov)
        val etAddress = view.findViewById<EditText>(R.id.etNewClinicAddress)
        val etPhone = view.findViewById<EditText>(R.id.etNewClinicPhone)
        val etMapsUrl = view.findViewById<EditText>(R.id.etNewClinicMapsUrl)
        val btnSubmit = view.findViewById<Button>(R.id.btnSubmitCreateClinic)
        val pbLoading = view.findViewById<ProgressBar>(R.id.pbCreateClinic)

        InputValidationUtils.applySafeTextRules(etName, 40)
        InputValidationUtils.applySafeTextRules(etAddress, 80)
        InputValidationUtils.applyPhoneRules(etPhone, 9)

        val govAdapter = ArrayAdapter(context, android.R.layout.simple_spinner_dropdown_item, Constants.YEMEN_GOVERNORATES)
        spGov.adapter = govAdapter

        val dialog = AlertDialog.Builder(context)
            .setView(view)
            .create()

        val btnPickLocation = view.findViewById<Button>(R.id.btnPickCurrentLocation)
        btnPickLocation?.setOnClickListener {
            val hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            val hasCoarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

            if (!hasFine && !hasCoarse) {
                if (context is Activity) {
                    ActivityCompat.requestPermissions(
                        context,
                        arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                        1002
                    )
                }
                Toast.makeText(context, "يرجى منح إذن الوصول إلى الموقع لتحديد موقع العيادة تلقائياً", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }

            val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            if (locationManager == null) {
                Toast.makeText(context, "خدمة تحديد الموقع غير متوفرة على هذا الجهاز", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
            val isNetworkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)

            if (!isGpsEnabled && !isNetworkEnabled) {
                Toast.makeText(context, "يرجى تفعيل الموقع (GPS) من إعدادات الهاتف", Toast.LENGTH_LONG).show()
                try {
                    context.startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS))
                } catch (e: Exception) {}
                return@setOnClickListener
            }

            // 1. محاولة جلب آخر موقع معروف فوراً
            var lastLoc: Location? = null
            if (isGpsEnabled) {
                try {
                    lastLoc = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                } catch (e: SecurityException) {}
            }
            if (lastLoc == null && isNetworkEnabled) {
                try {
                    lastLoc = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                } catch (e: SecurityException) {}
            }

            if (lastLoc != null) {
                val mapsUrl = "https://maps.google.com/?q=${lastLoc.latitude},${lastLoc.longitude}"
                etMapsUrl?.setText(mapsUrl)
                Toast.makeText(context, "📍 تم تحديد إحداثيات موقع العيادة عبر GPS بنجاح!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            // 2. في حال عدم توفر موقع محفوظ مسبقاً، نطلب تحديثاً حياً
            btnPickLocation.isEnabled = false
            btnPickLocation.text = "جاري التقاط إشارة GPS... ⏳"
            val provider = if (isGpsEnabled) LocationManager.GPS_PROVIDER else LocationManager.NETWORK_PROVIDER
            try {
                locationManager.requestLocationUpdates(
                    provider,
                    0L,
                    0f,
                    object : LocationListener {
                        override fun onLocationChanged(loc: Location) {
                            btnPickLocation.isEnabled = true
                            btnPickLocation.text = "📍 تحديد موقع العيادة الحالي عبر GPS"
                            val mapsUrl = "https://maps.google.com/?q=${loc.latitude},${loc.longitude}"
                            etMapsUrl?.setText(mapsUrl)
                            Toast.makeText(context, "📍 تم تحديد إحداثيات موقع العيادة عبر GPS بنجاح!", Toast.LENGTH_SHORT).show()
                            locationManager.removeUpdates(this)
                        }
                        @Deprecated("Deprecated in Java")
                        override fun onStatusChanged(p: String?, s: Int, e: Bundle?) {}
                        override fun onProviderEnabled(p: String) {}
                        override fun onProviderDisabled(p: String) {}
                    },
                    Looper.getMainLooper()
                )
            } catch (e: Exception) {
                btnPickLocation.isEnabled = true
                btnPickLocation.text = "📍 تحديد موقع العيادة الحالي عبر GPS"
                Toast.makeText(context, "تعذر التقاط الموقع: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }

        btnSubmit.setOnClickListener {
            val rawName = etName.text?.toString() ?: ""
            val name = InputValidationUtils.sanitize(rawName)
            if (name.length < 3) {
                etName.error = "اسم العيادة مطلوب (3 أحرف على الأقل)"
                return@setOnClickListener
            }

            val gov = Constants.YEMEN_GOVERNORATES[spGov.selectedItemPosition]
            val address = InputValidationUtils.sanitize(etAddress.text?.toString()).takeIf { it.isNotBlank() }
            val rawPhone = etPhone.text?.toString()?.trim() ?: ""
            val cleanPhone = rawPhone.replace(Regex("^(\\+?967)"), "")
            if (cleanPhone.isNotEmpty() && !InputValidationUtils.isValidPhone(cleanPhone)) {
                etPhone.error = "رقم هاتف العيادة يجب أن يتكون من 9 أرقام تبدأ بـ 7"
                return@setOnClickListener
            }
            val mapsUrl = InputValidationUtils.sanitize(etMapsUrl?.text?.toString()).takeIf { it.isNotBlank() }

            btnSubmit.isEnabled = false
            btnSubmit.text = ""
            pbLoading.visibility = View.VISIBLE

            scope.launch {
                val res = authRepository.createClinic(name, gov, address, cleanPhone.takeIf { it.isNotEmpty() }, mapsUrl)
                btnSubmit.isEnabled = true
                btnSubmit.text = "حفظ وإنشاء العيادة 🏥"
                pbLoading.visibility = View.GONE

                when (res) {
                    is Resource.Success -> {
                        Toast.makeText(context, "تم إنشاء عيادة ($name) بنجاح!", Toast.LENGTH_SHORT).show()
                        res.data?.let { onCreated(it) }
                        dialog.dismiss()
                    }
                    is Resource.Error -> {
                        Toast.makeText(context, res.message ?: "فشل إنشاء العيادة", Toast.LENGTH_LONG).show()
                    }
                    else -> {}
                }
            }
        }

        dialog.show()
    }

    fun showSelectSpecialtyDialog(
        context: Context,
        onSelected: (String) -> Unit
    ) {
        val view = LayoutInflater.from(context).inflate(R.layout.dialog_select_specialty, null)
        val etSearch = view.findViewById<EditText>(R.id.etSpecialtySearch)
        val lv = view.findViewById<ListView>(R.id.lvSpecialties)
        val btnCustom = view.findViewById<Button>(R.id.btnCustomSpecialty)

        val allSpecialties = Constants.MEDICAL_SPECIALTIES
        val filteredList = allSpecialties.toMutableList()

        val adapter = ArrayAdapter(context, android.R.layout.simple_list_item_1, filteredList)
        lv.adapter = adapter

        val dialog = AlertDialog.Builder(context)
            .setView(view)
            .create()

        etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                val query = s?.toString()?.trim() ?: ""
                filteredList.clear()
                if (query.isEmpty()) {
                    filteredList.addAll(allSpecialties)
                } else {
                    filteredList.addAll(allSpecialties.filter { it.contains(query, ignoreCase = true) })
                }
                adapter.notifyDataSetChanged()
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        lv.setOnItemClickListener { _, _, position, _ ->
            if (position in filteredList.indices) {
                onSelected(filteredList[position])
                dialog.dismiss()
            }
        }

        btnCustom.setOnClickListener {
            dialog.dismiss()
            showCustomSpecialtyDialog(context, onSelected)
        }

        dialog.show()
    }

    private fun showCustomSpecialtyDialog(
        context: Context,
        onSelected: (String) -> Unit
    ) {
        val input = EditText(context).apply {
            hint = "أدخل تخصصك الدقيق..."
            setPadding(48, 32, 48, 32)
        }

        AlertDialog.Builder(context)
            .setTitle("🩺 تخصص طبي مخصص")
            .setView(input)
            .setPositiveButton("اختيار") { _, _ ->
                val custom = input.text?.toString()?.trim() ?: ""
                if (custom.isNotBlank()) {
                    onSelected(custom)
                }
            }
            .setNegativeButton("إلغاء", null)
            .show()
    }

    fun showClinicScheduleDialog(
        context: Context,
        scope: CoroutineScope,
        apiService: com.medical.clinic.staff.data.api.ApiService,
        onSaved: ((com.medical.clinic.staff.data.models.ClinicScheduleData) -> Unit)? = null
    ) {
        val view = LayoutInflater.from(context).inflate(R.layout.dialog_clinic_schedule, null)
        val tvClinicTitle = view.findViewById<TextView>(R.id.tvScheduleClinicTitle)
        val tvCurrentStatus = view.findViewById<TextView>(R.id.tvCurrentScheduleStatus)
        val switch24 = view.findViewById<com.google.android.material.materialswitch.MaterialSwitch>(R.id.switch24Hours)
        val layoutTemplateContainer = view.findViewById<LinearLayout>(R.id.layoutTemplateContainer)
        val rgScheduleType = view.findViewById<RadioGroup>(R.id.rgScheduleType)
        val rbDaily = view.findViewById<RadioButton>(R.id.rbDailyTemplate)
        val rbWeekly = view.findViewById<RadioButton>(R.id.rbWeeklyTemplate)
        val layoutDaily = view.findViewById<LinearLayout>(R.id.layoutDailySection)
        val layoutWeekly = view.findViewById<LinearLayout>(R.id.layoutWeeklySection)
        val btnOpenTime = view.findViewById<Button>(R.id.btnDailyOpenTime)
        val btnCloseTime = view.findViewById<Button>(R.id.btnDailyCloseTime)
        val pbLoading = view.findViewById<ProgressBar>(R.id.pbScheduleLoading)
        val btnCancel = view.findViewById<Button>(R.id.btnCancelSchedule)
        val btnSave = view.findViewById<Button>(R.id.btnSaveSchedule)

        var selectedOpenTime = "08:00"
        var selectedCloseTime = "22:00"

        val formatDisplay = { timeStr: String ->
            val parts = timeStr.split(":")
            val h = parts.getOrNull(0)?.toIntOrNull() ?: 8
            val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
            val ampm = if (h >= 12) "م" else "ص"
            val h12 = if (h % 12 == 0) 12 else h % 12
            String.format("%02d:%02d %s", h12, m, ampm)
        }

        btnOpenTime.text = formatDisplay(selectedOpenTime)
        btnCloseTime.text = formatDisplay(selectedCloseTime)

        btnOpenTime.setOnClickListener {
            val parts = selectedOpenTime.split(":")
            val initH = parts.getOrNull(0)?.toIntOrNull() ?: 8
            val initM = parts.getOrNull(1)?.toIntOrNull() ?: 0
            android.app.TimePickerDialog(context, { _, hour, minute ->
                selectedOpenTime = String.format("%02d:%02d", hour, minute)
                btnOpenTime.text = formatDisplay(selectedOpenTime)
            }, initH, initM, false).show()
        }

        btnCloseTime.setOnClickListener {
            val parts = selectedCloseTime.split(":")
            val initH = parts.getOrNull(0)?.toIntOrNull() ?: 22
            val initM = parts.getOrNull(1)?.toIntOrNull() ?: 0
            android.app.TimePickerDialog(context, { _, hour, minute ->
                selectedCloseTime = String.format("%02d:%02d", hour, minute)
                btnCloseTime.text = formatDisplay(selectedCloseTime)
            }, initH, initM, false).show()
        }

        data class DayItemState(
            val key: String,
            val arabicName: String,
            var isOpen: Boolean = true,
            var openTime: String = "08:00",
            var closeTime: String = "22:00",
            var openBtn: com.google.android.material.button.MaterialButton? = null,
            var closeBtn: com.google.android.material.button.MaterialButton? = null,
            var switch: com.google.android.material.materialswitch.MaterialSwitch? = null,
            var timesLayout: View? = null,
            var closedNotice: View? = null
        )

        val weeklyDays = listOf(
            DayItemState("sat", "السبت 🗓️", isOpen = true, openTime = "08:00", closeTime = "22:00"),
            DayItemState("sun", "الأحد 🗓️", isOpen = true, openTime = "08:00", closeTime = "22:00"),
            DayItemState("mon", "الاثنين 🗓️", isOpen = true, openTime = "08:00", closeTime = "22:00"),
            DayItemState("tue", "الثلاثاء 🗓️", isOpen = true, openTime = "08:00", closeTime = "22:00"),
            DayItemState("wed", "الأربعاء 🗓️", isOpen = true, openTime = "08:00", closeTime = "22:00"),
            DayItemState("thu", "الخميس 🗓️", isOpen = true, openTime = "08:00", closeTime = "22:00"),
            DayItemState("fri", "الجمعة 🕌", isOpen = false, openTime = "16:00", closeTime = "22:00")
        )

        val layoutWeeklyContainer = view.findViewById<LinearLayout>(R.id.layoutWeeklyDaysContainer)
        val inflater = LayoutInflater.from(context)

        fun updateDayUI(day: DayItemState) {
            day.switch?.isChecked = day.isOpen
            day.switch?.text = if (day.isOpen) "دوام" else "عطلة"
            day.timesLayout?.visibility = if (day.isOpen) View.VISIBLE else View.GONE
            day.closedNotice?.visibility = if (day.isOpen) View.GONE else View.VISIBLE
            day.openBtn?.text = "من: ${formatDisplay(day.openTime)}"
            day.closeBtn?.text = "إلى: ${formatDisplay(day.closeTime)}"
        }

        if (layoutWeeklyContainer != null) {
            layoutWeeklyContainer.removeAllViews()
            for (day in weeklyDays) {
                val dayView = inflater.inflate(R.layout.item_clinic_schedule_day, layoutWeeklyContainer, false)
                val tvTitle = dayView.findViewById<TextView>(R.id.tvDayTitle)
                val switchOpen = dayView.findViewById<com.google.android.material.materialswitch.MaterialSwitch>(R.id.switchDayOpen)
                val layoutTimes = dayView.findViewById<LinearLayout>(R.id.layoutDayTimes)
                val btnOpen = dayView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btnDayOpenTime)
                val btnClose = dayView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btnDayCloseTime)
                val tvClosed = dayView.findViewById<TextView>(R.id.tvDayClosedNotice)

                tvTitle.text = day.arabicName
                day.switch = switchOpen
                day.timesLayout = layoutTimes
                day.openBtn = btnOpen
                day.closeBtn = btnClose
                day.closedNotice = tvClosed

                switchOpen.setOnCheckedChangeListener { _, isChecked ->
                    day.isOpen = isChecked
                    updateDayUI(day)
                }

                btnOpen.setOnClickListener {
                    val parts = day.openTime.split(":")
                    val initH = parts.getOrNull(0)?.toIntOrNull() ?: 8
                    val initM = parts.getOrNull(1)?.toIntOrNull() ?: 0
                    android.app.TimePickerDialog(context, { _, hour, minute ->
                        day.openTime = String.format("%02d:%02d", hour, minute)
                        updateDayUI(day)
                    }, initH, initM, false).show()
                }

                btnClose.setOnClickListener {
                    val parts = day.closeTime.split(":")
                    val initH = parts.getOrNull(0)?.toIntOrNull() ?: 22
                    val initM = parts.getOrNull(1)?.toIntOrNull() ?: 0
                    android.app.TimePickerDialog(context, { _, hour, minute ->
                        day.closeTime = String.format("%02d:%02d", hour, minute)
                        updateDayUI(day)
                    }, initH, initM, false).show()
                }

                updateDayUI(day)
                layoutWeeklyContainer.addView(dayView)
            }
        }

        switch24.setOnCheckedChangeListener { _, isChecked ->
            layoutTemplateContainer.visibility = if (isChecked) View.GONE else View.VISIBLE
        }

        rgScheduleType.setOnCheckedChangeListener { _, checkedId ->
            if (checkedId == R.id.rbWeeklyTemplate) {
                layoutDaily.visibility = View.GONE
                layoutWeekly.visibility = View.VISIBLE
            } else {
                layoutDaily.visibility = View.VISIBLE
                layoutWeekly.visibility = View.GONE
            }
        }

        val dialog = AlertDialog.Builder(context)
            .setView(view)
            .setCancelable(true)
            .create()

        btnCancel.setOnClickListener { dialog.dismiss() }

        // Fetch current schedule
        pbLoading.visibility = View.VISIBLE
        scope.launch {
            try {
                val res = apiService.getClinicSchedule()
                pbLoading.visibility = View.GONE
                if (res.isSuccessful && res.body()?.success == true && res.body()?.data != null) {
                    val data = res.body()!!.data!!
                    if (!data.clinicName.isNullOrBlank()) {
                        tvClinicTitle.text = "مواعيد عيادة: ${data.clinicName}"
                    }
                    val rawHours = data.workingHoursDisplay ?: ""
                    val safeHours = if (rawHours.contains("NaN")) "من 08:00 ص إلى 11:00 م" else rawHours
                    val statusText = if (data.is24Hours == 1) "🟢 مفتوح (دوام متواصل 24 ساعة)" else "${data.statusLabel ?: "مفتوح"} | $safeHours"
                    tvCurrentStatus.text = statusText

                    switch24.isChecked = data.is24Hours == 1
                    layoutTemplateContainer.visibility = if (data.is24Hours == 1) View.GONE else View.VISIBLE

                    if (data.scheduleType == "weekly") {
                        rbWeekly.isChecked = true
                        layoutDaily.visibility = View.GONE
                        layoutWeekly.visibility = View.VISIBLE
                    } else {
                        rbDaily.isChecked = true
                        layoutDaily.visibility = View.VISIBLE
                        layoutWeekly.visibility = View.GONE
                    }

                    if (!data.openTime.isNullOrBlank()) {
                        selectedOpenTime = data.openTime
                        btnOpenTime.text = formatDisplay(selectedOpenTime)
                    }
                    if (!data.closeTime.isNullOrBlank()) {
                        selectedCloseTime = data.closeTime
                        btnCloseTime.text = formatDisplay(selectedCloseTime)
                    }

                    if (!data.weeklySchedule.isNullOrBlank()) {
                        try {
                            val wObj = org.json.JSONObject(data.weeklySchedule)
                            for (day in weeklyDays) {
                                val dObj = wObj.optJSONObject(day.key)
                                if (dObj != null) {
                                    day.isOpen = !dObj.optBoolean("closed", false)
                                    val op = dObj.optString("open", day.openTime)
                                    val cl = dObj.optString("close", day.closeTime)
                                    if (op.isNotBlank()) day.openTime = op
                                    if (cl.isNotBlank()) day.closeTime = cl
                                    updateDayUI(day)
                                }
                            }
                        } catch (_: Exception) {}
                    }
                } else {
                    tvCurrentStatus.text = "دوام افتراضي: 08:00 ص إلى 10:00 م"
                }
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                tvCurrentStatus.text = "دوام افتراضي: 08:00 ص إلى 10:00 م"
            }
        }

        btnSave.setOnClickListener {
            val is24 = if (switch24.isChecked) 1 else 0
            val type = if (is24 == 1) "24h" else if (rbWeekly.isChecked) "weekly" else "daily"

            var weeklyJsonStr: String? = null
            if (type == "weekly") {
                val wObj = org.json.JSONObject()
                for (day in weeklyDays) {
                    val dObj = org.json.JSONObject().apply {
                        put("open", day.openTime)
                        put("close", day.closeTime)
                        put("closed", !day.isOpen)
                    }
                    wObj.put(day.key, dObj)
                }
                weeklyJsonStr = wObj.toString()
            }

            val req = com.medical.clinic.staff.data.models.UpdateClinicScheduleRequest(
                is24Hours = is24,
                scheduleType = type,
                openTime = selectedOpenTime,
                closeTime = selectedCloseTime,
                weeklySchedule = weeklyJsonStr
            )

            btnSave.isEnabled = false
            pbLoading.visibility = View.VISIBLE

            scope.launch {
                try {
                    val res = apiService.updateClinicSchedule(req)
                    pbLoading.visibility = View.GONE
                    btnSave.isEnabled = true
                    if (res.isSuccessful && res.body()?.success == true) {
                        Toast.makeText(context, "✅ تم حفظ وتطبيق قالب الدوام بنجاح!", Toast.LENGTH_LONG).show()
                        res.body()?.data?.let { onSaved?.invoke(it) }
                        dialog.dismiss()
                    } else {
                        val msg = res.body()?.message ?: "فشل حفظ المواعيد"
                        Toast.makeText(context, "⚠️ $msg", Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    pbLoading.visibility = View.GONE
                    btnSave.isEnabled = true
                    Toast.makeText(context, "⚠️ خطأ في الاتصال: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                }
            }
        }

        dialog.show()
    }
}
