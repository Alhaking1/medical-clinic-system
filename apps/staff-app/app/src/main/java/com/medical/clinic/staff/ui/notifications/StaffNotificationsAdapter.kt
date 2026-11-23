package com.medical.clinic.staff.ui.notifications

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.staff.R
import com.medical.clinic.staff.data.models.NotificationItem

class StaffNotificationsAdapter(
    private var items: List<NotificationItem> = emptyList(),
    private val onItemClick: (NotificationItem) -> Unit = {}
) : RecyclerView.Adapter<StaffNotificationsAdapter.ViewHolder>() {

    fun updateList(newList: List<NotificationItem>) {
        items = newList
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_staff_notification_card, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount() = items.size

    inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvIcon: TextView = itemView.findViewById(R.id.tvNotifIcon)
        private val tvTitle: TextView = itemView.findViewById(R.id.tvNotifTitle)
        private val tvBody: TextView = itemView.findViewById(R.id.tvNotifBody)
        private val tvDate: TextView = itemView.findViewById(R.id.tvNotifDate)
        private val dotUnread: View = itemView.findViewById(R.id.viewUnreadDot)

        fun bind(item: NotificationItem) {
            tvTitle.text = item.title
            tvBody.text = item.body ?: ""
            tvDate.text = item.createdAt?.take(16)?.replace("T", " ") ?: "الآن"

            dotUnread.visibility = if (item.isRead == 0) View.VISIBLE else View.GONE

            tvIcon.text = when (item.type.lowercase()) {
                "appointment", "appointment_reminder" -> "🕒"
                "payment_confirmed", "payment" -> "💳"
                "chat" -> "💬"
                "welcome" -> "🌟"
                "warning", "alert" -> "⚠️"
                else -> "🔔"
            }

            itemView.setOnClickListener {
                onItemClick(item)
            }
        }
    }
}
