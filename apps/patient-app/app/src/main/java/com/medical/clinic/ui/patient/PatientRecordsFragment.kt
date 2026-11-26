package com.medical.clinic.ui.patient

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.chip.ChipGroup
import com.medical.clinic.R
import com.medical.clinic.data.api.ApiClient
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.data.models.MedicalRecord
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class PatientRecordsFragment : Fragment() {

    @Inject
    lateinit var apiClient: ApiClient

    @Inject
    lateinit var sessionManager: SessionManager

    private lateinit var rvRecords: RecyclerView
    private lateinit var chipGroupRecords: ChipGroup
    private lateinit var recordsAdapter: RecordsAdapter
    private var layoutEmptyRecords: View? = null
    private var swipeRefresh: androidx.swiperefreshlayout.widget.SwipeRefreshLayout? = null

    private var allRecords: List<MedicalRecord> = emptyList()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_patient_records, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        rvRecords = view.findViewById(R.id.rvPatientRecords)
        chipGroupRecords = view.findViewById(R.id.chipGroupRecords)
        layoutEmptyRecords = view.findViewById(R.id.layoutEmptyRecords)
        swipeRefresh = view.findViewById(R.id.swipeRefreshRecords)
        swipeRefresh?.setColorSchemeResources(R.color.brand_primary)
        swipeRefresh?.setOnRefreshListener { loadRecords() }

        val onAddClick = View.OnClickListener {
            android.widget.Toast.makeText(requireContext(), "يتم تسجيل وإصدار تقاريرك الطبية والروشتات تلقائياً من قبل عيادتك وطبيبك المعالج 🩺", android.widget.Toast.LENGTH_LONG).show()
        }
        view.findViewById<View>(R.id.btnEmptyAddRecord)?.setOnClickListener(onAddClick)
        view.findViewById<View>(R.id.btnHeaderAddRecord)?.setOnClickListener(onAddClick)

        recordsAdapter = RecordsAdapter()
        rvRecords.layoutManager = LinearLayoutManager(requireContext())
        rvRecords.adapter = recordsAdapter

        chipGroupRecords.setOnCheckedStateChangeListener { _, checkedIds ->
            when {
                checkedIds.contains(R.id.chipPrescriptions) -> {
                    val filtered = allRecords.filter { !it.prescription.isNullOrBlank() }
                    recordsAdapter.updateList(filtered)
                    layoutEmptyRecords?.visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
                }
                checkedIds.contains(R.id.chipLabs) -> {
                    val filtered = allRecords.filter { !it.labTests.isNullOrBlank() }
                    recordsAdapter.updateList(filtered)
                    layoutEmptyRecords?.visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
                }
                else -> {
                    recordsAdapter.updateList(allRecords)
                    layoutEmptyRecords?.visibility = if (allRecords.isEmpty()) View.VISIBLE else View.GONE
                swipeRefresh?.isRefreshing = false
                }
            }
        }

        loadRecords()
    }

    private fun loadRecords() {
        // ⚡ تحميل السجلات والفحوصات والروشتات المحفوظة محلياً فوراً
        sessionManager.getString("cached_patient_records")?.let { cachedJson ->
            try {
                val listType = object : com.google.gson.reflect.TypeToken<List<MedicalRecord>>() {}.type
                val cached = com.google.gson.Gson().fromJson<List<MedicalRecord>>(cachedJson, listType)
                if (!cached.isNullOrEmpty() && allRecords.isEmpty()) {
                    allRecords = cached
                    recordsAdapter.updateList(allRecords)
                    layoutEmptyRecords?.visibility = View.GONE
                }
            } catch (_: Exception) {}
        }

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = apiClient.apiService.getMyMedicalRecords()
                if (response.success && response.data != null) {
                    allRecords = response.data
                    recordsAdapter.updateList(allRecords)
                    sessionManager.saveString("cached_patient_records", com.google.gson.Gson().toJson(allRecords))
                    layoutEmptyRecords?.visibility = if (allRecords.isEmpty()) View.VISIBLE else View.GONE
                } else if (allRecords.isEmpty()) {
                    allRecords = emptyList()
                    recordsAdapter.updateList(emptyList())
                    layoutEmptyRecords?.visibility = View.VISIBLE
                }
            } catch (e: Exception) {
                if (allRecords.isEmpty()) {
                    allRecords = emptyList()
                    recordsAdapter.updateList(emptyList())
                    layoutEmptyRecords?.visibility = View.VISIBLE
                }
            } finally {
                swipeRefresh?.isRefreshing = false
            }
        }
    }
}
