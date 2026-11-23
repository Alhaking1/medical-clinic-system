package com.medical.clinic.staff.ui.secretary

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.staff.R
import com.medical.clinic.staff.data.models.PeriodItem
import com.medical.clinic.staff.databinding.ItemPeriodCardBinding

class PeriodsAdapter(
    private val onEditCapacity: (PeriodItem) -> Unit
) : RecyclerView.Adapter<PeriodsAdapter.PeriodViewHolder>() {

    private val items = mutableListOf<PeriodItem>()

    fun submitList(newItems: List<PeriodItem>) {
        items.clear()
        items.addAll(newItems)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PeriodViewHolder {
        val binding = ItemPeriodCardBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return PeriodViewHolder(binding)
    }

    override fun onBindViewHolder(holder: PeriodViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount(): Int = items.size

    inner class PeriodViewHolder(private val binding: ItemPeriodCardBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(item: PeriodItem) {
            val ctx = binding.root.context
            binding.tvPeriodTime.text = "${item.startTime} - ${item.endTime}"
            binding.tvPeriodDate.text = item.date
            binding.tvCapacityStats.text = "المقاعد: ${item.bookedCount} محجوز من أصل ${item.maxBookings}"

            if (item.isStopped == 1) {
                binding.tvPeriodStatus.text = ctx.getString(R.string.period_status_stopped)
                binding.tvPeriodStatus.setTextColor(ContextCompat.getColor(ctx, R.color.brand_danger))
                binding.tvPeriodStatus.setBackgroundResource(R.drawable.bg_status_cancelled)

            } else {
                binding.tvPeriodStatus.text = ctx.getString(R.string.period_status_active)
                binding.tvPeriodStatus.setTextColor(ContextCompat.getColor(ctx, R.color.brand_primary))
                binding.tvPeriodStatus.setBackgroundResource(R.drawable.bg_status_accepted)
            }

            binding.btnEditCapacity.setOnClickListener { onEditCapacity(item) }
        }
    }
}
