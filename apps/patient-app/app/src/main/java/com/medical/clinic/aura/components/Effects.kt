package com.medical.clinic.aura.components

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.keyframes
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.medical.clinic.aura.theme.Cairo
import com.medical.clinic.aura.theme.LocalAuraPalette
import kotlinx.coroutines.delay
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.random.Random

// ═══════════════════════════════════════════════════════════════
// HAPTICS
// ═══════════════════════════════════════════════════════════════

class AuraHaptics internal constructor(
    val tap: () -> Unit,
    val success: () -> Unit,
    val error: () -> Unit,
    val like: () -> Unit
)

@Composable
fun rememberAuraHaptics(): AuraHaptics {
    val haptic = LocalHapticFeedback.current
    val context = LocalContext.current
    return remember(haptic, context) {
        AuraHaptics(
            tap = { haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove) },
            success = {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                heartbeatVibration(context)
            },
            error = { haptic.performHapticFeedback(HapticFeedbackType.LongPress) },
            like = {
                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                vibrate(context, longArrayOf(0, 22, 45, 30))
            }
        )
    }
}

private fun heartbeatVibration(context: Context) {
    // "lub-dub" — the signature of AURA
    vibrate(context, longArrayOf(0, 70, 90, 45, 110, 55))
}

private fun vibrate(context: Context, pattern: LongArray) {
    try {
        val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator ?: return
        if (!vibrator.hasVibrator()) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(pattern, -1)
        }
    } catch (_: Exception) {
    }
}

// ═══════════════════════════════════════════════════════════════
// PARTICLE EXPLOSION (favourite)
// ═══════════════════════════════════════════════════════════════

private data class Spark(
    val angle: Float,
    val speed: Float,
    val radius: Float,
    val color: Color,
    val weight: Float
)

@Composable
fun ParticleExplosion(
    trigger: Int,
    modifier: Modifier = Modifier,
    originX: Float = 0.5f,
    originY: Float = 0.5f
) {
    val palette = LocalAuraPalette.current
    val sparks = remember { mutableStateListOf<Spark>() }
    val progress = remember { Animatable(0f) }

    LaunchedEffect(trigger) {
        if (trigger <= 0) return@LaunchedEffect
        sparks.clear()
        val random = Random(trigger * 31 + 7)
        val colors = listOf(palette.teal, palette.violet, palette.gold, Color.White)
        repeat(26) { i ->
            sparks.add(
                Spark(
                    angle = (i / 26f) * 2f * PI.toFloat() + random.nextFloat() * 0.4f,
                    speed = 26f + random.nextFloat() * 70f,
                    radius = 1.6f + random.nextFloat() * 3.4f,
                    color = colors[i % colors.size],
                    weight = 0.5f + random.nextFloat()
                )
            )
        }
        progress.snapTo(0f)
        progress.animateTo(1f, tween(720, easing = FastOutSlowInEasing))
        sparks.clear()
    }

    Canvas(modifier) {
        val p = progress.value
        if (p <= 0f || p >= 1f) return@Canvas
        val origin = Offset(size.width * originX, size.height * originY)
        val burst = size.minDimension * 0.45f
        sparks.forEach { spark ->
            val distance = spark.speed * p * (size.minDimension / 240f)
            val x = origin.x + cos(spark.angle) * (distance + burst * 0.25f) * p
            val y = origin.y + sin(spark.angle) * (distance + burst * 0.25f) * p + (p * p * 26f)
            drawCircle(
                color = spark.color.copy(alpha = (1f - p) * spark.weight),
                radius = spark.radius * (1f - p * 0.5f),
                center = Offset(x, y)
            )
            drawCircle(
                color = spark.color.copy(alpha = (1f - p) * 0.18f * spark.weight),
                radius = spark.radius * 2.6f,
                center = Offset(x, y)
            )
        }
        drawCircle(
            color = palette.teal.copy(alpha = (1f - p) * 0.30f),
            radius = burst * p,
            center = origin
        )
    }
}

// ═══════════════════════════════════════════════════════════════
// CONFETTI
// ═══════════════════════════════════════════════════════════════

private data class Confetto(
    val x: Float,
    val delay: Float,
    val speed: Float,
    val size: Float,
    val spin: Float,
    val color: Color,
    val drift: Float
)

