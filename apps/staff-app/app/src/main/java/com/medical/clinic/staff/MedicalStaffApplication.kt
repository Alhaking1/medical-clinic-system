package com.medical.clinic.staff

import android.app.Application
import android.util.Log
import com.medical.clinic.staff.data.local.SessionManager
import com.medical.clinic.staff.utils.NotificationAlarmReceiver
import com.medical.clinic.staff.utils.NotificationHelper
import com.medical.clinic.staff.utils.NotificationPoller
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class MedicalStaffApplication : Application() {

    @Inject
    lateinit var notificationPoller: NotificationPoller

    @Inject
    lateinit var sessionManager: SessionManager

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "🚀 MedicalStaffApplication started")

        com.medical.clinic.staff.utils.ThemeManager.applyTheme(this)

        NotificationHelper.createNotificationChannel(this)

        if (sessionManager.isLoggedIn()) {
            NotificationAlarmReceiver.scheduleNext(this)
            notificationPoller.start { title, body, notifId ->
                NotificationHelper.showNotification(this, title, body, notifId)
            }
        }
    }

    companion object {
        private const val TAG = "MedicalStaffApp"
    }
}
