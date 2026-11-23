package com.medical.clinic.staff.aura.theme

import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * 👑 THE HEALING CANVAS COLOR PALETTE (Staff App)
 * - Background: "Silk White" (#FDFBF7) — A warm, creamy white that feels like premium paper, reducing eye strain.
 * - Primary Brand: "Serene Emerald" (#059669) — A deep, calming medical green.
 * - Secondary Accent: "Soft Apricot" (#FFF7ED) — Used for warmth and focus.
 * - Text: "Rich Charcoal" (#1F2937) for crisp clinical readability.
 * - No Neon. No Dark Mode. No Glassmorphism. Just pure, elegant surfaces.
 */

val SilkWhite = Color(0xFFFDFBF7)
val SereneEmerald = Color(0xFF059669)
val SereneEmeraldDark = Color(0xFF047857)
val SereneEmeraldLight = Color(0xFFECFDF5)
val SoftApricot = Color(0xFFFFF7ED)
val SoftApricotBorder = Color(0xFFFFEDD5)
val RichCharcoal = Color(0xFF1F2937)
val MutedCharcoal = Color(0xFF6B7280)
val SoftGray = Color(0xFF9CA3AF)
val CanvasBorder = Color(0xFFE5E7EB)
val CardWhite = Color(0xFFFFFFFF)

data class AuraPalette(
    val navy: Color = SilkWhite,
    val canvasBackground: Color = SilkWhite,
    val canvasBorder: Color = CanvasBorder,
    val cardBackground: Color = CardWhite,
    val emerald: Color = SereneEmerald,
    val purple: Color = SereneEmerald,
    val teal: Color = SereneEmerald,
    val tealDeep: Color = SereneEmeraldDark,
    val violet: Color = SereneEmerald,
    val textPrimary: Color = RichCharcoal,
    val textSecondary: Color = MutedCharcoal,
    val textMuted: Color = SoftGray,
    val danger: Color = Color(0xFFDC2626),
    val success: Color = SereneEmerald,
    val gold: Color = Color(0xFFD97706),
    val glass: Color = CardWhite,
    val isNight: Boolean = false
)

val HealingCanvasPalette = AuraPalette()
val LightMedicalPalette = HealingCanvasPalette

fun paletteForHour(hour: Int): AuraPalette = HealingCanvasPalette

val LocalAuraPalette = staticCompositionLocalOf { HealingCanvasPalette }

// Global convenience color definitions
val AuraNavy = SilkWhite
val AuraEmerald = SereneEmerald
val AuraPurple = SereneEmerald
val AuraTeal = SereneEmerald
val AuraIndigo = SereneEmeraldDark
val AuraGold = Color(0xFFD97706)
val AuraWhite = RichCharcoal
val AuraMuted = MutedCharcoal

val MedicalTeal = SereneEmerald
val MedicalBackground = SilkWhite
val MedicalCardWhite = CardWhite
val MedicalTextPrimary = RichCharcoal
val MedicalTextSecondary = MutedCharcoal