@Composable
fun AuraConfetti(
    trigger: Int,
    modifier: Modifier = Modifier
) {
    val palette = LocalAuraPalette.current
    val pieces = remember {
        val random = Random(42)
        val colors = listOf(palette.teal, palette.violet, palette.gold, Color.White, palette.success)
        List(90) {
            Confetto(
                x = random.nextFloat(),
                delay = random.nextFloat() * 0.22f,
                speed = 0.65f + random.nextFloat() * 0.6f,
                size = 3f + random.nextFloat() * 5f,
                spin = (random.nextFloat() * 720f) - 360f,
                color = colors[random.nextInt(colors.size)],
                drift = (random.nextFloat() - 0.5f) * 90f
            )
        }
    }
    val progress = remember { Animatable(0f) }
    LaunchedEffect(trigger) {
        if (trigger <= 0) return@LaunchedEffect
        progress.snapTo(0f)
        progress.animateTo(1f, tween(2100, easing = LinearEasing))
        progress.snapTo(0f)
    }
    Canvas(modifier) {
        val p = progress.value
        if (p <= 0f) return@Canvas
        pieces.forEach { piece ->
            val local = ((p - piece.delay) / (1f - piece.delay)).coerceIn(0f, 1f)
            if (local <= 0f) return@forEach
            val y = -30f + (size.height + 70f) * local * piece.speed
            val x = piece.x * size.width + piece.drift * local + sin(local * 7f + piece.spin) * 18f
            val alpha = if (local > 0.82f) ((1f - local) / 0.18f).coerceIn(0f, 1f) else 1f
            rotate(piece.spin * local, pivot = Offset(x, y)) {
                drawRect(
                    color = piece.color.copy(alpha = alpha),
                    topLeft = Offset(x, y),
                    size = androidx.compose.ui.geometry.Size(piece.size, piece.size * 1.7f)
                )
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// PULSE AVATAR (live heartbeat ring)
// ═══════════════════════════════════════════════════════════════

@Composable
fun PulseAvatar(
    modifier: Modifier = Modifier,
    size: Int = 64,
    ringColor: Color = LocalAuraPalette.current.teal,
    content: @Composable BoxScope.() -> Unit
) {
    val transition = rememberInfiniteTransition(label = "pulse")
    val beat by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(2000, easing = FastOutSlowInEasing), RepeatMode.Restart),
        label = "beat"
    )
    Box(
        modifier = modifier.size((size * 1.55f).dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(Modifier.fillMaxSize()) {
            val base = size.dp.toPx() / 2f
            repeat(2) { ring ->
                val local = ((beat + ring * 0.48f) % 1f)
                drawCircle(
                    color = ringColor.copy(alpha = (1f - local) * 0.28f),
                    radius = base * (1f + local * 0.62f),
                    style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1.6.dp.toPx())
                )
            }
            drawCircle(
                Brush.radialGradient(
                    listOf(ringColor.copy(alpha = 0.18f), Color.Transparent),
                    radius = base * 1.5f
                ),
                radius = base * 1.5f
            )
        }
        Box(
            Modifier
                .size(size.dp)
                .clip(CircleShape),
            content = content
        )
    }
}

// ═══════════════════════════════════════════════════════════════
// 3D GYROSCOPE TILT
// ═══════════════════════════════════════════════════════════════

@Composable
fun Tilt3D(
    modifier: Modifier = Modifier,
    maxAngle: Float = 8f,
    content: @Composable BoxScope.() -> Unit
) {
    val context = LocalContext.current
    var rotX by remember { mutableFloatStateOf(0f) }
    var rotY by remember { mutableFloatStateOf(0f) }

    DisposableEffect(Unit) {
        val manager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        val sensor = manager?.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
        var targetX = 0f
        var targetY = 0f
        var smoothedX = 0f
        var smoothedY = 0f
        val rotationMatrix = FloatArray(9)
        val orientation = FloatArray(3)
        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                if (event.sensor.type != Sensor.TYPE_ROTATION_VECTOR) return
                try {
                    SensorManager.getRotationMatrixFromVector(rotationMatrix, event.values)
                    SensorManager.getOrientation(rotationMatrix, orientation)
                    val pitch = Math.toDegrees(orientation[1].toDouble()).toFloat()
                    val roll = Math.toDegrees(orientation[2].toDouble()).toFloat()
                    targetX = (-pitch / 55f * maxAngle).coerceIn(-maxAngle, maxAngle)
                    targetY = (roll / 55f * maxAngle).coerceIn(-maxAngle, maxAngle)
                    smoothedX += (targetX - smoothedX) * 0.12f
                    smoothedY += (targetY - smoothedY) * 0.12f
                    rotX = smoothedX
                    rotY = smoothedY
                } catch (_: Exception) {
                }
            }

            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
        }
        if (manager != null && sensor != null) {
            manager.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_GAME)
        }
        onDispose {
            manager?.unregisterListener(listener)
        }
    }

    Box(
        modifier = modifier.graphicsLayer {
            rotationX = rotX
            rotationY = rotY
            cameraDistance = 18f * density
        },
        content = content
    )
}

