package com.medical.clinic.ui.patient

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.R
import com.medical.clinic.data.models.Clinic

class HospitalsAdapter(
    private var hospitals: List<Clinic>,
    private val onHospitalClick: (Clinic) -> Unit
) : RecyclerView.Adapter<HospitalsAdapter.HospitalViewHolder>() {

    fun updateData(newHospitals: List<Clinic>) {
        hospitals = newHospitals
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): HospitalViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_hospital_card, parent, false)
        return HospitalViewHolder(view)
    }

    override fun onBindViewHolder(holder: HospitalViewHolder, position: Int) {
        val hospital = hospitals[position]
        holder.bind(hospital)
    }

    override fun getItemCount(): Int = hospitals.size

    inner class HospitalViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvName: TextView = itemView.findViewById(R.id.tvHospitalName)
        private val tvCity: TextView = itemView.findViewById(R.id.tvHospitalCity)
        private val tvCount: TextView = itemView.findViewById(R.id.tvHospitalSpecialtiesCount)
        private val tvStatusBadge: TextView? = itemView.findViewById(R.id.tvHospitalStatusBadge)
        private val tvWorkingHours: TextView? = itemView.findViewById(R.id.tvHospitalWorkingHours)
        private val tvHospitalEmoji: TextView? = itemView.findViewById(R.id.tvHospitalEmoji)
        private val ivHospitalImage: android.widget.ImageView? = itemView.findViewById(R.id.ivHospitalImage)

        fun bind(hospital: Clinic) {
            tvName.text = hospital.name

            val clinicImg = hospital.image
            if (!clinicImg.isNullOrBlank() && ivHospitalImage != null) {
                val fullUrl = if (clinicImg.startsWith("http")) clinicImg else "${com.medical.clinic.utils.Constants.BASE_URL_LOCAL.removeSuffix("api/v1/")}${clinicImg.removePrefix("/")}"
                com.bumptech.glide.Glide.with(itemView.context)
                    .load(fullUrl)
                    .circleCrop()
                    .into(ivHospitalImage)
                ivHospitalImage.visibility = View.VISIBLE
                tvHospitalEmoji?.visibility = View.GONE
            } else {
                ivHospitalImage?.visibility = View.GONE
                tvHospitalEmoji?.visibility = View.VISIBLE
            }
            val cityText = listOfNotNull(hospital.governorate, hospital.address).joinToString(" - ")
            tvCity.text = if (cityText.isNotBlank()) cityText else "اليمن"
            tvCount.text = "متاح للحجز الفوري"

            val isOpen = hospital.isOpen ?: true
            val status = hospital.statusLabel ?: if (isOpen) "🟢 مفتوح الآن" else "🔴 مغلق حالياً"
            tvStatusBadge?.text = status
            tvStatusBadge?.setTextColor(if (isOpen) 0xFF059669.toInt() else 0xFFDC2626.toInt())

            val hours = hospital.workingHoursDisplay
            if (!hours.isNullOrBlank()) {
                tvWorkingHours?.text = hours
                tvWorkingHours?.visibility = View.VISIBLE
            } else {
                tvWorkingHours?.visibility = View.GONE
            }

            itemView.setOnClickListener {
                onHospitalClick(hospital)
            }
        }
    }
}
