package com.medical.clinic.staff.ui.doctor

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.medical.clinic.staff.R
import com.medical.clinic.staff.data.local.SessionManager
import com.medical.clinic.staff.data.models.DoctorQueueItem
import com.medical.clinic.staff.data.repository.DoctorRepository
import com.medical.clinic.staff.data.utils.Constants
import com.medical.clinic.staff.data.utils.Resource
import com.medical.clinic.staff.databinding.FragmentDoctorDashboardBinding
import com.medical.clinic.staff.ui.utils.ProfileGuard
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class DoctorDashboardFragment : Fragment() {

    private var _binding: FragmentDoctorDashboardBinding? = null
    private val binding get() = _binding!!

    @Inject
    lateinit var doctorRepository: DoctorRepository

    @Inject
    lateinit var sessionManager: SessionManager

    private var currentPatient: DoctorQueueItem? = null

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentDoctorDashboardBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupListeners()
        loadDashboardData()
    }

    private fun setupListeners() {
        binding.swipeRefresh.setOnRefreshListener {
            loadDashboardData()
        }

        binding.switchOnlineStatus.setOnCheckedChangeListener { buttonView, isChecked ->
            if (sessionManager.isGuestMode() || sessionManager.mustCompleteProfile()) {
                buttonView.isChecked = false
                ProfileGuard.checkOrPrompt(requireContext(), sessionManager) {}
                return@setOnCheckedChangeListener
            }
            if (isChecked) {
                binding.tvDoctorStatusTitle.text = getString(R.string.doctor_status_online)
                binding.viewLiveDot.setBackgroundResource(R.drawable.bg_status_accepted)
            } else {
                binding.tvDoctorStatusTitle.text = getString(R.string.doctor_status_offline)
                binding.viewLiveDot.setBackgroundResource(R.drawable.bg_status_cancelled)
            }
        }

        binding.btnCallNext.setOnClickListener {
            ProfileGuard.checkOrPrompt(requireContext(), sessionManager) {
                callNextPatient()
            }
        }

        binding.btnFinishCurrent.setOnClickListener {
            ProfileGuard.checkOrPrompt(requireContext(), sessionManager) {
                currentPatient?.let { patient ->
                    updatePatientStatus(patient.id, Constants.QUEUE_DONE)
                }
            }
        }

        binding.btnAbsentCurrent.setOnClickListener {
            ProfileGuard.checkOrPrompt(requireContext(), sessionManager) {
                currentPatient?.let { patient ->
                    updatePatientStatus(patient.id, Constants.QUEUE_NO_SHOW)
                }
            }
        }
    }

    fun loadDashboardData() {
        if (sessionManager.isGuestMode() || sessionManager.mustCompleteProfile()) {
            binding.swipeRefresh.isRefreshing = false
            binding.tvStatTotal.text = "0"
            binding.tvStatWaiting.text = "0"
            binding.tvStatDone.text = "0"
            binding.tvStatRevenue.text = "0 ر.ي"
            binding.tvCurrentPatientQueueNumber.text = "✨"
            binding.tvCurrentPatientName.text = "مرحباً دكتور في وضع التجربة"
            binding.tvCurrentPatientPhone.text = "أكمل ملفك المهني لبدء استقبال وحجز المرضى"
            binding.layoutCurrentActions.visibility = View.GONE
            return
        }

        val user = sessionManager.getUser() ?: return
        binding.swipeRefresh.isRefreshing = true

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                // 1. Fetch Stats
                val statsRes = doctorRepository.getStats(user.id)
                val b = _binding ?: return@launch
                if (statsRes is Resource.Success && statsRes.data != null) {
                    val stats = statsRes.data
                    b.tvStatTotal.text = "${stats.queue?.total ?: 0}"
                    b.tvStatWaiting.text = "${stats.queue?.waiting ?: 0}"
                    b.tvStatDone.text = "${stats.queue?.done ?: 0}"
                    val fee = user.consultationFee ?: 0.0
                    val totalRev = (stats.queue?.done ?: 0) * fee
                    b.tvStatRevenue.text = "${totalRev.toInt()} ر.ي"
                }

                // 2. Fetch Queue to find in_progress patient
                val queueRes = doctorRepository.getQueue(user.id)
                val b2 = _binding ?: return@launch
                if (queueRes is Resource.Success && queueRes.data != null) {
                    val queue = queueRes.data
                    val inProgress = queue.firstOrNull { it.status == Constants.QUEUE_IN_PROGRESS }
                    currentPatient = inProgress
                    if (inProgress != null) {
                        b2.tvCurrentPatientQueueNumber.text = "#${inProgress.queueNumber}"
                        b2.tvCurrentPatientName.text = inProgress.patientName
                        b2.tvCurrentPatientPhone.text = inProgress.patientPhone ?: "داخل الكشف الآن"
                        b2.layoutCurrentActions.visibility = View.VISIBLE
                    } else {
                        val nextWaiting = queue.firstOrNull { it.status == Constants.QUEUE_WAITING }
                        b2.layoutCurrentActions.visibility = View.GONE
                        if (nextWaiting != null) {
                            b2.tvCurrentPatientQueueNumber.text = "#${nextWaiting.queueNumber}"
                            b2.tvCurrentPatientName.text = "التالي: ${nextWaiting.patientName}"
                            b2.tvCurrentPatientPhone.text = "في انتظار المناداة"
                        } else {
                            b2.tvCurrentPatientQueueNumber.text = "✓"
                            b2.tvCurrentPatientName.text = getString(R.string.no_patient_in_clinic)
                            b2.tvCurrentPatientPhone.text = "تم الانتهاء من جميع الكشوفات اليوم"
                        }
                    }
                }
            } catch (e: Exception) {
                // handle error safely
            } finally {
                _binding?.swipeRefresh?.isRefreshing = false
            }
        }
    }

    private fun callNextPatient() {
        val user = sessionManager.getUser() ?: return
        viewLifecycleOwner.lifecycleScope.launch {
            val queueRes = doctorRepository.getQueue(user.id)
            if (queueRes is Resource.Success && queueRes.data != null) {
                val nextWaiting = queueRes.data.firstOrNull { it.status == Constants.QUEUE_WAITING }
                if (nextWaiting != null) {
                    updatePatientStatus(nextWaiting.id, Constants.QUEUE_IN_PROGRESS)
                } else {
                    context?.let { ctx ->
                        Toast.makeText(ctx, "لا يوجد مرضى بالانتظار", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
    }

    private fun updatePatientStatus(queueId: Int, newStatus: String) {
        viewLifecycleOwner.lifecycleScope.launch {
            val res = doctorRepository.updateQueueStatus(queueId, newStatus)
            if (res is Resource.Success) {
                context?.let { ctx ->
                    Toast.makeText(ctx, "تم تحديث الحالة بنجاح", Toast.LENGTH_SHORT).show()
                }
                loadDashboardData()
            } else {
                context?.let { ctx ->
                    Toast.makeText(ctx, res.message ?: "فشل تحديث الحالة", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
