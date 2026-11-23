package com.medical.clinic.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.medical.clinic.data.api.ApiClient
import com.medical.clinic.data.models.QueueUpdateRequest
import com.medical.clinic.data.models.QueueItem
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class QueueViewModel @Inject constructor(
    private val apiClient: ApiClient
) : ViewModel() {

    private val _queue = MutableStateFlow<List<QueueItem>>(emptyList())
    val queue: StateFlow<List<QueueItem>> = _queue.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    fun loadQueue(doctorId: Int) {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            try {
                val response = apiClient.apiService.getDoctorQueue(doctorId)
                _queue.value = response.data ?: emptyList()
            } catch (e: Exception) {
                _error.value = e.message ?: "فشل تحميل الطابور"
            }
            _loading.value = false
        }
    }

    fun updateStatus(queueId: Int, status: String) {
        viewModelScope.launch {
            try {
                apiClient.apiService.updateQueueStatus(queueId, QueueUpdateRequest(status))
                // تحديث محلي
                _queue.value = _queue.value.map {
                    if (it.id == queueId) it.copy(status = status) else it
                }
            } catch (e: Exception) {
                _error.value = e.message ?: "فشل التحديث"
            }
        }
    }

    fun startPatient(item: QueueItem) {
        updateStatus(item.id, "in_progress")
    }

    fun finishPatient(item: QueueItem) {
        updateStatus(item.id, "done")
    }

    fun refresh(doctorId: Int) {
        loadQueue(doctorId)
    }
}