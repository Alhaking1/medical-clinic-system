package com.medical.clinic.aura.screens

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.medical.clinic.aura.components.AuraConfetti
import com.medical.clinic.aura.components.AuraGhostButton
import com.medical.clinic.aura.components.AuraGlyph
import com.medical.clinic.aura.components.AuraIcon
import com.medical.clinic.aura.components.AuraPrimaryButton
import com.medical.clinic.aura.components.GlassCard
import com.medical.clinic.aura.components.GlassIconButton
import com.medical.clinic.aura.components.GlassPill
import com.medical.clinic.aura.components.GradientHeading
import com.medical.clinic.aura.components.LiveDot
import com.medical.clinic.aura.components.MeshGradientBackground
import com.medical.clinic.aura.components.PulseAvatar
import com.medical.clinic.aura.components.SectionTitle
import com.medical.clinic.aura.components.rememberAuraHaptics
import com.medical.clinic.aura.data.AuraDoctor
import com.medical.clinic.aura.theme.Cairo
import com.medical.clinic.aura.theme.LocalAuraPalette
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun AuraDoctorProfileScreen(
    doctor: AuraDoctor,
    snackbarHostState: SnackbarHostState,
    onBack: () -> Unit
) {
    val palette = LocalAuraPalette.current
    val haptics = rememberAuraHaptics()
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    var showBooking by remember { mutableStateOf(false) }
    var confetti by remember { mutableIntStateOf(0) }
    var favorite by remember { mutableStateOf(false) }
    val scroll = if (listState.firstVisibleItemIndex == 0) listState.firstVisibleItemScrollOffset else 520

    Box(Modifier.fillMaxSize()) {
        MeshGradientBackground(scrim = 0.05f) {
            LazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 140.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height(330.dp)
                            .graphicsLayer {
                                translationY = scroll * 0.45f
                                scaleX = 1f + scroll / 3200f
                                scaleY = 1f + scroll / 3200f
                            }
                    ) {
                        Canvas(Modifier.fillMaxSize()) {
                            drawRect(Brush.verticalGradient(doctor.gradient))
                            drawCircle(
                                Brush.radialGradient(
                                    listOf(Color.White.copy(alpha = 0.28f), Color.Transparent)
                                ),
                                radius = size.maxDimension * 0.55f,
                                center = Offset(size.width * 0.78f, size.height * 0.20f)
                            )
                            repeat(7) { i ->
                                drawCircle(
                                    color = Color.White.copy(alpha = 0.055f),
                                    radius = size.minDimension * (0.16f + i * 0.10f),
                                    center = Offset(size.width * 0.5f, size.height * 0.55f),
                                    style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1.dp.toPx())
                                )
                            }
                            drawRect(
                                Brush.verticalGradient(
                                    listOf(Color.Transparent, Color.Transparent, Color(0xE6070A12))
                                )
                            )
                        }
                        Column(
                            Modifier
                                .align(Alignment.BottomCenter)
                                .padding(bottom = 20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            PulseAvatar(size = 96, ringColor = Color.White) {
                                Box(
                                    Modifier
                                        .fillMaxSize()
                                        .background(
                                            Brush.linearGradient(
                                                listOf(Color.White.copy(alpha = 0.9f), doctor.gradient.last())
                                            )
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        doctor.initial,
                                        color = Color(0xFF071018),
                                        fontFamily = Cairo,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 36.sp
                                    )
                                }
                            }
                            Spacer(Modifier.height(10.dp))
                            GradientHeading(
                                text = doctor.name,
                                style = androidx.compose.material3.MaterialTheme.typography.headlineLarge,
                                colors = listOf(Color.White, Color.White, palette.teal)
                            )
                            Spacer(Modifier.height(3.dp))
                            Text(
                                "${doctor.specialty} · ${doctor.city}",
                                color = Color.White.copy(alpha = 0.82f),
                                fontFamily = Cairo,
                                fontSize = 11.5.sp
                            )
                            Spacer(Modifier.height(6.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                LiveDot(color = palette.success)
                                Spacer(Modifier.width(5.dp))
                                Text(
                                    if (doctor.isOnline) "متاح الآن · أقرب موعد ${doctor.nextSlot}" else "يحجز مسبقاً · ${doctor.nextSlot}",
                                    color = Color.White.copy(alpha = 0.78f),
                                    fontFamily = Cairo,
                                    fontSize = 9.5.sp
                                )
                            }
                        }
                    }
                }

                item {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        ProfileStat("${doctor.rating}", "التقييم", palette.gold, Modifier.weight(1f))
                        ProfileStat("${doctor.experience}+", "سنة خبرة", palette.teal, Modifier.weight(1f))
                        ProfileStat("${doctor.reviews}", "مراجعة", palette.violet, Modifier.weight(1f))
                        ProfileStat("${doctor.fee}", "ر.ي", palette.success, Modifier.weight(1f))
                    }
                }

                item {
                    GlassCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp),
                        contentPadding = PaddingValues(18.dp)
                    ) {
                        SectionTitle(title = "نبذة عن الطبيب")
                        Spacer(Modifier.height(10.dp))
                        Text(
                            doctor.bio,
                            color = palette.textSecondary,
                            fontFamily = Cairo,
                            fontSize = 11.5.sp,
                            lineHeight = 21.sp
                        )
                        Spacer(Modifier.height(14.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                            GlassPill(color = palette.teal) {
                                Text(doctor.specialty, color = palette.teal, fontFamily = Cairo, fontSize = 9.sp)
                            }
                            GlassPill(color = palette.violet) {
                                Text("استشارة ${doctor.fee} ر.ي", color = palette.violet, fontFamily = Cairo, fontSize = 9.sp)
                            }
                        }
                    }
                }

                item {
                    GlassCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp),
                        glowColor = palette.violet,
                        contentPadding = PaddingValues(18.dp)
                    ) {
                        SectionTitle(title = "العيادة والوصول")
                        Spacer(Modifier.height(12.dp))
                        ClinicRow(AuraGlyph.Location, doctor.clinic, "${doctor.city} · شارع الستين", palette.teal)
                        Spacer(Modifier.height(10.dp))
                        ClinicRow(AuraGlyph.Clock, "ساعات العمل", "السبت — الخميس · ٤:٠٠ م — ١٠:٠٠ م", palette.violet)
                        Spacer(Modifier.height(10.dp))
                        ClinicRow(AuraGlyph.Phone, "تأكيد الحجز", "٧٧٠ ١٢٣ ٤٥٦", palette.gold)
                    }
                }

                item {
                    Column(Modifier.padding(horizontal = 20.dp)) {
                        SectionTitle(title = "أقرب المواعيد المتاحة", action = "عرض الكل")
                        Spacer(Modifier.height(10.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                            items(listOf("٤:٣٠ م", "٥:٠٠ م", "٥:٣٠ م", "٦:١٥ م", "٧:٠٠ م", "٨:٣٠ م")) { slot ->
                                Box(
                                    Modifier
                                        .clip(RoundedCornerShape(14.dp))
                                        .background(
                                            if (slot == "٤:٣٠ م") {
                                                Brush.horizontalGradient(listOf(palette.teal, palette.violet))
                                            } else {
                                                Brush.horizontalGradient(
                                                    listOf(Color.White.copy(alpha = 0.08f), Color.White.copy(alpha = 0.03f))
                                                )
                                            }
                                        )
                                        .border(
                                            1.dp,
                                            if (slot == "٤:٣٠ م") Color.Transparent else Color.White.copy(alpha = 0.12f),
                                            RoundedCornerShape(14.dp)
                                        )
                                        .clickable { showBooking = true }
                                        .padding(horizontal = 16.dp, vertical = 11.dp)
                                ) {
                                    Text(
                                        slot,
                                        color = if (slot == "٤:٣٠ م") Color(0xFF04120F) else palette.textSecondary,
                                        fontFamily = Cairo,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }

                item {
                    GlassCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp),
                        contentPadding = PaddingValues(18.dp)
                    ) {
                        SectionTitle(title = "قالوا عن التجربة")
                        Spacer(Modifier.height(12.dp))
                        ReviewRow(
                            "أ. محمد",
                            "شرح كل تفصيلة بهدوء، والموعد بدأ في وقته بالضبط. تجربة مختلفة.",
                            5
                        )
                        Spacer(Modifier.height(12.dp))
                        ReviewRow(
                            "أ. ريم",
                            "العيادة هادئة والتطبيق ذكرني بكل خطوة. حسّيت إن صحتي بين يديّ أمينين.",
                            5
                        )
                    }
                }
            }

            Row(
                Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                GlassIconButton(
                    glyph = AuraGlyph.ChevronStart,
                    contentDescription = "رجوع",
                    onClick = onBack,
                    tint = Color.White
                )
                Spacer(Modifier.weight(1f))
                GlassIconButton(
                    glyph = AuraGlyph.Heart,
                    contentDescription = "المفضلة",
                    onClick = {
                        favorite = !favorite
                        haptics.like()
                    },
                    tint = if (favorite) palette.gold else Color.White
                )
                Spacer(Modifier.width(8.dp))
                GlassIconButton(
                    glyph = AuraGlyph.Send,
                    contentDescription = "مشاركة",
                    onClick = {
                        scope.launch {
                            snackbarHostState.showSnackbar("تم تجهيز بطاقة الطبيب للمشاركة")
                        }
                    },
                    tint = Color.White
                )
            }
        }

        Box(
            Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Transparent, Color(0xEE070A12), Color(0xFF070A12))
                    )
                )
                .navigationBarsPadding()
                .padding(horizontal = 20.dp, vertical = 12.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text(
                        "${doctor.fee} ر.ي",
                        color = palette.teal,
                        fontFamily = Cairo,
                        fontWeight = FontWeight.Black,
                        fontSize = 20.sp
                    )
                    Text(
                        "تشمل الاستشارة والتقرير",
                        color = palette.textMuted,
                        fontFamily = Cairo,
                        fontSize = 9.sp
                    )
                }
                Spacer(Modifier.weight(1f))
                AuraPrimaryButton(
                    text = "احجز الآن",
                    onClick = { showBooking = true },
                    modifier = Modifier.width(184.dp),
                    icon = AuraGlyph.Calendar
                )
            }
        }

        AuraConfetti(trigger = confetti, modifier = Modifier.fillMaxSize())

        if (showBooking) {
            BookingDialog(
                doctor = doctor,
                onDismiss = { showBooking = false },
                onConfirm = { day, time ->
                    showBooking = false
                    confetti++
                    haptics.success()
                    scope.launch {
                        snackbarHostState.showSnackbar("تم تأكيد حجزك مع ${doctor.name} · $day $time")
                    }
                }
            )
        }
    }
}

