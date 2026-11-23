package com.medical.clinic.staff.ui.doctor

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.staff.R
import com.medical.clinic.staff.data.models.DoctorQueueItem
import com.medical.clinic.staff.data.utils.Constants
import com.medical.clinic.staff.databinding.ItemQueuePatientBinding

class QueueAdapter(
    private val onStart: (DoctorQueueItem) -> Unit,
    private val onFinish: (DoctorQueueItem) -> Unit,
    private val onCancel: (DoctorQueueItem) -> Unit,
    private val onWritePrescription: (DoctorQueueItem) -> Unit = {}
) : RecyclerView.Adapter<QueueAdapter.QueueViewHolder>() {

    private val items = mutableListOf<DoctorQueueItem>()

    fun submitList(newItems: List<DoctorQueueItem>) {
        items.clear()
        items.addAll(newItems)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): QueueViewHolder {
        val binding = ItemQueuePatientBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return QueueViewHolder(binding)
    }

    override fun onBindViewHolder(holder: QueueViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount(): Int = items.size

    inner class QueueViewHolder(private val binding: ItemQueuePatientBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(item: DoctorQueueItem) {
            val ctx = binding.root.context
            binding.tvQueueNumber.text = "#${item.queueNumber}"
            val relBadge = if (!item.patientRelationship.isNullOrBlank() && item.patientRelationship != "صاحب الحساب") {
                val age = if (item.patientAge != null) " - ${item.patientAge} سنة" else ""
                " [👨‍👩‍👧‍👦 ${item.patientRelationship}$age]"
            } else ""
            binding.tvPatientName.text = "${item.patientName}$relBadge"
            binding.tvPatientPhone.text = item.patientPhone ?: "بدون هاتف"
            binding.tvBookingCode.text = if (!item.bookingCode.isNullOrBlank()) "كود الحجز: ${item.bookingCode}" else "تسجيل مباشر"

            if (item.isGolden == 1) {
                binding.tvStaffGoldenBadge.visibility = View.VISIBLE
            } else {
                binding.tvStaffGoldenBadge.visibility = View.GONE
            }

            when (item.status) {
                Constants.QUEUE_WAITING -> {
                    binding.tvQueueStatus.text = "قيد الانتظار"
                    binding.tvQueueStatus.setTextColor(ContextCompat.getColor(ctx, R.color.status_waiting))
                    binding.tvQueueStatus.setBackgroundResource(R.drawable.bg_status_pending)

                    binding.btnStartConsultation.visibility = View.VISIBLE
                    binding.btnFinishConsultation.visibility = View.GONE
                    binding.btnCancelVisit.visibility = View.VISIBLE
                    binding.btnWritePrescription.visibility = View.GONE

                    binding.btnStartConsultation.setOnClickListener { onStart(item) }
                    binding.btnCancelVisit.setOnClickListener { onCancel(item) }
                }
                Constants.QUEUE_IN_PROGRESS -> {
                    binding.tvQueueStatus.text = "داخل الكشف"
                    binding.tvQueueStatus.setTextColor(ContextCompat.getColor(ctx, R.color.brand_primary))
                    binding.tvQueueStatus.setBackgroundResource(R.drawable.bg_status_accepted)

                    binding.btnStartConsultation.visibility = View.GONE
                    binding.btnFinishConsultation.visibility = View.VISIBLE
                    binding.btnCancelVisit.visibility = View.GONE
                    binding.btnWritePrescription.visibility = View.VISIBLE

                    binding.btnFinishConsultation.setOnClickListener { onFinish(item) }
                    binding.btnWritePrescription.setOnClickListener { onWritePrescription(item) }
                }
                Constants.QUEUE_DONE -> {
                    binding.tvQueueStatus.text = "تم الكشف"
                    binding.tvQueueStatus.setTextColor(ContextCompat.getColor(ctx, R.color.status_done))
                    binding.tvQueueStatus.setBackgroundResource(R.drawable.bg_status_accepted)

                    binding.btnStartConsultation.visibility = View.GONE
                    binding.btnFinishConsultation.visibility = View.GONE
                    binding.btnCancelVisit.visibility = View.GONE
                    binding.btnWritePrescription.visibility = View.VISIBLE
                    binding.btnWritePrescription.setOnClickListener { onWritePrescription(item) }
                }
                else -> {
                    binding.tvQueueStatus.text = "ملغي"
                    binding.tvQueueStatus.setTextColor(ContextCompat.getColor(ctx, R.color.brand_danger))
                    binding.tvQueueStatus.setBackgroundResource(R.drawable.bg_status_cancelled)

                    binding.btnStartConsultation.visibility = View.GONE
                    binding.btnFinishConsultation.visibility = View.GONE
                    binding.btnCancelVisit.visibility = View.GONE
                    binding.btnWritePrescription.visibility = View.GONE
                }
            }
        }
    }
}
