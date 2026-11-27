package com.medical.clinic.aura.screens

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.medical.clinic.aura.components.AuraEmptyState
import com.medical.clinic.aura.components.AuraGhostButton
import com.medical.clinic.aura.components.AuraGlyph
import com.medical.clinic.aura.components.AuraIcon
import com.medical.clinic.aura.components.AuraPrimaryButton
import com.medical.clinic.aura.components.GlassCard
import com.medical.clinic.aura.components.GlassPill
import com.medical.clinic.aura.components.GradientHeading
import com.medical.clinic.aura.components.LiveDot
import com.medical.clinic.aura.components.MeshGradientBackground
import com.medical.clinic.aura.components.PulseAvatar
import com.medical.clinic.aura.components.SectionTitle
import com.medical.clinic.aura.components.StatusPill
import com.medical.clinic.aura.components.rememberAuraHaptics
import com.medical.clinic.aura.data.AuraAppointment
import com.medical.clinic.aura.data.AuraDemoData
import com.medical.clinic.aura.theme.Cairo
import com.medical.clinic.aura.theme.LocalAuraPalette
import kotlinx.coroutines.launch
import kotlin.random.Random

// ═══════════════════════════════════════════════════════════════
// APPOINTMENTS
// ═══════════════════════════════════════════════════════════════

@Composable
fun AuraAppointmentsScreen(
    userName: String?,
    snackbarHostState: SnackbarHostState,
    onExploreDoctors: () -> Unit
) {
    val palette = LocalAuraPalette.current
    val haptics = rememberAuraHaptics()
    val scope = rememberCoroutineScope()
    var tab by remember { mutableIntStateOf(0) }
    var attended by remember { mutableStateOf(setOf<Int>()) }
    var ticket by remember { mutableStateOf<AuraAppointment?>(null) }
    val items = if (tab == 0) AuraDemoData.appointments else AuraDemoData.pastAppointments
    val next = AuraDemoData.appointments.minByOrNull { it.minutesFromNow }

    Box(Modifier.fillMaxSize()) {
        MeshGradientBackground(scrim = 0.05f) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 140.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    Column(
                        Modifier
                            .statusBarsPadding()
                            .padding(horizontal = 20.dp)
                            .padding(top = 14.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            LiveDot(palette.teal)
                            Spacer(Modifier.width(6.dp))
                            Text(
                                "AURA · SCHEDULE",
                                color = palette.textSecondary,
                                fontFamily = Cairo,
                                fontSize = 9.sp,
                                letterSpacing = 1.8.sp
                            )
                        }
                        Spacer(Modifier.height(7.dp))
                        GradientHeading(
                            text = "مواعيدي",
                            style = androidx.compose.material3.MaterialTheme.typography.displaySmall
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "كل موعد خطوة نحو نسخة أكثر صحة منك.",
                            color = palette.textSecondary,
                            fontFamily = Cairo,
                            fontSize = 11.5.sp
                        )
                        Spacer(Modifier.height(18.dp))
                        TabSwitcher(
                            tabs = listOf("القادمة", "السابقة"),
                            selected = tab,
                            onSelect = {
                                haptics.tap()
                                tab = it
                            }
                        )
                    }
                }

                if (tab == 0 && next != null) {
                    item {
                        NextAppointmentPulse(
                            appointment = next,
                            modifier = Modifier.padding(horizontal = 20.dp)
                        )
                    }
                }

                if (items.isEmpty()) {
                    item {
                        AuraEmptyState(
                            title = "لا توجد حجوزات حالياً",
                            message = "استكشف أطباءنا وابدأ رحلتك الصحية — نبضك يستحق رعاية استثنائية.",
                            actionText = "استكشف أطباءنا",
                            onAction = onExploreDoctors,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp, vertical = 20.dp)
                        )
                    }
                } else {
                    items(items, key = { it.id }) { appointment ->
                        AppointmentGlassCard(
                            appointment = appointment,
                            attended = attended.contains(appointment.id),
                            modifier = Modifier.padding(horizontal = 20.dp),
                            onAttend = {
                                attended = attended + appointment.id
                                haptics.success()
                                scope.launch {
                                    snackbarHostState.showSnackbar("تم تسجيل حضورك — مكانك في الطابور محفوظ ✨")
                                }
                            },
                            onTicket = { ticket = appointment },
                            onRebook = onExploreDoctors
                        )
                    }
                }

                item {
                    Spacer(Modifier.height(4.dp))
                    GlassCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp),
                        glowColor = palette.violet,
                        contentPadding = PaddingValues(16.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            AuraIcon(AuraGlyph.Bell, null, size = 18.dp, tint = palette.violet)
                            Spacer(Modifier.width(9.dp))
                            Column(Modifier.weight(1f)) {
                                Text(
                                    "تنبيهات ذكية",
                                    color = palette.textPrimary,
                                    fontFamily = Cairo,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp
                                )
                                Text(
                                    "سنذكرك قبل موعدك بساعتين مع اتجاه الوصول.",
                                    color = palette.textSecondary,
                                    fontFamily = Cairo,
                                    fontSize = 9.5.sp
                                )
                            }
                            Box(
                                Modifier
                                    .clip(CircleShape)
                                    .background(palette.violet.copy(alpha = 0.16f))
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text("مفعّل", color = palette.violet, fontFamily = Cairo, fontSize = 9.sp)
                            }
                        }
                    }
                }
            }
        }

        ticket?.let {
            AppointmentTicketDialog(appointment = it, onDismiss = { ticket = null })
        }
    }
}

