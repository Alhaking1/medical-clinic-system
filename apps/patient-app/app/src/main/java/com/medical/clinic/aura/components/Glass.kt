package com.medical.clinic.aura.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.medical.clinic.aura.theme.Cairo
import com.medical.clinic.aura.theme.LocalAuraPalette
import com.medical.clinic.aura.theme.SereneEmerald
import com.medical.clinic.aura.theme.SereneEmeraldLight
import com.medical.clinic.aura.theme.RichCharcoal
import com.medical.clinic.aura.theme.CanvasBorder
import kotlin.math.sin

/**
 * 👑 THE HEALING CANVAS CARD (Floating Island)
 * Pure white background (#FFFFFF) with subtle, soft drop shadow (elevation 2.dp)
 * and rounded corners (16.dp).
 * NO glass, NO blur, NO neon borders.
 */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    shape: RoundedCornerShape = RoundedCornerShape(16.dp),
    glowColor: Color = Color.Transparent,
    contentPadding: PaddingValues = PaddingValues(16.dp),
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Box(
        modifier = modifier
            .shadow(
                elevation = 2.dp,
                shape = shape,
                ambientColor = Color(0x08000000),
                spotColor = Color(0x12000000)
            )
            .clip(shape)
            .background(Color.White)
            .border(
                width = 1.dp,
                color = CanvasBorder,
                shape = shape
            )
            .then(
                if (onClick != null) {
                    Modifier.clickable(onClick = onClick)
                } else Modifier
            )
    ) {
        Column(
            modifier = Modifier.padding(contentPadding),
            content = content
        )
    }
}

/** A floating pill — used for chips, badges, metadata. */
@Composable
fun GlassPill(
    modifier: Modifier = Modifier,
    color: Color = SereneEmerald,
    contentPadding: PaddingValues = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
    content: @Composable () -> Unit
) {
    Box(
        modifier = modifier
            .clip(CircleShape)
            .background(SereneEmeraldLight)
            .border(1.dp, color.copy(alpha = 0.25f), CircleShape)
            .padding(contentPadding),
        contentAlignment = Alignment.Center
    ) { content() }
}

/**
 * Clean Charcoal Headline (Rich Charcoal #1F2937).
 */
@Composable
fun GradientHeading(
    text: String,
    modifier: Modifier = Modifier,
    style: TextStyle = androidx.compose.material3.MaterialTheme.typography.displaySmall,
    colors: List<Color> = listOf(RichCharcoal),
    textAlign: TextAlign = TextAlign.Start
) {
    Text(
        text = text,
        modifier = modifier,
        style = style.copy(color = RichCharcoal),
        textAlign = textAlign
    )
}

/** Primary CTA: Solid Serene Emerald with clean white text and soft elevation. */
@Composable
fun AuraPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    loading: Boolean = false,
    enabled: Boolean = true,
    icon: AuraGlyph? = null
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.98f else 1f,
        animationSpec = spring(stiffness = 600f),
        label = "cta-scale"
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp)
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
                alpha = if (enabled) 1f else 0.5f
            }
            .shadow(
                elevation = 3.dp,
                shape = RoundedCornerShape(14.dp),
                ambientColor = Color(0x08000000),
                spotColor = Color(0x30059669)
            )
            .clip(RoundedCornerShape(14.dp))
            .background(SereneEmerald)
            .clickable(
                interactionSource = interaction,
                indication = null,
                enabled = enabled && !loading,
                onClick = onClick
            ),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp)
        ) {
            if (loading) {
                AuraLoadingDots(color = Color.White)
                Spacer(Modifier.width(10.dp))
            } else if (icon != null) {
                AuraIcon(icon, null, size = 20.dp, tint = Color.White, stroke = 2.1f)
                Spacer(Modifier.width(10.dp))
            }
            Text(
                text = text,
                color = Color.White,
                fontFamily = Cairo,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp
            )
        }
    }
}

