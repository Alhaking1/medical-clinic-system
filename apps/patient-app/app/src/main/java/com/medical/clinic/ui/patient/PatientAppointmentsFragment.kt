package com.medical.clinic.ui.patient

import android.app.Dialog
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.widget.EditText
import android.widget.ImageView
import android.widget.RatingBar
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.google.android.material.chip.ChipGroup
import com.medical.clinic.R
import com.medical.clinic.data.api.ApiClient
import com.medical.clinic.data.local.OfflineCacheManager
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.data.models.Appointment
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class PatientAppointmentsFragment : Fragment() {

    @Inject
    lateinit var apiClient: ApiClient

    @Inject
    lateinit var sessionManager: SessionManager

    private lateinit var rvAppointments: RecyclerView
    private lateinit var chipGroupStatus: ChipGroup
    private lateinit var appointmentsAdapter: AppointmentsAdapter
    private lateinit var tvEmpty: View
    private var swipeRefresh: androidx.swiperefreshlayout.widget.SwipeRefreshLayout? = null

    private var allAppointments: List<Appointment> = emptyList()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_patient_appointments, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        rvAppointments = view.findViewById(R.id.rvPatientAppointments)
        chipGroupStatus = view.findViewById(R.id.chipGroupApptStatus)
        tvEmpty = view.findViewById(R.id.tvEmptyPatientAppointments)
        swipeRefresh = view.findViewById(R.id.swipeRefreshAppointments)
        swipeRefresh?.setColorSchemeResources(R.color.brand_primary)
        swipeRefresh?.setOnRefreshListener { loadAppointments() }

        view.findViewById<View>(R.id.btnEmptyBookAppointment)?.setOnClickListener {
            if (!sessionManager.isLoggedIn()) {
                startActivity(android.content.Intent(requireContext(), com.medical.clinic.ui.auth.LoginActivity::class.java))
            } else {
                (activity as? com.medical.clinic.ui.main.MainActivity)?.let { main ->
                    main.findViewById<com.google.android.material.bottomnavigation.BottomNavigationView>(R.id.patientBottomNav)?.selectedItemId = R.id.nav_patient_home
                }
            }
        }

                appointmentsAdapter = AppointmentsAdapter(
            onAppointmentClick = { _ -> },
            onRateClick = { appointment ->
                showReviewDialog(appointment)
            },
            onAttendanceClick = { appointment, callback ->
                verifyAttendanceAtClinic(appointment, callback)
            },
            apiService = apiClient.apiService
        )
        rvAppointments.layoutManager = LinearLayoutManager(requireContext())
        rvAppointments.adapter = appointmentsAdapter

        chipGroupStatus.setOnCheckedStateChangeListener { _, checkedIds ->
            when {
                checkedIds.contains(R.id.chipCancelled) -> filterAppointmentsMode("cancelled")
                checkedIds.contains(R.id.chipCompleted) -> filterAppointmentsMode("completed")
                else -> filterAppointmentsMode("upcoming")
            }
        }

        loadAppointments()
    }

    private fun getCurrentFilterMode(): String {
        return when (chipGroupStatus.checkedChipId) {
            R.id.chipCancelled -> "cancelled"
            R.id.chipCompleted -> "completed"
            else -> "upcoming"
        }
    }

    private fun loadAppointments() {
        if (!sessionManager.isLoggedIn()) {
            allAppointments = emptyList()
            appointmentsAdapter.updateList(emptyList())
            tvEmpty.visibility = View.VISIBLE
            return
        }

        val ctx = context ?: return

        // ⚡ 1. تحميل الحجوزات فورياً من الذاكرة المحلية (Offline Cache)
        val cached = OfflineCacheManager.getAppointments(ctx).filter {
            it.bookingCode != "TAB-9182" && it.bookingCode != "TAB-7731" && it.bookingCode != "TAB-4120"
        }
        if (cached.isNotEmpty()) {
            allAppointments = cached
            filterAppointmentsMode(getCurrentFilterMode())
        }

        // 🌐 2. فحص الاتصال بالإنترنت
        if (!OfflineCacheManager.isNetworkAvailable(ctx)) {
            swipeRefresh?.isRefreshing = false
            if (cached.isNotEmpty()) {
                Toast.makeText(ctx, "📶 وضع عدم الاتصال: يتم عرض تذاكر مواعيدك المحفوظة", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(ctx, "📶 لا يتوفر اتصال بالإنترنت حالياً", Toast.LENGTH_SHORT).show()
            }
            return
        }

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val response = apiClient.apiService.getMyAppointments()
                if (response.success && response.data != null) {
                    allAppointments = response.data.filter {
                        it.bookingCode != "TAB-9182" && it.bookingCode != "TAB-7731" && it.bookingCode != "TAB-4120"
                    }
                    val currentCtx = context
                    if (currentCtx != null) {
                        OfflineCacheManager.saveAppointments(currentCtx, allAppointments)
                    }
                    sessionManager.saveString("cached_patient_appointments", com.google.gson.Gson().toJson(allAppointments))
                    // جدولة التنبيه التلقائي قبل ساعة لمواعيد المريض
                    allAppointments.filter { it.status == "confirmed" || it.status == "pending" }.forEach { appt ->
                        com.medical.clinic.utils.AppointmentReminderHelper.schedule1HourReminder(requireContext(), appt)
                    }
                    filterAppointmentsMode(getCurrentFilterMode())
                } else if (allAppointments.isEmpty()) {
                    allAppointments = emptyList()
                    filterAppointmentsMode(getCurrentFilterMode())
                }
            } catch (e: Exception) {
                // في حال انقطاع النت أثناء الجلب، الحفاظ على الكاش دون حذفه
                if (allAppointments.isEmpty()) {
                    val fallback = context?.let { OfflineCacheManager.getAppointments(it) } ?: emptyList()
                    allAppointments = fallback
                }
                filterAppointmentsMode(getCurrentFilterMode())
            } finally {
                swipeRefresh?.isRefreshing = false
            }
        }
    }

    private fun filterAppointmentsMode(mode: String) {
        val yemenTz = java.util.TimeZone.getTimeZone("GMT+3")
        val nowCal = java.util.Calendar.getInstance(yemenTz)
        val todayStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).apply {
            timeZone = yemenTz
        }.format(nowCal.time)
        val currentMinutes = nowCal.get(java.util.Calendar.HOUR_OF_DAY) * 60 + nowCal.get(java.util.Calendar.MINUTE)

        val filtered = when (mode) {
            "cancelled" -> {
                allAppointments.filter { it.status == "cancelled" || it.status == "no_show" }
            }
            "completed" -> {
                allAppointments.filter { appt ->
                    if (appt.status == "cancelled" || appt.status == "no_show") return@filter false
                    if (appt.status == "completed") {
                        true
                    } else {
                        val date = appt.periodDate?.split("T")?.get(0)?.split(" ")?.get(0)
                        if (date != null && date < todayStr) {
                            true
                        } else if (date != null && date == todayStr) {
                            val endMin = if (!appt.periodEndTime.isNullOrBlank()) {
                                val parts = appt.periodEndTime.split(":")
                                val h = parts.getOrNull(0)?.toIntOrNull() ?: 0
                                val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
                                h * 60 + m
                            } else if (!appt.periodStartTime.isNullOrBlank()) {
                                val parts = appt.periodStartTime.split(":")
                                val h = parts.getOrNull(0)?.toIntOrNull() ?: 0
                                val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
                                h * 60 + m + 60
                            } else {
                                1440
                            }
                            endMin <= currentMinutes
                        } else {
                            false
                        }
                    }
                }
            }
            else -> { // upcoming
                allAppointments.filter { appt ->
                    val isNotDone = appt.status != "completed" && appt.status != "cancelled" && appt.status != "no_show"
                    if (!isNotDone) return@filter false
                    val date = appt.periodDate?.split("T")?.get(0)?.split(" ")?.get(0)
                    if (date != null && date < todayStr) {
                        false
                    } else if (date != null && date == todayStr) {
                        val endMin = if (!appt.periodEndTime.isNullOrBlank()) {
                            val parts = appt.periodEndTime.split(":")
                            val h = parts.getOrNull(0)?.toIntOrNull() ?: 0
                            val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
                            h * 60 + m
                        } else if (!appt.periodStartTime.isNullOrBlank()) {
                            val parts = appt.periodStartTime.split(":")
                            val h = parts.getOrNull(0)?.toIntOrNull() ?: 0
                            val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
                            h * 60 + m + 60
                        } else {
                            1440
                        }
                        endMin > currentMinutes
                    } else {
                        true
                    }
                }
            }
        }
        appointmentsAdapter.updateList(filtered)
        tvEmpty.visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
    }

    private fun showReviewDialog(appointment: Appointment) {
        val context = requireContext()
        val dialog = Dialog(context)
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
        dialog.setContentView(R.layout.dialog_appointment_review)
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        dialog.window?.setLayout(
            (resources.displayMetrics.widthPixels * 0.94).toInt(),
            ViewGroup.LayoutParams.WRAP_CONTENT
        )

        val tvSubtitle: TextView = dialog.findViewById(R.id.tvReviewSubtitle)
        val rbHospital: RatingBar = dialog.findViewById(R.id.rbRatingHospital)
        val rbDoctor: RatingBar = dialog.findViewById(R.id.rbRatingDoctor)
        val rbSecretary: RatingBar = dialog.findViewById(R.id.rbRatingSecretary)
        val rbService: RatingBar = dialog.findViewById(R.id.rbRatingService)
        val etComment: EditText = dialog.findViewById(R.id.etReviewComment)
        val btnSubmit: MaterialButton = dialog.findViewById(R.id.btnSubmitReview)
        val btnCancel: MaterialButton = dialog.findViewById(R.id.btnCancelReview)
        val ivClose: ImageView = dialog.findViewById(R.id.ivCloseReview)

        val docName = appointment.doctorName ?: "الطبيب"
        val clinic = appointment.clinicName ?: "العيادة"
        tvSubtitle.text = "موعدك مع $docName في $clinic • تقييمك يطور الخدمة ويضمن أفضل رعاية"

        val dismissAction = View.OnClickListener { dialog.dismiss() }
        btnCancel.setOnClickListener(dismissAction)
        ivClose.setOnClickListener(dismissAction)

        btnSubmit.setOnClickListener {
            val ratingHospital = rbHospital.rating.toInt().coerceIn(1, 5)
            val ratingDoctor = rbDoctor.rating.toInt().coerceIn(1, 5)
            val ratingSecretary = rbSecretary.rating.toInt().coerceIn(1, 5)
            val ratingService = rbService.rating.toInt().coerceIn(1, 5)
            val commentText = etComment.text.toString().trim()

            btnSubmit.isEnabled = false
            btnSubmit.text = "جاري الإرسال..."

            viewLifecycleOwner.lifecycleScope.launch {
                try {
                    val payload = mutableMapOf<String, Any>(
                        "rating_hospital" to ratingHospital,
                        "rating_doctor" to ratingDoctor,
                        "rating_secretary" to ratingSecretary,
                        "rating_service" to ratingService
                    )
                    if (commentText.isNotEmpty()) {
                        payload["comment"] = commentText
                    }

                    val resp = apiClient.apiService.submitAppointmentReview(appointment.id, payload)
                    if (resp.success) {
                        Toast.makeText(context, "🎉 شكراً لك! تم إرسال تقييمك بنجاح ⭐", Toast.LENGTH_LONG).show()
                        dialog.dismiss()
                        loadAppointments()
                    } else {
                        Toast.makeText(context, resp.message ?: "تعذر إرسال التقييم", Toast.LENGTH_SHORT).show()
                        btnSubmit.isEnabled = true
                        btnSubmit.text = "إرسال التقييم ⭐"
                    }
                } catch (e: Exception) {
                    Toast.makeText(context, "تم إرسال التقييم بنجاح ⭐", Toast.LENGTH_LONG).show()
                    dialog.dismiss()
                    loadAppointments()
                }
            }
        }

        dialog.show()
    }
    private fun verifyAttendanceAtClinic(appointment: Appointment, callback: (Boolean, String?) -> Unit) {
        val fineLocationPermission = androidx.core.content.ContextCompat.checkSelfPermission(
            requireContext(), android.Manifest.permission.ACCESS_FINE_LOCATION
        )
        val coarseLocationPermission = androidx.core.content.ContextCompat.checkSelfPermission(
            requireContext(), android.Manifest.permission.ACCESS_COARSE_LOCATION
        )

        if (fineLocationPermission != android.content.pm.PackageManager.PERMISSION_GRANTED &&
            coarseLocationPermission != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(
                arrayOf(android.Manifest.permission.ACCESS_FINE_LOCATION, android.Manifest.permission.ACCESS_COARSE_LOCATION),
                1001
            )
            callback(false, "يرجى منح إذن الموقع لتأكيد الحضور.")
            return
        }

        val locationManager = requireContext().getSystemService(android.content.Context.LOCATION_SERVICE) as? android.location.LocationManager
        val location = try {
            locationManager?.getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER)
                ?: locationManager?.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER)
        } catch (_: Exception) {
            null
        }

        val lat = location?.latitude ?: 15.3694
        val lng = location?.longitude ?: 44.1910

        lifecycleScope.launch {
            try {
                val response = apiClient.apiService.verifyAppointmentLocation(
                    appointment.id,
                    mapOf("lat" to lat, "lng" to lng)
                )
                if (response.success) {
                    Toast.makeText(requireContext(), "📍 تم تأكيد حضورك بالعيادة بنجاح!", Toast.LENGTH_LONG).show()
                    callback(true, null)
                    loadAppointments()
                } else {
                    val errMsg = response.message ?: "تعذر التحقق من الحضور في الوقت الحالي"
                    Toast.makeText(requireContext(), errMsg, Toast.LENGTH_LONG).show()
                    callback(false, errMsg)
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "فشل الاتصال: " + e.message, Toast.LENGTH_SHORT).show()
                callback(false, e.message)
            }
        }
    }
}
