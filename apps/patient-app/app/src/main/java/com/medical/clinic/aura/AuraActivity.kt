package com.medical.clinic.aura

import android.content.Intent
import android.content.pm.ActivityInfo
import android.graphics.Color as AndroidColor
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.medical.clinic.aura.components.AuraSnackbarHost
import com.medical.clinic.aura.components.AuraPatientTabs
import com.medical.clinic.aura.components.EcgSplashScreen
import com.medical.clinic.aura.components.LiquidBottomBar
import com.medical.clinic.aura.data.AuraDemoData
import com.medical.clinic.aura.screens.AuraAllDoctorsScreen
import com.medical.clinic.aura.screens.AuraAppointmentsScreen
import com.medical.clinic.aura.screens.AuraDoctorProfileScreen
import com.medical.clinic.aura.screens.AuraHomeScreen
import com.medical.clinic.aura.screens.AuraLoginScreen
import com.medical.clinic.aura.screens.AuraProfileScreen
import com.medical.clinic.aura.screens.AuraRecordsScreen
import com.medical.clinic.aura.theme.AuraTheme
import com.medical.clinic.aura.theme.LocalAuraPalette
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.ui.auth.ChangePasswordActivity
import com.medical.clinic.ui.auth.ForgotPasswordActivity
import com.medical.clinic.ui.auth.GuestLoginActivity
import com.medical.clinic.ui.auth.RegisterPatientActivity
import com.medical.clinic.ui.chat.PatientConversationsActivity
import com.medical.clinic.ui.main.MainActivity
import com.medical.clinic.ui.patient.CompletePatientProfileActivity
import com.medical.clinic.ui.patient.OffersActivity
import com.medical.clinic.viewmodel.AuthViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * AURA host for the patient experience.
 * The classic XML screens remain registered as deep-flow fallbacks (booking,
 * registration, password recovery, chat) while every entry point is Compose.
 */
@AndroidEntryPoint
class AuraActivity : ComponentActivity() {

    @Inject
    lateinit var sessionManager: SessionManager

    private val viewModel: AuthViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = AndroidColor.TRANSPARENT
        window.navigationBarColor = AndroidColor.TRANSPARENT
        WindowCompat.getInsetsController(window, window.decorView).apply {
            isAppearanceLightStatusBars = true
            isAppearanceLightNavigationBars = true
        }
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT

        setContent {
            AuraTheme {
                AuraRoot(
                    viewModel = viewModel,
                    sessionManager = sessionManager,
                    onOpenLegacy = { intent -> startActivity(intent) },
                    onExit = { finish() }
                )
            }
        }
    }
}

private enum class AuraStage { Splash, Login, Main }

@Composable
private fun AuraRoot(
    viewModel: AuthViewModel,
    sessionManager: SessionManager,
    onOpenLegacy: (Intent) -> Unit,
    onExit: () -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val loginState by viewModel.loginState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    var stage by rememberSaveable {
        mutableStateOf(
            if (sessionManager.isLoggedIn()) AuraStage.Splash else AuraStage.Splash
        )
    }
    var loggedIn by rememberSaveable { mutableStateOf(sessionManager.isLoggedIn()) }
    var serverError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(loginState) {
        when (val state = loginState) {
            is AuthViewModel.LoginState.Success -> {
                serverError = null
                val user = state.user
                when {
                    user.isDoctor || user.isSecretary -> {
                        onOpenLegacy(
                            Intent(context, MainActivity::class.java).apply {
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                            }
                        )
                        onExit()
                    }
                    user.mustChangePassword -> {
                        onOpenLegacy(Intent(context, ChangePasswordActivity::class.java))
                        onExit()
                    }
                    user.mustCompleteProfile -> {
                        onOpenLegacy(Intent(context, CompletePatientProfileActivity::class.java))
                        onExit()
                    }
                    else -> {
                        loggedIn = true
                        viewModel.resetLoginState()
                    }
                }
            }
            is AuthViewModel.LoginState.Error -> {
                serverError = state.message
                viewModel.resetLoginState()
            }
            else -> Unit
        }
    }

    val displayStage = when {
        !loggedIn && stage == AuraStage.Splash -> AuraStage.Splash
        !loggedIn -> AuraStage.Login
        else -> AuraStage.Main
    }

    val palette = LocalAuraPalette.current

    Box(Modifier.fillMaxSize().background(palette.canvasBackground)) {
        AnimatedContent(
            targetState = displayStage,
            transitionSpec = { fadeIn(tween(650)) togetherWith fadeOut(tween(420)) },
            label = "aura-stage"
        ) { current ->
            when (current) {
                AuraStage.Splash -> {
                    EcgSplashScreen(
                        onFinished = {
                            stage = AuraStage.Login
                        }
                    )
                }
                AuraStage.Login -> {
                    AuraLoginScreen(
                        loading = loginState is AuthViewModel.LoginState.Loading,
                        serverError = serverError,
                        onLogin = { login, password ->
                            serverError = null
                            viewModel.login(login, password, "patient")
                        },
                        onOpenRegister = {
                            onOpenLegacy(Intent(context, RegisterPatientActivity::class.java))
                        },
                        onForgotPassword = {
                            onOpenLegacy(Intent(context, ForgotPasswordActivity::class.java))
                        },
                        onGuest = {
                            onOpenLegacy(Intent(context, GuestLoginActivity::class.java))
                        }
                    )
                }
                AuraStage.Main -> {
                    AuraMain(
                        userName = sessionManager.getUser()?.fullName,
                        phone = sessionManager.getUser()?.phone,
                        email = sessionManager.getUser()?.email,
                        snackbarHostState = snackbarHostState,
                        onOpenLegacy = onOpenLegacy,
                        onLogout = {
                            viewModel.logout()
                            sessionManager.logout()
                            loggedIn = false
                            stage = AuraStage.Login
                        }
                    )
                }
            }
        }

        AuraSnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .statusBarsPadding()
                .padding(top = 8.dp)
        )
    }
}

