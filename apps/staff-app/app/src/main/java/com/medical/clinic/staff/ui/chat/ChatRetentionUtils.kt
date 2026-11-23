package com.medical.clinic.staff.ui.chat

import java.text.ParsePosition
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

object ChatRetentionUtils {
    const val RETENTION_MILLIS = 48L * 60 * 60 * 1000

    fun isRecent(timestamp: String?, nowMillis: Long = System.currentTimeMillis()): Boolean {
        val createdAt = parseTimestamp(timestamp) ?: return false
        return nowMillis - createdAt.time < RETENTION_MILLIS
    }

    private fun parseTimestamp(timestamp: String?): Date? {
        if (timestamp.isNullOrBlank()) return null

        val patterns = listOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
            "yyyy-MM-dd'T'HH:mm:ssXXX",
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd HH:mm:ss"
        )

        for (pattern in patterns) {
            val formatter = SimpleDateFormat(pattern, Locale.US).apply {
                isLenient = false
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val position = ParsePosition(0)
            val parsed = formatter.parse(timestamp, position)
            if (parsed != null && position.index == timestamp.length) {
                return parsed
            }
        }
        return null
    }
}