@Composable
private fun TabSwitcher(tabs: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    val palette = LocalAuraPalette.current
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Color(0xFFF1F5F9))
            .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(18.dp))
            .padding(4.dp)
    ) {
        tabs.forEachIndexed { index, title ->
            val active = index == selected
            Box(
                Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(
                        if (active) palette.teal
                        else Color.Transparent
                    )
                    .clickable { onSelect(index) }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    title,
                    color = if (active) Color.White else palette.textSecondary,
                    fontFamily = Cairo,
                    fontSize = 11.sp,
                    fontWeight = if (active) FontWeight.Bold else FontWeight.Medium
                )
            }
        }
    }
}

@Composable
private fun NextAppointmentPulse(appointment: AuraAppointment, modifier: Modifier = Modifier) {
    val palette = LocalAuraPalette.current
    val target = (1f - (appointment.minutesFromNow / 240f)).coerceIn(0.08f, 1f)
    val progress by animateFloatAsState(
        targetValue = target,
        animationSpec = tween(1600, easing = FastOutSlowInEasing),
        label = "appt-progress"
    )
    GlassCard(
        modifier = modifier.fillMaxWidth(),
        glowColor = palette.teal,
        contentPadding = PaddingValues(18.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            AuraIcon(AuraGlyph.Clock, null, size = 16.dp, tint = palette.teal)
            Spacer(Modifier.width(7.dp))
            Text(
                "النبض القادم",
                color = palette.teal,
                fontFamily = Cairo,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.8.sp
            )
            Spacer(Modifier.weight(1f))
            Text(
                "بعد ${appointment.minutesFromNow} دقيقة",
                color = palette.textSecondary,
                fontFamily = Cairo,
                fontSize = 9.5.sp
            )
        }
        Spacer(Modifier.height(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            PulseAvatar(size = 52) {
                Box(
                    Modifier
                        .fillMaxSize()
                        .background(Brush.linearGradient(listOf(palette.tealDeep, palette.purple))),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        appointment.doctorName.replace("د. ", "").take(1),
                        color = Color.White,
                        fontFamily = Cairo,
                        fontWeight = FontWeight.Black,
                        fontSize = 19.sp
                    )
                }
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    appointment.doctorName,
                    color = palette.textPrimary,
                    fontFamily = Cairo,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.5.sp
                )
                Text(
                    "${appointment.specialty} · ${appointment.time}",
                    color = palette.textSecondary,
                    fontFamily = Cairo,
                    fontSize = 10.sp
                )
                Spacer(Modifier.height(7.dp))
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(4.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.07f))
                ) {
                    Box(
                        Modifier
                            .fillMaxWidth(progress)
                            .height(4.dp)
                            .clip(CircleShape)
                            .background(Brush.horizontalGradient(listOf(palette.teal, palette.violet)))
                    )
                }
            }
        }
    }
}

