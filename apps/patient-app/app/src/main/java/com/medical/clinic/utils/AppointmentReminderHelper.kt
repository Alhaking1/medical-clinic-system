package com.medical.clinic.utils

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import androidx.core.app.NotificationCompat
import com.medical.clinic.R
import com.medical.clinic.data.models.Appointment
import com.medical.clinic.ui.main.MainActivity
import java.util.Calendar
import java.util.TimeZone

/**
 * مستقبل إشعار التذكير بموعد الكشف الطبي
 * يضمن التنبيه لمرة واحدة فقط وبدون أي تكرار
 */
class AppointmentReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val apptId = intent.getIntExtra("appt_id", 0)
        if (apptId <= 0) return

        val prefs = context.getSharedPreferences(AppointmentReminderHelper.PREFS_REMINDERS, Context.MODE_PRIVATE)
        // 🔒 فحص صارم: التنبيه مرة واحدة فقط والتأكد من عدم التكرار
        if (prefs.getBoolean("${AppointmentReminderHelper.KEY_FIRED_PREFIX}$apptId", false)) {
            return
        }

        // حفظ حالة التنبيه كـ "تم التنبيه بنجاح"
        prefs.edit().putBoolean("${AppointmentReminderHelper.KEY_FIRED_PREFIX}$apptId", true).apply()

        val doctorName = intent.getStringExtra("doctor_name") ?: "الطبيب"
        val clinicName = intent.getStringExtra("clinic_name") ?: "العيادة"
        val periodTime = intent.getStringExtra("period_time") ?: ""
        val bookingCode = intent.getStringExtra("booking_code") ?: ""

        val timeNotice = if (periodTime.isNotBlank()) " في تمام ($periodTime)" else " بعد ساعة واحدة"
        val body = "تذكير: موعد كشفك الطبي لدى $doctorName في $clinicName$timeNotice. رمز الحجز: $bookingCode. يرجى الحضور في الموعد المحدد."

        AppointmentReminderHelper.showNotification(
            context = context,
            title = "⏰ تذكير بموعدك الطبي القادم - طبيبك",
            body = body,
            notificationId = apptId
        )
    }
}

/**
 * مساعد جدولة وتوقيت تنبيهات المواعيد الطبية بدقة تامة
 */
object AppointmentReminderHelper {
    const val PREFS_REMINDERS = "tabeebak_appointment_reminders_prefs"
    const val KEY_SCHEDULED_PREFIX = "scheduled_appt_"
    const val KEY_FIRED_PREFIX = "fired_appt_"

