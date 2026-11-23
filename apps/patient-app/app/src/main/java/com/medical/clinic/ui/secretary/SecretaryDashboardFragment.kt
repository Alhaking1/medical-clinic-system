package com.medical.clinic.ui.secretary

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.medical.clinic.R
import com.medical.clinic.data.local.SessionManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class SecretaryDashboardFragment : Fragment() {

    @Inject
    lateinit var sessionManager: SessionManager

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_secretary_dashboard, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val user = sessionManager.getUser()

        view.findViewById<TextView>(R.id.tvWelcome).text =
            "مرحباً، ${user?.fullName ?: ""}"
        view.findViewById<TextView>(R.id.tvClinic).text =
            "العيادة: ${user?.clinicName ?: "غير محددة"}"

        // إحصائيات تجريبية
        view.findViewById<TextView>(R.id.tvDoctorsCount).text = "0"
        view.findViewById<TextView>(R.id.tvAppointmentsCount).text = "0"

        animateEntry(view)
    }

    private fun animateEntry(view: View) {
        val ids = listOf(
            R.id.headerCard,
            R.id.statsGrid,
            R.id.quickActionsCard
        )

        ids.forEachIndexed { index, id ->
            view.findViewById<View>(id)?.let { v ->
                v.alpha = 0f
                v.translationY = 30f
                v.animate()
                    .alpha(1f)
                    .translationY(0f)
                    .setDuration(400)
                    .setStartDelay((index * 100).toLong())
                    .start()
            }
        }
    }
}
