package com.medical.clinic.staff.ui.doctor

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.medical.clinic.staff.data.local.SessionManager
import com.medical.clinic.staff.data.models.DoctorQueueItem
import com.medical.clinic.staff.data.repository.DoctorRepository
import com.medical.clinic.staff.data.utils.Constants
import com.medical.clinic.staff.data.utils.Resource
import com.medical.clinic.staff.databinding.FragmentDoctorQueueBinding
import com.medical.clinic.staff.ui.utils.ProfileGuard
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class DoctorQueueFragment : Fragment() {

    private var _binding: FragmentDoctorQueueBinding? = null
    private val binding get() = _binding!!

    @Inject
    lateinit var doctorRepository: DoctorRepository

    @Inject
    lateinit var sessionManager: SessionManager

    private lateinit var queueAdapter: QueueAdapter
    private var allQueueItems = listOf<DoctorQueueItem>()
    private var selectedFilter = "all"

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentDoctorQueueBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupRecyclerView()
        setupListeners()
        loadQueue()
    }

    private fun setupRecyclerView() {
        queueAdapter = QueueAdapter(
            onStart = { item ->
                ProfileGuard.checkOrPrompt(requireContext(), sessionManager) {
                    updatePatientStatus(item.id, Constants.QUEUE_IN_PROGRESS)
                }
            },
            onFinish = { item ->
                ProfileGuard.checkOrPrompt(requireContext(), sessionManager) {
                    updatePatientStatus(item.id, Constants.QUEUE_DONE)
                }
            },
            onCancel = { item ->
                ProfileGuard.checkOrPrompt(requireContext(), sessionManager) {
                    updatePatientStatus(item.id, Constants.QUEUE_CANCELLED)
                }
            },
            onWritePrescription = { item ->
                ProfileGuard.checkOrPrompt(requireContext(), sessionManager) {
                    val apptId = item.appointmentId ?: item.id
                    val intent = android.content.Intent(requireContext(), DoctorPrescriptionActivity::class.java).apply {
                        putExtra(DoctorPrescriptionActivity.EXTRA_APPOINTMENT_ID, apptId)
                        putExtra(DoctorPrescriptionActivity.EXTRA_PATIENT_NAME, item.patientName)
                        putExtra(DoctorPrescriptionActivity.EXTRA_BOOKING_CODE, item.bookingCode ?: "")
                    }
                    startActivity(intent)
                }
            }
        )
        binding.rvQueue.layoutManager = LinearLayoutManager(requireContext())
        binding.rvQueue.adapter = queueAdapter
    }

    private fun setupListeners() {
        binding.swipeRefreshQueue.setOnRefreshListener {
            loadQueue()
        }

        binding.chipGroupStatus.setOnCheckedStateChangeListener { _, checkedIds ->
            when (checkedIds.firstOrNull()) {
                binding.chipWaiting.id -> selectedFilter = Constants.QUEUE_WAITING
                binding.chipInProgress.id -> selectedFilter = Constants.QUEUE_IN_PROGRESS
                binding.chipDone.id -> selectedFilter = Constants.QUEUE_DONE
                else -> selectedFilter = "all"
            }
            applyFilter()
        }
    }

    private fun loadQueue() {
        if (sessionManager.isGuestMode() || sessionManager.mustCompleteProfile()) {
            binding.swipeRefreshQueue.isRefreshing = false
            allQueueItems = emptyList()
            applyFilter()
            return
        }

        val user = sessionManager.getUser() ?: return
        _binding?.swipeRefreshQueue?.isRefreshing = true

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val res = doctorRepository.getQueue(user.id)
                if (_binding == null) return@launch
                if (res is Resource.Success && res.data != null) {
                    allQueueItems = res.data
                    applyFilter()
                } else {
                    context?.let { ctx ->
                        Toast.makeText(ctx, res.message ?: "فشل جلب الطابور", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                // handle error safely
            } finally {
                _binding?.swipeRefreshQueue?.isRefreshing = false
            }
        }
    }

    private fun applyFilter() {
        val b = _binding ?: return
        val filtered = if (selectedFilter == "all") {
            allQueueItems
        } else {
            allQueueItems.filter { it.status == selectedFilter }
        }

        queueAdapter.submitList(filtered)
        if (filtered.isEmpty()) {
            b.layoutEmptyQueue.visibility = View.VISIBLE
        } else {
            b.layoutEmptyQueue.visibility = View.GONE
        }
    }

    private fun updatePatientStatus(queueId: Int, newStatus: String) {
        viewLifecycleOwner.lifecycleScope.launch {
            val res = doctorRepository.updateQueueStatus(queueId, newStatus)
            if (res is Resource.Success) {
                context?.let { ctx ->
                    Toast.makeText(ctx, "تم تحديث الحالة بنجاح", Toast.LENGTH_SHORT).show()
                }
                loadQueue()
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