@Composable
private fun AppointmentGlassCard(
    appointment: AuraAppointment,
    attended: Boolean,
    modifier: Modifier = Modifier,
    onAttend: () -> Unit,
    onTicket: () -> Unit,
    onRebook: () -> Unit
) {
    val palette = LocalAuraPalette.current
    val statusText = if (attended) "وصلت" else appointment.status
    val statusColor = if (attended) palette.success else appointment.statusColor
    GlassCard(
        modifier = modifier.fillMaxWidth(),
        glowColor = statusColor,
        contentPadding = PaddingValues(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(46.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(appointment.statusColor.copy(alpha = 0.13f))
                    .border(1.dp, appointment.statusColor.copy(alpha = 0.25f), RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        appointment.dayLabel,
                        color = statusColor,
                        fontFamily = Cairo,
                        fontWeight = FontWeight.Bold,
                        fontSize = 9.sp
                    )
                    Text(
                        appointment.time,
                        color = palette.textPrimary,
                        fontFamily = Cairo,
                        fontWeight = FontWeight.Black,
                        fontSize = 10.5.sp
                    )
                }
            }
            Spacer(Modifier.width(11.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    appointment.doctorName,
                    color = palette.textPrimary,
                    fontFamily = Cairo,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    "${appointment.specialty} · ${appointment.clinic}",
                    color = palette.textSecondary,
                    fontFamily = Cairo,
                    fontSize = 9.5.sp
                )
            }
            StatusPill(statusText, statusColor)
        }

        Spacer(Modifier.height(12.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            InfoChip(AuraGlyph.Calendar, appointment.dateLabel)
            Spacer(Modifier.width(7.dp))
            InfoChip(AuraGlyph.Users, "رقم الطابور ${appointment.queueNumber}")
            Spacer(Modifier.width(7.dp))
            InfoChip(AuraGlyph.Spark, "${appointment.fee} ر.ي")
        }

        if (appointment.upcoming) {
            Spacer(Modifier.height(13.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (!attended) {
                    AuraPrimaryButton(
                        text = "أنا في الطريق",
                        onClick = onAttend,
                        modifier = Modifier.weight(1f),
                        icon = AuraGlyph.Location
                    )
                } else {
                    AuraGhostButton(
                        text = "تم تسجيل الحضور",
                        onClick = {},
                        modifier = Modifier.weight(1f),
                        icon = AuraGlyph.Check,
                        color = palette.success
                    )
                }
                AuraGhostButton(
                    text = "التذكرة",
                    onClick = onTicket,
                    icon = AuraGlyph.More
                )
            }
        } else {
            Spacer(Modifier.height(13.dp))
            AuraGhostButton(
                text = "إعادة الحجز مع نفس الطبيب",
                onClick = onRebook,
                modifier = Modifier.fillMaxWidth(),
                icon = AuraGlyph.Calendar,
                color = palette.violet
            )
        }
    }
}

@Composable
private fun InfoChip(glyph: AuraGlyph, text: String) {
    val palette = LocalAuraPalette.current
    Row(verticalAlignment = Alignment.CenterVertically) {
        AuraIcon(glyph, null, size = 11.dp, tint = palette.textMuted)
        Spacer(Modifier.width(4.dp))
        Text(text, color = palette.textSecondary, fontFamily = Cairo, fontSize = 9.sp)
    }
}

@Composable
private fun AppointmentTicketDialog(appointment: AuraAppointment, onDismiss: () -> Unit) {
    val palette = LocalAuraPalette.current
    Dialog(onDismissRequest = onDismiss) {
        GlassCard(
            modifier = Modifier.fillMaxWidth(),
            glowColor = palette.teal,
            contentPadding = PaddingValues(22.dp)
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                GlassPill(color = palette.teal) {
                    Text("AURA PASS", color = palette.teal, fontFamily = Cairo, fontSize = 8.5.sp, letterSpacing = 1.5.sp)
                }
                Spacer(Modifier.height(14.dp))
                Text(
                    appointment.doctorName,
                    color = palette.textPrimary,
                    fontFamily = Cairo,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                Text(
                    "${appointment.dateLabel} · ${appointment.time}",
                    color = palette.textSecondary,
                    fontFamily = Cairo,
                    fontSize = 10.5.sp
                )
                Spacer(Modifier.height(18.dp))
                Box(
                    Modifier
                        .size(190.dp)
                        .clip(RoundedCornerShape(18.dp))
                        .background(Color.White)
                        .padding(14.dp)
                ) {
                    QrArt(seed = appointment.id)
                }
                Spacer(Modifier.height(14.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                    TicketMeta("الطابور", "${appointment.queueNumber}")
                    TicketMeta("الرمز", "A-${appointment.id}")
                    TicketMeta("الحالة", appointment.status)
                }
                Spacer(Modifier.height(18.dp))
                AuraGhostButton(
                    text = "إغلاق التذكرة",
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

@Composable
private fun TicketMeta(label: String, value: String) {
    val palette = LocalAuraPalette.current
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, color = palette.textMuted, fontFamily = Cairo, fontSize = 8.5.sp)
        Text(value, color = palette.textPrimary, fontFamily = Cairo, fontSize = 11.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun QrArt(seed: Int) {
    val random = remember(seed) { Random(seed) }
    val cells = remember(seed) { List(21 * 21) { random.nextFloat() > 0.52f } }
    Canvas(Modifier.fillMaxSize()) {
        val n = 21
        val cell = size.minDimension / n
        for (row in 0 until n) {
            for (col in 0 until n) {
                val finder = (row < 7 && col < 7) || (row < 7 && col >= n - 7) || (row >= n - 7 && col < 7)
                if (finder) continue
                if (cells[row * n + col]) {
                    drawRect(
                        color = Color(0xFF0B0C10),
                        topLeft = Offset(col * cell, row * cell),
                        size = Size(cell * 0.88f, cell * 0.88f)
                    )
                }
            }
        }
        fun finder(x: Int, y: Int) {
            drawRect(Color(0xFF0B0C10), Offset(x * cell, y * cell), Size(7 * cell, 7 * cell))
            drawRect(Color.White, Offset((x + 1) * cell, (y + 1) * cell), Size(5 * cell, 5 * cell))
            drawRect(Color(0xFF0B0C10), Offset((x + 2) * cell, (y + 2) * cell), Size(3 * cell, 3 * cell))
        }
        finder(0, 0); finder(n - 7, 0); finder(0, n - 7)
    }
}

// ═══════════════════════════════════════════════════════════════
// MEDICAL RECORDS
// ═══════════════════════════════════════════════════════════════

@Composable
fun AuraRecordsScreen(
    snackbarHostState: SnackbarHostState,
    onExploreDoctors: () -> Unit
) {
    val palette = LocalAuraPalette.current
    val haptics = rememberAuraHaptics()
    val scope = rememberCoroutineScope()

    data class RecordItem(
        val title: String,
        val doctor: String,
        val date: String,
        val type: String,
        val glyph: AuraGlyph,
        val color: Color
    )

    val records = listOf(
        RecordItem("روشتة علاجية", "د. خالد المقطري", "١٢ أكتوبر ٢٠٢٦", "روشتة", AuraGlyph.Pill, palette.teal),
        RecordItem("تحليل صورة دم كاملة", "مختبر AURA", "٣ أكتوبر ٢٠٢٦", "تحليل", AuraGlyph.Spark, palette.violet),
        RecordItem("تقرير تخطيط القلب", "د. خالد المقطري", "٢٨ سبتمبر ٢٠٢٦", "تقرير", AuraGlyph.Doctor, palette.gold),
        RecordItem("أشعة صدر", "مستشفى الأمل", "٩ أغسطس ٢٠٢٦", "أشعة", AuraGlyph.Records, palette.success)
    )

    MeshGradientBackground(scrim = 0.05f) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 140.dp),
            verticalArrangement = Arrangement.spacedBy(15.dp)
        ) {
            item {
                Column(
                    Modifier
                        .statusBarsPadding()
                        .padding(horizontal = 20.dp)
                        .padding(top = 14.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        LiveDot(palette.teal)
                        Spacer(Modifier.width(6.dp))
                        Text(
                            "AURA · HEALTH VAULT",
                            color = palette.textSecondary,
                            fontFamily = Cairo,
                            fontSize = 9.sp,
                            letterSpacing = 1.8.sp
                        )
                    }
                    Spacer(Modifier.height(7.dp))
                    GradientHeading(
                        text = "سجلي الطبي",
                        style = androidx.compose.material3.MaterialTheme.typography.displaySmall
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "تاريخك الصحي، مشفّراً ومرتباً في مكان واحد.",
                        color = palette.textSecondary,
                        fontFamily = Cairo,
                        fontSize = 11.5.sp
                    )
                }
            }

            item {
                VitalsCard(modifier = Modifier.padding(horizontal = 20.dp))
            }

            item {
                SectionTitle(
                    title = "أرشيف المستندات",
                    action = "تصدير",
                    onAction = {
                        haptics.tap()
                        scope.launch { snackbarHostState.showSnackbar("تم تجهيز ملف السجل الطبي للتصدير") }
                    },
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
            }

            if (records.isEmpty()) {
                item {
                    AuraEmptyState(
                        title = "سجلك فارغ… للآن",
                        message = "بعد أول زيارة، ستجد هنا الروشتات والتحاليل والتقارير — منظمة تلقائياً.",
                        actionText = "استكشف أطباءنا",
                        onAction = onExploreDoctors,
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp)
                    )
                }
            } else {
                items(records) { record ->
                    GlassCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp),
                        onClick = {
                            haptics.tap()
                            scope.launch { snackbarHostState.showSnackbar("جارٍ فتح ${record.title}…") }
                        },
                        contentPadding = PaddingValues(15.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier
                                    .size(42.dp)
                                    .clip(RoundedCornerShape(13.dp))
                                    .background(record.color.copy(alpha = 0.13f))
                                    .border(1.dp, record.color.copy(alpha = 0.22f), RoundedCornerShape(13.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                AuraIcon(record.glyph, null, size = 19.dp, tint = record.color)
                            }
                            Spacer(Modifier.width(11.dp))
                            Column(Modifier.weight(1f)) {
                                Text(
                                    record.title,
                                    color = palette.textPrimary,
                                    fontFamily = Cairo,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 12.5.sp
                                )
                                Spacer(Modifier.height(2.dp))
                                Text(
                                    "${record.doctor} · ${record.date}",
                                    color = palette.textSecondary,
                                    fontFamily = Cairo,
                                    fontSize = 9.5.sp
                                )
                            }
                            GlassPill(color = record.color) {
                                Text(record.type, color = record.color, fontFamily = Cairo, fontSize = 8.5.sp)
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
                    glowColor = palette.danger,
                    contentPadding = PaddingValues(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AuraIcon(AuraGlyph.Shield, null, size = 19.dp, tint = palette.danger)
                        Spacer(Modifier.width(9.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                "حساسية مسجلة",
                                color = palette.textPrimary,
                                fontFamily = Cairo,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                            Text(
                                "البنسلين · حبوب اللقاح — تُعرض لكل طبيب قبل الوصفة.",
                                color = palette.textSecondary,
                                fontFamily = Cairo,
                                fontSize = 9.5.sp
                            )
                        }
                        StatusPill("مهم", palette.danger)
                    }
                }
            }
        }
    }
}

@Composable
private fun VitalsCard(modifier: Modifier = Modifier) {
    val palette = LocalAuraPalette.current
    GlassCard(modifier = modifier.fillMaxWidth(), contentPadding = PaddingValues(18.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                "نبضك الآن",
                color = palette.textPrimary,
                fontFamily = Cairo,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
            Spacer(Modifier.weight(1f))
            GlassPill(color = palette.success) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    LiveDot(palette.success, Modifier.size(5.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("حي", color = palette.success, fontFamily = Cairo, fontSize = 8.5.sp)
                }
            }
        }
        Spacer(Modifier.height(16.dp))
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            VitalRing("٧٢", "نبض/دقيقة", 0.68f, palette.teal)
            VitalRing("١٢٠/٨٠", "ضغط الدم", 0.58f, palette.violet)
            VitalRing("٩٥", "سكر الدم", 0.48f, palette.gold)
        }
    }
}

@Composable
private fun VitalRing(value: String, label: String, fraction: Float, color: Color) {
    val palette = LocalAuraPalette.current
    val animated by animateFloatAsState(fraction, tween(1400, easing = FastOutSlowInEasing), label = "vital-$label")
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(82.dp), contentAlignment = Alignment.Center) {
            Canvas(Modifier.fillMaxSize()) {
                drawArc(
                    color = Color.White.copy(alpha = 0.08f),
                    startAngle = 135f,
                    sweepAngle = 270f,
                    useCenter = false,
                    style = Stroke(width = 6.dp.toPx(), cap = StrokeCap.Round)
                )
                drawArc(
                    brush = Brush.sweepGradient(listOf(color.copy(alpha = 0.4f), color, Color.White)),
                    startAngle = 135f,
                    sweepAngle = 270f * animated,
                    useCenter = false,
                    style = Stroke(width = 6.dp.toPx(), cap = StrokeCap.Round)
                )
            }
            Text(
                value,
                color = palette.textPrimary,
                fontFamily = Cairo,
                fontWeight = FontWeight.Black,
                fontSize = 14.sp
            )
        }
        Spacer(Modifier.height(5.dp))
        Text(label, color = palette.textMuted, fontFamily = Cairo, fontSize = 8.5.sp)
    }
}

// ═══════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════

@Composable
fun AuraProfileScreen(
    userName: String?,
    phone: String?,
    email: String?,
    snackbarHostState: SnackbarHostState,
    onLogout: () -> Unit
) {
    val palette = LocalAuraPalette.current
    val haptics = rememberAuraHaptics()
    val scope = rememberCoroutineScope()
    var confirmLogout by remember { mutableStateOf(false) }
    val name = userName?.takeIf { it.isNotBlank() } ?: "أحمد"
    val initial = name.trim().firstOrNull()?.toString() ?: "أ"

    fun toast(message: String) {
        haptics.tap()
        scope.launch { snackbarHostState.showSnackbar(message) }
    }

    MeshGradientBackground(scrim = 0.05f) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 140.dp),
            verticalArrangement = Arrangement.spacedBy(15.dp)
        ) {
            item {
                Column(
                    Modifier
                        .statusBarsPadding()
                        .padding(horizontal = 20.dp)
                        .padding(top = 14.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        LiveDot(palette.teal)
                        Spacer(Modifier.width(6.dp))
                        Text(
                            "AURA · MEMBER",
                            color = palette.textSecondary,
                            fontFamily = Cairo,
                            fontSize = 9.sp,
                            letterSpacing = 1.8.sp
                        )
                        Spacer(Modifier.weight(1f))
                        AuraIcon(AuraGlyph.Settings, "الإعدادات", size = 19.dp, tint = palette.textSecondary)
                    }
                    Spacer(Modifier.height(18.dp))
                    PulseAvatar(size = 88) {
                        Box(
                            Modifier
                                .fillMaxSize()
                                .background(Brush.linearGradient(listOf(palette.tealDeep, palette.purple, palette.violet))),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                initial,
                                color = Color.White,
                                fontFamily = Cairo,
                                fontWeight = FontWeight.Black,
                                fontSize = 32.sp
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    GradientHeading(
                        text = name,
                        style = androidx.compose.material3.MaterialTheme.typography.headlineLarge
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        phone ?: "+967 77X XXX XXXX",
                        color = palette.textSecondary,
                        fontFamily = Cairo,
                        fontSize = 10.5.sp
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        GlassPill(color = palette.gold) {
                            Text("AURA GOLD", color = palette.gold, fontFamily = Cairo, fontSize = 8.sp, letterSpacing = 1.sp)
                        }
                        GlassPill(color = palette.teal) {
                            Text("مريض موثّق", color = palette.teal, fontFamily = Cairo, fontSize = 8.sp)
                        }
                    }
                }
            }

            item {
                DigitalHealthCard(
                    name = name,
                    phone = phone,
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
            }

            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(9.dp)
                ) {
                    MiniStat("٣", "مواعيد", palette.teal, Modifier.weight(1f))
                    MiniStat("٤", "زيارات", palette.violet, Modifier.weight(1f))
                    MiniStat("٨٥٠", "نقاط AURA", palette.gold, Modifier.weight(1f))
                }
            }

            item {
                GlassCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    glowColor = palette.gold,
                    contentPadding = PaddingValues(18.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(13.dp))
                                .background(
                                    Brush.linearGradient(
                                        listOf(palette.gold.copy(alpha = 0.85f), palette.violet.copy(alpha = 0.6f))
                                    )
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            AuraIcon(AuraGlyph.Spark, null, size = 20.dp, tint = Color(0xFF1A1200))
                        }
                        Spacer(Modifier.width(11.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                "وصولك أسرع مع AURA Gold",
                                color = palette.textPrimary,
                                fontFamily = Cairo,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.5.sp
                            )
                            Text(
                                "تخطي الانتظار · تذكير ذكي · دعم مباشر",
                                color = palette.textSecondary,
                                fontFamily = Cairo,
                                fontSize = 9.5.sp
                            )
                        }
                        Box(
                            Modifier
                                .clip(CircleShape)
                                .background(palette.gold.copy(alpha = 0.16f))
                                .padding(horizontal = 11.dp, vertical = 6.dp)
                                .clickable { toast("تجربة AURA Gold مفعّلة لمدة ٣٠ يوماً") }
                        ) {
                            Text("جرّب", color = palette.gold, fontFamily = Cairo, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            item {
                SectionTitle(title = "حسابك", modifier = Modifier.padding(horizontal = 20.dp))
            }

            item {
                GlassCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    ProfileRow(AuraGlyph.Profile, "الملف الشخصي", "الاسم، الهوية، جهة الاتصال", palette.teal) {
                        toast("الملف الشخصي محمي ومكتمل")
                    }
                    DividerLine()
                    ProfileRow(AuraGlyph.Shield, "التأمين والمحفظة", "رصيدك ٠ ر.ي · لا يوجد تأمين مرتبط", palette.violet) {
                        toast("لا توجد مطالبات تأمين حالياً")
                    }
                    DividerLine()
                    ProfileRow(AuraGlyph.Bell, "الإشعارات", "التنبيهات الذكية مفعّلة", palette.gold) {
                        toast("الإشعارات الذكية مفعّلة")
                    }
                    DividerLine()
                    ProfileRow(AuraGlyph.Lock, "الأمان والبصمة", "تسجيل الدخول البيومتري", palette.success) {
                        toast("جهازك محمي — بصمة AURA مفعّلة")
                    }
                    DividerLine()
                    ProfileRow(AuraGlyph.Route, "اللغة والمنطقة", "العربية · صنعاء", palette.teal) {
                        toast("اللغة الحالية: العربية (RTL)")
                    }
                    DividerLine()
                    ProfileRow(AuraGlyph.Chat, "المساعدة والدعم", "فريق AURA · ٢٤/٧", palette.violet) {
                        toast("فريق AURA متاح لك على مدار الساعة")
                    }
                }
            }

            item {
                AuraGhostButton(
                    text = "تسجيل الخروج",
                    onClick = { confirmLogout = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    icon = AuraGlyph.Logout,
                    color = palette.danger
                )
            }

            item {
                Column(
                    Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "AURA v2.0 · طبيبك",
                        color = palette.textMuted,
                        fontFamily = Cairo,
                        fontSize = 8.5.sp
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        email ?: "صُنع بعناية في اليمن",
                        color = palette.textMuted,
                        fontFamily = Cairo,
                        fontSize = 8.sp
                    )
                }
            }
        }
    }

    if (confirmLogout) {
        Dialog(onDismissRequest = { confirmLogout = false }) {
            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                glowColor = palette.danger,
                contentPadding = PaddingValues(22.dp)
            ) {
                Text(
                    "هل تغادر AURA؟",
                    color = palette.textPrimary,
                    fontFamily = Cairo,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    "سنحفظ سجلك ومواعيدك بأمان. يمكنك العودة في أي وقت بنبضة واحدة.",
                    color = palette.textSecondary,
                    fontFamily = Cairo,
                    fontSize = 10.5.sp,
                    lineHeight = 18.sp
                )
                Spacer(Modifier.height(18.dp))
                AuraPrimaryButton(
                    text = "تسجيل الخروج",
                    onClick = { confirmLogout = false; onLogout() },
                    icon = AuraGlyph.Logout
                )
                Spacer(Modifier.height(8.dp))
                AuraGhostButton(
                    text = "البقاء مع AURA",
                    onClick = { confirmLogout = false },
                    modifier = Modifier.fillMaxWidth(),
                    color = palette.teal
                )
            }
        }
    }
}

@Composable
private fun MiniStat(value: String, label: String, color: Color, modifier: Modifier = Modifier) {
    val palette = LocalAuraPalette.current
    Column(
        modifier
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White)
            .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp))
            .padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(value, color = color, fontFamily = Cairo, fontWeight = FontWeight.Black, fontSize = 17.sp)
        Text(label, color = palette.textSecondary, fontFamily = Cairo, fontSize = 9.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun ProfileRow(
    glyph: AuraGlyph,
    title: String,
    subtitle: String,
    color: Color,
    onClick: () -> Unit
) {
    val palette = LocalAuraPalette.current
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 11.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier
                .size(34.dp)
                .clip(RoundedCornerShape(11.dp))
                .background(color.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center
        ) {
            AuraIcon(glyph, null, size = 16.dp, tint = color)
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(title, color = palette.textPrimary, fontFamily = Cairo, fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold)
            Text(subtitle, color = palette.textMuted, fontFamily = Cairo, fontSize = 9.sp)
        }
        AuraIcon(AuraGlyph.ChevronEnd, null, size = 14.dp, tint = palette.textMuted)
    }
}

@Composable
private fun DividerLine() {
    Box(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp)
            .height(1.dp)
            .background(Color(0xFFE2E8F0))
    )
}

@Composable
private fun DigitalHealthCard(name: String, phone: String?, modifier: Modifier = Modifier) {
    val palette = LocalAuraPalette.current
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(
                Brush.linearGradient(
                    listOf(
                        Color(0xFF0F766E),
                        Color(0xFF0D9488),
                        Color(0xFF047857)
                    )
                )
            )
            .border(
                1.dp,
                Brush.linearGradient(
                    listOf(
                        Color.White.copy(alpha = 0.35f),
                        Color.Transparent,
                        Color.White.copy(alpha = 0.15f)
                    )
                ),
                RoundedCornerShape(22.dp)
            )
            .padding(20.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(34.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color.White.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        AuraIcon(AuraGlyph.Shield, null, size = 18.dp, tint = Color.White)
                    }
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text(
                            "طبيبك · الهوية الطبية الرقمية",
                            color = Color.White,
                            fontFamily = Cairo,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                        Text(
                            "HEALTH ID CARD",
                            color = Color.White.copy(alpha = 0.75f),
                            fontFamily = Cairo,
                            fontSize = 8.5.sp,
                            letterSpacing = 1.sp
                        )
                    }
                }
                Box(
                    Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.White.copy(alpha = 0.2f))
                        .padding(horizontal = 9.dp, vertical = 4.dp)
                ) {
                    Text(
                        "فصيلة +O",
                        color = Color.White,
                        fontFamily = Cairo,
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.sp
                    )
                }
            }

            Spacer(Modifier.height(20.dp))

            Text(
                name,
                color = Color.White,
                fontFamily = Cairo,
                fontWeight = FontWeight.Black,
                fontSize = 18.sp
            )

            Spacer(Modifier.height(4.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    phone ?: "+967 77X XXX XXXX",
                    color = Color.White.copy(alpha = 0.85f),
                    fontFamily = Cairo,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 11.sp
                )
                Text(
                    "رقم الملف: #MED-8842",
                    color = Color.White.copy(alpha = 0.85f),
                    fontFamily = Cairo,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 10.sp
                )
            }
        }
    }
}
