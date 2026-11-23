package com.medical.clinic.ui.secretary

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.R
import com.medical.clinic.data.api.DoctorItem

class DoctorAdapter(
    private val onDoctorClick: (DoctorItem) -> Unit
) : ListAdapter<DoctorItem, DoctorAdapter.VH>(DIFF) {

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<DoctorItem>() {
            override fun areItemsTheSame(a: DoctorItem, b: DoctorItem) = a.id == b.id
            override fun areContentsTheSame(a: DoctorItem, b: DoctorItem) = a == b
        }
    }

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvAvatar: TextView = view.findViewById(R.id.tvAvatar)
        val tvDoctorName: TextView = view.findViewById(R.id.tvDoctorName)
        val tvDoctorSpecialty: TextView = view.findViewById(R.id.tvDoctorSpecialty)
        val tvDoctorStatus: TextView = view.findViewById(R.id.tvDoctorStatus)
        val ivLinked: ImageView = view.findViewById(R.id.ivLinked)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_doctor, parent, false)
        return VH(view)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = getItem(position)

        holder.tvAvatar.text = "👨‍⚕️"
        holder.tvDoctorName.text = item.full_name
        holder.tvDoctorSpecialty.text = item.specialty ?: "—"
        holder.tvDoctorStatus.text = when (item.status) {
            "approved" -> "✅ معتمد"
            "pending" -> "⏳ قيد المراجعة"
            "rejected" -> "❌ مرفوض"
            else -> "—"
        }

        // مؤشر الربط
        if (item.is_linked == 1) {
            holder.ivLinked.setImageResource(android.R.drawable.checkbox_on_background)
        } else {
            holder.ivLinked.setImageResource(android.R.drawable.checkbox_off_background)
        }

        holder.itemView.setOnClickListener { onDoctorClick(item) }
    }
}
