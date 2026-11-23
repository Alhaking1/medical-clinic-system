package com.medical.clinic.utils

import android.content.Context
import android.util.Log
import com.medical.clinic.data.api.ApiClient
import com.medical.clinic.data.local.SessionManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * فحص سريع للإشعارات في الواجهة أثناء فتح التطبيق (كل 5 ثواني)
 */
@Singleton
class NotificationPoller @Inject constructor(
    @ApplicationContext private val context: Context,
    private val apiClient: ApiClient,
    private val sessionManager: SessionManager
) {

    private var pollingJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    fun start(onNewNotification: (title: String, body: String, notifId: Int) -> Boolean) {
        stop()

        if (!sessionManager.isLoggedIn()) {
            return
        }

        // أيضاً جدولة التنبيهات في الخلفية في حال تم إغلاق التطبيق لاحقاً
        NotificationAlarmReceiver.scheduleNext(context)

        pollingJob = scope.launch {
            while (isActive) {
                try {
                    val response = apiClient.apiService.getNotifications(unreadOnly = 1)
                    if (response.success && response.data != null) {
                        for (notification in response.data) {
                            val wasDisplayed = onNewNotification(
                                notification.title,
                                notification.body ?: "",
                                notification.id
                            )

                            if (wasDisplayed) {
                                try {
                                    apiClient.apiService.markNotificationRead(notification.id)
                                } catch (e: Exception) {
                                    Log.w(TAG, "Failed to mark notification ${notification.id} as read", e)
                                }
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.d(TAG, "Poller error: ${e.message}")
                }

                delay(10_000) // كل 10 ثواني أثناء فتح التطبيق
            }
        }
    }

    fun stop() {
        pollingJob?.cancel()
        pollingJob = null
    }

    companion object {
        private const val TAG = "NotificationPoller"
    }
}