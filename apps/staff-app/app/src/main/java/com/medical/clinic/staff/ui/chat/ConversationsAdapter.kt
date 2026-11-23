package com.medical.clinic.staff.ui.chat

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.staff.R
import com.medical.clinic.staff.data.models.ChatConversation
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

class ConversationsAdapter(
    private val onConversationClicked: (ChatConversation) -> Unit
) : RecyclerView.Adapter<ConversationsAdapter.ConversationViewHolder>() {

    private val conversations = mutableListOf<ChatConversation>()

    fun setConversations(items: List<ChatConversation>) {
        conversations.clear()
        conversations.addAll(items)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ConversationViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_conversation, parent, false)
        return ConversationViewHolder(view)
    }

    override fun onBindViewHolder(holder: ConversationViewHolder, position: Int) {
        holder.bind(conversations[position])
    }

    override fun getItemCount(): Int = conversations.size

    inner class ConversationViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvAvatar: TextView = itemView.findViewById(R.id.tvConversationAvatar)
        private val tvTitle: TextView = itemView.findViewById(R.id.tvConversationTitle)
        private val tvTime: TextView = itemView.findViewById(R.id.tvConversationTime)
        private val tvLastMsg: TextView = itemView.findViewById(R.id.tvConversationLastMsg)
        private val tvBadge: TextView = itemView.findViewById(R.id.tvUnreadBadge)

        fun bind(item: ChatConversation) {
            val pName = item.patientName ?: "المريض"
            tvTitle.text = pName
            val initial = if (pName.isNotBlank()) pName.trim().first().toString() else "م"
            tvAvatar.text = initial

            val hasRecentLastMessage = ChatRetentionUtils.isRecent(item.lastMessageAt)
            tvLastMsg.text = if (hasRecentLastMessage) {
                item.lastMessage ?: "بدء المحادثة"
            } else {
                "لا توجد رسائل خلال آخر 48 ساعة"
            }
            tvTime.text = if (hasRecentLastMessage) formatTime(item.lastMessageAt) else ""

            if (item.unreadCount > 0) {
                tvBadge.visibility = View.VISIBLE
                tvBadge.text = item.unreadCount.toString()
            } else {
                tvBadge.visibility = View.GONE
            }

            itemView.setOnClickListener {
                onConversationClicked(item)
            }
        }

        private fun formatTime(dateStr: String?): String {
            if (dateStr.isNullOrBlank()) return ""
            return try {
                val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                inputFormat.timeZone = TimeZone.getTimeZone("UTC")
                val date = inputFormat.parse(dateStr)
                if (date != null) {
                    val outputFormat = SimpleDateFormat("h:mm a", Locale.forLanguageTag("ar"))
                    outputFormat.format(date)
                } else {
                    dateStr.takeLast(8)
                }
            } catch (e: Exception) {
                try {
                    val inputFormat2 = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)
                    val date2 = inputFormat2.parse(dateStr)
                    if (date2 != null) {
                        val outputFormat = SimpleDateFormat("h:mm a", Locale.forLanguageTag("ar"))
                        outputFormat.format(date2)
                    } else {
                        ""
                    }
                } catch (e2: Exception) {
                    ""
                }
            }
        }
    }
}
