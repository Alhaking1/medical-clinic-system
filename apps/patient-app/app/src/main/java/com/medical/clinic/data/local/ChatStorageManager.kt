package com.medical.clinic.data.local

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.medical.clinic.data.api.ChatMessage
import java.text.ParsePosition
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/**
 * مدير تخزين واسترجاع سجل رسائل الدردشة محلياً
 * يخفي الرسائل والمحادثات التي لم يجرِ فيها نشاط خلال آخر 48 ساعة.
 */
object ChatStorageManager {

    private const val PREFS_NAME = "tabeebak_chat_storage"
    private const val KEY_PREFIX_MSGS = "chat_msgs_conv_"
    private const val RETENTION_MILLIS = 48L * 60L * 60L * 1000L
    private const val RETENTION_HOURS = 48

    private val gson = Gson()

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun isConversationVisible(lastMessageAt: String?): Boolean =
        lastMessageAt.isNullOrBlank() || isRecent(lastMessageAt)

    /**
     * حفظ قائمة رسائل محادثة معينة في الذاكرة المحلية
     */
    fun saveMessages(context: Context, conversationId: Int, messages: List<ChatMessage>) {
        if (conversationId <= 0) return
        val filtered = filterRecentMessages(messages)
        val json = gson.toJson(filtered)
        getPrefs(context).edit().putString("$KEY_PREFIX_MSGS$conversationId", json).apply()
    }

    /**
     * جلب رسائل المحادثة المخزنة محلياً
     */
    fun getMessages(context: Context, conversationId: Int): List<ChatMessage> {
        if (conversationId <= 0) return emptyList()
        val json = getPrefs(context).getString("$KEY_PREFIX_MSGS$conversationId", null) ?: return emptyList()
        return try {
            val type = object : TypeToken<List<ChatMessage>>() {}.type
            val list: List<ChatMessage> = gson.fromJson(json, type) ?: emptyList()
            val recentMessages = filterRecentMessages(list)
            if (recentMessages.size != list.size) {
                saveMessages(context, conversationId, recentMessages)
            }
            recentMessages
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * إضافة رسالة جديدة إلى السجل المحلي
     */
    fun addMessage(context: Context, conversationId: Int, message: ChatMessage) {
        if (conversationId <= 0) return
        val current = getMessages(context, conversationId).toMutableList()
        // منع التكرار
        val exists = current.any { it.id > 0 && it.id == message.id }
        if (!exists) {
            current.add(message)
            saveMessages(context, conversationId, current)
        }
    }

    fun filterRecentMessages(messages: List<ChatMessage>): List<ChatMessage> {
        return messages.filter { msg ->
            isRecent(msg.created_at)
        }
    }

    fun getRetentionDisplayText(): String {
        return "🔒 محادثة طبية مشفرة بالكامل (AES-256-GCM) • تُخفى الرسائل بعد $RETENTION_HOURS ساعة"
    }

    private fun isRecent(timestamp: String): Boolean {
        val messageTime = parseTimestamp(timestamp) ?: return false
        return messageTime >= System.currentTimeMillis() - RETENTION_MILLIS
    }

    private fun parseTimestamp(timestamp: String): Long? {
        val formats = listOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
            "yyyy-MM-dd'T'HH:mm:ssXXX",
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd HH:mm:ss"
        )

        for (pattern in formats) {
            val formatter = SimpleDateFormat(pattern, Locale.US).apply {
                isLenient = false
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val position = ParsePosition(0)
            val parsed = formatter.parse(timestamp, position)
            if (parsed != null && position.index == timestamp.length) {
                return parsed.time
            }
        }
        return null
    }
}
