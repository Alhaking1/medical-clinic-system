package com.medical.clinic.ui.patient

import android.app.Dialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.net.Uri
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.medical.clinic.R
import com.medical.clinic.data.models.Appointment
import com.medical.clinic.nfc.PatientHceService
import com.medical.clinic.utils.QrCodeUtils
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class AppointmentsAdapter(
    private var items: List<Appointment> = emptyList(),
    private val onAppointmentClick: (Appointment) -> Unit = {},
    private val onRateClick: (Appointment) -> Unit = {},
    private val onAttendanceClick: (Appointment, (Boolean, String?) -> Unit) -> Unit = { _, _ -> },
    private val apiService: com.medical.clinic.data.api.ApiService? = null
) : RecyclerView.Adapter<AppointmentsAdapter.ViewHolder>() {

    fun updateList(newList: List<Appointment>) {
        items = newList
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_appointment_card, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]
        holder.bind(item)
    }

    override fun getItemCount() = items.size

    inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvDoctor: TextView = itemView.findViewById(R.id.tvApptDoctor)
        private val tvHospital: TextView = itemView.findViewById(R.id.tvApptHospital)
        private val tvQueue: TextView = itemView.findViewById(R.id.tvApptQueueNumber)
        private val tvTime: TextView = itemView.findViewById(R.id.tvApptTime)
        private val tvStatus: TextView = itemView.findViewById(R.id.tvApptStatus)
        private val tvGoldenBadge: TextView = itemView.findViewById(R.id.tvApptGoldenBadge)
        private val btnClinicMap: MaterialButton = itemView.findViewById(R.id.btnClinicMap)
        private val btnQrCode: MaterialButton = itemView.findViewById(R.id.btnQrCode)
        private val btnIAmAtClinic: MaterialButton? = itemView.findViewById(R.id.btnIAmAtClinic)
        private val tvAttendanceConfirmedBadge: TextView? = itemView.findViewById(R.id.tvAttendanceConfirmedBadge)
        private val btnRateAppointment: MaterialButton = itemView.findViewById(R.id.btnRateAppointment)
        private val tvReviewedBadge: TextView = itemView.findViewById(R.id.tvReviewedBadge)

        private val tvSpecialty: TextView? = itemView.findViewById(R.id.tvApptSpecialty)

        fun bind(item: Appointment) {
            val docName = item.doctorName ?: "طبيب استشاري"
            if (tvSpecialty != null) {
                tvDoctor.text = docName
                tvSpecialty.text = item.doctorSpecialty ?: "استشاري عام"
            } else {
                val spec = item.doctorSpecialty?.let { " ($it)" } ?: ""
                tvDoctor.text = "$docName$spec"
            }

            tvHospital.text = if (!item.patientRelationship.isNullOrBlank() && item.patientRelationship != "صاحب الحساب") {
                val rel = item.patientRelationship
                val pName = item.patientName ?: "المريض"
                val pAge = if (item.patientAge != null) " - ${item.patientAge} سنة" else ""
                "${item.clinicName ?: "العيادة"} • 👨‍👩‍👧‍👦 ${pName} (${rel}${pAge})"
            } else {
                item.clinicName ?: "العيادة الطبية"
            }

            // الحجز الذهبي والمقعد الأولي
            if (item.isGolden == 1) {
                tvGoldenBadge.visibility = View.VISIBLE
                val qNum = item.queueNumber ?: 1
                tvQueue.text = "المقعد الذهبي #$qNum 👑"
                tvQueue.setTextColor(Color.parseColor("#92400E"))
                tvQueue.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#FEF3C7"))
            } else {
                tvGoldenBadge.visibility = View.GONE
                val qNum = item.queueNumber ?: 1
                tvQueue.text = "الدور #$qNum"
                tvQueue.setTextColor(Color.parseColor("#0A5C5F"))
                tvQueue.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#E6F4F1"))
            }

            val formattedDate = com.medical.clinic.utils.DateTimeUtils.formatArabicDate(item.periodDate)
            val formattedTime = com.medical.clinic.utils.DateTimeUtils.formatArabicTime(item.periodStartTime)
            val timeDisplay = if (formattedTime.isNotBlank()) " | $formattedTime" else ""
            tvTime.text = "$formattedDate$timeDisplay"

            when (item.status) {
                "confirmed" -> {
                    tvStatus.text = "مؤكدة"
                    tvStatus.setTextColor(Color.parseColor("#0D9488"))
                    tvStatus.setBackgroundResource(R.drawable.bg_pill_status_confirmed)
                }
                "completed" -> {
                    tvStatus.text = "مكتملة"
                    tvStatus.setTextColor(Color.parseColor("#6B7280"))
                    tvStatus.setBackgroundResource(R.drawable.bg_pill_status_completed)
                }
                "cancelled" -> {
                    tvStatus.text = "ملغاة"
                    tvStatus.setTextColor(Color.parseColor("#DC2626"))
                    tvStatus.setBackgroundResource(R.drawable.bg_pill_status_cancelled)
                }
                else -> {
                    tvStatus.text = "قادمة"
                    tvStatus.setTextColor(Color.parseColor("#B45309"))
                    tvStatus.setBackgroundResource(R.drawable.bg_pill_status_upcoming)
                }
            }

            // ميزة زر "أنا في العيادة" المقيدة بمدة الفترة بدقة
            val isArrived = item.attendanceStatus == "arrived"
            val isWithinPeriod = isAppointmentWithinPeriod(item)

            // ضبط شحنة الـ NFC أوفلاين تلقائياً إذا كان الموعد اليوم
            if (isToday(item.periodDate)) {
                val code = item.bookingCode ?: "TAB-${item.id}"
                PatientHceService.currentPayload = "TABEEBAK_APPT:${item.id}:$code"
            }

            if (isArrived) {
                tvAttendanceConfirmedBadge?.visibility = View.VISIBLE
                btnIAmAtClinic?.visibility = View.GONE
            } else if (isWithinPeriod) {
                tvAttendanceConfirmedBadge?.visibility = View.GONE
                btnIAmAtClinic?.visibility = View.VISIBLE
                btnIAmAtClinic?.isEnabled = true
                btnIAmAtClinic?.text = "🟢 أنا في العيادة الآن (تأكيد الحضور)"
                btnIAmAtClinic?.setOnClickListener {
                    btnIAmAtClinic.isEnabled = false
                    btnIAmAtClinic.text = "جاري التحقق من الموقع..."
                    onAttendanceClick(item) { success, _ ->
                        if (success) {
                            btnIAmAtClinic.visibility = View.GONE
                            tvAttendanceConfirmedBadge?.visibility = View.VISIBLE
                        } else {
                            btnIAmAtClinic.isEnabled = true
                            btnIAmAtClinic.text = "🟢 أنا في العيادة الآن (تأكيد الحضور)"
                        }
                    }
                }
            } else {
                tvAttendanceConfirmedBadge?.visibility = View.GONE
                btnIAmAtClinic?.visibility = View.GONE
            }

            // نظام التقييم بعد انتهاء الفترة أو إكمال الموعد
            val isEligibleForReview = checkReviewEligibility(item)
            if (item.isReviewed == 1) {
                btnRateAppointment.visibility = View.GONE
                tvReviewedBadge.visibility = View.VISIBLE
            } else if (isEligibleForReview) {
                btnRateAppointment.visibility = View.VISIBLE
                tvReviewedBadge.visibility = View.GONE
                btnRateAppointment.setOnClickListener {
                    onRateClick(item)
                }
            } else {
                btnRateAppointment.visibility = View.GONE
                tvReviewedBadge.visibility = View.GONE
            }

            itemView.setOnClickListener {
                showTicketDialog(item)
                onAppointmentClick(item)
            }

            btnClinicMap.setOnClickListener {
                val clinic = item.clinicName ?: "عيادة طبية في اليمن"
                val mapUri = Uri.parse("geo:0,0?q=" + Uri.encode(clinic))
                try {
                    val mapIntent = Intent(Intent.ACTION_VIEW, mapUri)
                    itemView.context.startActivity(mapIntent)
                } catch (e: Exception) {
                    val webMapIntent = Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("https://www.google.com/maps/search/?api=1&query=" + Uri.encode(clinic))
                    )
                    itemView.context.startActivity(webMapIntent)
                }
            }

            btnQrCode.setOnClickListener {
                showTicketDialog(item)
            }
        }

        private fun isToday(dateStr: String?): Boolean {
            if (dateStr.isNullOrBlank()) return false
            val cleanDate = dateStr.split("T")[0].split(" ")[0].trim()
            val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
            return cleanDate == todayStr
        }

        private fun isAppointmentWithinPeriod(item: Appointment): Boolean {
            if (item.status == "cancelled" || item.status == "completed") return false

            val rawDate = item.periodDate ?: return false
            val datePart = rawDate.split("T")[0].split(" ")[0].trim()

            val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
            if (datePart != today) return false

            val startStr = item.periodStartTime ?: return true
            val endStr = item.periodEndTime ?: return true

            fun timeToMinutes(t: String): Int {
                val parts = t.trim().split(":")
                val h = parts.getOrNull(0)?.toIntOrNull() ?: 0
                val m = parts.getOrNull(1)?.toIntOrNull() ?: 0
                return h * 60 + m
            }

            val startMin = timeToMinutes(startStr)
            val endMin = timeToMinutes(endStr)

            val now = Calendar.getInstance()
            val currentMin = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)

            // الشرط الصارم: فقط خلال مدة الفترة المحددة للحجز (مع سماح 15 دقيقة قبل بداية الفترة للوصول)
            return currentMin in (startMin - 15)..endMin
        }

        private fun checkReviewEligibility(item: Appointment): Boolean {
            // 🛡️ شرط التقييم المعتمد: تم تأكيد الحضور الفعلي للعيادة أو إكمال الكشف الطبي
            val isAttended = item.attendanceStatus == "attended" || 
                             !item.locationVerifiedAt.isNullOrBlank() || 
                             item.status == "completed"
            return isAttended && (item.isReviewed ?: 0) != 1
        }

        private fun showTicketDialog(item: Appointment) {
            val context = itemView.context
            val dialog = Dialog(context)
            dialog.requestWindowFeature(Window.FEATURE_NO_TITLE)
            dialog.setContentView(R.layout.dialog_appointment_ticket)
            dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
            dialog.window?.setLayout(
                (context.resources.displayMetrics.widthPixels * 0.92).toInt(),
                ViewGroup.LayoutParams.WRAP_CONTENT
            )

            val tvCode: TextView = dialog.findViewById(R.id.tvTicketBookingCode)
            val ivQr: ImageView = dialog.findViewById(R.id.ivTicketQr)
            val tvDoctor: TextView = dialog.findViewById(R.id.tvTicketDoctor)
            val tvClinic: TextView = dialog.findViewById(R.id.tvTicketClinic)
            val tvTime: TextView = dialog.findViewById(R.id.tvTicketTime)
            val tvQueue: TextView = dialog.findViewById(R.id.tvTicketQueue)
            val tvTicketGoldenBadge: TextView = dialog.findViewById(R.id.tvTicketGoldenBadge)
            val cardLiveQueue: com.google.android.material.card.MaterialCardView? = dialog.findViewById(R.id.cardLiveQueue)
            val tvLiveQueueStatus: TextView? = dialog.findViewById(R.id.tvLiveQueueStatus)

            if (isToday(item.periodDate) && item.status != "cancelled" && item.status != "completed") {
                cardLiveQueue?.visibility = View.VISIBLE
                tvLiveQueueStatus?.text = "جاري الاتصال بالطابور الحي..."
                if (apiService != null) {
                    val streamJob = CoroutineScope(Dispatchers.IO).launch {
                        while (isActive) {
                            try {
                                val resp = apiService.getLiveQueueStatus(item.id)
                                if (resp.success && resp.data != null) {
                                    val data = resp.data
                                    withContext(Dispatchers.Main) {
                                        if (data.patientsAhead == 0) {
                                            cardLiveQueue?.setCardBackgroundColor(Color.parseColor("#FEF3C7"))
                                            cardLiveQueue?.strokeColor = Color.parseColor("#FDE68A")
                                            tvLiveQueueStatus?.setTextColor(Color.parseColor("#B45309"))
                                            tvLiveQueueStatus?.text = "🏥 حان دورك الآن! يرجى الدخول لغرفة الطبيب"
                                        } else if (data.patientsAhead == 1) {
                                            cardLiveQueue?.setCardBackgroundColor(Color.parseColor("#EFF6FF"))
                                            cardLiveQueue?.strokeColor = Color.parseColor("#BFDBFE")
                                            tvLiveQueueStatus?.setTextColor(Color.parseColor("#1D4ED8"))
                                            tvLiveQueueStatus?.text = "⏳ أنت المريض التالي! يرجى التوجه لباب العيادة"
                                        } else {
                                            cardLiveQueue?.setCardBackgroundColor(Color.parseColor("#ECFDF5"))
                                            cardLiveQueue?.strokeColor = Color.parseColor("#A7F3D0")
                                            tvLiveQueueStatus?.setTextColor(Color.parseColor("#047857"))
                                            tvLiveQueueStatus?.text = "يجري الآن كشف دور #" + data.currentServingNumber + " • يتبقى أمامك " + data.patientsAhead + " مرضى (~" + data.estimatedWaitMinutes + " دقيقة)"
                                        }
                                    }
                                }
                            } catch (_: Exception) {}
                            kotlinx.coroutines.delay(4000)
                        }
                    }
                    dialog.setOnDismissListener { streamJob.cancel() }
                }
            } else {
                cardLiveQueue?.visibility = View.GONE
            }
            val layoutTicketTx: LinearLayout = dialog.findViewById(R.id.layoutTicketTx)
            val tvTicketTxId: TextView = dialog.findViewById(R.id.tvTicketTxId)
            val btnClinicMap: MaterialButton = dialog.findViewById(R.id.btnDialogClinicMap)
            val btnCopyCode: MaterialButton = dialog.findViewById(R.id.btnCopyBookingCode)
            val btnClose: MaterialButton = dialog.findViewById(R.id.btnTicketClose)

            val code = item.bookingCode ?: "TAB-${item.id}"
            tvCode.text = "رمز الحجز: #$code"
            tvDoctor.text = item.doctorName ?: "الطبيب"
            tvClinic.text = if (!item.patientRelationship.isNullOrBlank() && item.patientRelationship != "صاحب الحساب") {
                "${item.clinicName ?: "العيادة"} • المريض: ${item.patientName ?: "المريض"} (${item.patientRelationship})"
            } else {
                item.clinicName ?: "العيادة"
            }
            val dFormatted = com.medical.clinic.utils.DateTimeUtils.formatArabicDate(item.periodDate)
            val tFormatted = com.medical.clinic.utils.DateTimeUtils.formatArabicTime(item.periodStartTime)
            tvTime.text = "$dFormatted | $tFormatted"
            tvQueue.text = "#${item.queueNumber ?: "-"}"

            // تفعيل بث الـ NFC أوفلاين فوراً بمجرد فتح التذكرة
            PatientHceService.currentPayload = "TABEEBAK_APPT:${item.id}:$code"

            if (item.isGolden == 1) {
                tvTicketGoldenBadge.visibility = View.VISIBLE
            } else {
                tvTicketGoldenBadge.visibility = View.GONE
            }

            if (!item.transactionId.isNullOrBlank()) {
                layoutTicketTx.visibility = View.VISIBLE
                tvTicketTxId.text = item.transactionId
            } else {
                layoutTicketTx.visibility = View.GONE
            }

            val qrBitmap = QrCodeUtils.generateQrCode("TABEEBAK_APPT:${item.id}:${code}")
            if (qrBitmap != null) {
                ivQr.setImageBitmap(qrBitmap)
            }

            btnClinicMap.setOnClickListener {
                val clinic = item.clinicName ?: "عيادة طبية في اليمن"
                val mapUri = Uri.parse("geo:0,0?q=" + Uri.encode(clinic))
                try {
                    val mapIntent = Intent(Intent.ACTION_VIEW, mapUri)
                    context.startActivity(mapIntent)
                } catch (e: Exception) {
                    val webMapIntent = Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("https://www.google.com/maps/search/?api=1&query=" + Uri.encode(clinic))
                    )
                    context.startActivity(webMapIntent)
                }
            }

            btnCopyCode.setOnClickListener {
                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val clip = ClipData.newPlainText("BookingCode", code)
                clipboard.setPrimaryClip(clip)
                Toast.makeText(context, "تم نسخ رمز الحجز بنجاح (#$code)", Toast.LENGTH_SHORT).show()
            }

            btnClose.setOnClickListener { dialog.dismiss() }
            dialog.show()
        }
    }
}
