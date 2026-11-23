package com.medical.clinic.ui.doctor

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.medical.clinic.R
import com.medical.clinic.data.models.DoctorStats
import com.medical.clinic.ui.base.BaseFragment
import com.medical.clinic.viewmodel.DoctorDashboardViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class DoctorDashboardFragment : BaseFragment() {

    private val viewModel: DoctorDashboardViewModel by viewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_doctor_dashboard, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val user = sessionManager.getUser()

        view.findViewById<TextView>(R.id.tvWelcome).text =
            "مرحباً، ${user?.fullName?.ifEmpty { "—" } ?: "—"}"
        view.findViewById<TextView>(R.id.tvClinic).text =
            user?.clinicName ?: "العيادة"

        // ⚠️ لا نستدعي API إذا لم يُكمل الملف
        if (isProfileComplete() && user?.id != -1) {
            user?.id?.let { viewModel.loadStats(it) }
        } else {
            // عرض قيم صفرية
            view.findViewById<TextView>(R.id.tvTotalToday)?.text = "0"
            view.findViewById<TextView>(R.id.tvCompleted)?.text = "0"
            view.findViewById<TextView>(R.id.tvWaiting)?.text = "0"
            view.findViewById<TextView>(R.id.tvInProgress)?.text = "0"
            view.findViewById<TextView>(R.id.tvNewPatients)?.text = "0"
            view.findViewById<TextView>(R.id.tvRevenue)?.text = "0"
        }

        observeStats()
        animateEntry(view)
    }

    private fun animateEntry(view: View) {
        val ids = listOf(
            R.id.headerCard,
            R.id.statsGrid,
            R.id.quickActionsCard,
            R.id.queueCard
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

    private fun observeStats() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.stats.collect { stats ->
                    if (stats != null) {
                        updateUI(stats)
                    }
                }
            }
        }
    }

    private fun updateUI(stats: DoctorStats) {
        view?.findViewById<TextView>(R.id.tvTotalToday)?.text = stats.total.toString()
        view?.findViewById<TextView>(R.id.tvCompleted)?.text = stats.completed.toString()
        view?.findViewById<TextView>(R.id.tvWaiting)?.text = stats.waiting.toString()
        view?.findViewById<TextView>(R.id.tvInProgress)?.text = stats.inProgress.toString()
        view?.findViewById<TextView>(R.id.tvNewPatients)?.text = stats.newPatients.toString()
        view?.findViewById<TextView>(R.id.tvRevenue)?.text = stats.totalRevenue.toString()
    }
}