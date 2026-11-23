package com.medical.clinic.ui.doctor

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.medical.clinic.R
import com.medical.clinic.ui.base.BaseFragment
import com.medical.clinic.viewmodel.QueueViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class DoctorQueueFragment : BaseFragment() {

    private val viewModel: QueueViewModel by viewModels()

    private lateinit var recyclerQueue: RecyclerView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var tvEmpty: LinearLayout
    private lateinit var adapter: QueueAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_doctor_queue, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        recyclerQueue = view.findViewById(R.id.recyclerQueue)
        swipeRefresh = view.findViewById(R.id.swipeRefresh)
        tvEmpty = view.findViewById(R.id.layoutEmpty)

        val user = sessionManager.getUser()

        // Adapter — كل عملية تُفحص
        adapter = QueueAdapter(
            onStart = { item -> 
                requireCompleteProfile { 
                    viewModel.startPatient(item) 
                }
            },
            onFinish = { item -> 
                requireCompleteProfile { 
                    viewModel.finishPatient(item) 
                }
            }
        )

        recyclerQueue.layoutManager = LinearLayoutManager(requireContext())
        recyclerQueue.adapter = adapter

        // Swipe to refresh
        swipeRefresh.setOnRefreshListener {
            if (isProfileComplete() && user?.id != -1) {
                user?.id?.let { viewModel.loadQueue(it) }
            }
            swipeRefresh.isRefreshing = false
        }

        // تحميل أولي — فقط إذا الملف مكتمل
        if (isProfileComplete() && user?.id != -1) {
            user?.id?.let { viewModel.loadQueue(it) }
        } else {
            tvEmpty.visibility = View.VISIBLE
            recyclerQueue.visibility = View.GONE
        }

        observeQueue()

        // تحديث دوري كل 30 ثانية
        if (isProfileComplete() && user?.id != -1) {
            startPolling(user?.id ?: 0)
        }
    }

    private fun startPolling(doctorId: Int) {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                while (true) {
                    kotlinx.coroutines.delay(30_000)
                    if (doctorId > 0) {
                        viewModel.loadQueue(doctorId)
                    }
                }
            }
        }
    }

    private fun observeQueue() {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.queue.collect { items ->
                    adapter.submitList(items)

                    if (items.isEmpty()) {
                        tvEmpty.visibility = View.VISIBLE
                        recyclerQueue.visibility = View.GONE
                    } else {
                        tvEmpty.visibility = View.GONE
                        recyclerQueue.visibility = View.VISIBLE
                    }
                }
            }
        }

        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.loading.collect { loading ->
                    swipeRefresh.isRefreshing = loading
                }
            }
        }
    }
}