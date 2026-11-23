package com.medical.clinic.ui.chat

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.R
import com.medical.clinic.data.api.ChatConversation
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

class PatientConversationsAdapter(
    private val onConversationClicked: (ChatConversation) -> Unit
) : RecyclerView.Adapter<PatientConversationsAdapter.ConversationViewHolder>() {

    private val conversations = mutableListOf<ChatConversation>()

    fun setConversations(items: List<ChatConversation>) {
        conversations.clear()
        conversations.addAll(items)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ConversationViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_patient_conversation, parent, false)
        return ConversationViewHolder(view)
    }

    override fun onBindViewHolder(holder: ConversationViewHolder, position: Int) {
        holder.bind(conversations[position])
    }

    override fun getItemCount(): Int = conversations.size

    inner class ConversationViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvAvatar: TextView = itemView.findViewById(R.id.tvConversationAvatar)
        private val tvTitle: TextView = itemView.findViewById(R.id.tvConversationTitle)
        private val tvSubtitle: TextView = itemView.findViewById(R.id.tvConversationSubtitle)
        private val tvTime: TextView = itemView.findViewById(R.id.tvConversationTime)
        private val tvLastMsg: TextView = itemView.findViewById(R.id.tvConversationLastMsg)
        private val tvBadge: TextView = itemView.findViewById(R.id.tvUnreadBadge)

        fun bind(item: ChatConversation) {
            val isDoctor = item.target_type == "doctor"
            val titleText = if (isDoctor) {
                item.doctor_name ?: "الطبيب الاستشاري"
            } else {
                val clinic = item.clinic_name?.takeIf { it.isNotBlank() } ?: "العيادة"
                "سكرتيرة عيادة $clinic"
            }

            tvTitle.text = titleText
            tvSubtitle.text = item.clinic_name ?: if (isDoctor) item.doctor_specialty ?: "العيادة الطبية" else "العيادة الطبية"
            
            val initial = if (isDoctor) {
                if (!item.doctor_name.isNullOrBlank()) item.doctor_name.trim().first().toString() else "د"
            } else {
                "س"
            }
            tvAvatar.text = initial

            val ivAvatar = itemView.findViewById<android.widget.ImageView>(R.id.ivConversationAvatar)
            val docAvatar = item.doctor_avatar
            if (ivAvatar != null) {
                if (!docAvatar.isNullOrBlank()) {
                    val fullUrl = if (docAvatar.startsWith("http")) docAvatar else com.medical.clinic.BuildConfig.BASE_URL.removeSuffix("/api/v1/").removeSuffix("/") + if (docAvatar.startsWith("/")) docAvatar else "/$docAvatar"
                    com.bumptech.glide.Glide.with(itemView.context)
                        .load(fullUrl)
                        .transition(com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions.withCrossFade(250))
                        .circleCrop()
                        .into(ivAvatar)
                    ivAvatar.visibility = View.VISIBLE
                    tvAvatar.visibility = View.GONE
                } else {
                    ivAvatar.visibility = View.GONE
                    tvAvatar.visibility = View.VISIBLE
                }
            }


            tvLastMsg.text = item.last_message ?: "بدء المحادثة"
            tvTime.text = formatTime(item.last_message_at)

            val unread = if (item.patient_unread_count > 0) item.patient_unread_count else item.unread_count
            if (unread > 0) {
                tvBadge.visibility = View.VISIBLE
                tvBadge.text = unread.toString()
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
