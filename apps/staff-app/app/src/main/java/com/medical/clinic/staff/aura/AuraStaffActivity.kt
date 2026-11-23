package com.medical.clinic.staff.aura

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import com.medical.clinic.staff.aura.components.*
import com.medical.clinic.staff.aura.screens.*
import com.medical.clinic.staff.aura.theme.AuraTheme

class AuraStaffActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = android.graphics.Color.TRANSPARENT
        window.navigationBarColor = android.graphics.Color.TRANSPARENT
        WindowCompat.getInsetsController(window, window.decorView).apply {
            isAppearanceLightStatusBars = true
            isAppearanceLightNavigationBars = true
        }

        setContent {
            AuraTheme {
                var showSplash by rememberSaveable { mutableStateOf(true) }
                var selectedTabIndex by rememberSaveable { mutableIntStateOf(1) } // 1 = "queue"
                var selectedPatientForRx by remember { mutableStateOf<AuraQueuePatient?>(null) }

                // 1. The Deep Mesh Animated Background
                MeshGradientBackground(
                    modifier = Modifier.fillMaxSize()
                ) {
                    if (showSplash) {
                        EcgSplashScreen(
                            onFinished = { showSplash = false }
                        )
                    } else {
                        Column(modifier = Modifier.fillMaxSize()) {
                            Box(modifier = Modifier.weight(1f)) {
                                AnimatedContent(
                                    targetState = if (selectedPatientForRx != null) "rx" else selectedTabIndex.toString(),
                                    transitionSpec = {
                                        fadeIn(animationSpec = tween(400)) togetherWith
                                                fadeOut(animationSpec = tween(300))
                                    },
                                    label = "StaffScreenTransition"
                                ) { screen ->
                                    when (screen) {
                                        "1" -> {
                                            AuraStaffQueueScreen(
                                                onOpenPrescription = { patient ->
                                                    selectedPatientForRx = patient
                                                }
                                            )
                                        }
                                        "2", "rx" -> {
                                            AuraPrescriptionNotepadScreen(
                                                patientName = selectedPatientForRx?.name ?: "مريض تجريبي",
                                                bookingCode = selectedPatientForRx?.bookingCode ?: "BK-1001",
                                                onBack = {
                                                    selectedPatientForRx = null
                                                    selectedTabIndex = 1
                                                },
                                                onSaveAndPrint = { _, _ ->
                                                    Toast.makeText(
                                                        this@AuraStaffActivity,
                                                        "تم حفظ الروشتة وتوليد PDF المعتمد بنجاح ✅",
                                                        Toast.LENGTH_LONG
                                                    ).show()
                                                    selectedPatientForRx = null
                                                    selectedTabIndex = 1
                                                }
                                            )
                                        }
                                        else -> {
                                            AuraStaffQueueScreen(
                                                onOpenPrescription = { patient ->
                                                    selectedPatientForRx = patient
                                                }
                                            )
                                        }
                                    }
                                }
                            }

                            // 2. Liquid Bottom Navigation Bar
                            if (selectedPatientForRx == null) {
                                LiquidBottomBar(
                                    tabs = AuraStaffTabs,
                                    selectedIndex = selectedTabIndex,
                                    onSelect = { selectedTabIndex = it },
                                    modifier = Modifier
                                        .navigationBarsPadding()
                                        .padding(bottom = 12.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
