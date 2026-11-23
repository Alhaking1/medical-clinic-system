package com.medical.clinic.ui.patient

import android.graphics.Paint
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.R
import com.medical.clinic.data.models.OfferItem

class OffersAdapter(
    private var offers: List<OfferItem>,
    private val onOfferClick: (OfferItem) -> Unit
) : RecyclerView.Adapter<OffersAdapter.OfferViewHolder>() {

    fun updateData(newOffers: List<OfferItem>) {
        offers = newOffers
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): OfferViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_offer_card, parent, false)
        return OfferViewHolder(view)
    }

    override fun onBindViewHolder(holder: OfferViewHolder, position: Int) {
        holder.bind(offers[position])
    }

    override fun getItemCount(): Int = offers.size

    inner class OfferViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvBadge: TextView = itemView.findViewById(R.id.tvOfferDiscountBadge)
        private val tvExpiry: TextView = itemView.findViewById(R.id.tvOfferExpiry)
        private val tvTitle: TextView = itemView.findViewById(R.id.tvOfferTitle)
        private val tvDescription: TextView = itemView.findViewById(R.id.tvOfferDescription)
        private val tvDoctorInfo: TextView = itemView.findViewById(R.id.tvOfferDoctorInfo)
        private val tvOriginalPrice: TextView = itemView.findViewById(R.id.tvOfferOriginalPrice)
        private val tvDiscountedPrice: TextView = itemView.findViewById(R.id.tvOfferDiscountedPrice)
        private val btnBook: Button = itemView.findViewById(R.id.btnBookOffer)

        fun bind(offer: OfferItem) {
            tvBadge.text = offer.discountBadge
            if (!offer.remainingTimeDisplay.isNullOrEmpty()) {
                tvExpiry.text = "⏳ ${offer.remainingTimeDisplay}"
            } else {
                tvExpiry.text = "⏳ متاح لفترة محدودة"
            }
            tvTitle.text = offer.title
            tvDescription.text = offer.description ?: "عرض طبي استثنائي مع استشارة وفحوصات متكاملة."
            
            val doc = offer.doctorName ?: "طبيب معتمد"
            val spec = offer.doctorSpecialty?.let { " ($it)" } ?: ""
            val clinic = offer.clinicName?.let { " • $it" } ?: ""
            tvDoctorInfo.text = "$doc$spec$clinic"

            tvOriginalPrice.text = offer.formattedOriginalPrice
            tvOriginalPrice.paintFlags = tvOriginalPrice.paintFlags or Paint.STRIKE_THRU_TEXT_FLAG

            tvDiscountedPrice.text = offer.formattedDiscountedPrice

            btnBook.setOnClickListener { onOfferClick(offer) }
            itemView.setOnClickListener { onOfferClick(offer) }
        }
    }
}
