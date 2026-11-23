package com.medical.clinic.ui.secretary

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.R
import com.medical.clinic.data.api.ApiClient
import com.medical.clinic.data.api.PendingDoctorItem
import com.medical.clinic.data.api.RejectDoctorRequest
import com.medical.clinic.ui.auth.CompleteSecretaryProfileActivity
import com.medical.clinic.ui.base.BaseFragment
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class SecretaryDoctorsFragment : BaseFragment() {

    @Inject lateinit var apiClient: ApiClient

    private lateinit var scrollContent: ScrollView
    private lateinit var recyclerDoctors: RecyclerView
    private lateinit var recyclerPendingDoctors: RecyclerView
    private lateinit var cardPendingDoctors: View
    private lateinit var tvPendingCount: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var layoutEmpty: LinearLayout
    private lateinit var layoutNoProfile: LinearLayout
    private lateinit var btnManageDoctors: Button
    private lateinit var btnCompleteProfile: Button

    private lateinit var doctorAdapter: DoctorAdapter
    private lateinit var pendingAdapter: PendingDoctorAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_secretary_doctors, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        scrollContent = view.findViewById(R.id.scrollContent)
        recyclerDoctors = view.findViewById(R.id.recyclerDoctors)
        recyclerPendingDoctors = view.findViewById(R.id.recyclerPendingDoctors)
        cardPendingDoctors = view.findViewById(R.id.cardPendingDoctors)
        tvPendingCount = view.findViewById(R.id.tvPendingCount)
        progressBar = view.findViewById(R.id.progressBar)
        layoutEmpty = view.findViewById(R.id.layoutEmpty)
        layoutNoProfile = view.findViewById(R.id.layoutNoProfile)
        btnManageDoctors = view.findViewById(R.id.btnManageDoctors)
        btnCompleteProfile = view.findViewById(R.id.btnCompleteProfile)

        // Adapters
        doctorAdapter = DoctorAdapter { doctor ->
            requireCompleteProfile {
                Toast.makeText(requireContext(), "الطبيب: ${doctor.full_name}", Toast.LENGTH_SHORT).show()
            }
        }

        pendingAdapter = PendingDoctorAdapter(
            onApprove = { doctor -> approveDoctor(doctor) },
            onReject = { doctor -> rejectDoctor(doctor) }
        )

        recyclerDoctors.layoutManager = LinearLayoutManager(requireContext())
        recyclerDoctors.adapter = doctorAdapter

        recyclerPendingDoctors.layoutManager = LinearLayoutManager(requireContext())
        recyclerPendingDoctors.adapter = pendingAdapter

        btnCompleteProfile.setOnClickListener {
            startActivity(Intent(requireContext(), CompleteSecretaryProfileActivity::class.java))
        }

        btnManageDoctors.setOnClickListener {
            requireCompleteProfile {
                Toast.makeText(requireContext(), "إدارة الأطباء (قريباً)", Toast.LENGTH_SHORT).show()
            }
        }

        loadData()
    }

    override fun onResume() {
        super.onResume()
        loadData()
    }

    private fun loadData() {
        val user = sessionManager.getUser()
        if (user?.mustCompleteProfile == true || user?.id == -1) {
            progressBar.visibility = View.GONE
            scrollContent.visibility = View.GONE
            layoutNoProfile.visibility = View.VISIBLE
            return
        }

        progressBar.visibility = View.VISIBLE
        scrollContent.visibility = View.GONE
        layoutNoProfile.visibility = View.GONE

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                // 1. الأطباء المعتمدون
                val doctorsResponse = apiClient.apiService.getMyDoctors()

                // 2. الأطباء المنتظرون
                val pendingResponse = apiClient.apiService.getPendingDoctors()

                progressBar.visibility = View.GONE
                scrollContent.visibility = View.VISIBLE

                // عرض المعتمدين
                if (doctorsResponse.success && doctorsResponse.data != null) {
                    doctorAdapter.submitList(doctorsResponse.data.linked)

                    if (doctorsResponse.data.linked.isEmpty()) {
                        layoutEmpty.visibility = View.VISIBLE
                    } else {
                        layoutEmpty.visibility = View.GONE
                    }
                }

                // عرض المنتظرين
                if (pendingResponse.success && pendingResponse.data != null) {
                    val pendingList = pendingResponse.data.data ?: emptyList()
                    pendingAdapter.submitList(pendingList)

                    if (pendingList.isEmpty()) {
                        cardPendingDoctors.visibility = View.GONE
                    } else {
                        cardPendingDoctors.visibility = View.VISIBLE
                        tvPendingCount.text = pendingList.size.toString()
                    }
                } else {
                    cardPendingDoctors.visibility = View.GONE
                }

            } catch (e: retrofit2.HttpException) {
                progressBar.visibility = View.GONE
                Log.e("Doctors", "HTTP ${e.code()}: ${e.message}")

                if (e.code() == 401) {
                    layoutNoProfile.visibility = View.VISIBLE
                } else {
                    Toast.makeText(requireContext(), "خطأ (${e.code()})", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                progressBar.visibility = View.GONE
                Log.e("Doctors", "Error", e)
                Toast.makeText(requireContext(), "خطأ: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun approveDoctor(doctor: PendingDoctorItem) {
        AlertDialog.Builder(requireContext())
            .setTitle("اعتماد الطبيب")
            .setMessage("هل تريد اعتماد ${doctor.full_name}؟")
            .setPositiveButton("اعتماد") { _, _ ->
                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val response = apiClient.apiService.approveDoctorBySecretary(doctor.id)
                        if (response.success) {
                            Toast.makeText(requireContext(), "✅ تم اعتماد ${doctor.full_name}", Toast.LENGTH_SHORT).show()
                            loadData()
                        } else {
                            Toast.makeText(requireContext(), response.message ?: "فشل", Toast.LENGTH_LONG).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(requireContext(), "خطأ: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
            .setNegativeButton("إلغاء", null)
            .show()
    }

    private fun rejectDoctor(doctor: PendingDoctorItem) {
        AlertDialog.Builder(requireContext())
            .setTitle("رفض الطبيب")
            .setMessage("هل تريد رفض ${doctor.full_name}؟")
            .setPositiveButton("رفض") { _, _ ->
                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val response = apiClient.apiService.rejectDoctorBySecretary(
                            doctor.id,
                            RejectDoctorRequest("مرفوض من السكرتيرة")
                        )
                        if (response.success) {
                            Toast.makeText(requireContext(), "✅ تم رفض ${doctor.full_name}", Toast.LENGTH_SHORT).show()
                            loadData()
                        } else {
                            Toast.makeText(requireContext(), response.message ?: "فشل", Toast.LENGTH_LONG).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(requireContext(), "خطأ: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
            .setNegativeButton("إلغاء", null)
            .show()
    }
}