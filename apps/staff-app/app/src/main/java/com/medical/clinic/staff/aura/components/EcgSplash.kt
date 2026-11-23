package com.medical.clinic.staff.aura.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathMeasure
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.medical.clinic.staff.aura.theme.Cairo
import com.medical.clinic.staff.aura.theme.LocalAuraPalette
import kotlinx.coroutines.delay
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * ECG splash: a neon heartbeat draws itself across the cosmos, then dissolves
 * into the AURA monogram. Two long-press haptics punctuate the entrance.
 */
@Composable
fun EcgSplashScreen(
    onFinished: () -> Unit
) {
    val palette = LocalAuraPalette.current
    val haptics = rememberAuraHaptics()
    val draw = remember { Animatable(0f) }
    var logoVisible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        haptics.tap()
        draw.animateTo(1f, tween(1750, easing = FastOutSlowInEasing))
        logoVisible = true
        haptics.success()
        delay(850)
        onFinished()
    }

    MeshGradientBackground(scrim = 0.15f) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Canvas(Modifier.fillMaxWidth().height(260.dp)) {
                val baseline = size.height * 0.52f
                val w = size.width
                val path = Path().apply {
                    moveTo(0f, baseline)
                    fun pt(x: Float, dy: Float) = lineTo(w * x, baseline + size.height * dy)
                    pt(0.07f, 0f)
                    pt(0.11f, -0.03f)
                    pt(0.15f, 0f)
                    pt(0.34f, 0f)
                    pt(0.385f, 0.02f)
                    pt(0.41f, -0.20f)
                    pt(0.445f, 0.24f)
                    pt(0.475f, 0f)
                    pt(0.53f, 0f)
                    pt(0.575f, -0.035f)
                    pt(0.62f, 0f)
                    pt(1f, 0f)
                }
                val measure = PathMeasure()
                measure.setPath(path, false)
                val total = measure.length
                val segment = Path()
                measure.getSegment(0f, total * draw.value, segment, true)

                val gradient = Brush.linearGradient(
                    colors = listOf(palette.teal, Color.White, palette.violet),
                    start = Offset(0f, baseline),
                    end = Offset(w, baseline)
                )
                // Halo layers
                listOf(16f to 0.06f, 9f to 0.10f, 4f to 0.22f).forEach { (width, alpha) ->
                    drawPath(
                        segment,
                        brush = if (width > 10f) gradient else Brush.linearGradient(
                            listOf(
                                palette.teal.copy(alpha = alpha),
                                Color.White.copy(alpha = alpha),
                                palette.violet.copy(alpha = alpha)
                            )
                        ),
                        style = Stroke(width = width.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round)
                    )
                }
                drawPath(
                    segment,
                    brush = Brush.linearGradient(listOf(Color.White, palette.teal, Color.White)),
                    style = Stroke(width = 2.4.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round)
                )
                // Moving head of the line
                if (draw.value in 0.02f..0.99f) {
                    val pos = measure.getPosition(total * draw.value)
                    drawCircle(
                        Brush.radialGradient(
                            listOf(Color.White, palette.teal.copy(alpha = 0.45f), Color.Transparent),
                            center = pos,
                            radius = 22.dp.toPx()
                        ),
                        radius = 22.dp.toPx(),
                        center = pos
                    )
                }
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(top = 158.dp)
            ) {
                Box(
                    Modifier.graphicsLayer {
                        val scale = if (logoVisible) 1f else 0.7f
                        scaleX = scale
                        scaleY = scale
                        alpha = if (logoVisible) 1f else 0f
                    }
                ) {
                    AuraLogoMark(size = 104)
                }
                Spacer(Modifier.height(20.dp))
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.graphicsLayer {
                        alpha = if (logoVisible) 1f else 0f
                        translationY = if (logoVisible) 0f else 22f
                    }
                ) {
                    GradientHeading(
                        text = "طبيبك",
                        style = androidx.compose.material3.MaterialTheme.typography.displayMedium,
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(2.dp))
                    androidx.compose.material3.Text(
                        text = "A U R A   ·   E X P E R I E N C E",
                        color = palette.textSecondary.copy(alpha = 0.8f),
                        fontFamily = Cairo,
                        fontSize = 9.5.sp,
                        letterSpacing = 2.4.sp,
                        fontWeight = FontWeight.Medium,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

/** The AURA monogram — hexagon pulse, inner heartbeat, orbital glow. */
@Composable
fun AuraLogoMark(size: Int = 92) {
    val palette = LocalAuraPalette.current
    val transition = rememberInfiniteTransition(label = "logo")
    val spin by transition.animateFloat(
        0f, 360f,
        infiniteRepeatable(tween(16000, easing = LinearEasing), RepeatMode.Restart),
        label = "logo-spin"
    )
    val breathe by transition.animateFloat(
        0.92f, 1.06f,
        infiniteRepeatable(tween(1900, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "logo-breathe"
    )
    Box(Modifier.size(size.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            val c = center
            val r = this.size.minDimension * 0.40f
            drawCircle(
                Brush.radialGradient(
                    listOf(palette.teal.copy(alpha = 0.30f), palette.violet.copy(alpha = 0.10f), Color.Transparent),
                    radius = r * 1.5f
                ),
                radius = r * 1.5f,
                center = c
            )
            rotate(spin) {
                val orbit = Path().apply {
                    addOval(androidx.compose.ui.geometry.Rect(c, r * 1.18f))
                }
                drawArc(
                    brush = Brush.sweepGradient(
                        listOf(Color.Transparent, palette.teal.copy(alpha = 0.7f), Color.Transparent)
                    ),
                    startAngle = 0f,
                    sweepAngle = 360f,
                    useCenter = false,
                    style = Stroke(width = 1.4.dp.toPx())
                )
                drawPath(orbit, palette.violet.copy(alpha = 0.12f), style = Stroke(width = 0.8.dp.toPx()))
            }
            val hex = Path()
            repeat(6) { i ->
                val angle = -PI / 2 + i * PI / 3
                val x = c.x + cos(angle).toFloat() * r * breathe
                val y = c.y + sin(angle).toFloat() * r * breathe
                if (i == 0) hex.moveTo(x, y) else hex.lineTo(x, y)
            }
            hex.close()
            drawPath(
                hex,
                brush = Brush.linearGradient(
                    listOf(Color.White.copy(alpha = 0.9f), palette.teal, palette.violet),
                    start = Offset(c.x - r, c.y - r),
                    end = Offset(c.x + r, c.y + r)
                ),
                style = Stroke(width = 1.8.dp.toPx(), join = StrokeJoin.Round)
            )
            // Inner heartbeat
            val base = c.y + 2f
            val ecg = Path().apply {
                moveTo(c.x - r * 0.52f, base)
                lineTo(c.x - r * 0.24f, base)
                lineTo(c.x - r * 0.10f, base - r * 0.36f)
                lineTo(c.x + r * 0.06f, base + r * 0.38f)
                lineTo(c.x + r * 0.22f, base)
                lineTo(c.x + r * 0.52f, base)
            }
            drawPath(
                ecg,
                brush = Brush.horizontalGradient(listOf(palette.teal, Color.White, palette.violet)),
                style = Stroke(width = 2.2.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round)
            )
            drawCircle(Color.White, radius = 2.2.dp.toPx(), center = Offset(c.x + r * 0.22f, base))
        }
    }
}

