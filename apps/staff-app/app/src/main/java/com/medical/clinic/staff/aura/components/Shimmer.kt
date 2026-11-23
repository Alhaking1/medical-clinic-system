package com.medical.clinic.staff.aura.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

@Composable
fun rememberShimmerBrush(
    base: Color = Color.White.copy(alpha = 0.055f),
    highlight: Color = Color.White.copy(alpha = 0.16f)
): Brush {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val x by transition.animateFloat(
        initialValue = -500f,
        targetValue = 1400f,
        animationSpec = infiniteRepeatable(
            animation = tween(1450, easing = LinearEasing)
        ),
        label = "shimmer-x"
    )
    return Brush.linearGradient(
        colors = listOf(base, highlight, base),
        start = Offset(x, 0f),
        end = Offset(x + 380f, 320f)
    )
}

@Composable
fun SkeletonBox(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(10.dp),
    brush: Brush = rememberShimmerBrush()
) {
    Box(modifier.clip(shape).background(brush))
}

@Composable
fun SkeletonLine(
    width: Dp,
    height: Dp = 11.dp,
    brush: Brush = rememberShimmerBrush()
) {
    SkeletonBox(Modifier.width(width).height(height), RoundedCornerShape(50), brush)
}

/**
 * Skeleton that mirrors the exact doctor card geometry — circle avatar,
 * specialty line, rating line and CTA bar. No spinners, ever.
 */
@Composable
fun SkeletonDoctorCard(modifier: Modifier = Modifier) {
    val brush = rememberShimmerBrush()
    Box(
        modifier
            .width(248.dp)
            .height(228.dp)
            .clip(RoundedCornerShape(22.dp))
            .background(Color.White.copy(alpha = 0.045f))
            .padding(16.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(11.dp)) {
            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                SkeletonBox(Modifier.size(54.dp), CircleShape, brush)
                Spacer(Modifier.width(12.dp))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SkeletonLine(112.dp, 13.dp, brush)
                    SkeletonLine(78.dp, 10.dp, brush)
                }
            }
            Spacer(Modifier.height(8.dp))
            SkeletonLine(196.dp, 9.dp, brush)
            SkeletonLine(154.dp, 9.dp, brush)
            SkeletonLine(172.dp, 9.dp, brush)
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SkeletonBox(Modifier.height(30.dp).width(76.dp), RoundedCornerShape(50), brush)
                SkeletonBox(Modifier.height(30.dp).width(96.dp), RoundedCornerShape(50), brush)
            }
        }
    }
}

@Composable
fun SkeletonAppointmentCard(modifier: Modifier = Modifier) {
    val brush = rememberShimmerBrush()
    Box(
        modifier
            .fillMaxWidth()
            .height(92.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(Color.White.copy(alpha = 0.045f))
            .padding(16.dp)
    ) {
        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            SkeletonBox(Modifier.size(48.dp), CircleShape, brush)
            Spacer(Modifier.width(12.dp))
            Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                SkeletonLine(150.dp, 12.dp, brush)
                SkeletonLine(96.dp, 9.dp, brush)
                SkeletonLine(120.dp, 9.dp, brush)
            }
        }
    }
}

