package com.medical.clinic.utils

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log
import com.medical.clinic.data.api.ApiClient
import com.medical.clinic.data.local.SessionManager
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.AndroidEntryPoint
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * مستقبل تنبيهات الخلفية (يعمل حتى لو كان التطبيق مغلقاً بالكامل)
 */
@AndroidEntryPoint
class NotificationAlarmReceiver : BroadcastReceiver() {

    @EntryPoint
    @InstallIn(SingletonComponent::class)
    interface ReceiverEntryPoint {
        fun apiClient(): ApiClient
        fun sessionManager(): SessionManager
    }

    @Inject
    lateinit var apiClient: ApiClient

    @Inject
    lateinit var sessionManager: SessionManager

    override fun onReceive(context: Context, intent: Intent) {
        val pendingResult = goAsync()

        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val wakeLock = powerManager?.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "MedicalClinic:NotifAlarmWakeLock"
        )
        wakeLock?.acquire(15_000L)

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val effectiveSession = try {
                    if (::sessionManager.isInitialized) sessionManager
                    else EntryPointAccessors.fromApplication(
                        context.applicationContext,
                        ReceiverEntryPoint::class.java
                    ).sessionManager()
                } catch (e: Exception) {
                    null
                }

                val effectiveApiClient = try {
                    if (::apiClient.isInitialized) apiClient
                    else EntryPointAccessors.fromApplication(
                        context.applicationContext,
                        ReceiverEntryPoint::class.java
                    ).apiClient()
                } catch (e: Exception) {
                    null
                }

                if (effectiveSession != null && effectiveApiClient != null && effectiveSession.isLoggedIn()) {
                    val res = effectiveApiClient.apiService.getNotifications(unreadOnly = 1)
                    if (res.success && res.data != null) {
                        for (notif in res.data) {
                            val wasDisplayed = NotificationHelper.showNotification(
                                context,
                                notif.title,
                                notif.body ?: "",
                                notif.id
                            )
                            if (wasDisplayed) {
                                try {
                                    effectiveApiClient.apiService.markNotificationRead(notif.id)
                                } catch (e: Exception) {
                                    Log.w(TAG, "Failed to mark notification ${notif.id} as read", e)
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error checking notifications in background: ${e.message}")
            } finally {
                try {
                    scheduleNext(context)
                } catch (_: Exception) {}
                try {
                    if (wakeLock?.isHeld == true) {
                        wakeLock.release()
                    }
                } catch (_: Exception) {}
                pendingResult.finish()
            }
        }
    }

    companion object {
        private const val TAG = "NotifAlarmReceiver"
        private const val REQUEST_CODE = 8821

        fun scheduleNext(context: Context, delayMillis: Long = 15_000L) {
            try {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
                val intent = Intent(context, NotificationAlarmReceiver::class.java)
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    REQUEST_CODE,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                val triggerAt = System.currentTimeMillis() + delayMillis

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (alarmManager.canScheduleExactAlarms()) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
                    } else {
                        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
                    }
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to schedule next alarm: ${e.message}")
            }
        }

        fun cancel(context: Context) {
            try {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
                val intent = Intent(context, NotificationAlarmReceiver::class.java)
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    REQUEST_CODE,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                alarmManager.cancel(pendingIntent)
            } catch (_: Exception) {}
        }
    }
}
