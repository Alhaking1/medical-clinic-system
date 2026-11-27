package com.medical.clinic.staff.aura.theme

import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * 👑 THE ROYAL MEDICAL COLOR PALETTE (Staff App)
 * - Background: "Pure Ice White" (#F8FAFC) — A pristine, clean clinical white that eliminates yellowing.
 * - Primary Brand: "Medical Deep Teal" (#0D9488) & "Serene Emerald" (#059669) — Luxury clinical authority.
 * - Secondary Accent: "Soft Apricot Gold" (#FFF7ED) — Warmth for appointments and VIP statuses.
 * - Text: "Deep Obsidian Slate" (#0F172A) for razor-sharp Arabic typography.
 */

val SilkWhite = Color(0xFFF8FAFC)
val SereneEmerald = Color(0xFF0D9488)
val SereneEmeraldDark = Color(0xFF0F766E)
val SereneEmeraldLight = Color(0xFFF0FDFA)
val SoftApricot = Color(0xFFFFF7ED)
val SoftApricotBorder = Color(0xFFFFEDD5)
val RichCharcoal = Color(0xFF0F172A)
val MutedCharcoal = Color(0xFF334155)
val SoftGray = Color(0xFF64748B)
val CanvasBorder = Color(0xFFE2E8F0)
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
    val success: Color = Color(0xFF059669),
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
