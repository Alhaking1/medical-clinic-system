package com.medical.clinic.utils

import java.text.SimpleDateFormat
import java.util.Locale

object DateTimeUtils {

    /**
     * يحول التاريخ من yyyy-MM-dd إلى صيغة عربية دقيقة
     * مثال: 2026-10-08 -> الخميس 8 أكتوبر 2026
     */
    fun formatArabicDate(dateStr: String?): String {
        if (dateStr.isNullOrBlank()) return "اليوم"
        val trimmed = dateStr.trim().take(10)
        return try {
            val parser = SimpleDateFormat("yyyy-MM-dd", Locale.ENGLISH)
            val date = parser.parse(trimmed) ?: return dateStr
            val formatter = SimpleDateFormat("EEEE d MMMM yyyy", Locale("ar"))
            formatter.format(date)
        } catch (e: Exception) {
            dateStr
        }
    }

    /**
     * يحول التوقيت من صيغة 24 ساعة إلى 12 ساعة بنظام صباحاً / مساءً
     * مثال: 09:00 -> 9:00 صباحاً
     * مثال: 16:30 -> 4:30 مساءً
     */
    fun formatArabicTime(timeStr: String?): String {
        if (timeStr.isNullOrBlank()) return ""
        val cleanTime = timeStr.trim().take(5)
        return try {
            val parser = SimpleDateFormat("HH:mm", Locale.ENGLISH)
            val date = parser.parse(cleanTime) ?: return timeStr
            val formatter = SimpleDateFormat("h:mm a", Locale("ar"))
            var formatted = formatter.format(date)
            // توحيد الحروف إلى الكلمات الكاملة الفخمة
            formatted = formatted.replace("AM", "صباحاً")
                .replace("PM", "مساءً")
                .replace("ص", "صباحاً")
                .replace("م", "مساءً")
                .trim()
            formatted
        } catch (e: Exception) {
            timeStr
        }
    }

    /**
     * دمج وقت البداية والنهاية بصيغة عربية جذابة
     */
    fun formatArabicTimeRange(startTime: String?, endTime: String?): String {
        val s = formatArabicTime(startTime)
        val e = formatArabicTime(endTime)
        return if (s.isNotBlank() && e.isNotBlank()) {
            "من $s إلى $e"
        } else if (s.isNotBlank()) {
            s
        } else {
            ""
        }
    }
}