    private const val CHANNEL_ID = "tabeebak_appointment_reminders"
    private const val CHANNEL_NAME = "تذكير مواعيد طبيبك"

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "إشعارات التذكير بمواعيد الكشف الطبي المحددة لمرة واحدة فقط"
                enableVibration(true)
            }
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    fun showNotification(context: Context, title: String, body: String, notificationId: Int = 1001) {
        createNotificationChannel(context)

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_nav_calendar)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(notificationId, notification)
    }

    /**
     * جدولة التنبيه لموعد محدد بالتوقيت الفعلي الدقيق لمرة واحدة وبدون تكرار
     */
    fun schedule1HourReminder(context: Context, appointment: Appointment) {
        if (appointment.id <= 0) return

        val prefs = context.getSharedPreferences(PREFS_REMINDERS, Context.MODE_PRIVATE)

        // إذا كان الموعد ملغياً أو مكتملاً نلغي التنبيه إن وجد
        if (appointment.status == "cancelled" || appointment.status == "completed") {
            cancelReminder(context, appointment.id)
            return
        }

        // إذا تم إطلاق التنبيه مسبقاً لا نكرره نهائياً
        if (prefs.getBoolean("$KEY_FIRED_PREFIX${appointment.id}", false)) {
            return
        }

        // إذا تم جدولة التنبيه مسبقاً بنجاح في هذا الجهاز لا نعيد جدولته
        if (prefs.getBoolean("$KEY_SCHEDULED_PREFIX${appointment.id}", false)) {
            return
        }

        val apptTimestamp = parseAppointmentDateTime(appointment.periodDate, appointment.periodStartTime) ?: return
        val now = System.currentTimeMillis()

        // إذا انقضى وقت الموعد لا ننبه
        if (apptTimestamp <= now) {
            prefs.edit().putBoolean("$KEY_FIRED_PREFIX${appointment.id}", true).apply()
            return
        }

        createNotificationChannel(context)

        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return

            val intent = Intent(context, AppointmentReminderReceiver::class.java).apply {
                putExtra("appt_id", appointment.id)
                putExtra("doctor_name", appointment.doctorName ?: "الطبيب")
                putExtra("clinic_name", appointment.clinicName ?: "العيادة")
                putExtra("booking_code", appointment.bookingCode ?: "")
                putExtra("period_time", appointment.periodStartTime ?: "")
            }

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                appointment.id,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // التنبيه قبل الموعد بساعة (60 دقيقة)
            var triggerTime = apptTimestamp - (60L * 60L * 1000L)
            if (triggerTime <= now) {
                // إذا كان المتبقي أقل من ساعة، يتم التنبيه بعد 15 ثانية فورياً كإشعار تذكير
                triggerTime = now + 15000L
            }

            // ضبط التنبيه الدقيق مرة واحدة
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
            }

            // حفظ حالة الجدولة لمنع أي تكرار
            prefs.edit().putBoolean("$KEY_SCHEDULED_PREFIX${appointment.id}", true).apply()

        } catch (e: Exception) {
            // تجاهل أخطاء صلاحيات ExactAlarm في أندرويد 12+ واستخدام المنبه العادي كبديل
            try {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
                val intent = Intent(context, AppointmentReminderReceiver::class.java).apply {
                    putExtra("appt_id", appointment.id)
                    putExtra("doctor_name", appointment.doctorName ?: "الطبيب")
                    putExtra("clinic_name", appointment.clinicName ?: "العيادة")
                    putExtra("booking_code", appointment.bookingCode ?: "")
                }
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    appointment.id,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                alarmManager.set(AlarmManager.RTC_WAKEUP, apptTimestamp, pendingIntent)
                prefs.edit().putBoolean("$KEY_SCHEDULED_PREFIX${appointment.id}", true).apply()
            } catch (_: Exception) {}
        }
    }

    /**
     * إلغاء تنبيه الموعد
     */
    fun cancelReminder(context: Context, appointmentId: Int) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val intent = Intent(context, AppointmentReminderReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                appointmentId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
        } catch (_: Exception) {}
    }

    /**
     * استخراج توقيت الموعد بالمللي ثانية بتوقيت اليمن الرسمي (GMT+3)
     */
    fun parseAppointmentDateTime(dateStr: String?, timeStr: String?): Long? {
        if (dateStr.isNullOrBlank()) return null
        val calendar = Calendar.getInstance(TimeZone.getTimeZone("GMT+3"))

        val dateParts = dateStr.trim().split("-")
        if (dateParts.size < 3) return null
        val year = dateParts[0].toIntOrNull() ?: return null
        val month = (dateParts[1].toIntOrNull() ?: return null) - 1
        val day = dateParts[2].toIntOrNull() ?: return null

        calendar.set(Calendar.YEAR, year)
        calendar.set(Calendar.MONTH, month)
        calendar.set(Calendar.DAY_OF_MONTH, day)

        var hour = 9
        var minute = 0
        if (!timeStr.isNullOrBlank()) {
            val clean = timeStr.trim()
            val match = Regex("""(\d{1,2}):(\d{2})""").find(clean)
            if (match != null) {
                hour = match.groupValues[1].toIntOrNull() ?: 9
                minute = match.groupValues[2].toIntOrNull() ?: 0
                val isPm = clean.contains("م") || clean.contains("مساء") || clean.contains("عصر") || clean.contains("ظهر") || clean.lowercase().contains("pm")
                val isAm = clean.contains("ص") || clean.contains("صباح") || clean.lowercase().contains("am")
                if (isPm && hour < 12) {
                    hour += 12
                } else if (isAm && hour == 12) {
                    hour = 0
                }
            }
        }

        calendar.set(Calendar.HOUR_OF_DAY, hour)
        calendar.set(Calendar.MINUTE, minute)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)

        return calendar.timeInMillis
    }
}
