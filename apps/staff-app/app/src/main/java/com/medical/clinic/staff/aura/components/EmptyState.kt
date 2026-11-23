package com.medical.clinic.staff.aura.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.medical.clinic.staff.aura.theme.Cairo
import com.medical.clinic.staff.aura.theme.LocalAuraPalette
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * "Beautiful nothing" — a floating 3D-ish clinic capsule instead of a blank
 * screen. Used by empty appointments, search misses and empty queues.
 */
@Composable
fun AuraEmptyState(
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    actionText: String? = null,
    onAction: (() -> Unit)? = null,
    accent: Color = LocalAuraPalette.current.teal
) {
    val palette = LocalAuraPalette.current
    val transition = rememberInfiniteTransition(label = "empty-float")
    val float by transition.animateFloat(
        -5f, 5f,
        infiniteRepeatable(tween(2600, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "empty-y"
    )
    val orbit by transition.animateFloat(
        0f, 360f,
        infiniteRepeatable(tween(18000, easing = androidx.compose.animation.core.LinearEasing)),
        label = "empty-orbit"
    )

    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Canvas(Modifier.size(170.dp)) {
            val c = center
            val r = size.minDimension * 0.36f
            drawCircle(
                Brush.radialGradient(
                    listOf(accent.copy(alpha = 0.20f), palette.violet.copy(alpha = 0.08f), Color.Transparent),
                    radius = r * 1.9f
                ),
                radius = r * 1.9f
            )
            rotate(orbit, pivot = c) {
                drawCircle(
                    color = accent.copy(alpha = 0.24f),
                    radius = r * 1.35f,
                    center = c,
                    style = Stroke(width = 1.dp.toPx())
                )
                drawCircle(
                    color = palette.violet.copy(alpha = 0.55f),
                    radius = 3.dp.toPx(),
                    center = Offset(c.x + r * 1.35f, c.y)
                )
            }
            drawCircle(
                color = accent.copy(alpha = 0.16f),
                radius = r * 1.05f,
                center = c,
                style = Stroke(width = 1.2.dp.toPx())
            )
            // Floating capsule
            val capsuleCenter = Offset(c.x, c.y + float.dp.toPx())
            val capW = r * 1.14f
            val capH = r * 0.58f
            drawRoundRect(
                brush = Brush.linearGradient(
                    listOf(
                        accent.copy(alpha = 0.9f),
                        palette.tealDeep.copy(alpha = 0.8f),
                        palette.violet.copy(alpha = 0.75f)
                    ),
                    start = Offset(capsuleCenter.x - capW / 2, capsuleCenter.y - capH / 2),
                    end = Offset(capsuleCenter.x + capW / 2, capsuleCenter.y + capH / 2)
                ),
                topLeft = Offset(capsuleCenter.x - capW / 2, capsuleCenter.y - capH / 2),
                size = androidx.compose.ui.geometry.Size(capW, capH),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(capH / 2)
            )
            drawLine(
                color = Color.White.copy(alpha = 0.65f),
                start = Offset(capsuleCenter.x, capsuleCenter.y - capH * 0.32f),
                end = Offset(capsuleCenter.x, capsuleCenter.y + capH * 0.32f),
                strokeWidth = 1.6.dp.toPx(),
                cap = StrokeCap.Round
            )
            // Star sparkles
            repeat(5) { i ->
                val angle = i * 2 * PI / 5 + 0.4
                val x = c.x + cos(angle).toFloat() * r * (1.5f + (i % 2) * 0.18f)
                val y = c.y + sin(angle).toFloat() * r * (1.5f + (i % 2) * 0.18f)
                drawCircle(Color.White.copy(alpha = 0.4f), radius = (1.4f + i % 2) * density, center = Offset(x, y))
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(
            title,
            color = palette.textPrimary,
            fontFamily = Cairo,
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(6.dp))
        Text(
            message,
            color = palette.textSecondary,
            fontFamily = Cairo,
            fontSize = 11.sp,
            textAlign = TextAlign.Center,
            lineHeight = 19.sp,
            modifier = Modifier.fillMaxWidth(0.86f)
        )
        if (actionText != null && onAction != null) {
            Spacer(Modifier.height(14.dp))
            AuraGhostButton(
                text = actionText,
                onClick = onAction,
                icon = AuraGlyph.Spark,
                color = accent,
                modifier = Modifier.width(200.dp)
            )
        }
    }
}

