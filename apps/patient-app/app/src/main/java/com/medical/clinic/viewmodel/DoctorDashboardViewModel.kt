package com.medical.clinic.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.medical.clinic.data.api.ApiClient
import com.medical.clinic.data.models.DoctorStats
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DoctorDashboardViewModel @Inject constructor(
    private val apiClient: ApiClient
) : ViewModel() {

    private val _stats = MutableStateFlow<DoctorStats?>(null)
    val stats: StateFlow<DoctorStats?> = _stats.asStateFlow()

    fun loadStats(doctorId: Int) {
        viewModelScope.launch {
            try {
                val queueStats = apiClient.apiService.getQueueStats(doctorId)
                val doctorStats = apiClient.apiService.getDoctorStatsToday(doctorId)

                val s = DoctorStats(
                    total = doctorStats.data?.appointments?.total ?: 0,
                    completed = doctorStats.data?.appointments?.completed ?: 0,
                    confirmed = doctorStats.data?.appointments?.confirmed ?: 0,
                    waiting = queueStats.data?.queue?.waiting ?: 0,
                    inProgress = queueStats.data?.queue?.inProgress ?: 0,
                    done = queueStats.data?.queue?.done ?: 0,
                    newPatients = doctorStats.data?.newPatientsToday ?: 0,
                    totalRevenue = doctorStats.data?.appointments?.totalRevenue ?: 0
                )

                _stats.value = s
            } catch (e: Exception) {
                _stats.value = DoctorStats()
            }
        }
    }
}