@Composable
private fun ProfileStat(value: String, label: String, color: Color, modifier: Modifier = Modifier) {
    val palette = LocalAuraPalette.current
    Column(
        modifier
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White.copy(alpha = 0.05f))
            .border(1.dp, Color.White.copy(alpha = 0.10f), RoundedCornerShape(16.dp))
            .padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(value, color = color, fontFamily = Cairo, fontWeight = FontWeight.Black, fontSize = 16.sp)
        Spacer(Modifier.height(2.dp))
        Text(label, color = palette.textMuted, fontFamily = Cairo, fontSize = 8.5.sp)
    }
}

@Composable
private fun ClinicRow(glyph: AuraGlyph, title: String, subtitle: String, color: Color) {
    val palette = LocalAuraPalette.current
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(color.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center
        ) {
            AuraIcon(glyph, null, size = 16.dp, tint = color)
        }
        Spacer(Modifier.width(10.dp))
        Column {
            Text(title, color = palette.textPrimary, fontFamily = Cairo, fontWeight = FontWeight.SemiBold, fontSize = 11.5.sp)
            Text(subtitle, color = palette.textSecondary, fontFamily = Cairo, fontSize = 9.5.sp)
        }
    }
}

@Composable
private fun ReviewRow(name: String, body: String, stars: Int) {
    val palette = LocalAuraPalette.current
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color.White.copy(alpha = 0.035f))
            .padding(12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(28.dp)
                    .clip(CircleShape)
                    .background(Brush.linearGradient(listOf(palette.purple, palette.teal))),
                contentAlignment = Alignment.Center
            ) {
                Text(name.takeLast(1), color = Color.White, fontFamily = Cairo, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.width(8.dp))
            Text(name, color = palette.textPrimary, fontFamily = Cairo, fontSize = 10.5.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.weight(1f))
            repeat(stars) {
                AuraIcon(AuraGlyph.Star, null, size = 10.dp, tint = palette.gold)
            }
        }
        Spacer(Modifier.height(7.dp))
        Text(body, color = palette.textSecondary, fontFamily = Cairo, fontSize = 10.5.sp, lineHeight = 18.sp)
    }
}