// ═══════════════════════════════════════════════════════════════
// SHAKE
// ═══════════════════════════════════════════════════════════════

class ShakeController internal constructor() {
    internal val anim = Animatable(0f)

    suspend fun shake() {
        anim.snapTo(0f)
        anim.animateTo(
            targetValue = 1f,
            animationSpec = keyframes {
                durationMillis = 430
                0f at 0 using LinearEasing
                1f at 45 using LinearEasing
                -1f at 100 using LinearEasing
                0.8f at 160 using LinearEasing
                -0.6f at 230 using LinearEasing
                0.35f at 310 using LinearEasing
                0f at 430 using LinearEasing
            }
        )
    }
}

@Composable
fun rememberShakeController(): ShakeController = remember { ShakeController() }

fun Modifier.shake(controller: ShakeController): Modifier = this.then(
    Modifier.offset {
        IntOffset((controller.anim.value * 9.dp.toPx()).roundToInt(), 0)
    }
)

// ═══════════════════════════════════════════════════════════════
// GLASS SNACKBAR
// ═══════════════════════════════════════════════════════════════

@Composable
fun AuraSnackbarHost(
    hostState: SnackbarHostState,
    modifier: Modifier = Modifier
) {
    val palette = LocalAuraPalette.current
    val current = hostState.currentSnackbarData
    var lastMessage by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(current) {
        if (current != null) lastMessage = current.visuals.message
    }
    AnimatedVisibility(
        visible = current != null,
        enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
        exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(),
        modifier = modifier
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 18.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(
                    Brush.horizontalGradient(
                        listOf(
                            Color(0xEE111827),
                            palette.emerald.copy(alpha = 0.55f),
                            Color(0xEE111827)
                        )
                    )
                )
                .graphicsLayer { shadowElevation = 22.dp.toPx() }
                .padding(horizontal = 16.dp, vertical = 13.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(palette.teal)
            )
            Spacer(Modifier.width(11.dp))
            Text(
                text = lastMessage ?: "",
                color = Color.White,
                fontFamily = Cairo,
                fontSize = 12.5.sp,
                modifier = Modifier.weight(1f)
            )
            Text(
                "تم",
                color = palette.teal,
                fontFamily = Cairo,
                fontSize = 11.sp,
                modifier = Modifier
                    .clip(CircleShape)
                    .clickable {
                        current?.dismiss()
                    }
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// SMALL UTILITIES
// ═══════════════════════════════════════════════════════════════

/** A compact, premium status badge. */
@Composable
fun StatusPill(
    text: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Row(
        modifier
            .clip(CircleShape)
            .background(color.copy(alpha = 0.15f))
            .padding(horizontal = 9.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Box(Modifier.size(5.dp).clip(CircleShape).background(color))
        Text(text, color = color, fontFamily = Cairo, fontSize = 9.5.sp)
    }
}

/** A tiny breathing dot that signals "live". */
@Composable
fun LiveDot(color: Color, modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "live")
    val alpha by transition.animateFloat(
        0.35f, 1f,
        infiniteRepeatable(tween(900, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "live-alpha"
    )
    Box(
        modifier
            .size(7.dp)
            .clip(CircleShape)
            .background(color.copy(alpha = alpha))
    )
}
