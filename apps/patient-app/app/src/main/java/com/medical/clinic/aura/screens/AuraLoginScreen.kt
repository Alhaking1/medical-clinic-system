package com.medical.clinic.aura.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.medical.clinic.aura.components.AuraGhostButton
import com.medical.clinic.aura.components.AuraGlyph
import com.medical.clinic.aura.components.AuraIcon
import com.medical.clinic.aura.components.AuraPrimaryButton
import com.medical.clinic.aura.components.AuraTextField
import com.medical.clinic.aura.components.GlassCard
import com.medical.clinic.aura.components.GradientHeading
import com.medical.clinic.aura.components.LiveDot
import com.medical.clinic.aura.components.MeshGradientBackground
import com.medical.clinic.aura.components.rememberAuraHaptics
import com.medical.clinic.aura.components.rememberShakeController
import com.medical.clinic.aura.components.shake
import com.medical.clinic.aura.theme.Cairo
import com.medical.clinic.aura.theme.LocalAuraPalette
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun AuraLoginScreen(
    loading: Boolean,
    serverError: String?,
    onLogin: (login: String, password: String) -> Unit,
    onOpenRegister: () -> Unit,
    onForgotPassword: () -> Unit,
    onGuest: () -> Unit
) {
    val palette = LocalAuraPalette.current
    val haptics = rememberAuraHaptics()
    val scope = rememberCoroutineScope()
    val shakeController = rememberShakeController()
    var login by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var rememberMe by remember { mutableStateOf(true) }
    var submitted by remember { mutableStateOf(false) }

    val emailLike = login.contains("@")
    val loginError: String? = when {
        login.isEmpty() -> if (submitted) "أدخل رقم الهاتف أو البريد الإلكتروني" else null
        emailLike && !login.matches(Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) ->
            if (login.length > 4) "صيغة البريد الإلكتروني غير صحيحة" else null
        !emailLike && login.any { it.isLetter() } -> "أدخل رقم هاتف صحيح أو بريداً إلكترونياً"
        !emailLike && login.filter { it.isDigit() }.length >= 9 -> null
        !emailLike && login.length >= 9 -> "رقم الهاتف أطول من المتوقع"
        else -> null
    }
    val passwordError: String? = when {
        password.isEmpty() -> if (submitted) "كلمة المرور مطلوبة" else null
        password.isNotEmpty() && password.length < 8 -> "كلمة المرور ٨ أحرف على الأقل"
        else -> null
    }

    LaunchedEffect(loginError) {
        if (loginError != null && login.length >= 4) {
            delay(420)
            shakeController.shake()
            haptics.error()
        }
    }

    fun submit() {
        submitted = true
        if (loginError != null || passwordError != null) {
            scope.launch { shakeController.shake() }
            haptics.error()
        } else {
            haptics.tap()
            onLogin(login.trim(), password)
        }
    }

    MeshGradientBackground(scrim = 0.08f) {
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .statusBarsPadding()
                .navigationBarsPadding()
                .imePadding()
                .padding(horizontal = 22.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(34.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                LiveDot(color = palette.teal)
                Spacer(Modifier.width(7.dp))
                Text(
                    "AURA · CARE NETWORK",
                    color = palette.textSecondary,
                    fontFamily = Cairo,
                    fontSize = 9.sp,
                    letterSpacing = 2.2.sp,
                    fontWeight = FontWeight.Medium
                )
            }
            Spacer(Modifier.height(26.dp))
            com.medical.clinic.aura.components.AuraLogoMark(size = 86)
            Spacer(Modifier.height(14.dp))

            GradientHeading(
                text = "أهلاً بعودتك",
                style = androidx.compose.material3.MaterialTheme.typography.displayMedium,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(6.dp))
            Text(
                "ادخل إلى عالمك الصحي — كل شيء يبدأ بنبضة.",
                color = palette.textSecondary,
                fontFamily = Cairo,
                fontSize = 12.5.sp,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(30.dp))

            Column(Modifier.shake(shakeController)) {
                GlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(20.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AuraIcon(AuraGlyph.Shield, null, size = 16.dp, tint = palette.teal)
                        Spacer(Modifier.width(7.dp))
                        Text(
                            "دخول آمن ومشفّر",
                            color = palette.teal,
                            fontFamily = Cairo,
                            fontSize = 10.5.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(Modifier.weight(1f))
                        Text(
                            "المريض",
                            color = palette.textMuted,
                            fontFamily = Cairo,
                            fontSize = 10.sp
                        )
                    }

                    Spacer(Modifier.height(20.dp))

                    AuraTextField(
                        value = login,
                        onValueChange = { login = it.trimStart() },
                        label = "رقم الهاتف أو البريد الإلكتروني",
                        error = loginError,
                        leading = AuraGlyph.Profile,
                        keyboardType = KeyboardType.Email,
                        imeAction = ImeAction.Next
                    )

                    Spacer(Modifier.height(8.dp))

                    AuraTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = "كلمة المرور",
                        error = passwordError,
                        leading = AuraGlyph.Lock,
                        secure = true,
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done
                    )

                    Spacer(Modifier.height(14.dp))

                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null
                            ) { rememberMe = !rememberMe }
                        ) {
                            Box(
                                Modifier
                                    .size(18.dp)
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(
                                        if (rememberMe) palette.teal else palette.canvasBorder
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                if (rememberMe) {
                                    AuraIcon(
                                        AuraGlyph.Check,
                                        null,
                                        size = 11.dp,
                                        tint = Color.White,
                                        stroke = 2.4f
                                    )
                                }
                            }
                            Spacer(Modifier.width(8.dp))
                            Text(
                                "تذكرني",
                                color = palette.textSecondary,
                                fontFamily = Cairo,
                                fontSize = 11.sp
                            )
                        }
                        Spacer(Modifier.weight(1f))
                        Text(
                            "نسيت كلمة المرور؟",
                            color = palette.teal,
                            fontFamily = Cairo,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier
                                .clip(CircleShape)
                                .clickable { onForgotPassword() }
                                .padding(horizontal = 6.dp, vertical = 4.dp)
                        )
                    }

                    AnimatedVisibility(
                        visible = serverError != null,
                        enter = fadeIn() + slideInVertically(initialOffsetY = { -it / 2 }),
                        exit = fadeOut()
                    ) {
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .padding(top = 14.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(palette.danger.copy(alpha = 0.12f))
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            AuraIcon(AuraGlyph.Close, null, size = 15.dp, tint = palette.danger, stroke = 2f)
                            Spacer(Modifier.width(8.dp))
                            Text(
                                serverError ?: "",
                                color = palette.danger,
                                fontFamily = Cairo,
                                fontSize = 11.sp
                            )
                        }
                    }

                    Spacer(Modifier.height(20.dp))

                    AuraPrimaryButton(
                        text = if (loading) "جارٍ فتح البوابة…" else "دخول إلى AURA",
                        onClick = { submit() },
                        loading = loading,
                        icon = AuraGlyph.Spark
                    )
                }
            }

            Spacer(Modifier.height(18.dp))

            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    Modifier
                        .height(1.dp)
                        .weight(1f)
                        .background(Brush.horizontalGradient(listOf(Color.Transparent, palette.canvasBorder)))
                )
                Text(
                    "أو",
                    color = palette.textMuted,
                    fontFamily = Cairo,
                    fontSize = 10.sp,
                    modifier = Modifier.padding(horizontal = 12.dp)
                )
                Box(
                    Modifier
                        .height(1.dp)
                        .weight(1f)
                        .background(Brush.horizontalGradient(listOf(palette.canvasBorder, Color.Transparent)))
                )
            }

            Spacer(Modifier.height(16.dp))

            AuraGhostButton(
                text = "تجربة سريعة كزائر",
                onClick = onGuest,
                modifier = Modifier.fillMaxWidth(),
                icon = AuraGlyph.Route
            )

            Spacer(Modifier.height(26.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "ليس لديك حساب؟",
                    color = palette.textSecondary,
                    fontFamily = Cairo,
                    fontSize = 11.5.sp
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    "أنشئ حسابك الآن",
                    color = palette.teal,
                    fontFamily = Cairo,
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(CircleShape)
                        .clickable { onOpenRegister() }
                        .padding(horizontal = 8.dp, vertical = 5.dp)
                )
            }

            Spacer(Modifier.height(18.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                AuraIcon(AuraGlyph.Lock, null, size = 11.dp, tint = palette.textMuted)
                Spacer(Modifier.width(5.dp))
                Text(
                    "بياناتك محمية بتشفير AES-256 · طبيبك AURA",
                    color = palette.textMuted,
                    fontFamily = Cairo,
                    fontSize = 9.sp
                )
            }

            Spacer(Modifier.height(26.dp))
        }
    }
}
