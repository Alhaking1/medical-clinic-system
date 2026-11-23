package com.medical.clinic.aura.theme

import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * 👑 THE HEALING CANVAS COLOR PALETTE (Bespoke & Calming)
 * - Background: "Silk White" (#FDFBF7) — A warm, creamy white that feels like premium paper, reducing eye strain.
 * - Primary Brand: "Serene Emerald" (#059669) — A deep, calming medical green.
 * - Secondary Accent: "Soft Apricot" (#FFF7ED) — Used for cards related to appointments (warmth).
 * - Text: "Rich Charcoal" (#1F2937) for crisp readability.
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

// Pastel bubble backgrounds for specialties:
val PastelHeart = Color(0xFFE0F2FE) // Soft Blue
val PastelHeartIcon = Color(0xFF0284C7)
val PastelDental = Color(0xFFFCE7F3) // Soft Pink
val PastelDentalIcon = Color(0xFFDB2777)
val PastelOrthopedic = Color(0xFFF3E8FF) // Soft Lavender
val PastelOrthopedicIcon = Color(0xFF7C3AED)
val PastelPediatrics = Color(0xFFFEF3C7) // Soft Amber
val PastelPediatricsIcon = Color(0xFFD97706)
val PastelGeneral = Color(0xFFECFDF5) // Soft Mint
val PastelGeneralIcon = Color(0xFF059669)
val PastelEyes = Color(0xFFE0E7FF) // Soft Indigo
val PastelEyesIcon = Color(0xFF4F46E5)

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

// Compatibility aliases
val MedicalTeal = SereneEmerald
val MedicalTealDark = SereneEmeraldDark
val MedicalTealLight = SereneEmeraldLight
val MedicalBackground = SilkWhite
val MedicalCardWhite = CardWhite
val MedicalTextPrimary = RichCharcoal
val MedicalTextSecondary = MutedCharcoal
val MedicalDivider = CanvasBorder
