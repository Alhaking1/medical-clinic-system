package com.medical.clinic.ui.patient

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.R
import com.medical.clinic.data.models.DoctorItem

class DoctorsAdapter(
    private var doctors: List<DoctorItem>,
    private val onDoctorClick: (DoctorItem) -> Unit,
    private val onBookClick: (DoctorItem) -> Unit
) : RecyclerView.Adapter<DoctorsAdapter.DoctorViewHolder>() {

    fun updateData(newDoctors: List<DoctorItem>) {
        doctors = newDoctors
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DoctorViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_doctor_card, parent, false)
        return DoctorViewHolder(view)
    }

    override fun onBindViewHolder(holder: DoctorViewHolder, position: Int) {
        val doc = doctors[position]
        holder.bind(doc)
    }

    override fun getItemCount(): Int = doctors.size

    inner class DoctorViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvName: TextView = itemView.findViewById(R.id.tvDoctorName)
        private val tvSpecialty: TextView = itemView.findViewById(R.id.tvDoctorSpecialty)
        private val tvClinic: TextView = itemView.findViewById(R.id.tvDoctorClinic)
        private val tvRating: TextView = itemView.findViewById(R.id.tvDoctorRating)
        private val tvSeats: TextView = itemView.findViewById(R.id.tvDoctorSeats)
        private val tvFee: TextView = itemView.findViewById(R.id.tvDoctorFee)
        private val btnBook: Button = itemView.findViewById(R.id.btnBookDoctor)
        private val tvDoctorEmoji: TextView = itemView.findViewById(R.id.tvDoctorEmoji)
        private val ivDoctorAvatar: android.widget.ImageView = itemView.findViewById(R.id.ivDoctorAvatar)

        fun bind(doc: DoctorItem) {
            tvName.text = doc.displayName
            tvSpecialty.text = doc.specialty

            val avatarUrl = doc.avatar
            if (!avatarUrl.isNullOrBlank()) {
                val fullUrl = if (avatarUrl.startsWith("http")) avatarUrl else "${com.medical.clinic.utils.Constants.BASE_URL_LOCAL.removeSuffix("api/v1/")}${avatarUrl.removePrefix("/")}"
                com.bumptech.glide.Glide.with(itemView.context)
                    .load(fullUrl)
                    .circleCrop()
                    .into(ivDoctorAvatar)
                ivDoctorAvatar.visibility = View.VISIBLE
                tvDoctorEmoji.visibility = View.GONE
            } else {
                ivDoctorAvatar.visibility = View.GONE
                tvDoctorEmoji.visibility = View.VISIBLE
            }
            
            val clinicDetails = buildString {
                append(doc.clinicName ?: "عيادة تخصصية")
                if (!doc.clinicWorkingHours.isNullOrBlank()) {
                    append(" • ")
                    append(doc.clinicWorkingHours)
                }
            }
            tvClinic.text = clinicDetails

            if (doc.rating != null && doc.rating > 0f) {
                tvRating.text = " • ⭐ ${doc.rating}"
                tvRating.setTextColor(ContextCompat.getColor(itemView.context, R.color.gold_star))
            } else {
                tvRating.text = " • ⭐ لا شيء"
                tvRating.setTextColor(Color.parseColor("#94A3B8"))
            }

            tvFee.text = doc.formattedFee

            val seats = doc.availableSeats ?: 8
            if (seats > 0) {
                tvSeats.text = "🟢 متبقي $seats مقاعد للحجز اليوم"
                tvSeats.setTextColor(Color.parseColor("#0D9488"))
                btnBook.isEnabled = true
                btnBook.text = "حجز كشف"
            } else {
                tvSeats.text = "🔴 المقاعد مكتملة اليوم"
                tvSeats.setTextColor(Color.parseColor("#EF4444"))
                btnBook.isEnabled = false
                btnBook.text = "مكتمل"
            }

            itemView.setOnClickListener { onDoctorClick(doc) }
            btnBook.setOnClickListener { onBookClick(doc) }
        }
    }
}
