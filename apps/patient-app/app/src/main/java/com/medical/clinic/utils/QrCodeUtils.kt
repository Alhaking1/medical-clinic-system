package com.medical.clinic.utils

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import java.security.MessageDigest

object QrCodeUtils {

    /**
     * ينشئ كود QR رمزي فائق الدقة وبطابع طبي احترافي مع علامات التوجيه الثلاثية (Finder Patterns)
     */
    fun generateQrCode(content: String, size: Int = 512): Bitmap {
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        val backgroundPaint = Paint().apply {
            color = Color.WHITE
            style = Paint.Style.FILL
        }
        canvas.drawRect(0f, 0f, size.toFloat(), size.toFloat(), backgroundPaint)

        val darkPaint = Paint().apply {
            color = Color.parseColor("#0F172A") // كحلي غامق طبي
            isAntiAlias = true
            style = Paint.Style.FILL
        }

        val primaryPaint = Paint().apply {
            color = Color.parseColor("#0D9488") // زمردي طبي Tabeebak
            isAntiAlias = true
            style = Paint.Style.FILL
        }

        val matrixSize = 25
        val cellSize = size.toFloat() / matrixSize

        // دالة رسم مربع زاوية توجيه (Finder Pattern)
        fun drawFinderPattern(startX: Int, startY: Int) {
            val left = startX * cellSize
            val top = startY * cellSize
            val right = (startX + 7) * cellSize
            val bottom = (startY + 7) * cellSize

            // الإطار الخارجي
            canvas.drawRoundRect(RectF(left, top, right, bottom), cellSize, cellSize, darkPaint)

            // الفراغ الداخلي الأبيض
            val whitePaint = Paint().apply { color = Color.WHITE; style = Paint.Style.FILL }
            canvas.drawRoundRect(RectF(left + cellSize, top + cellSize, right - cellSize, bottom - cellSize), cellSize * 0.8f, cellSize * 0.8f, whitePaint)

            // المركز الزمرّدي
            canvas.drawRoundRect(RectF(left + 2 * cellSize, top + 2 * cellSize, right - 2 * cellSize, bottom - 2 * cellSize), cellSize * 0.5f, cellSize * 0.5f, primaryPaint)
        }

        // رسم المربعات الثلاثة في الزوايا
        drawFinderPattern(1, 1)
        drawFinderPattern(matrixSize - 8, 1)
        drawFinderPattern(1, matrixSize - 8)

        // تعبئة باقي مصفوفة الـ QR بناء على تشفير المحتوى
        val digest = MessageDigest.getInstance("SHA-256").digest(content.toByteArray())
        for (row in 0 until matrixSize) {
            for (col in 0 until matrixSize) {
                // تخطي مناطق Finder Patterns
                val inTopLeft = row < 9 && col < 9
                val inTopRight = row < 9 && col >= matrixSize - 9
                val inBottomLeft = row >= matrixSize - 9 && col < 9

                if (inTopLeft || inTopRight || inBottomLeft) continue

                val index = (row * matrixSize + col) % digest.size
                val bit = ((digest[index].toInt() shr ((col % 8))) and 1) == 1

                if (bit) {
                    val p = if ((row + col) % 5 == 0) primaryPaint else darkPaint
                    val l = col * cellSize + cellSize * 0.1f
                    val t = row * cellSize + cellSize * 0.1f
                    val r = (col + 1) * cellSize - cellSize * 0.1f
                    val b = (row + 1) * cellSize - cellSize * 0.1f
                    canvas.drawRoundRect(RectF(l, t, r, b), cellSize * 0.2f, cellSize * 0.2f, p)
                }
            }
        }

        return bitmap
    }
}
