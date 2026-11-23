package com.medical.clinic.ui.secretary

import android.app.DatePickerDialog
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.google.android.material.button.MaterialButton
import com.google.android.material.floatingactionbutton.ExtendedFloatingActionButton
import com.medical.clinic.R
import com.medical.clinic.data.api.ApiClient
import com.medical.clinic.data.api.Colleague
import com.medical.clinic.data.api.DoctorItem
import com.medical.clinic.data.models.CreateDelegationRequest
import com.medical.clinic.data.models.Delegation
import com.medical.clinic.data.models.RespondDelegationRequest
import com.medical.clinic.ui.base.BaseFragment
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import javax.inject.Inject

@AndroidEntryPoint
class DelegationsFragment : BaseFragment() {

    @Inject lateinit var apiClient: ApiClient

    // ═══ Views ═══
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var recyclerDelegations: RecyclerView
    private lateinit var layoutEmpty: LinearLayout
    private lateinit var layoutLoading: LinearLayout
    private lateinit var layoutError: LinearLayout
    private lateinit var tvEmptyTitle: TextView
    private lateinit var tvEmptyHint: TextView
    private lateinit var tvError: TextView
    private lateinit var btnRetry: Button
    private lateinit var fabCreate: ExtendedFloatingActionButton
    private lateinit var chipAll: MaterialButton
    private lateinit var chipIncoming: MaterialButton
    private lateinit var chipOutgoing: MaterialButton
    private lateinit var chipAccepted: MaterialButton
    private lateinit var chipRejected: MaterialButton
    private lateinit var tvPendingCount: TextView
    private lateinit var tvAcceptedCount: TextView
    private lateinit var tvOutgoingCount: TextView

    private lateinit var adapter: DelegationAdapter
    private val allDelegations = mutableListOf<Delegation>()
    private var currentFilter: Filter = Filter.ALL
    private var currentSecretaryId: Int = 0

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    enum class Filter { ALL, INCOMING, OUTGOING, ACCEPTED, REJECTED }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        return inflater.inflate(R.layout.fragment_secretary_delegations, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        currentSecretaryId = sessionManager.getUser()?.id ?: 0

        // ربط Views
        swipeRefresh = view.findViewById(R.id.swipeRefresh)
        recyclerDelegations = view.findViewById(R.id.recyclerDelegations)
        layoutEmpty = view.findViewById(R.id.layoutEmpty)
        layoutLoading = view.findViewById(R.id.layoutLoading)
        layoutError = view.findViewById(R.id.layoutError)
        tvEmptyTitle = view.findViewById(R.id.tvEmptyTitle)
        tvEmptyHint = view.findViewById(R.id.tvEmptyHint)
        tvError = view.findViewById(R.id.tvError)
        btnRetry = view.findViewById(R.id.btnRetry)
        fabCreate = view.findViewById(R.id.fabCreate)
        chipAll = view.findViewById(R.id.chipAll)
        chipIncoming = view.findViewById(R.id.chipIncoming)
        chipOutgoing = view.findViewById(R.id.chipOutgoing)
        chipAccepted = view.findViewById(R.id.chipAccepted)
        chipRejected = view.findViewById(R.id.chipRejected)
        tvPendingCount = view.findViewById(R.id.tvPendingCount)
        tvAcceptedCount = view.findViewById(R.id.tvAcceptedCount)
        tvOutgoingCount = view.findViewById(R.id.tvOutgoingCount)

        setupRecyclerView()
        setupChips()
        setupSwipeRefresh()
        setupFab()
        setupRetry()

        loadDelegations()
    }

    // ═══════════════════════════════════════════
    // Setup
    // ═══════════════════════════════════════════

    private fun setupRecyclerView() {
        adapter = DelegationAdapter(
            currentSecretaryId = currentSecretaryId,
            onItemClick = { delegation -> onDelegationClick(delegation) },
            onAcceptClick = { delegation -> handleAccept(delegation) },
            onRejectClick = { delegation -> handleReject(delegation) }
        )

        recyclerDelegations.layoutManager = LinearLayoutManager(requireContext())
        recyclerDelegations.adapter = adapter
    }

