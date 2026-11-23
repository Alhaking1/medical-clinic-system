package com.medical.clinic.staff.utils

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.medical.clinic.staff.ui.main.MainActivity

object NotificationHelper {

    const val CHANNEL_ID = "medical_staff_notifications_v2"
    private const val TAG = "StaffNotifHelper"
    private const val PREFS_NAME = "shown_staff_notifications_cache"

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "إشعارات الكادر الطبي"
            val description = "تنبيهات المواعيد وقائمة الانتظار ورسائل المرضى والتعاميم الإدارية"
            val importance = NotificationManager.IMPORTANCE_HIGH

            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build()

            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                this.description = description
                enableVibration(true)
                enableLights(true)
                setSound(soundUri, audioAttributes)
                vibrationPattern = longArrayOf(0, 350, 150, 350)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun isAlreadyShown(context: Context, notifId: Int): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getBoolean("notif_$notifId", false)
    }

    private fun recordAsShown(context: Context, notifId: Int) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putBoolean("notif_$notifId", true).apply()
    }

    fun showNotification(context: Context, title: String, body: String, notifId: Int? = null): Boolean {
        try {
            val effectiveId = notifId ?: (title + body).hashCode()
            if (isAlreadyShown(context, effectiveId)) {
                Log.d(TAG, "⏭️ تم تجاهل إشعار مكرر للكادر: $effectiveId")
                return true
            }

            createNotificationChannel(context)

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                effectiveId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

            val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setSound(defaultSound)
                .setVibrate(longArrayOf(0, 350, 150, 350))
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .build()

            val notificationManager = NotificationManagerCompat.from(context)
            val channelEnabled = Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
                notificationManager.getNotificationChannel(CHANNEL_ID)?.importance != NotificationManager.IMPORTANCE_NONE
            if (!notificationManager.areNotificationsEnabled() || !channelEnabled) {
                Log.w(TAG, "⚠️ Staff notifications disabled by user")
                return false
            }

            notificationManager.notify(effectiveId, notification)
            recordAsShown(context, effectiveId)
            Log.d(TAG, "🔔 Staff notification displayed: $title (ID: $effectiveId)")
            return true
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to show staff notification: ${e.message}")
            return false
        }
    }
}
