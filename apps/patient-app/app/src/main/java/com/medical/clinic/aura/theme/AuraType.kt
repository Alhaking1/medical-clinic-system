package com.medical.clinic.aura.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.unit.sp
import com.medical.clinic.R

/**
 * Cairo — premium Arabic typeface bundled with the app.
 * A single variable font is mapped across weights; Android picks the closest instance.
 */
val Cairo = FontFamily(
    Font(R.font.cairo_variable, FontWeight.Light),
    Font(R.font.cairo_variable, FontWeight.Normal),
    Font(R.font.cairo_variable, FontWeight.Medium),
    Font(R.font.cairo_variable, FontWeight.SemiBold),
    Font(R.font.cairo_variable, FontWeight.Bold),
    Font(R.font.cairo_variable, FontWeight.Black)
)

private val balanced = LineHeightStyle(
    alignment = LineHeightStyle.Alignment.Center,
    trim = LineHeightStyle.Trim.None
)

val AuraTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.Black,
        fontSize = 40.sp,
        lineHeight = 52.sp,
        letterSpacing = (-0.5).sp,
        lineHeightStyle = balanced
    ),
    displayMedium = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.Black,
        fontSize = 32.sp,
        lineHeight = 42.sp,
        letterSpacing = (-0.3).sp,
        lineHeightStyle = balanced
    ),
    displaySmall = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.Bold,
        fontSize = 27.sp,
        lineHeight = 36.sp,
        lineHeightStyle = balanced
    ),
    headlineLarge = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        lineHeight = 34.sp
    ),
    headlineMedium = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.Bold,
        fontSize = 21.sp,
        lineHeight = 30.sp
    ),
    headlineSmall = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp,
        lineHeight = 27.sp
    ),
    titleLarge = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.Bold,
        fontSize = 18.sp,
        lineHeight = 26.sp
    ),
    titleMedium = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.SemiBold,
        fontSize = 15.sp,
        lineHeight = 23.sp
    ),
    titleSmall = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.SemiBold,
        fontSize = 13.sp,
        lineHeight = 20.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
        lineHeight = 25.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.Normal,
        fontSize = 13.5.sp,
        lineHeight = 23.sp
    ),
    bodySmall = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 19.sp
    ),
    labelLarge = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.Bold,
        fontSize = 14.sp,
        lineHeight = 20.sp
    ),
    labelMedium = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp,
        lineHeight = 17.sp
    ),
    labelSmall = TextStyle(
        fontFamily = Cairo,
        fontWeight = FontWeight.Medium,
        fontSize = 10.5.sp,
        lineHeight = 15.sp
    )
)
