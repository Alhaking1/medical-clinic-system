package com.medical.clinic.ui.assistant

import android.content.Context
import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.google.android.material.button.MaterialButton
import com.medical.clinic.R
import com.medical.clinic.data.models.AssistantAction
import com.medical.clinic.data.models.AssistantChatMessage
import com.medical.clinic.data.models.AssistantDoctorCard
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class AssistantMessagesAdapter(
    private val onDoctorClick: (AssistantDoctorCard) -> Unit,
    private val onActionClick: (AssistantAction) -> Unit
) : RecyclerView.Adapter<AssistantMessagesAdapter.MessageViewHolder>() {

    private val messages = mutableListOf<AssistantChatMessage>()
    private val timeFormat = SimpleDateFormat("hh:mm a", Locale("ar"))

    fun submitList(newMessages: List<AssistantChatMessage>) {
        messages.clear()
        messages.addAll(newMessages)
        notifyDataSetChanged()
    }

    fun addMessage(message: AssistantChatMessage) {
        messages.add(message)
        notifyItemInserted(messages.size - 1)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MessageViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_assistant_message, parent, false)
        return MessageViewHolder(view)
    }

    override fun onBindViewHolder(holder: MessageViewHolder, position: Int) {
        holder.bind(messages[position])
    }

    override fun getItemCount(): Int = messages.size

    inner class MessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val layoutUser: LinearLayout = itemView.findViewById(R.id.layoutUserMessage)
        private val tvUserText: TextView = itemView.findViewById(R.id.tvUserMessageText)
        private val tvUserTime: TextView = itemView.findViewById(R.id.tvUserMessageTime)

        private val layoutAssistant: LinearLayout = itemView.findViewById(R.id.layoutAssistantMessage)
        private val tvBadge: TextView = itemView.findViewById(R.id.tvAssistantBadge)
        private val tvAssistantText: TextView = itemView.findViewById(R.id.tvAssistantMessageText)
        private val tvAssistantTime: TextView = itemView.findViewById(R.id.tvAssistantMessageTime)
        private val layoutDoctors: LinearLayout = itemView.findViewById(R.id.layoutDoctorsContainer)
        private val layoutActions: LinearLayout = itemView.findViewById(R.id.layoutActionsContainer)

        fun bind(msg: AssistantChatMessage) {
            val timeStr = timeFormat.format(Date(msg.timestamp))

            if (msg.sender == "user") {
                layoutUser.visibility = View.VISIBLE
                layoutAssistant.visibility = View.GONE
                tvUserText.text = msg.text
                tvUserTime.text = timeStr
            } else {
                layoutUser.visibility = View.GONE
                layoutAssistant.visibility = View.VISIBLE

                // Badge styling
                if (!msg.badge.isNullOrBlank()) {
                    tvBadge.visibility = View.VISIBLE
                    tvBadge.text = msg.badge
                    if (msg.type == "EMERGENCY") {
                        tvBadge.setBackgroundColor(Color.parseColor("#FEE2E2"))
                        tvBadge.setTextColor(Color.parseColor("#B91C1C"))
                    } else if (msg.type == "APP_GUIDE") {
                        tvBadge.setBackgroundColor(Color.parseColor("#EFF6FF"))
                        tvBadge.setTextColor(Color.parseColor("#1D4ED8"))
                    } else {
                        tvBadge.setBackgroundColor(Color.parseColor("#CCFBF1"))
                        tvBadge.setTextColor(Color.parseColor("#00695C"))
                    }
                } else {
                    tvBadge.visibility = View.GONE
                }

                // Format text (simple bolding markdown)
                tvAssistantText.text = msg.text.replace("**", "").replace("###", "")
                tvAssistantTime.text = timeStr

                // Bind Recommended Doctors
                layoutDoctors.removeAllViews()
                if (!msg.doctors.isNullOrEmpty()) {
                    layoutDoctors.visibility = View.VISIBLE
                    val inflater = LayoutInflater.from(itemView.context)
                    for (doc in msg.doctors) {
                        val cardView = inflater.inflate(R.layout.item_assistant_doctor_card, layoutDoctors, false)
                        val ivAvatar = cardView.findViewById<ImageView>(R.id.ivDocCardAvatar)
                        val tvName = cardView.findViewById<TextView>(R.id.tvDocCardName)
                        val tvClinic = cardView.findViewById<TextView>(R.id.tvDocCardClinic)
                        val btnBook = cardView.findViewById<MaterialButton>(R.id.btnBookDocCard)

                        tvName.text = doc.name
                        val feeText = if (doc.fee != null) " • ${doc.fee.toInt()} ر.ي" else ""
                        tvClinic.text = "${doc.clinic}$feeText"

                        if (!doc.avatar.isNullOrBlank()) {
                            Glide.with(itemView.context).load(doc.avatar).placeholder(R.drawable.ic_nav_profile).into(ivAvatar)
                        }

                        btnBook.setOnClickListener { onDoctorClick(doc) }
                        cardView.setOnClickListener { onDoctorClick(doc) }
                        layoutDoctors.addView(cardView)
                    }
                } else {
                    layoutDoctors.visibility = View.GONE
                }

                // Bind Actions
                layoutActions.removeAllViews()
                if (!msg.actions.isNullOrEmpty()) {
                    layoutActions.visibility = View.VISIBLE
                    val context = itemView.context
                    for (act in msg.actions) {
                        val tvAction = TextView(context).apply {
                            text = "${act.label}  ❯"
                            textSize = 13f
                            setTextColor(Color.parseColor("#0F766E"))
                            setTypeface(typeface, android.graphics.Typeface.BOLD)
                            setBackgroundResource(R.drawable.bg_assistant_action_pill)
                            isClickable = true
                            isFocusable = true
                            isSingleLine = true
                            ellipsize = android.text.TextUtils.TruncateAt.END
                            gravity = android.view.Gravity.CENTER_VERTICAL or android.view.Gravity.START
                            setPadding(28, 20, 28, 20)
                            val params = LinearLayout.LayoutParams(
                                LinearLayout.LayoutParams.MATCH_PARENT,
                                LinearLayout.LayoutParams.WRAP_CONTENT
                            ).apply {
                                setMargins(0, 5, 0, 5)
                            }
                            layoutParams = params
                            setOnClickListener { onActionClick(act) }
                        }
                        layoutActions.addView(tvAction)
                    }
                } else {
                    layoutActions.visibility = View.GONE
                }
            }
        }
    }
}
