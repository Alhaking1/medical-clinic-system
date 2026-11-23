package com.medical.clinic.ui.doctor

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.R
import com.medical.clinic.data.models.QueueItem

class QueueAdapter(
    private val onStart: (QueueItem) -> Unit,
    private val onFinish: (QueueItem) -> Unit
) : ListAdapter<QueueItem, QueueAdapter.VH>(DIFF) {

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<QueueItem>() {
            override fun areItemsTheSame(a: QueueItem, b: QueueItem) = a.id == b.id
            override fun areContentsTheSame(a: QueueItem, b: QueueItem) = a == b
        }
    }

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvNumber: TextView = view.findViewById(R.id.tvNumber)
        val tvName: TextView = view.findViewById(R.id.tvName)
        val tvPhone: TextView = view.findViewById(R.id.tvPhone)
        val tvTime: TextView = view.findViewById(R.id.tvTime)
        val tvStatus: TextView = view.findViewById(R.id.tvStatus)
        val tvBadge: TextView = view.findViewById(R.id.tvBadge)
        val btnStart: Button = view.findViewById(R.id.btnStart)
        val btnFinish: Button = view.findViewById(R.id.btnFinish)
        val statusBar: View = view.findViewById(R.id.statusBar)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_queue, parent, false)
        return VH(view)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = getItem(position)

        holder.tvNumber.text = "#${item.queueNumber}"
        holder.tvName.text = item.patientName ?: "—"
        holder.tvPhone.text = item.patientPhone ?: "—"
        holder.tvTime.text = item.checkedInAt?.takeLast(8)?.take(5) ?: ""

        // الحالة
        when (item.status) {
            "waiting" -> {
                holder.tvStatus.text = "منتظر"
                holder.tvStatus.setTextColor(holder.itemView.context.getColor(R.color.status_waiting))
                holder.tvBadge.text = "⏳"
                holder.statusBar.setBackgroundColor(
                    holder.itemView.context.getColor(R.color.status_waiting)
                )
                holder.btnStart.visibility = View.VISIBLE
                holder.btnFinish.visibility = View.GONE
            }
            "in_progress" -> {
                holder.tvStatus.text = "قيد الفحص"
                holder.tvStatus.setTextColor(holder.itemView.context.getColor(R.color.status_in_progress))
                holder.tvBadge.text = "🔵"
                holder.statusBar.setBackgroundColor(
                    holder.itemView.context.getColor(R.color.status_in_progress)
                )
                holder.btnStart.visibility = View.GONE
                holder.btnFinish.visibility = View.VISIBLE
            }
            "done" -> {
                holder.tvStatus.text = "منتهي"
                holder.tvStatus.setTextColor(holder.itemView.context.getColor(R.color.status_done))
                holder.tvBadge.text = "✅"
                holder.statusBar.setBackgroundColor(
                    holder.itemView.context.getColor(R.color.status_done)
                )
                holder.btnStart.visibility = View.GONE
                holder.btnFinish.visibility = View.GONE
            }
        }

        // Click listeners
        holder.btnStart.setOnClickListener { onStart(item) }
        holder.btnFinish.setOnClickListener { onFinish(item) }

        // Animation
        holder.itemView.alpha = 0f
        holder.itemView.animate()
            .alpha(1f)
            .setDuration(300)
            .setStartDelay((position * 50).toLong())
            .start()
    }
}