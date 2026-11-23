package com.medical.clinic.staff.ui.main

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.medical.clinic.staff.R
import com.medical.clinic.staff.data.local.SessionManager
import com.medical.clinic.staff.data.utils.Constants
import com.medical.clinic.staff.databinding.ActivityMainBinding
import com.medical.clinic.staff.ui.auth.CompleteDoctorProfileActivity
import com.medical.clinic.staff.ui.auth.CompleteSecretaryProfileActivity
import com.medical.clinic.staff.ui.doctor.DoctorDashboardFragment
import com.medical.clinic.staff.ui.doctor.DoctorProfileFragment
import com.medical.clinic.staff.ui.doctor.DoctorQueueFragment
import com.medical.clinic.staff.ui.secretary.SecretaryDashboardFragment
import com.medical.clinic.staff.ui.secretary.SecretaryOffersFragment
import com.medical.clinic.staff.ui.secretary.SecretaryPeriodsFragment
import com.medical.clinic.staff.ui.secretary.SecretaryProfileFragment
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import com.medical.clinic.staff.data.api.ApiService
import com.medical.clinic.staff.data.models.ChatConversation

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    @Inject
    lateinit var sessionManager: SessionManager

    @Inject
    lateinit var apiService: ApiService

    @Inject
    lateinit var notificationPoller: com.medical.clinic.staff.utils.NotificationPoller

    private val notificationPermissionLauncher =
        registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.RequestPermission()) { isGranted ->
            if (isGranted) {
                com.medical.clinic.staff.utils.NotificationAlarmReceiver.scheduleNext(this)
            }
        }

    private fun checkNotificationPermission() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            if (androidx.core.content.ContextCompat.checkSelfPermission(
                    this,
                    android.Manifest.permission.POST_NOTIFICATIONS
                ) != android.content.pm.PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        checkNotificationPermission()
        com.medical.clinic.staff.utils.NotificationAlarmReceiver.scheduleNext(this)

        setupRoleNavigation()
        setupGuestBanner()
        updateHeaderAndBanner()

        binding.btnHeaderChat.setOnClickListener {
            val intent = Intent(this, com.medical.clinic.staff.ui.chat.ConversationsActivity::class.java)
            startActivity(intent)
        }

        binding.btnHeaderNotifications.setOnClickListener {
            showNotificationsDialog()
        }
        updateThemeToggleIcon()
        binding.btnHeaderThemeToggle.setOnClickListener {
            binding.tvHeaderThemeIcon.animate()
                ?.rotationBy(360f)
                ?.scaleX(1.3f)
                ?.scaleY(1.3f)
                ?.setDuration(300)
                ?.withEndAction {
                    binding.tvHeaderThemeIcon.scaleX = 1.0f
                    binding.tvHeaderThemeIcon.scaleY = 1.0f
                }
                ?.start()

            val newMode = com.medical.clinic.staff.utils.ThemeManager.toggleTheme(this)
            updateThemeToggleIcon()
            val msg = if (newMode == com.medical.clinic.staff.utils.ThemeManager.ThemeMode.DARK) {
                "تم تفعيل الوضع الليلي 🌙"
            } else {
                "تم تفعيل الوضع الفاتح ☀️"
            }
            android.widget.Toast.makeText(this, msg, android.widget.Toast.LENGTH_SHORT).show()
        }
    }

    override fun onResume() {
        super.onResume()
        enableNfcReader()
        com.medical.clinic.staff.utils.NotificationAlarmReceiver.scheduleNext(this)
        updateHeaderAndBanner()
        updateChatBadge()
        updateNotificationsBadge()

        if (!sessionManager.isGuestMode() && sessionManager.isLoggedIn()) {
            notificationPoller.start { title, body, id ->
                runOnUiThread {
                    updateNotificationsBadge()
                }
                com.medical.clinic.staff.utils.NotificationHelper.showNotification(
                    context = this@MainActivity,
                    title = title,
                    body = body,
                    notifId = id
                )
            }

            lifecycleScope.launch {
                try {
                    val res = apiService.getMe()
                    if (res.isSuccessful && res.body()?.success == true && res.body()?.data != null) {
                        sessionManager.saveUser(res.body()!!.data!!)
                        updateHeaderAndBanner()
                    }
                } catch (_: Exception) {}
            }
        }
    }

    override fun onPause() {
        super.onPause()
        disableNfcReader()
        notificationPoller.stop()
    }

    private fun updateChatBadge() {
        lifecycleScope.launch {
            try {
                val res = apiService.getConversations()
                if (res.isSuccessful && res.body()?.success == true) {
                    val unread = res.body()?.data?.sumOf { it.unreadCount } ?: 0
                    if (unread > 0) {
                        binding.tvHeaderChatBadge.visibility = View.VISIBLE
                        binding.tvHeaderChatBadge.text = if (unread > 99) "99+" else unread.toString()
                    } else {
                        binding.tvHeaderChatBadge.visibility = View.GONE
                    }
                }
            } catch (_: Exception) {}
        }
    }

    private fun updateNotificationsBadge() {
        lifecycleScope.launch {
            try {
                val res = apiService.getNotifications(unreadOnly = 1)
                if (res.isSuccessful && res.body()?.success == true) {
                    val count = res.body()?.data?.size ?: 0
                    if (count > 0) {
                        binding.tvHeaderNotifBadge.visibility = View.VISIBLE
                        binding.tvHeaderNotifBadge.text = if (count > 99) "99+" else count.toString()
                    } else {
                        binding.tvHeaderNotifBadge.visibility = View.GONE
                    }
                }
            } catch (_: Exception) {}
        }
    }

    private fun showNotificationsDialog() {
        val dialog = com.google.android.material.bottomsheet.BottomSheetDialog(this)
        val view = layoutInflater.inflate(R.layout.dialog_staff_notifications, null)
        dialog.setContentView(view)

        val pbLoading = view.findViewById<android.widget.ProgressBar>(R.id.pbNotificationsLoading)
        val tvEmpty = view.findViewById<android.widget.TextView>(R.id.tvEmptyNotifications)
        val rvNotifs = view.findViewById<androidx.recyclerview.widget.RecyclerView>(R.id.rvNotifications)
        val btnMarkAll = view.findViewById<android.widget.TextView>(R.id.btnMarkAllRead)

        val adapter = com.medical.clinic.staff.ui.notifications.StaffNotificationsAdapter { notif ->
            lifecycleScope.launch {
                try {
                    apiService.markNotificationRead(notif.id)
                } catch (_: Exception) {}
            }
        }

        rvNotifs.layoutManager = androidx.recyclerview.widget.LinearLayoutManager(this)
        rvNotifs.adapter = adapter

        pbLoading.visibility = View.VISIBLE
        tvEmpty.visibility = View.GONE

        fun loadList() {
            lifecycleScope.launch {
                try {
                    val res = apiService.getNotifications()
                    pbLoading.visibility = View.GONE
                    if (res.isSuccessful && res.body()?.success == true) {
                        val items = res.body()?.data ?: emptyList()
                        adapter.updateList(items)
                        tvEmpty.visibility = if (items.isEmpty()) View.VISIBLE else View.GONE
                    } else {
                        tvEmpty.visibility = View.VISIBLE
                    }
                } catch (e: Exception) {
                    pbLoading.visibility = View.GONE
                    tvEmpty.visibility = View.VISIBLE
                }
            }
        }

        loadList()

        btnMarkAll.setOnClickListener {
            lifecycleScope.launch {
                try {
                    apiService.markAllNotificationsRead()
                    binding.tvHeaderNotifBadge.visibility = View.GONE
                    loadList()
                } catch (_: Exception) {}
            }
        }

        dialog.show()
    }

    private fun showClinicSwitchDialog() {
        lifecycleScope.launch {
            try {
                val res = apiService.getDoctorClinics()
                if (res.isSuccessful && res.body()?.success == true) {
                    val clinics = res.body()?.data ?: emptyList()
                    if (clinics.isEmpty()) {
                        android.widget.Toast.makeText(this@MainActivity, "لم يتم العثور على عيادات مرتبطة", android.widget.Toast.LENGTH_SHORT).show()
                        return@launch
                    }

                    val names = clinics.map { it.name }.toTypedArray()
                    val currentClinicId = sessionManager.getUser()?.clinicId ?: -1
                    val currentIndex = clinics.indexOfFirst { it.id == currentClinicId }.coerceAtLeast(0)

                    androidx.appcompat.app.AlertDialog.Builder(this@MainActivity)
                        .setTitle("🏥 اختيار العيادة النشطة")
                        .setSingleChoiceItems(names, currentIndex) { dialog, which ->
                            val selectedClinic = clinics[which]
                            dialog.dismiss()
                            switchActiveClinic(selectedClinic.id)
                        }
                        .setNegativeButton("إلغاء", null)
                        .show()
                } else {
                    android.widget.Toast.makeText(this@MainActivity, "تعذر جلب العيادات", android.widget.Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                android.widget.Toast.makeText(this@MainActivity, "خطأ في الاتصال: ${e.localizedMessage}", android.widget.Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun switchActiveClinic(clinicId: Int) {
        lifecycleScope.launch {
            try {
                val res = apiService.switchClinic(mapOf("clinic_id" to clinicId))
                if (res.isSuccessful && res.body()?.success == true) {
                    val updatedUser = res.body()?.data ?: res.body()?.user
                    if (updatedUser != null) {
                        sessionManager.saveUser(updatedUser)
                    }
                    updateHeaderAndBanner()
                    android.widget.Toast.makeText(this@MainActivity, res.body()?.message ?: "تم التبديل بنجاح", android.widget.Toast.LENGTH_SHORT).show()

                    // إعادة تحميل الشاشة الحالية فوراً لعرض مواعيد وبيانات العيادة الجديدة
                    val currentId = binding.bottomNav.selectedItemId
                    when (currentId) {
                        R.id.nav_doctor_dashboard -> loadFragment(DoctorDashboardFragment())
                        R.id.nav_doctor_queue -> loadFragment(DoctorQueueFragment())
                        R.id.nav_doctor_profile -> loadFragment(DoctorProfileFragment())
                        else -> loadFragment(DoctorDashboardFragment())
                    }
                } else {
                    android.widget.Toast.makeText(this@MainActivity, res.body()?.message ?: "فشل تبديل العيادة", android.widget.Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                android.widget.Toast.makeText(this@MainActivity, "خطأ: ${e.localizedMessage}", android.widget.Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun updateHeaderAndBanner() {
        val user = sessionManager.getUser()
        val isDoctor = sessionManager.isDoctor()
        val isGuest = sessionManager.isGuestMode() || sessionManager.mustCompleteProfile()

        val rawName = user?.fullName?.trim()
        val formattedName = if (!rawName.isNullOrBlank() && !rawName.contains("تجريبي")) {
            if (isDoctor && !rawName.startsWith("د.") && !rawName.startsWith("دكتور") && !rawName.startsWith("الدكتور")) {
                "د. $rawName"
            } else {
                rawName
            }
        } else {
            if (isDoctor) "طبيب" else "سكرتيرة"
        }

        binding.tvHeaderUserName.text = formattedName
        binding.tvHeaderClinicName.text = user?.clinicFullName ?: user?.clinicName ?: if (isGuest) "وضع التجربة السريعة" else "العيادة التخصصية"
        val avatarUrl = user?.bestAvatar
        if (!avatarUrl.isNullOrBlank()) {
            val fullUrl = if (avatarUrl.startsWith("http")) avatarUrl else com.medical.clinic.staff.BuildConfig.BASE_URL.removeSuffix("/api/v1/").removeSuffix("/") + if (avatarUrl.startsWith("/")) avatarUrl else "/$avatarUrl"
            com.bumptech.glide.Glide.with(this)
                .load(fullUrl)
                .transition(com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions.withCrossFade(300))
                .circleCrop()
                .into(binding.ivHeaderAvatar)
            binding.ivHeaderAvatar.visibility = android.view.View.VISIBLE
            binding.tvHeaderAvatarEmoji.visibility = android.view.View.GONE
        } else {
            binding.ivHeaderAvatar.visibility = android.view.View.GONE
            binding.tvHeaderAvatarEmoji.visibility = android.view.View.VISIBLE
            binding.tvHeaderAvatarEmoji.text = if (isDoctor) "👨‍⚕️" else "👩‍💼"
        }

        if (isDoctor) {
            binding.tvClinicDropdownArrow.visibility = View.VISIBLE
            binding.layoutHeaderClinicPicker.setOnClickListener {
                showClinicSwitchDialog()
            }
        } else {
            binding.tvClinicDropdownArrow.visibility = View.GONE
            binding.layoutHeaderClinicPicker.setOnClickListener(null)
        }

        if (isGuest) {
            binding.layoutGuestBanner.visibility = View.VISIBLE
        } else {
            binding.layoutGuestBanner.visibility = View.GONE
        }
    }

    private fun setupGuestBanner() {
        binding.btnBannerCompleteProfile.setOnClickListener {
            val isDoctor = sessionManager.isDoctor()
            val intent = if (isDoctor) {
                Intent(this, CompleteDoctorProfileActivity::class.java).apply {
                    putExtra("is_guest", true)
                    putExtra(Constants.EXTRA_ROLE, Constants.ROLE_DOCTOR)
                }
            } else {
                Intent(this, CompleteSecretaryProfileActivity::class.java).apply {
                    putExtra("is_guest", true)
                    putExtra(Constants.EXTRA_ROLE, Constants.ROLE_SECRETARY)
                }
            }
            startActivity(intent)
        }
    }

    private fun setupRoleNavigation() {
        val isDoctor = sessionManager.isDoctor()

        if (isDoctor) {
            binding.tvHeaderRoleBadge.text = "👨‍⚕️ طبيب"
            binding.tvHeaderAvatarEmoji.text = "👨‍⚕️"
            binding.bottomNav.menu.clear()
            binding.bottomNav.inflateMenu(R.menu.menu_bottom_doctor)

            loadFragment(DoctorDashboardFragment())

            binding.bottomNav.setOnItemSelectedListener { item ->
                animateBottomNavItem(item.itemId)
                when (item.itemId) {
                    R.id.nav_doctor_dashboard -> {
                        loadFragment(DoctorDashboardFragment())
                        true
                    }
                    R.id.nav_doctor_queue -> {
                        loadFragment(DoctorQueueFragment())
                        true
                    }
                    R.id.nav_doctor_profile -> {
                        loadFragment(DoctorProfileFragment())
                        true
                    }
                    else -> false
                }
            }
        } else {
            binding.tvHeaderRoleBadge.text = "👩‍💼 سكرتيرة"
            binding.tvHeaderAvatarEmoji.text = "👩‍💼"
            binding.bottomNav.menu.clear()
            binding.bottomNav.inflateMenu(R.menu.menu_bottom_secretary)

            loadFragment(SecretaryDashboardFragment())

            binding.bottomNav.setOnItemSelectedListener { item ->
                animateBottomNavItem(item.itemId)
                when (item.itemId) {
                    R.id.nav_sec_dashboard -> {
                        loadFragment(SecretaryDashboardFragment())
                        true
                    }
                    R.id.nav_sec_periods -> {
                        loadFragment(SecretaryPeriodsFragment())
                        true
                    }
                    R.id.nav_sec_offers -> {
                        loadFragment(SecretaryOffersFragment())
                        true
                    }
                    R.id.nav_sec_profile -> {
                        loadFragment(SecretaryProfileFragment())
                        true
                    }
                    else -> false
                }
            }
        }
    }

    private fun loadFragment(fragment: Fragment) {
        supportFragmentManager.beginTransaction()
            .setCustomAnimations(R.anim.tab_enter, R.anim.tab_exit)
            .replace(R.id.fragmentContainer, fragment)
            .commit()
    }

    private fun updateThemeToggleIcon() {
        val isNight = com.medical.clinic.staff.utils.ThemeManager.isNightActive(this)
        binding.tvHeaderThemeIcon.text = if (isNight) "☀️" else "🌙"
    }

    private fun animateBottomNavItem(itemId: Int) {
        try {
            binding.bottomNav.performHapticFeedback(android.view.HapticFeedbackConstants.VIRTUAL_KEY)
            val itemView = binding.bottomNav.findViewById<android.view.View>(itemId) ?: return

            val iconContainer = itemView.findViewById<android.view.View>(com.google.android.material.R.id.navigation_bar_item_icon_container)
            val iconView = itemView.findViewById<android.view.View>(com.google.android.material.R.id.navigation_bar_item_icon_view)
            val targetView = iconContainer ?: iconView ?: itemView

            targetView.animate().cancel()
            targetView.scaleX = 0.82f
            targetView.scaleY = 0.82f
            targetView.animate()
                .scaleX(1.24f)
                .scaleY(1.24f)
                .translationY(-12f)
                .setDuration(180)
                .setInterpolator(android.view.animation.OvershootInterpolator(3.8f))
                .withEndAction {
                    targetView.animate()
                        .scaleX(1.0f)
                        .scaleY(1.0f)
                        .translationY(0f)
                        .setDuration(150)
                        .setInterpolator(android.view.animation.DecelerateInterpolator())
                        .start()
                }
                .start()

            val labelGroup = itemView.findViewById<android.view.View>(com.google.android.material.R.id.navigation_bar_item_labels_group)
            labelGroup?.let { lbl ->
                lbl.animate().cancel()
                lbl.scaleX = 0.92f
                lbl.scaleY = 0.92f
                lbl.animate()
                    .scaleX(1.08f)
                    .scaleY(1.08f)
                    .setDuration(160)
                    .withEndAction {
                        lbl.animate()
                            .scaleX(1.0f)
                            .scaleY(1.0f)
                            .setDuration(120)
                            .start()
                    }
                    .start()
            }
        } catch (_: Exception) {}
    }
    // ═══════════════════════════════════════════
    // NFC TAP-TO-CHECK-IN (استقبال الحضور بالتلامس)
    // ═══════════════════════════════════════════

    private fun enableNfcReader() {
        val nfcAdapter = android.nfc.NfcAdapter.getDefaultAdapter(this) ?: return
        if (!nfcAdapter.isEnabled) return

        val flags = android.nfc.NfcAdapter.FLAG_READER_NFC_A or
                    android.nfc.NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK
        nfcAdapter.enableReaderMode(this, { tag ->
            handleNfcTag(tag)
        }, flags, null)
    }

    private fun disableNfcReader() {
        val nfcAdapter = android.nfc.NfcAdapter.getDefaultAdapter(this) ?: return
        nfcAdapter.disableReaderMode(this)
    }

    private fun handleNfcTag(tag: android.nfc.Tag) {
        val isoDep = android.nfc.tech.IsoDep.get(tag) ?: return
        try {
            isoDep.connect()
            // APDU SELECT: 00 A4 04 00 07 F0 01 02 03 04 05 06
            val selectAidApdu = byteArrayOf(
                0x00.toByte(), 0xA4.toByte(), 0x04.toByte(), 0x00.toByte(), 0x07.toByte(),
                0xF0.toByte(), 0x01.toByte(), 0x02.toByte(), 0x03.toByte(), 0x04.toByte(), 0x05.toByte(), 0x06.toByte()
            )
            val response = isoDep.transceive(selectAidApdu)
            if (response != null && response.size >= 2) {
                val sw1 = response[response.size - 2]
                val sw2 = response[response.size - 1]
                if (sw1 == 0x90.toByte() && sw2 == 0x00.toByte()) {
                    val payloadBytes = response.copyOfRange(0, response.size - 2)
                    val payload = String(payloadBytes, Charsets.UTF_8)
                    runOnUiThread {
                        processNfcAttendance(payload)
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("StaffNFC", "Error reading NFC tag: " + e.message)
        } finally {
            try { isoDep.close() } catch (_: Exception) {}
        }
    }

    private fun processNfcAttendance(payload: String) {
        if (!payload.startsWith("TABEEBAK_APPT:")) return

        val vibrator = getSystemService(android.content.Context.VIBRATOR_SERVICE) as? android.os.Vibrator
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            vibrator?.vibrate(android.os.VibrationEffect.createOneShot(180, android.os.VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            vibrator?.vibrate(180)
        }

        val parts = payload.removePrefix("TABEEBAK_APPT:").split(":")
        val apptIdOrCode = parts.getOrNull(0) ?: return
        val bookingCode = parts.getOrNull(1) ?: apptIdOrCode

        lifecycleScope.launch {
            try {
                val response = apiService.updateAppointmentAttendance(
                    apptIdOrCode,
                    mapOf("status" to "arrived")
                )
                if (response.isSuccessful && response.body()?.success == true) {
                    showNfcAttendanceDialog(bookingCode)
                    supportFragmentManager.fragments.firstOrNull()?.let { current ->
                        supportFragmentManager.beginTransaction().detach(current).attach(current).commitAllowingStateLoss()
                    }
                } else {
                    android.widget.Toast.makeText(this@MainActivity, "تعذر تسجيل الحضور: " + response.message(), android.widget.Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                android.widget.Toast.makeText(this@MainActivity, "خطأ في الاتصال: " + e.message, android.widget.Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showNfcAttendanceDialog(bookingCode: String) {
        val builder = com.google.android.material.dialog.MaterialAlertDialogBuilder(this)
        builder.setTitle("📲 تأكيد الحضور الذكي (NFC)")
        builder.setMessage("تم تسجيل وصول المريض صاحب الحجز (#" + bookingCode + ") بنجاح إلى صالة الانتظار.")
        builder.setIcon(R.drawable.ic_tabeebak_logo)
        builder.setPositiveButton("موافق") { dialog, _ -> dialog.dismiss() }
        builder.show()
    }
}
