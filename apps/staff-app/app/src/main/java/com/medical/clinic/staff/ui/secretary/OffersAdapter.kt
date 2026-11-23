package com.medical.clinic.staff.ui.secretary

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.staff.data.models.OfferItem
import com.medical.clinic.staff.databinding.ItemOfferCardBinding

class OffersAdapter(
    private val onDelete: (OfferItem) -> Unit = {},
    private val onRepeat: (OfferItem) -> Unit = {}
) : RecyclerView.Adapter<OffersAdapter.OfferViewHolder>() {

    private val items = mutableListOf<OfferItem>()

    fun submitList(newItems: List<OfferItem>) {
        items.clear()
        items.addAll(newItems)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): OfferViewHolder {
        val binding = ItemOfferCardBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return OfferViewHolder(binding)
    }

    override fun onBindViewHolder(holder: OfferViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount(): Int = items.size

    inner class OfferViewHolder(private val binding: ItemOfferCardBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(item: OfferItem) {
            binding.tvOfferTitle.text = item.title
            binding.tvOfferDesc.text = item.description ?: "عرض خاص للعيادة"
            val discount = item.discountPercent ?: item.discountPercentage?.toInt() ?: 10
            binding.tvOfferDiscount.text = "$discount% خصم"
            binding.tvOfferDates.text = if (!item.endDate.isNullOrBlank()) "صالح حتى: ${item.endDate}" else "عرض ساري"

            // الطبيب المشمول
            val doc = item.doctorName ?: "طبيب بالعيادة"
            val spec = item.doctorSpecialty?.let { " ($it)" } ?: ""
            binding.tvOfferDoctor.text = "👨‍⚕️ الطبيب: $doc$spec"

            // المدة المتبقية
            if (!item.remainingTimeDisplay.isNullOrBlank()) {
                binding.tvOfferRemainingTime.visibility = View.VISIBLE
                binding.tvOfferRemainingTime.text = "⏳ ${item.remainingTimeDisplay}"
            } else {
                binding.tvOfferRemainingTime.visibility = View.GONE
            }

            // شارة الحالة
            val isExpired = item.isExpired == 1
            if (item.status == "rejected") {
                binding.tvOfferStatus.text = "مرفوض ❌"
                binding.tvOfferStatus.setTextColor(Color.parseColor("#DC2626"))
                if (!item.rejectionReason.isNullOrBlank()) {
                    binding.tvOfferRejectionReason.text = "سبب الرفض: ${item.rejectionReason}"
                    binding.tvOfferRejectionReason.visibility = View.VISIBLE
                } else {
                    binding.tvOfferRejectionReason.visibility = View.GONE
                }
            } else if (isExpired) {
                binding.tvOfferStatus.text = "مكتمل / منتهي 🏁"
                binding.tvOfferStatus.setTextColor(Color.parseColor("#64748B"))
                binding.tvOfferRejectionReason.visibility = View.GONE
            } else if (item.status == "approved" && item.isActive == 1) {
                binding.tvOfferStatus.text = "معتمد ونشط 🟢"
                binding.tvOfferStatus.setTextColor(Color.parseColor("#059669"))
                binding.tvOfferRejectionReason.visibility = View.GONE
            } else {
                binding.tvOfferStatus.text = "بانتظار موافقة الإدارة ⏳"
                binding.tvOfferStatus.setTextColor(Color.parseColor("#D97706"))
                binding.tvOfferRejectionReason.visibility = View.GONE
            }

            // زر تكرار العرض (للعروض المكتملة/المنتهية)
            if (isExpired) {
                binding.btnRepeatOffer.visibility = View.VISIBLE
                binding.btnRepeatOffer.setOnClickListener { onRepeat(item) }
            } else {
                binding.btnRepeatOffer.visibility = View.GONE
            }

            // إخفاء زر الحذف للسكرتيرة
            binding.btnDeleteOffer.visibility = View.GONE
        }
    }
}