    private fun setupChips() {
        chipAll.setOnClickListener { setFilter(Filter.ALL, chipAll) }
        chipIncoming.setOnClickListener { setFilter(Filter.INCOMING, chipIncoming) }
        chipOutgoing.setOnClickListener { setFilter(Filter.OUTGOING, chipOutgoing) }
        chipAccepted.setOnClickListener { setFilter(Filter.ACCEPTED, chipAccepted) }
        chipRejected.setOnClickListener { setFilter(Filter.REJECTED, chipRejected) }
    }

    private fun setFilter(filter: Filter, chip: MaterialButton) {
        currentFilter = filter
        listOf(chipAll, chipIncoming, chipOutgoing, chipAccepted, chipRejected)
            .forEach { it.isChecked = false }
        chip.isChecked = true
        applyFilter()
    }

    private fun setupSwipeRefresh() {
        swipeRefresh.setOnRefreshListener { loadDelegations() }
        swipeRefresh.setColorSchemeColors(
            ContextCompat.getColor(requireContext(), R.color.brand_primary)
        )
    }

    private fun setupFab() {
        fabCreate.setOnClickListener {
            requireCompleteProfile {
                openCreateBottomSheet()
            }
        }
    }

    private fun setupRetry() {
        btnRetry.setOnClickListener { loadDelegations() }
    }

    // ═══════════════════════════════════════════
    // Loading
    // ═══════════════════════════════════════════