@Composable
private fun BookingDialog(
    doctor: AuraDoctor,
    onDismiss: () -> Unit,
    onConfirm: (String, String) -> Unit
) {
    val palette = LocalAuraPalette.current
    val days = listOf("اليوم", "غداً", "الاثنين", "الثلاثاء")
    val times = listOf("٤:٣٠ م", "٥:٠٠ م", "٥:٣٠ م", "٦:١٥ م", "٧:٠٠ م", "٨:٣٠ م")
    var day by remember { mutableStateOf(days.first()) }
    var time by remember { mutableStateOf(times.first()) }

    Dialog(onDismissRequest = onDismiss) {
        GlassCard(
            modifier = Modifier.fillMaxWidth(),
            glowColor = palette.teal,
            contentPadding = PaddingValues(22.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(42.dp)
                        .clip(CircleShape)
                        .background(Brush.linearGradient(doctor.gradient)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(doctor.initial, color = Color.White, fontFamily = Cairo, fontWeight = FontWeight.Black, fontSize = 17.sp)
                }
                Spacer(Modifier.width(11.dp))
                Column {
                    Text("تأكيد الحجز", color = palette.textPrimary, fontFamily = Cairo, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Text(doctor.name, color = palette.textSecondary, fontFamily = Cairo, fontSize = 10.sp)
                }
            }
            Spacer(Modifier.height(18.dp))
            Text("اختر اليوم", color = palette.textSecondary, fontFamily = Cairo, fontSize = 10.sp)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                days.forEach { item ->
                    val active = item == day
                    Box(
                        Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                if (active) Brush.horizontalGradient(listOf(palette.teal, palette.violet))
                                else Brush.horizontalGradient(listOf(Color.White.copy(alpha = 0.07f), Color.White.copy(alpha = 0.03f)))
                            )
                            .clickable { day = item }
                            .padding(vertical = 9.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            item,
                            color = if (active) Color(0xFF04120F) else palette.textSecondary,
                            fontFamily = Cairo,
                            fontSize = 9.5.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
            Spacer(Modifier.height(16.dp))
            Text("اختر الوقت", color = palette.textSecondary, fontFamily = Cairo, fontSize = 10.sp)
            Spacer(Modifier.height(8.dp))
            Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                times.chunked(3).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        row.forEach { item ->
                            val active = item == time
                            Box(
                                Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(
                                        if (active) palette.teal.copy(alpha = 0.22f)
                                        else Color.White.copy(alpha = 0.04f)
                                    )
                                    .border(
                                        1.dp,
                                        if (active) palette.teal else Color.White.copy(alpha = 0.10f),
                                        RoundedCornerShape(12.dp)
                                    )
                                    .clickable { time = item }
                                    .padding(vertical = 10.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    item,
                                    color = if (active) palette.teal else palette.textSecondary,
                                    fontFamily = Cairo,
                                    fontSize = 10.5.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(18.dp))
            AuraPrimaryButton(
                text = "تأكيد الموعد · ${doctor.fee} ر.ي",
                onClick = { onConfirm(day, time) },
                icon = AuraGlyph.Check
            )
            Spacer(Modifier.height(8.dp))
            AuraGhostButton(text = "إلغاء", onClick = onDismiss, modifier = Modifier.fillMaxWidth())
        }
    }
}
