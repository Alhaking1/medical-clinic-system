package com.medical.clinic

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.ui.main.MainActivity
import com.medical.clinic.utils.NotificationPoller
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class MedicalClinicApplication : Application() {

    @Inject lateinit var notificationPoller: NotificationPoller
    @Inject lateinit var sessionManager: SessionManager

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "🚀 Application started")

        // تطبيق الوضع المفضل للمستخدم (ليلي / نهاري / نظام)
        com.medical.clinic.utils.ThemeManager.applyTheme(this)

        com.medical.clinic.utils.NotificationHelper.createNotificationChannel(this)

        // بدء الإشعارات فوراً بالخلفية وفي التطبيق إذا كان المستخدم مسجّلاً
        if (sessionManager.isLoggedIn()) {
            com.medical.clinic.utils.NotificationAlarmReceiver.scheduleNext(this)
            notificationPoller.start { title, body, id ->
                com.medical.clinic.utils.NotificationHelper.showNotification(this, title, body, id)
            }
        } else {
            Log.d(TAG, "⏸️ Not logged in — polling not started")
        }
    }

    /**
     * إنشاء قناة الإشعارات (مطلوب لـ Android 8+)
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "إشعارات العيادة"
            val description = "إشعارات المواعيد والموافقات"
            val importance = NotificationManager.IMPORTANCE_HIGH

            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                this.description = description
                enableVibration(true)
                enableLights(true)
            }

            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
            Log.d(TAG, "📢 Notification channel created")
        }
    }

    /**
     * عرض إشعار Android System
     */
    private fun showSystemNotification(title: String, body: String) {
        try {
            // Intent لفتح MainActivity عند الضغط
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // بناء الإشعار
            val notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)  // ← بديل مؤقت
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .build()

            // عرض الإشعار
            val notificationManager = NotificationManagerCompat.from(this)
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                notificationManager.areNotificationsEnabled()) {
                notificationManager.notify(
                    System.currentTimeMillis().toInt(),
                    notification
                )
                Log.d(TAG, "🔔 Notification shown: $title")
            } else {
                Log.w(TAG, "⚠️ Notifications disabled by user")
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "❌ Permission denied: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to show notification: ${e.message}")
        }
    }

    companion object {
        private const val TAG = "MedicalClinicApp"
        private const val CHANNEL_ID = "medical_clinic_notifications"
    }
}