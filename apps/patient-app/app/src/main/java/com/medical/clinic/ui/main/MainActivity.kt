package com.medical.clinic.ui.main

import android.os.Bundle
import android.view.MotionEvent
import android.view.View
import android.content.Intent
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.medical.clinic.R
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.ui.doctor.DoctorDashboardFragment
import com.medical.clinic.ui.doctor.DoctorProfileFragment
import com.medical.clinic.ui.doctor.DoctorQueueFragment
import com.medical.clinic.ui.patient.PatientAppointmentsFragment
import com.medical.clinic.ui.patient.PatientHomeFragment
import com.medical.clinic.ui.patient.PatientProfileFragment
import com.medical.clinic.ui.patient.PatientRecordsFragment
import com.medical.clinic.ui.secretary.DelegationsFragment
import com.medical.clinic.ui.secretary.SecretaryDashboardFragment
import com.medical.clinic.ui.secretary.SecretaryDoctorsFragment
import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.medical.clinic.utils.NotificationAlarmReceiver
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    @Inject
    lateinit var sessionManager: SessionManager

    private lateinit var bottomNav: BottomNavigationView

    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            if (isGranted) {
                NotificationAlarmReceiver.scheduleNext(this)
            }
        }

    private fun checkNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        checkNotificationPermission()
        NotificationAlarmReceiver.scheduleNext(this)

        val user = sessionManager.getUser()

        when {
            user?.isDoctor == true -> {
                setContentView(R.layout.activity_main)
                bottomNav = findViewById(R.id.bottomNav)
                setupDoctorUI()
            }
            user?.isSecretary == true -> {
                setContentView(R.layout.activity_main_secretary)
                bottomNav = findViewById(R.id.bottomNav)
                setupSecretaryUI()
            }
            else -> {
                // Patient or Guest (تطبيق طبيبك للمريض)
                setContentView(R.layout.activity_main_patient)
                bottomNav = findViewById(R.id.patientBottomNav)
                setupPatientUI()
                setupDraggableAiBubble()
            }
        }
    }

    // ═══════════════════════════════════════════
    // Patient UI (طبيبك)
    // ═══════════════════════════════════════════
    private fun setupPatientUI() {
        loadFragment(PatientHomeFragment(), R.id.patientFragmentContainer)
        bottomNav.setOnItemReselectedListener { item ->
            animateBottomNavItem(item.itemId)
        }

        bottomNav.setOnItemSelectedListener { item ->
            animateBottomNavItem(item.itemId)
            val fragment: Fragment = when (item.itemId) {
                R.id.nav_patient_home -> PatientHomeFragment()
                R.id.nav_patient_appointments -> PatientAppointmentsFragment()
                R.id.nav_patient_records -> PatientRecordsFragment()
                R.id.nav_patient_profile -> PatientProfileFragment()
                else -> PatientHomeFragment()
            }
            loadFragment(fragment, R.id.patientFragmentContainer)
            true
        }
    }

    // ═══════════════════════════════════════════
    // Doctor UI
    // ═══════════════════════════════════════════
    private fun setupDoctorUI() {
        loadFragment(DoctorDashboardFragment(), R.id.fragmentContainer)
        bottomNav.setOnItemReselectedListener { item ->
            animateBottomNavItem(item.itemId)
        }

        bottomNav.setOnItemSelectedListener { item ->
            animateBottomNavItem(item.itemId)
            val fragment: Fragment = when (item.itemId) {
                R.id.nav_dashboard -> DoctorDashboardFragment()
                R.id.nav_queue -> DoctorQueueFragment()
                R.id.nav_patients -> DoctorDashboardFragment()
                R.id.nav_profile -> DoctorProfileFragment()
                else -> DoctorDashboardFragment()
            }
            loadFragment(fragment, R.id.fragmentContainer)
            true
        }
    }

    // ═══════════════════════════════════════════
    // Secretary UI
    // ═══════════════════════════════════════════
    private fun setupSecretaryUI() {
        loadFragment(SecretaryDashboardFragment(), R.id.fragmentContainer)
        bottomNav.setOnItemReselectedListener { item ->
            animateBottomNavItem(item.itemId)
        }

        bottomNav.setOnItemSelectedListener { item ->
            animateBottomNavItem(item.itemId)
            when (item.itemId) {
                R.id.nav_sec_dashboard -> {
                    loadFragment(SecretaryDashboardFragment(), R.id.fragmentContainer)
                    true
                }
                R.id.nav_sec_doctors -> {
                    loadFragment(SecretaryDoctorsFragment(), R.id.fragmentContainer)
                    true
                }
                R.id.nav_sec_periods -> {
                    loadFragment(SecretaryDashboardFragment(), R.id.fragmentContainer)
                    true
                }
                R.id.nav_sec_delegations -> {
                    loadFragment(DelegationsFragment(), R.id.fragmentContainer)
                    true
                }
                else -> {
                    loadFragment(SecretaryDashboardFragment(), R.id.fragmentContainer)
                    true
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        NotificationAlarmReceiver.scheduleNext(this)
    }

    private fun loadFragment(fragment: Fragment, containerId: Int = R.id.fragmentContainer) {
        supportFragmentManager.beginTransaction()
            .setCustomAnimations(R.anim.tab_enter, R.anim.tab_exit)
            .replace(containerId, fragment)
            .commit()
    }

    /**
     * تأثير تفاعلي ونبض زنبركي أيقوني فائق الجمال في نفس الموضع عند النقر على عناصر الشريط السفلي
     */
    private fun animateBottomNavItem(itemId: Int) {
        try {
            bottomNav.performHapticFeedback(android.view.HapticFeedbackConstants.VIRTUAL_KEY)
            val itemView = bottomNav.findViewById<android.view.View>(itemId) ?: return

            // العثور على حاوية الأيقونة والأيقونة بداخل عنصر التبويب
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

            // حركة نبضية ناعمة للنص المرافق للأيقونة
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

    private var bubbleGlowAnimator: android.animation.AnimatorSet? = null

    private fun startBubbleGlow(bubble: View) {
        bubbleGlowAnimator?.cancel()
        val halo = findViewById<View>(R.id.vBubbleGlowHalo) ?: bubble

        val scaleX = android.animation.ObjectAnimator.ofFloat(halo, "scaleX", 1.0f, 1.25f, 1.0f).apply {
            repeatCount = android.animation.ValueAnimator.INFINITE
            repeatMode = android.animation.ValueAnimator.RESTART
            duration = 2000
            interpolator = android.view.animation.AccelerateDecelerateInterpolator()
        }
        val scaleY = android.animation.ObjectAnimator.ofFloat(halo, "scaleY", 1.0f, 1.25f, 1.0f).apply {
            repeatCount = android.animation.ValueAnimator.INFINITE
            repeatMode = android.animation.ValueAnimator.RESTART
            duration = 2000
            interpolator = android.view.animation.AccelerateDecelerateInterpolator()
        }
        val alpha = android.animation.ObjectAnimator.ofFloat(halo, "alpha", 0.45f, 1.0f, 0.45f).apply {
            repeatCount = android.animation.ValueAnimator.INFINITE
            repeatMode = android.animation.ValueAnimator.RESTART
            duration = 2000
            interpolator = android.view.animation.AccelerateDecelerateInterpolator()
        }

        bubbleGlowAnimator = android.animation.AnimatorSet().apply {
            playTogether(scaleX, scaleY, alpha)
            start()
        }
    }

    private fun pauseBubbleGlow() {
        bubbleGlowAnimator?.cancel()
        findViewById<View>(R.id.vBubbleGlowHalo)?.apply {
            scaleX = 1.0f
            scaleY = 1.0f
            alpha = 0.6f
        }
    }

    private fun setupDraggableAiBubble() {
        val bubble = findViewById<View>(R.id.fabAiBubble) ?: return
        startBubbleGlow(bubble)

        var dX = 0f
        var dY = 0f
        var startX = 0f
        var startY = 0f
        val touchSlop = 12f

        bubble.setOnTouchListener { view, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    pauseBubbleGlow()
                    dX = view.x - event.rawX
                    dY = view.y - event.rawY
                    startX = event.rawX
                    startY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val parent = view.parent as? View ?: return@setOnTouchListener false
                    val newX = (event.rawX + dX).coerceIn(0f, (parent.width - view.width).toFloat())
                    val newY = (event.rawY + dY).coerceIn(0f, (parent.height - view.height).toFloat())
                    view.animate()
                        .x(newX)
                        .y(newY)
                        .setDuration(0)
                        .start()
                    true
                }
                MotionEvent.ACTION_UP -> {
                    val diffX = Math.abs(event.rawX - startX)
                    val diffY = Math.abs(event.rawY - startY)
                    if (diffX < touchSlop && diffY < touchSlop) {
                        startBubbleGlow(view)
                        // Tapped: open Assistant!
                        val intent = Intent(this, com.medical.clinic.ui.assistant.ClinicalAssistantActivity::class.java)
                        startActivity(intent)
                    } else {
                        // Dragged: smoothly snap to nearest edge
                        val parent = view.parent as? View
                        if (parent != null) {
                            val midX = parent.width / 2f
                            val targetX = if (view.x + view.width / 2f < midX) 24f else (parent.width - view.width - 24f)
                            view.animate()
                                .x(targetX)
                                .setDuration(250)
                                .setInterpolator(android.view.animation.OvershootInterpolator(1.2f))
                                .withEndAction {
                                    startBubbleGlow(view)
                                }
                                .start()
                        } else {
                            startBubbleGlow(view)
                        }
                    }
                    true
                }
                else -> false
            }
        }
    }

}