@Composable
private fun AuraMain(
    userName: String?,
    phone: String?,
    email: String?,
    snackbarHostState: SnackbarHostState,
    onOpenLegacy: (Intent) -> Unit,
    onLogout: () -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val route = backStack?.destination?.route ?: "home"
    val mainRoutes = AuraPatientTabs.map { it.key }
    val showBar = route in mainRoutes

    fun openTab(target: String) {
        navController.navigate(target) {
            popUpTo("home") { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    Box(Modifier.fillMaxSize()) {
        NavHost(
            navController = navController,
            startDestination = "home",
            modifier = Modifier.fillMaxSize(),
            enterTransition = {
                androidx.compose.animation.slideInHorizontally(
                    initialOffsetX = { it },
                    animationSpec = tween(460)
                ) + fadeIn(tween(320))
            },
            exitTransition = {
                androidx.compose.animation.slideOutHorizontally(
                    targetOffsetX = { -it / 4 },
                    animationSpec = tween(460)
                ) + fadeOut(tween(280))
            },
            popEnterTransition = {
                androidx.compose.animation.slideInHorizontally(
                    initialOffsetX = { -it / 4 },
                    animationSpec = tween(460)
                ) + fadeIn(tween(320))
            },
            popExitTransition = {
                androidx.compose.animation.slideOutHorizontally(
                    targetOffsetX = { it },
                    animationSpec = tween(460)
                ) + fadeOut(tween(280))
            }
        ) {
            composable("home") {
                AuraHomeScreen(
                    userName = userName,
                    unreadMessages = AuraDemoData.unreadMessages,
                    snackbarHostState = snackbarHostState,
                    onOpenDoctor = { doctor -> navController.navigate("doctor/${doctor.id}") },
                    onOpenAllDoctors = { navController.navigate("doctors") },
                    onOpenAppointments = { openTab("appointments") },
                    onOpenChat = {
                        onOpenLegacy(Intent(context, PatientConversationsActivity::class.java))
                    },
                    onOpenOffers = {
                        onOpenLegacy(Intent(context, OffersActivity::class.java))
                    }
                )
            }
            composable("appointments") {
                AuraAppointmentsScreen(
                    userName = userName,
                    snackbarHostState = snackbarHostState,
                    onExploreDoctors = { navController.navigate("doctors") }
                )
            }
            composable("records") {
                AuraRecordsScreen(
                    snackbarHostState = snackbarHostState,
                    onExploreDoctors = { navController.navigate("doctors") }
                )
            }
            composable("profile") {
                AuraProfileScreen(
                    userName = userName,
                    phone = phone,
                    email = email,
                    snackbarHostState = snackbarHostState,
                    onLogout = onLogout
                )
            }
            composable("doctors") {
                AuraAllDoctorsScreen(
                    onBack = { navController.popBackStack() },
                    onOpenDoctor = { doctor -> navController.navigate("doctor/${doctor.id}") }
                )
            }
            composable(
                route = "doctor/{doctorId}",
                arguments = listOf(navArgument("doctorId") { type = NavType.IntType })
            ) { entry ->
                val id = entry.arguments?.getInt("doctorId") ?: AuraDemoData.doctors.first().id
                val doctor = AuraDemoData.doctors.firstOrNull { it.id == id } ?: AuraDemoData.doctors.first()
                AuraDoctorProfileScreen(
                    doctor = doctor,
                    snackbarHostState = snackbarHostState,
                    onBack = { navController.popBackStack() }
                )
            }
        }

        if (showBar) {
            val selected = AuraPatientTabs.indexOfFirst { it.key == route }.coerceAtLeast(0)
            LiquidBottomBar(
                tabs = AuraPatientTabs,
                selectedIndex = selected,
                onSelect = { index -> openTab(AuraPatientTabs[index].key) },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding()
            )
        }
    }
}
