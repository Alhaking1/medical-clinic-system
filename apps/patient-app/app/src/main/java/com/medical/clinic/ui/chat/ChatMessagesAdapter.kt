package com.medical.clinic.ui.chat

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.R
import com.medical.clinic.data.api.ChatMessage
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

class ChatMessagesAdapter(
    private val isPatientApp: Boolean = true,
    private val staffName: String = "الطبيب"
) : RecyclerView.Adapter<ChatMessagesAdapter.MessageViewHolder>() {

    private val messages = mutableListOf<ChatMessage>()

    fun setMessages(newMessages: List<ChatMessage>) {
        messages.clear()
        messages.addAll(newMessages)
        notifyDataSetChanged()
    }

    fun addMessage(message: ChatMessage) {
        messages.add(message)
        notifyItemInserted(messages.size - 1)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MessageViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_chat_message, parent, false)
        return MessageViewHolder(view)
    }

    override fun onBindViewHolder(holder: MessageViewHolder, position: Int) {
        holder.bind(messages[position])
    }

    override fun getItemCount(): Int = messages.size

    inner class MessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val layoutSent: LinearLayout = itemView.findViewById(R.id.layoutSentMessage)
        private val tvSentText: TextView = itemView.findViewById(R.id.tvSentText)
        private val tvSentTime: TextView = itemView.findViewById(R.id.tvSentTime)

        private val layoutReceived: LinearLayout = itemView.findViewById(R.id.layoutReceivedMessage)
        private val tvReceivedSender: TextView = itemView.findViewById(R.id.tvReceivedSender)
        private val tvReceivedText: TextView = itemView.findViewById(R.id.tvReceivedText)
        private val tvReceivedTime: TextView = itemView.findViewById(R.id.tvReceivedTime)

        fun bind(msg: ChatMessage) {
            val isSentByMe = if (isPatientApp) {
                msg.sender_type == "patient"
            } else {
                msg.sender_type == "doctor" || msg.sender_type == "secretary"
            }

            val formattedTime = formatTime(msg.created_at)

            if (isSentByMe) {
                layoutSent.visibility = View.VISIBLE
                layoutReceived.visibility = View.GONE
                tvSentText.text = msg.message_text
                tvSentTime.text = formattedTime
            } else {
                layoutSent.visibility = View.GONE
                layoutReceived.visibility = View.VISIBLE
                tvReceivedText.text = msg.message_text
                tvReceivedTime.text = formattedTime
                
                val senderTitle = if (msg.sender_type == "doctor") {
                    "د. $staffName"
                } else if (msg.sender_type == "secretary") {
                    "السكرتيرة"
                } else {
                    "المريض"
                }
                tvReceivedSender.text = senderTitle
            }
        }

        private fun formatTime(dateStr: String?): String {
            if (dateStr.isNullOrBlank()) return ""
            return try {
                val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                inputFormat.timeZone = TimeZone.getTimeZone("UTC")
                val date = inputFormat.parse(dateStr)
                if (date != null) {
                    val outputFormat = SimpleDateFormat("h:mm a", Locale("ar"))
                    outputFormat.format(date)
                } else {
                    dateStr.takeLast(8)
                }
            } catch (e: Exception) {
                try {
                    val inputFormat2 = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)
                    val date2 = inputFormat2.parse(dateStr)
                    if (date2 != null) {
                        val outputFormat = SimpleDateFormat("h:mm a", Locale("ar"))
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
