package com.medical.clinic.staff.utils

import android.content.Context
import android.util.Log
import com.medical.clinic.staff.data.api.ApiService
import com.medical.clinic.staff.data.local.SessionManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * فاحص إشعارات سريع للواجهة أثناء فتح تطبيق الكادر الطبي (كل 5 ثواني)
 */
@Singleton
class NotificationPoller @Inject constructor(
    @ApplicationContext private val context: Context,
    private val apiService: ApiService,
    private val sessionManager: SessionManager
) {

    private var pollingJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    fun start(onNewNotification: (title: String, body: String, id: Int) -> Boolean) {
        stop()

        if (!sessionManager.isLoggedIn()) {
            return
        }

        // جدولة فحص الخلفية كذلك
        NotificationAlarmReceiver.scheduleNext(context)

        pollingJob = scope.launch {
            while (isActive) {
                try {
                    val response = apiService.getNotifications(unreadOnly = 1)
                    if (response.isSuccessful && response.body()?.success == true) {
                        val list = response.body()?.data ?: emptyList()
                        for (notification in list) {
                            val displayed = onNewNotification(
                                notification.title,
                                notification.body ?: "",
                                notification.id
                            )
                            if (displayed) {
                                try {
                                    apiService.markNotificationRead(notification.id)
                                } catch (_: Exception) {}
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.d(TAG, "Staff poller error: ${e.message}")
                }

                delay(10_000)
            }
        }
    }

    fun stop() {
        pollingJob?.cancel()
        pollingJob = null
    }

    companion object {
        private const val TAG = "StaffNotificationPoller"
    }
}
