package com.medical.clinic.aura.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.medical.clinic.aura.components.AuraGlyph
import com.medical.clinic.aura.components.AuraIcon
import com.medical.clinic.aura.components.GlassCard
import com.medical.clinic.aura.components.GlassIconButton
import com.medical.clinic.aura.components.GlassPill
import com.medical.clinic.aura.components.GradientHeading
import com.medical.clinic.aura.components.LiveDot
import com.medical.clinic.aura.components.MeshGradientBackground
import com.medical.clinic.aura.components.PulseAvatar
import com.medical.clinic.aura.components.rememberAuraHaptics
import com.medical.clinic.aura.data.AuraDemoData
import com.medical.clinic.aura.data.AuraDoctor
import com.medical.clinic.aura.theme.Cairo
import com.medical.clinic.aura.theme.LocalAuraPalette

@Composable
fun AuraAllDoctorsScreen(
    onBack: () -> Unit,
    onOpenDoctor: (AuraDoctor) -> Unit
) {
    val palette = LocalAuraPalette.current
    val haptics = rememberAuraHaptics()
    var favorites by remember { mutableIntStateOf(0) }

    MeshGradientBackground(scrim = 0.05f) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 120.dp),
            verticalArrangement = Arrangement.spacedBy(13.dp)
        ) {
            item {
                Column(Modifier.statusBarsPadding().padding(top = 12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        GlassIconButton(
                            glyph = AuraGlyph.ChevronStart,
                            contentDescription = "رجوع",
                            onClick = onBack
                        )
                        Spacer(Modifier.weight(1f))
                        GlassPill(color = palette.teal) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                LiveDot(palette.teal, Modifier.size(5.dp))
                                Spacer(Modifier.width(4.dp))
                                Text(
                                    "${AuraDemoData.doctors.size} طبيب متاح",
                                    color = palette.teal,
                                    fontFamily = Cairo,
                                    fontSize = 8.5.sp
                                )
                            }
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    GradientHeading(
                        text = "كل الأطباء",
                        style = androidx.compose.material3.MaterialTheme.typography.displaySmall
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "شبكة AURA الطبية — مختارة بعناية، متصلة بك.",
                        color = palette.textSecondary,
                        fontFamily = Cairo,
                        fontSize = 11.5.sp
                    )
                }
            }

            items(AuraDemoData.doctors, key = { it.id }) { doctor ->
                GlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    onClick = { onOpenDoctor(doctor) },
                    contentPadding = PaddingValues(14.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        PulseAvatar(size = 54, ringColor = doctor.gradient.first()) {
                            Box(
                                Modifier
                                    .fillMaxSize()
                                    .background(Brush.linearGradient(doctor.gradient)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    doctor.initial,
                                    color = Color.White,
                                    fontFamily = Cairo,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 20.sp
                                )
                            }
                        }
                        Spacer(Modifier.width(8.dp))
                        Column(Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    doctor.name,
                                    color = palette.textPrimary,
                                    fontFamily = Cairo,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.5.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Spacer(Modifier.width(6.dp))
                                LiveDot(if (doctor.isOnline) palette.success else palette.textMuted, Modifier.size(5.dp))
                            }
                            Spacer(Modifier.height(2.dp))
                            Text(
                                "${doctor.specialty} · ${doctor.clinic}",
                                color = palette.textSecondary,
                                fontFamily = Cairo,
                                fontSize = 9.5.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(Modifier.height(4.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                AuraIcon(AuraGlyph.Star, null, size = 10.dp, tint = palette.gold)
                                Spacer(Modifier.width(3.dp))
                                Text(
                                    "${doctor.rating} · ${doctor.reviews} مراجعة",
                                    color = palette.textSecondary,
                                    fontFamily = Cairo,
                                    fontSize = 8.5.sp
                                )
                                Spacer(Modifier.width(8.dp))
                                AuraIcon(AuraGlyph.Clock, null, size = 10.dp, tint = palette.violet)
                                Spacer(Modifier.width(3.dp))
                                Text(
                                    doctor.nextSlot,
                                    color = palette.textSecondary,
                                    fontFamily = Cairo,
                                    fontSize = 8.5.sp
                                )
                            }
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                "${doctor.fee}",
                                color = palette.teal,
                                fontFamily = Cairo,
                                fontWeight = FontWeight.Black,
                                fontSize = 15.sp
                            )
                            Text("ر.ي", color = palette.textMuted, fontFamily = Cairo, fontSize = 8.sp)
                            Spacer(Modifier.height(6.dp))
                            Box(
                                Modifier
                                    .size(30.dp)
                                    .clip(CircleShape)
                                    .background(Brush.linearGradient(listOf(palette.teal, palette.violet))),
                                contentAlignment = Alignment.Center
                            ) {
                                AuraIcon(
                                    AuraGlyph.ChevronEnd,
                                    "فتح",
                                    size = 14.dp,
                                    tint = Color(0xFF04120F),
                                    stroke = 2f
                                )
                            }
                        }
                    }
                }
            }

            item {
                GlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    glowColor = palette.violet,
                    contentPadding = PaddingValues(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AuraIcon(AuraGlyph.Spark, null, size = 18.dp, tint = palette.violet)
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "لا تجد تخصصك؟ اسأل مساعد AURA وسنقترح الأقرب لك.",
                            color = palette.textSecondary,
                            fontFamily = Cairo,
                            fontSize = 10.sp
                        )
                    }
                }
            }
        }
    }
}
