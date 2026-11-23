package com.medical.clinic.aura.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * AURA glyph set. Every icon is drawn from scratch with Compose Canvas —
 * no Material icon pack, one visual grammar, one stroke weight.
 */
enum class AuraGlyph {
    Home, Calendar, Records, Profile, Search, Bell, Chat, Heart, Star, Location,
    ChevronStart, ChevronEnd, Close, Plus, Check, Pill, Doctor, Clock, Spark, Send,
    Eye, EyeOff, Phone, Lock, Mail, Logout, Settings, More, Dashboard, Users, Route, Shield, Video
}

@Composable
fun AuraIcon(
    glyph: AuraGlyph,
    contentDescription: String? = null,
    modifier: Modifier = Modifier,
    tint: Color = Color.White,
    size: Dp = 24.dp,
    stroke: Float = 1.75f,
    filled: Boolean = false
) {
    val semanticsModifier = if (contentDescription != null) {
        Modifier.semantics { this.contentDescription = contentDescription }
    } else Modifier
    Canvas(modifier = modifier.size(size).then(semanticsModifier)) {
        drawAuraGlyph(glyph, tint, stroke, filled)
    }
}

fun DrawScope.drawAuraGlyph(
    glyph: AuraGlyph,
    tint: Color,
    strokeWidth: Float = 1.75f,
    filled: Boolean = false
) {
    val unit = size.minDimension / 24f
    val sw = strokeWidth * unit
    val stroke = Stroke(width = sw, cap = StrokeCap.Round, join = StrokeJoin.Round)
    val fill = if (filled) Fill else stroke

    fun o(x: Float, y: Float) = Offset(x * unit, y * unit)
    fun line(x1: Float, y1: Float, x2: Float, y2: Float) =
        drawLine(tint, o(x1, y1), o(x2, y2), strokeWidth = sw, cap = StrokeCap.Round)

    fun p(vararg points: Float): Path = Path().apply {
        moveTo(points[0] * unit, points[1] * unit)
        var i = 2
        while (i + 1 < points.size) {
            lineTo(points[i] * unit, points[i + 1] * unit)
            i += 2
        }
    }

    when (glyph) {
        AuraGlyph.Home -> {
            drawPath(p(3f, 11f, 12f, 3.5f, 21f, 11f), tint, style = stroke)
            drawPath(p(5.4f, 9.6f, 5.4f, 20.5f, 18.6f, 20.5f, 18.6f, 9.6f), tint, style = stroke)
            drawPath(p(9.6f, 20.5f, 9.6f, 14.4f, 14.4f, 14.4f, 14.4f, 20.5f), tint, style = stroke)
        }
        AuraGlyph.Calendar -> {
            drawRoundRect(
                tint, topLeft = o(3.5f, 5.5f), size = Size(17f * unit, 15f * unit),
                cornerRadius = CornerRadius(3.2f * unit), style = stroke
            )
            line(3.5f, 9.6f, 20.5f, 9.6f)
            line(8f, 3f, 8f, 7.2f)
            line(16f, 3f, 16f, 7.2f)
            listOf(8f to 13f, 12f to 13f, 16f to 13f, 8f to 17f, 12f to 17f).forEach {
                drawCircle(tint, radius = 1.15f * unit, center = o(it.first, it.second))
            }
        }
        AuraGlyph.Records -> {
            drawRoundRect(
                tint, topLeft = o(5f, 2.8f), size = Size(14f * unit, 18.4f * unit),
                cornerRadius = CornerRadius(2.6f * unit), style = stroke
            )
            line(8.2f, 8f, 15.8f, 8f)
            line(8.2f, 12f, 15.8f, 12f)
            line(8.2f, 16f, 13.2f, 16f)
        }
        AuraGlyph.Profile -> {
            drawCircle(tint, radius = 3.6f * unit, center = o(12f, 8.2f), style = stroke)
            val path = Path().apply {
                moveTo(4.6f * unit, 20.6f * unit)
                cubicTo(5.2f * unit, 16.2f * unit, 8.2f * unit, 14.7f * unit, 12f * unit, 14.7f * unit)
                cubicTo(15.8f * unit, 14.7f * unit, 18.8f * unit, 16.2f * unit, 19.4f * unit, 20.6f * unit)
            }
            drawPath(path, tint, style = stroke)
        }
        AuraGlyph.Search -> {
            drawCircle(tint, radius = 6.1f * unit, center = o(10.8f, 10.6f), style = stroke)
            line(15.2f, 15.1f, 20.5f, 20.4f)
        }
        AuraGlyph.Bell -> {
            val path = Path().apply {
                moveTo(5.7f * unit, 17.4f * unit)
                cubicTo(6.5f * unit, 16.2f * unit, 7.2f * unit, 15.4f * unit, 7.2f * unit, 11.4f * unit)
                cubicTo(7.2f * unit, 7.7f * unit, 9.2f * unit, 5.4f * unit, 12f * unit, 5.4f * unit)
                cubicTo(14.8f * unit, 5.4f * unit, 16.8f * unit, 7.7f * unit, 16.8f * unit, 11.4f * unit)
                cubicTo(16.8f * unit, 15.4f * unit, 17.5f * unit, 16.2f * unit, 18.3f * unit, 17.4f * unit)
                close()
            }
            drawPath(path, tint, style = stroke)
            line(10.2f, 20.3f, 13.8f, 20.3f)
            line(12f, 3.2f, 12f, 4.6f)
        }
        AuraGlyph.Chat -> {
            drawRoundRect(
                tint, topLeft = o(3.2f, 4.4f), size = Size(17.6f * unit, 13f * unit),
                cornerRadius = CornerRadius(4.6f * unit), style = stroke
            )
            drawPath(p(8.6f, 17.2f, 7f, 21f, 12.2f, 17.7f), tint, style = stroke)
            drawCircle(tint, 1.1f * unit, o(8.2f, 11f))
            drawCircle(tint, 1.1f * unit, o(12f, 11f))
            drawCircle(tint, 1.1f * unit, o(15.8f, 11f))
        }
        AuraGlyph.Heart -> {
            val path = Path().apply {
                moveTo(12f * unit, 20.4f * unit)
                cubicTo(4.2f * unit, 15.4f * unit, 3.1f * unit, 11f * unit, 5.5f * unit, 8.1f * unit)
                cubicTo(7.6f * unit, 5.6f * unit, 10.8f * unit, 6.2f * unit, 12f * unit, 8.7f * unit)
                cubicTo(13.2f * unit, 6.2f * unit, 16.4f * unit, 5.6f * unit, 18.5f * unit, 8.1f * unit)
                cubicTo(20.9f * unit, 11f * unit, 19.8f * unit, 15.4f * unit, 12f * unit, 20.4f * unit)
                close()
            }
            drawPath(path, tint, style = fill)
        }
        AuraGlyph.Star -> {
            val path = Path()
            repeat(10) { i ->
                val angle = (-PI / 2 + i * PI / 5).toFloat()
                val r = if (i % 2 == 0) 8.8f else 3.9f
                val x = (12f + cos(angle) * r) * unit
                val y = (12.2f + sin(angle) * r) * unit
                if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
            }
            path.close()
            drawPath(path, tint, style = fill)
        }
        AuraGlyph.Location -> {
            val path = Path().apply {
                moveTo(12f * unit, 21.5f * unit)
                cubicTo(9.4f * unit, 18f * unit, 5.4f * unit, 14.6f * unit, 5.4f * unit, 10.1f * unit)
                cubicTo(5.4f * unit, 6.2f * unit, 8.3f * unit, 3.3f * unit, 12f * unit, 3.3f * unit)
                cubicTo(15.7f * unit, 3.3f * unit, 18.6f * unit, 6.2f * unit, 18.6f * unit, 10.1f * unit)
                cubicTo(18.6f * unit, 14.6f * unit, 14.6f * unit, 18f * unit, 12f * unit, 21.5f * unit)
                close()
            }
            drawPath(path, tint, style = stroke)
            drawCircle(tint, radius = 2.5f * unit, center = o(12f, 10f), style = stroke)
        }
        AuraGlyph.ChevronStart -> drawPath(p(9f, 5f, 16f, 12f, 9f, 19f), tint, style = stroke)
        AuraGlyph.ChevronEnd -> drawPath(p(15f, 5f, 8f, 12f, 15f, 19f), tint, style = stroke)
        AuraGlyph.Close -> {
            line(6f, 6f, 18f, 18f)
            line(18f, 6f, 6f, 18f)
        }
        AuraGlyph.Plus -> {
            line(12f, 4f, 12f, 20f)
            line(4f, 12f, 20f, 12f)
        }
        AuraGlyph.Check -> drawPath(p(4f, 12.6f, 9.4f, 18f, 20f, 6.2f), tint, style = stroke)
        AuraGlyph.Pill -> {
            rotate(degrees = -35f, pivot = center) {
                drawRoundRect(
                    tint, topLeft = o(5.5f, 8f), size = Size(13f * unit, 8f * unit),
                    cornerRadius = CornerRadius(4f * unit), style = stroke
                )
                line(12f, 8.3f, 12f, 15.7f)
            }
        }
        AuraGlyph.Doctor -> {
            drawCircle(tint, radius = 3.5f * unit, center = o(12f, 7.3f), style = stroke)
            line(12f, 6.2f, 12f, 8.5f)
            line(10.9f, 7.35f, 13.1f, 7.35f)
            val steth = Path().apply {
                moveTo(5.4f * unit, 11.5f * unit)
                cubicTo(5.4f * unit, 16.2f * unit, 8f * unit, 17.5f * unit, 10.6f * unit, 17.5f * unit)
                moveTo(18.6f * unit, 11.5f * unit)
                cubicTo(18.6f * unit, 16.2f * unit, 16f * unit, 17.5f * unit, 13.4f * unit, 17.5f * unit)
            }
            drawPath(steth, tint, style = stroke)
            drawCircle(tint, radius = 2.1f * unit, center = o(12f, 19.2f), style = stroke)
            line(12f, 17.5f, 12f, 17.1f)
        }
        AuraGlyph.Clock -> {
            drawCircle(tint, radius = 8.6f * unit, center = o(12f, 12f), style = stroke)
            line(12f, 12f, 12f, 6.8f)
            line(12f, 12f, 16.2f, 14.4f)
            drawCircle(tint, 1.1f * unit, o(12f, 12f))
        }
        AuraGlyph.Spark -> {
            val path = Path().apply {
                moveTo(12f * unit, 2.8f * unit)
                quadraticBezierTo(13.2f * unit, 9.2f * unit, 21.2f * unit, 12f * unit)
                quadraticBezierTo(13.2f * unit, 14.8f * unit, 12f * unit, 21.2f * unit)
                quadraticBezierTo(10.8f * unit, 14.8f * unit, 2.8f * unit, 12f * unit)
                quadraticBezierTo(10.8f * unit, 9.2f * unit, 12f * unit, 2.8f * unit)
                close()
            }
            drawPath(path, tint, style = fill)
        }
        AuraGlyph.Send -> {
            drawPath(p(3f, 11.2f, 21f, 3.4f, 14.1f, 20.8f, 10.8f, 13.4f, 3f, 11.2f), tint, style = stroke)
            line(10.8f, 13.4f, 21f, 3.4f)
        }
        AuraGlyph.Eye -> {
            val path = Path().apply {
                moveTo(2.4f * unit, 12f * unit)
                cubicTo(6.1f * unit, 6.3f * unit, 17.9f * unit, 6.3f * unit, 21.6f * unit, 12f * unit)
                cubicTo(17.9f * unit, 17.7f * unit, 6.1f * unit, 17.7f * unit, 2.4f * unit, 12f * unit)
                close()
            }
            drawPath(path, tint, style = stroke)
            drawCircle(tint, radius = 2.9f * unit, center = o(12f, 12f), style = stroke)
        }
        AuraGlyph.EyeOff -> {
            val path = Path().apply {
                moveTo(2.4f * unit, 12f * unit)
                cubicTo(6.1f * unit, 6.3f * unit, 17.9f * unit, 6.3f * unit, 21.6f * unit, 12f * unit)
                cubicTo(17.9f * unit, 17.7f * unit, 6.1f * unit, 17.7f * unit, 2.4f * unit, 12f * unit)
                close()
            }
            drawPath(path, tint, style = stroke)
            drawCircle(tint, radius = 2.9f * unit, center = o(12f, 12f), style = stroke)
            line(4f, 20f, 20f, 4f)
        }
        AuraGlyph.Phone -> {
            val path = Path().apply {
                moveTo(7.1f * unit, 3.4f * unit)
                lineTo(9.7f * unit, 8f * unit)
                lineTo(7.6f * unit, 10.2f * unit)
                cubicTo(9f * unit, 13.2f * unit, 10.8f * unit, 15f * unit, 13.8f * unit, 16.4f * unit)
                lineTo(16f * unit, 14.3f * unit)
                lineTo(20.6f * unit, 16.9f * unit)
                lineTo(20.2f * unit, 19.4f * unit)
                cubicTo(20f * unit, 20.6f * unit, 19f * unit, 21f * unit, 17.8f * unit, 20.8f * unit)
                cubicTo(10f * unit, 19.7f * unit, 4.3f * unit, 14f * unit, 3.2f * unit, 6.2f * unit)
                cubicTo(3f * unit, 5f * unit, 3.4f * unit, 4f * unit, 4.6f * unit, 3.8f * unit)
                close()
            }
            drawPath(path, tint, style = stroke)
        }
        AuraGlyph.Lock -> {
            drawRoundRect(
                tint, topLeft = o(4.8f, 10.4f), size = Size(14.4f * unit, 10.2f * unit),
                cornerRadius = CornerRadius(2.6f * unit), style = stroke
            )
            val shackle = Path().apply {
                moveTo(8f * unit, 10.4f * unit)
                lineTo(8f * unit, 8.2f * unit)
                cubicTo(8f * unit, 5.8f * unit, 9.6f * unit, 4.2f * unit, 12f * unit, 4.2f * unit)
                cubicTo(14.4f * unit, 4.2f * unit, 16f * unit, 5.8f * unit, 16f * unit, 8.2f * unit)
                lineTo(16f * unit, 10.4f * unit)
            }
            drawPath(shackle, tint, style = stroke)
            drawCircle(tint, radius = 1.25f * unit, center = o(12f, 15.2f))
        }
        AuraGlyph.Mail -> {
            drawRoundRect(
                tint, topLeft = o(3f, 5.4f), size = Size(18f * unit, 13.2f * unit),
                cornerRadius = CornerRadius(2.4f * unit), style = stroke
            )
            drawPath(p(3.6f, 7f, 12f, 13.3f, 20.4f, 7f), tint, style = stroke)
        }
        AuraGlyph.Logout -> {
            drawPath(p(10f, 4f, 4.8f, 4f, 4.8f, 20f, 10f, 20f), tint, style = stroke)
            line(10f, 12f, 21f, 12f)
            drawPath(p(17f, 8f, 21f, 12f, 17f, 16f), tint, style = stroke)
        }
        AuraGlyph.Settings -> {
            drawCircle(tint, radius = 3.2f * unit, center = o(12f, 12f), style = stroke)
            drawCircle(tint, radius = 7.8f * unit, center = o(12f, 12f), style = stroke)
            repeat(8) { i ->
                val a = i * PI / 4
                line(
                    (12 + cos(a) * 7.8f).toFloat(), (12 + sin(a) * 7.8f).toFloat(),
                    (12 + cos(a) * 9.4f).toFloat(), (12 + sin(a) * 9.4f).toFloat()
                )
            }
        }
        AuraGlyph.More -> {
            drawCircle(tint, 1.6f * unit, o(5f, 12f))
            drawCircle(tint, 1.6f * unit, o(12f, 12f))
            drawCircle(tint, 1.6f * unit, o(19f, 12f))
        }
        AuraGlyph.Dashboard -> {
            listOf(3.5f to 3.5f, 13.5f to 3.5f, 3.5f to 13.5f, 13.5f to 13.5f).forEach {
                drawRoundRect(
                    tint, topLeft = o(it.first, it.second),
                    size = Size(7f * unit, 7f * unit),
                    cornerRadius = CornerRadius(2.2f * unit), style = stroke
                )
            }
        }
        AuraGlyph.Users -> {
            drawCircle(tint, radius = 3.1f * unit, center = o(9f, 8.2f), style = stroke)
            drawPath(p(2.8f, 19.8f, 3.2f, 17f, 5.5f, 15.2f, 9f, 15.2f, 12.5f, 15.2f, 14.8f, 17f, 15.2f, 19.8f), tint, style = stroke)
            drawCircle(tint, radius = 2.6f * unit, center = o(17f, 8.5f), style = stroke)
            drawPath(p(16f, 15.2f, 18f, 15.2f, 20.4f, 16.8f, 21.2f, 19.8f), tint, style = stroke)
        }
        AuraGlyph.Route -> {
            drawCircle(tint, radius = 2.2f * unit, center = o(6f, 6f), style = stroke)
            drawCircle(tint, radius = 2.2f * unit, center = o(18f, 18f), style = stroke)
            val path = Path().apply {
                moveTo(6f * unit, 8.2f * unit)
                lineTo(6f * unit, 12f * unit)
                cubicTo(6f * unit, 15f * unit, 9f * unit, 15f * unit, 12f * unit, 15f * unit)
                cubicTo(15f * unit, 15f * unit, 18f * unit, 15f * unit, 18f * unit, 15.8f * unit)
            }
            drawPath(path, tint, style = stroke)
        }
        AuraGlyph.Shield -> {
            val path = Path().apply {
                moveTo(12f * unit, 2.8f * unit)
                lineTo(20f * unit, 6f * unit)
                lineTo(20f * unit, 11.2f * unit)
                cubicTo(20f * unit, 16f * unit, 16.6f * unit, 19.7f * unit, 12f * unit, 21.2f * unit)
                cubicTo(7.4f * unit, 19.7f * unit, 4f * unit, 16f * unit, 4f * unit, 11.2f * unit)
                lineTo(4f * unit, 6f * unit)
                close()
            }
            drawPath(path, tint, style = stroke)
            drawPath(p(8.4f, 11.8f, 11f, 14.4f, 15.8f, 9.4f), tint, style = stroke)
        }
        AuraGlyph.Video -> {
            drawRoundRect(
                tint, topLeft = o(2.8f, 6.2f), size = Size(12.8f * unit, 11.6f * unit),
                cornerRadius = CornerRadius(2.6f * unit), style = stroke
            )
            drawPath(p(15.6f, 10.2f, 21.2f, 7f, 21.2f, 17f, 15.6f, 13.8f), tint, style = stroke)
        }
    }
}