/** Quiet outlined button. */
@Composable
fun AuraGhostButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: AuraGlyph? = null,
    color: Color = SereneEmerald
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.98f else 1f,
        animationSpec = spring(stiffness = 600f),
        label = "ghost-scale"
    )
    Row(
        modifier = modifier
            .heightIn(min = 48.dp)
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .clip(RoundedCornerShape(14.dp))
            .background(SereneEmeraldLight)
            .border(1.dp, color.copy(alpha = 0.5f), RoundedCornerShape(14.dp))
            .clickable(interactionSource = interaction, indication = null, onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        if (icon != null) {
            AuraIcon(icon, null, size = 18.dp, tint = color, stroke = 2f)
            Spacer(Modifier.width(8.dp))
        }
        Text(text, color = color, fontFamily = Cairo, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
    }
}

/** Custom floating-label field. */
@Composable
fun AuraTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    error: String? = null,
    leading: AuraGlyph? = null,
    secure: Boolean = false,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    enabled: Boolean = true
) {
    val palette = LocalAuraPalette.current
    var focused by remember { mutableStateOf(false) }
    var revealed by remember { mutableStateOf(false) }
    val floating = focused || value.isNotEmpty()
    val labelOffset by animateFloatAsState(
        targetValue = if (floating) -10f else 12f,
        animationSpec = spring(dampingRatio = 0.8f, stiffness = 500f),
        label = "label-float"
    )
    val labelSize by animateFloatAsState(
        targetValue = if (floating) 10.5f else 13.5f,
        animationSpec = tween(180),
        label = "label-size"
    )
    val borderColor by animateColorAsState(
        targetValue = when {
            error != null -> palette.danger
            focused -> SereneEmerald
            else -> CanvasBorder
        },
        animationSpec = tween(220),
        label = "field-border"
    )
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl

    Column(modifier) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(60.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(Color.White)
                .border(if (focused) 1.5.dp else 1.dp, borderColor, RoundedCornerShape(14.dp))
                .padding(horizontal = 16.dp)
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(top = 20.dp, bottom = 4.dp)
                    .align(Alignment.CenterStart),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (leading != null) {
                    AuraIcon(leading, null, size = 18.dp, tint = if (focused) SereneEmerald else palette.textMuted)
                    Spacer(Modifier.width(10.dp))
                }
                BasicTextField(
                    value = value,
                    onValueChange = onValueChange,
                    modifier = Modifier.weight(1f),
                    enabled = enabled,
                    singleLine = true,
                    textStyle = LocalTextStyle.current.copy(
                        color = RichCharcoal,
                        fontFamily = Cairo,
                        fontSize = 14.5.sp,
                        textAlign = if (rtl) TextAlign.Right else TextAlign.Left
                    ),
                    cursorBrush = SolidColor(SereneEmerald),
                    keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
                    visualTransformation = if (secure && !revealed) PasswordVisualTransformation() else VisualTransformation.None
                )
                if (secure) {
                    Text(
                        text = if (revealed) "إخفاء" else "إظهار",
                        color = if (focused) SereneEmerald else palette.textMuted,
                        fontFamily = Cairo,
                        fontSize = 11.sp,
                        modifier = Modifier
                            .clickable { revealed = !revealed }
                            .padding(4.dp)
                    )
                }
            }

            Text(
                text = label,
                color = when {
                    error != null -> palette.danger
                    focused -> SereneEmerald
                    else -> palette.textSecondary
                },
                fontFamily = Cairo,
                fontWeight = if (floating) FontWeight.SemiBold else FontWeight.Normal,
                fontSize = labelSize.sp,
                modifier = Modifier
                    .align(if (rtl) Alignment.TopEnd else Alignment.TopStart)
                    .padding(
                        top = (10f + labelOffset).coerceAtLeast(6f).dp,
                        start = if (!rtl && leading != null && !floating) 32.dp else 0.dp,
                        end = if (rtl && leading != null && !floating) 32.dp else 0.dp
                    )
            )
        }
        if (error != null) {
            Spacer(Modifier.height(4.dp))
            Text(
                error,
                color = palette.danger,
                fontFamily = Cairo,
                fontSize = 11.5.sp,
                modifier = Modifier.padding(horizontal = 6.dp)
            )
        }
    }
}

/** Circular icon button. */
@Composable
fun GlassIconButton(
    glyph: AuraGlyph,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    contentDescription: String? = null,
    size: Int = 44,
    tint: Color = RichCharcoal,
    badge: String? = null,
    glow: Boolean = false
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.92f else 1f, spring(stiffness = 700f), label = "icon-scale")
    Box(
        modifier = modifier
            .size(size.dp)
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .shadow(
                elevation = 2.dp,
                shape = CircleShape,
                ambientColor = Color(0x08000000),
                spotColor = Color(0x10000000)
            )
            .clip(CircleShape)
            .background(Color.White)
            .border(1.dp, CanvasBorder, CircleShape)
            .clickable(interactionSource = interaction, indication = null, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        AuraIcon(glyph, contentDescription, size = (size * 0.46f).dp, tint = tint)
        if (badge != null) {
            Box(
                Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 4.dp, end = 2.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFDC2626))
                    .padding(horizontal = 5.dp, vertical = 1.dp)
            ) {
                Text(
                    badge,
                    color = Color.White,
                    fontSize = 8.5.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = Cairo
                )
            }
        }
    }
}

@Composable
fun AuraLoadingDots(
    modifier: Modifier = Modifier,
    color: Color = SereneEmerald,
    dotSize: Int = 7
) {
    val transition = rememberInfiniteTransition(label = "dots")
    val phase by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(900, easing = FastOutSlowInEasing), RepeatMode.Restart),
        label = "dots-phase"
    )
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
        repeat(3) { i ->
            val wave = ((sin((phase * 2 * Math.PI + i * 1.4)).toFloat() + 1f) / 2f)
            Box(
                Modifier
                    .size((dotSize + wave * 3f).dp)
                    .clip(CircleShape)
                    .background(color.copy(alpha = 0.45f + wave * 0.55f))
            )
        }
    }
}

@Composable
fun SectionTitle(
    title: String,
    modifier: Modifier = Modifier,
    action: String? = null,
    onAction: (() -> Unit)? = null
) {
    Row(
        modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(width = 3.5.dp, height = 18.dp)
                    .clip(CircleShape)
                    .background(SereneEmerald)
            )
            Spacer(Modifier.width(9.dp))
            Text(
                title,
                color = RichCharcoal,
                fontFamily = Cairo,
                fontWeight = FontWeight.Bold,
                fontSize = 16.5.sp
            )
        }
        if (action != null && onAction != null) {
            Text(
                action,
                color = SereneEmerald,
                fontFamily = Cairo,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier
                    .clip(CircleShape)
                    .clickable(onClick = onAction)
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            )
        }
    }
}