    private fun loadDelegations() {
        if (currentSecretaryId == 0) {
            showError("لم يتم التعرف على المستخدم")
            return
        }

        showLoading()

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = apiClient.apiService.getMyDelegations()

                if (!response.success) {
                    showError(response.message ?: "فشل تحميل التفويضات")
                    return@launch
                }

                allDelegations.clear()
                val data = response.data
                if (data != null) {
                    allDelegations.addAll(data.incoming)
                    allDelegations.addAll(data.outgoing)
                    allDelegations.sortByDescending { it.createdAt ?: "" }
                }

                updateStats()
                applyFilter()

            } catch (e: retrofit2.HttpException) {
                Log.e(TAG, "HTTP ${e.code()}", e)
                val msg = when (e.code()) {
                    401 -> "انتهت الجلسة — يرجى تسجيل الدخول مجدداً"
                    403 -> "غير مصرح لك بالوصول"
                    404 -> "لا توجد بيانات"
                    else -> "خطأ في الشبكة (${e.code()})"
                }
                showError(msg)
            } catch (e: java.io.IOException) {
                Log.e(TAG, "IO", e)
                showError("تعذر الاتصال بالخادم")
            } catch (e: Exception) {
                Log.e(TAG, "Error", e)
                showError(e.message ?: "خطأ غير معروف")
            }
        }
    }

    private fun updateStats() {
        val incoming = allDelegations.count { it.toSecretaryId == currentSecretaryId && it.isPending }
        val accepted = allDelegations.count { it.isAccepted }
        val outgoing = allDelegations.count { it.fromSecretaryId == currentSecretaryId }

        tvPendingCount.text = incoming.toString()
        tvAcceptedCount.text = accepted.toString()
        tvOutgoingCount.text = outgoing.toString()
    }

    // ═══════════════════════════════════════════
    // Filter
    // ═══════════════════════════════════════════

    private fun applyFilter() {
        val filtered = when (currentFilter) {
            Filter.ALL -> allDelegations
            Filter.INCOMING -> allDelegations.filter { it.toSecretaryId == currentSecretaryId }
            Filter.OUTGOING -> allDelegations.filter { it.fromSecretaryId == currentSecretaryId }
            Filter.ACCEPTED -> allDelegations.filter { it.isAccepted }
            Filter.REJECTED -> allDelegations.filter { it.isRejected }
        }

        if (filtered.isEmpty()) {
            showEmpty()
        } else {
            showContent()
            adapter.submitList(filtered)
        }
    }

    // ═══════════════════════════════════════════
    // States
    // ═══════════════════════════════════════════

    private fun showLoading() {
        layoutLoading.visibility = View.VISIBLE
        layoutEmpty.visibility = View.GONE
        layoutError.visibility = View.GONE
        recyclerDelegations.visibility = View.GONE
        swipeRefresh.isRefreshing = false
    }

    private fun showContent() {
        layoutLoading.visibility = View.GONE
        layoutEmpty.visibility = View.GONE
        layoutError.visibility = View.GONE
        recyclerDelegations.visibility = View.VISIBLE
        swipeRefresh.isRefreshing = false
    }

    private fun showEmpty() {
        layoutLoading.visibility = View.GONE
        layoutEmpty.visibility = View.VISIBLE
        layoutError.visibility = View.GONE
        recyclerDelegations.visibility = View.GONE
        swipeRefresh.isRefreshing = false

        tvEmptyTitle.text = "لا توجد تفويضات"
        tvEmptyHint.text = when (currentFilter) {
            Filter.ALL -> "ابدأ بإنشاء تفويض جديد لسكرتيرة أخرى"
            Filter.INCOMING -> "لا توجد تفويضات واردة"
            Filter.OUTGOING -> "لم تُرسل أي تفويض بعد"
            Filter.ACCEPTED -> "لا توجد تفويضات مقبولة"
            Filter.REJECTED -> "لا توجد تفويضات مرفوضة"
        }
    }

    private fun showError(msg: String) {
        layoutLoading.visibility = View.GONE
        layoutEmpty.visibility = View.GONE
        layoutError.visibility = View.VISIBLE
        recyclerDelegations.visibility = View.GONE
        swipeRefresh.isRefreshing = false
        tvError.text = msg
    }

    // ═══════════════════════════════════════════
    // Actions
    // ═══════════════════════════════════════════

    private fun handleAccept(delegation: Delegation) {
        AlertDialog.Builder(requireContext(), R.style.Theme_MedicalClinic_Dialog)
            .setTitle("قبول التفويض")
            .setMessage("هل تريد قبول إدارة مواعيد د. ${delegation.doctorName ?: ""}؟")
            .setPositiveButton("قبول") { _, _ -> performAccept(delegation) }
            .setNegativeButton("إلغاء", null)
            .show()
    }

    private fun performAccept(delegation: Delegation) {
        Toast.makeText(requireContext(), "جاري القبول...", Toast.LENGTH_SHORT).show()
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = apiClient.apiService.acceptDelegation(
                    delegation.id,
                    RespondDelegationRequest()
                )
                if (response.success) {
                    Toast.makeText(requireContext(), "✅ تم قبول التفويض", Toast.LENGTH_SHORT).show()
                    loadDelegations()
                } else {
                    Toast.makeText(requireContext(), response.message ?: "فشل", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "خطأ: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun handleReject(delegation: Delegation) {
        AlertDialog.Builder(requireContext(), R.style.Theme_MedicalClinic_Dialog)
            .setTitle("رفض التفويض")
            .setMessage("هل تريد رفض الطلب؟")
            .setPositiveButton("رفض") { _, _ -> performReject(delegation) }
            .setNegativeButton("إلغاء", null)
            .show()
    }

    private fun performReject(delegation: Delegation) {
        Toast.makeText(requireContext(), "جاري الرفض...", Toast.LENGTH_SHORT).show()
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = apiClient.apiService.rejectDelegation(
                    delegation.id,
                    RespondDelegationRequest()
                )
                if (response.success) {
                    Toast.makeText(requireContext(), "✅ تم رفض التفويض", Toast.LENGTH_SHORT).show()
                    loadDelegations()
                } else {
                    Toast.makeText(requireContext(), response.message ?: "فشل", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "خطأ: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun onDelegationClick(delegation: Delegation) {
        Toast.makeText(
            requireContext(),
            "تفويض: ${delegation.doctorName} — ${delegation.statusArabic}",
            Toast.LENGTH_SHORT
        ).show()
    }

    private fun openCreateBottomSheet() {
        val sheet = CreateDelegationBottomSheet { loadDelegations() }
        sheet.show(childFragmentManager, "CreateDelegation")
    }

    companion object {
        private const val TAG = "DelegationsFragment"
    }

    // ═══════════════════════════════════════════════════════════════
    // Bottom Sheet: إنشاء تفويض جديد
    // ═══════════════════════════════════════════════════════════════

    @AndroidEntryPoint
    class CreateDelegationBottomSheet(
        private val onCreated: () -> Unit = {}
    ) : BottomSheetDialogFragment() {

        @Inject lateinit var apiClient: ApiClient

        private val doctors = mutableListOf<DoctorItem>()
        private val colleagues = mutableListOf<Colleague>()

        private var selectedDoctorId: Int = 0
        private var selectedSecretaryId: Int = 0
        private var selectedFromDate: String = ""
        private var selectedToDate: String = ""

        private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

        override fun onCreateView(
            inflater: LayoutInflater,
            container: ViewGroup?,
            savedInstanceState: Bundle?
        ): View {
            return inflater.inflate(R.layout.bottom_sheet_create_delegation, container, false)
        }

        override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
            super.onViewCreated(view, savedInstanceState)

            val spinnerDoctor = view.findViewById<Spinner>(R.id.spinnerDoctor)
            val spinnerSecretary = view.findViewById<Spinner>(R.id.spinnerSecretary)
            val etDateFrom = view.findViewById<EditText>(R.id.etDateFrom)
            val etDateTo = view.findViewById<EditText>(R.id.etDateTo)
            val etMaxBookings = view.findViewById<EditText>(R.id.etMaxBookings)
            val etMessage = view.findViewById<EditText>(R.id.etMessage)
            val tvError = view.findViewById<TextView>(R.id.tvError)
            val btnCancel = view.findViewById<Button>(R.id.btnCancel)
            val btnSubmit = view.findViewById<Button>(R.id.btnSubmit)
            val progressBar = view.findViewById<ProgressBar>(R.id.progressBar)

            etDateFrom.setOnClickListener { openDatePicker(etDateFrom) { selectedFromDate = it } }
            etDateTo.setOnClickListener { openDatePicker(etDateTo) { selectedToDate = it } }

            btnCancel.setOnClickListener { dismiss() }

            btnSubmit.setOnClickListener {
                tvError.visibility = View.GONE

                if (selectedDoctorId == 0) {
                    tvError.text = "⚠️ يرجى اختيار الطبيب"
                    tvError.visibility = View.VISIBLE
                    return@setOnClickListener
                }
                if (selectedSecretaryId == 0) {
                    tvError.text = "⚠️ يرجى اختيار السكرتيرة"
                    tvError.visibility = View.VISIBLE
                    return@setOnClickListener
                }
                if (selectedFromDate.isBlank() || selectedToDate.isBlank()) {
                    tvError.text = "⚠️ يرجى تحديد المدة"
                    tvError.visibility = View.VISIBLE
                    return@setOnClickListener
                }
                if (selectedFromDate > selectedToDate) {
                    tvError.text = "⚠️ تاريخ البداية يجب أن يكون قبل تاريخ النهاية"
                    tvError.visibility = View.VISIBLE
                    return@setOnClickListener
                }

                val maxBookings = etMaxBookings.text.toString().toIntOrNull()
                val message = etMessage.text.toString().trim().ifBlank { null }

                submitDelegation(
                    doctorId = selectedDoctorId,
                    toSecretaryId = selectedSecretaryId,
                    validFrom = selectedFromDate,
                    validUntil = selectedToDate,
                    maxBookings = maxBookings,
                    message = message,
                    tvError = tvError,
                    btnSubmit = btnSubmit,
                    progressBar = progressBar
                )
            }

            loadDoctors(spinnerDoctor)
            loadColleagues(spinnerSecretary)
        }

        private fun openDatePicker(target: EditText, onSelected: (String) -> Unit) {
            val cal = Calendar.getInstance()
            val dialog = DatePickerDialog(
                requireContext(),
                { _, year, month, day ->
                    cal.set(year, month, day)
                    val dateStr = dateFormat.format(cal.time)
                    target.setText(dateStr)
                    onSelected(dateStr)
                },
                cal.get(Calendar.YEAR),
                cal.get(Calendar.MONTH),
                cal.get(Calendar.DAY_OF_MONTH)
            )
            dialog.datePicker.minDate = System.currentTimeMillis() - 1000
            dialog.show()
        }

        private fun loadDoctors(spinner: Spinner) {
            lifecycleScope.launch {
                try {
                    val response = apiClient.apiService.getMyDoctors()
                    doctors.clear()
                    if (response.success && response.data != null) {
                        doctors.addAll(response.data.linked)
                    }
                    val names = if (doctors.isEmpty()) listOf("— لا يوجد أطباء —")
                    else doctors.map { "${it.full_name} (${it.specialty ?: "—"})" }

                    val adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, names)
                    adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                    spinner.adapter = adapter

                    spinner.onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
                        override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: View?, position: Int, id: Long) {
                            selectedDoctorId = if (doctors.isEmpty()) 0 else doctors[position].id
                        }
                        override fun onNothingSelected(parent: android.widget.AdapterView<*>?) {}
                    }
                } catch (e: Exception) {
                    Log.e("BottomSheet", "loadDoctors failed", e)
                }
            }
        }

        private fun loadColleagues(spinner: Spinner) {
            lifecycleScope.launch {
                try {
                    val response = apiClient.apiService.getColleagues()
                    colleagues.clear()
                    colleagues.addAll(response.data)

                    val names = if (colleagues.isEmpty()) listOf("— لا يوجد سكرتيرات —")
                    else colleagues.map { it.full_name }

                    val adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, names)
                    adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                    spinner.adapter = adapter

                    spinner.onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
                        override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: View?, position: Int, id: Long) {
                            selectedSecretaryId = if (colleagues.isEmpty()) 0 else colleagues[position].id
                        }
                        override fun onNothingSelected(parent: android.widget.AdapterView<*>?) {}
                    }
                } catch (e: Exception) {
                    Log.e("BottomSheet", "loadColleagues failed", e)
                }
            }
        }

        private fun submitDelegation(
            doctorId: Int,
            toSecretaryId: Int,
            validFrom: String,
            validUntil: String,
            maxBookings: Int?,
            message: String?,
            tvError: TextView,
            btnSubmit: Button,
            progressBar: ProgressBar
        ) {
            btnSubmit.isEnabled = false
            progressBar.visibility = View.VISIBLE

            lifecycleScope.launch {
                try {
                    val response = apiClient.apiService.createDelegation(
                        CreateDelegationRequest(
                            toSecretaryId = toSecretaryId,
                            doctorId = doctorId,
                            validFrom = validFrom,
                            validUntil = validUntil,
                            maxBookings = maxBookings,
                            message = message
                        )
                    )
                    progressBar.visibility = View.GONE
                    btnSubmit.isEnabled = true

                    if (response.success) {
                        Toast.makeText(requireContext(), "✅ تم إرسال الطلب", Toast.LENGTH_SHORT).show()
                        onCreated()
                        dismiss()
                    } else {
                        tvError.text = "⚠️ ${response.message ?: "فشل الإرسال"}"
                        tvError.visibility = View.VISIBLE
                    }
                } catch (e: retrofit2.HttpException) {
                    progressBar.visibility = View.GONE
                    btnSubmit.isEnabled = true
                    val body = e.response()?.errorBody()?.string()
                    tvError.text = "⚠️ ${body ?: "خطأ (${e.code()})"}"
                    tvError.visibility = View.VISIBLE
                } catch (e: Exception) {
                    progressBar.visibility = View.GONE
                    btnSubmit.isEnabled = true
                    tvError.text = "⚠️ ${e.message ?: "خطأ غير معروف"}"
                    tvError.visibility = View.VISIBLE
                }
            }
        }
    }
}