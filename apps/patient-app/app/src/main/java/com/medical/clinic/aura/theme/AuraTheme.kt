package com.medical.clinic.aura.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/**
 * 👑 THE HEALING CANVAS THEME
 * Bespoke light medical design system.
 * Warm Silk White background, Serene Emerald accents, Rich Charcoal text.
 */
@Composable
fun AuraTheme(
    content: @Composable () -> Unit
) {
    val palette = HealingCanvasPalette

    val scheme = lightColorScheme(
        primary = SereneEmerald,
        onPrimary = Color.White,
        primaryContainer = SereneEmeraldLight,
        onPrimaryContainer = SereneEmeraldDark,
        secondary = SereneEmerald,
        onSecondary = Color.White,
        secondaryContainer = SoftApricot,
        onSecondaryContainer = RichCharcoal,
        tertiary = Color(0xFF0284C7),
        onTertiary = Color.White,
        background = SilkWhite,
        onBackground = RichCharcoal,
        surface = CardWhite,
        onSurface = RichCharcoal,
        surfaceVariant = SilkWhite,
        onSurfaceVariant = MutedCharcoal,
        outline = CanvasBorder,
        error = Color(0xFFDC2626),
        onError = Color.White
    )

    val shapes = Shapes(
        extraSmall = RoundedCornerShape(8.dp),
        small = RoundedCornerShape(12.dp),
        medium = RoundedCornerShape(16.dp),
        large = RoundedCornerShape(24.dp),
        extraLarge = RoundedCornerShape(32.dp)
    )

    CompositionLocalProvider(LocalAuraPalette provides palette) {
        MaterialTheme(
            colorScheme = scheme,
            typography = AuraTypography,
            shapes = shapes,
            content = content
        )
    }
}
