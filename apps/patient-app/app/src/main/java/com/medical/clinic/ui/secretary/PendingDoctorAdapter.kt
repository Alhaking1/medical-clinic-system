package com.medical.clinic.ui.secretary

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.medical.clinic.R
import com.medical.clinic.data.api.PendingDoctorItem

class PendingDoctorAdapter(
    private val onApprove: (PendingDoctorItem) -> Unit,
    private val onReject: (PendingDoctorItem) -> Unit
) : ListAdapter<PendingDoctorItem, PendingDoctorAdapter.VH>(DIFF) {

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<PendingDoctorItem>() {
            override fun areItemsTheSame(a: PendingDoctorItem, b: PendingDoctorItem) = a.id == b.id
            override fun areContentsTheSame(a: PendingDoctorItem, b: PendingDoctorItem) = a == b
        }
    }

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvAvatar: TextView = view.findViewById(R.id.tvAvatar)
        val tvDoctorName: TextView = view.findViewById(R.id.tvDoctorName)
        val tvDoctorSpecialty: TextView = view.findViewById(R.id.tvDoctorSpecialty)
        val tvDoctorPhone: TextView = view.findViewById(R.id.tvDoctorPhone)
        val btnApprove: MaterialButton = view.findViewById(R.id.btnApprove)
        val btnReject: MaterialButton = view.findViewById(R.id.btnReject)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_pending_doctor, parent, false)
        return VH(view)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = getItem(position)

        holder.tvAvatar.text = "🩺"
        holder.tvDoctorName.text = item.full_name
        holder.tvDoctorSpecialty.text = item.specialty ?: "—"
        holder.tvDoctorPhone.text = "📱 ${item.phone ?: "—"}"

        holder.btnApprove.setOnClickListener { onApprove(item) }
        holder.btnReject.setOnClickListener { onReject(item) }
    }
}