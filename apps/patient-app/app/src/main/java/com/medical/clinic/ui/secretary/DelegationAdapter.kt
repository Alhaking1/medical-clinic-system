package com.medical.clinic.ui.secretary

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.R
import com.medical.clinic.data.models.Delegation

/**
 * Adapter لعرض قائمة التفويضات
 *
 * @param currentSecretaryId — لتحديد إن كان التفويض وارداً أم صادراً
 * @param onItemClick — عند الضغط على العنصر
 * @param onAcceptClick — عند الضغط على "قبول"
 * @param onRejectClick — عند الضغط على "رفض"
 */
class DelegationAdapter(
    private val currentSecretaryId: Int,
    private val onItemClick: (Delegation) -> Unit = {},
    private val onAcceptClick: (Delegation) -> Unit = {},
    private val onRejectClick: (Delegation) -> Unit = {}
) : RecyclerView.Adapter<DelegationAdapter.DelegationViewHolder>() {

    private val items = mutableListOf<Delegation>()

    fun submitList(newItems: List<Delegation>) {
        items.clear()
        items.addAll(newItems)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DelegationViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_delegation, parent, false)
        return DelegationViewHolder(view)
    }

    override fun onBindViewHolder(holder: DelegationViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount(): Int = items.size

    inner class DelegationViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {

        private val tvAvatarInitial: TextView = itemView.findViewById(R.id.tvAvatarInitial)
        private val tvDoctorName: TextView = itemView.findViewById(R.id.tvDoctorName)
        private val tvSpecialty: TextView = itemView.findViewById(R.id.tvSpecialty)
        private val tvStatus: TextView = itemView.findViewById(R.id.tvStatus)
        private val tvFromTo: TextView = itemView.findViewById(R.id.tvFromTo)
        private val tvDuration: TextView = itemView.findViewById(R.id.tvDuration)
        private val rowMaxBookings: LinearLayout = itemView.findViewById(R.id.rowMaxBookings)
        private val tvMaxBookings: TextView = itemView.findViewById(R.id.tvMaxBookings)
        private val tvMessage: TextView = itemView.findViewById(R.id.tvMessage)
        private val rowActions: LinearLayout = itemView.findViewById(R.id.rowActions)
        private val btnAccept: Button = itemView.findViewById(R.id.btnAccept)
        private val btnReject: Button = itemView.findViewById(R.id.btnReject)
        private val tvCreatedAt: TextView = itemView.findViewById(R.id.tvCreatedAt)

        fun bind(delegation: Delegation) {
            val ctx = itemView.context

            // ─── Avatar ───
            val initial = delegation.doctorName?.firstOrNull()?.toString() ?: "د"
            tvAvatarInitial.text = initial

            // ─── Doctor ───
            tvDoctorName.text = delegation.doctorName ?: "طبيب #${delegation.doctorId}"
            tvSpecialty.text = delegation.doctorSpecialty ?: "—"

            // ─── Status Badge ───
            tvStatus.text = delegation.statusArabic
            applyStatusBadge(ctx, delegation.status)

            // ─── From → To ───
            val isIncoming = delegation.toSecretaryId == currentSecretaryId
            val fromName = delegation.fromSecretaryName ?: "—"
            val toName = delegation.toSecretaryName ?: "—"
            tvFromTo.text = if (isIncoming) {
                "من: $fromName"
            } else {
                "إلى: $toName"
            }

            // ─── Duration ───
            val days = calculateDays(delegation.validFrom, delegation.validUntil)
            tvDuration.text = "${delegation.validFrom} → ${delegation.validUntil}" +
                    if (days > 0) " ($days يوم)" else ""

            // ─── Max Bookings ───
            if (delegation.maxBookings != null && delegation.maxBookings > 0) {
                rowMaxBookings.visibility = View.VISIBLE
                tvMaxBookings.text = "الحد الأقصى: ${delegation.maxBookings} حجز"
            } else {
                rowMaxBookings.visibility = View.GONE
            }

            // ─── Message ───
            if (!delegation.message.isNullOrBlank()) {
                tvMessage.visibility = View.VISIBLE
                tvMessage.text = "💬 ${delegation.message}"
            } else {
                tvMessage.visibility = View.GONE
            }

            // ─── Actions (Pending + Incoming only) ───
            if (delegation.isPending && isIncoming) {
                rowActions.visibility = View.VISIBLE
                btnAccept.setOnClickListener { onAcceptClick(delegation) }
                btnReject.setOnClickListener { onRejectClick(delegation) }
            } else {
                rowActions.visibility = View.GONE
                btnAccept.setOnClickListener(null)
                btnReject.setOnClickListener(null)
            }

            // ─── Created At ───
            tvCreatedAt.text = formatCreatedAt(delegation.createdAt)

            // ─── Item Click ───
            itemView.setOnClickListener { onItemClick(delegation) }
        }

        private fun applyStatusBadge(ctx: android.content.Context, status: String) {
            val (bgRes, textColorRes) = when (status) {
                "pending" -> R.drawable.bg_status_pending to R.color.status_waiting
                "accepted" -> R.drawable.bg_status_accepted to R.color.status_done
                "rejected" -> R.drawable.bg_status_rejected to R.color.status_cancelled
                "cancelled" -> R.drawable.bg_status_cancelled to R.color.on_surface_dark_tertiary
                "expired" -> R.drawable.bg_status_cancelled to R.color.on_surface_dark_tertiary
                else -> R.drawable.bg_status_cancelled to R.color.on_surface_dark_tertiary
            }
            tvStatus.setBackgroundResource(bgRes)
            tvStatus.setTextColor(ContextCompat.getColor(ctx, textColorRes))
        }

        private fun calculateDays(from: String, until: String): Int {
            return try {
                val fmt = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
                val d1 = fmt.parse(from)?.time ?: return 0
                val d2 = fmt.parse(until)?.time ?: return 0
                (((d2 - d1) / (1000 * 60 * 60 * 24)).toInt()) + 1
            } catch (e: Exception) {
                0
            }
        }

        private fun formatCreatedAt(createdAt: String?): String {
            if (createdAt.isNullOrBlank()) return ""
            return try {
                // نأخذ الجزء الأول فقط (التاريخ)
                val parts = createdAt.split("T", " ")
                val datePart = parts.getOrNull(0) ?: return createdAt
                "📅 $datePart"
            } catch (e: Exception) {
                createdAt
            }
        }
    }
}