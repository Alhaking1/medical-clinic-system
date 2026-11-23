package com.medical.clinic.staff.ui.chat

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.staff.R
import com.medical.clinic.staff.data.api.ApiService
import com.medical.clinic.staff.data.local.SessionManager
import com.medical.clinic.staff.data.models.SendMessageRequest
import com.medical.clinic.staff.ui.utils.ChatFilterUtils
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class ChatActivity : AppCompatActivity() {

    @Inject
    lateinit var apiService: ApiService

    @Inject
    lateinit var sessionManager: SessionManager

    private lateinit var btnBack: ImageButton
    private lateinit var tvAvatarInitials: TextView
    private lateinit var tvChatTitle: TextView
    private lateinit var tvChatSubtitle: TextView
    private lateinit var tvRetentionNotice: TextView
    private lateinit var layoutFilterWarning: LinearLayout
    private lateinit var tvFilterWarning: TextView
    private lateinit var rvMessages: RecyclerView
    private lateinit var pbLoading: ProgressBar
    private lateinit var tvEmptyState: TextView
    private lateinit var etMessage: EditText
    private lateinit var btnSend: FrameLayout

    private lateinit var adapter: ChatMessagesAdapter
    private var conversationId: Int = 0
    private var patientName: String = "المريض"

    private var pollingJob: Job? = null
    private var isSending: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_chat)

        extractIntentData()
        initViews()
        setupRecyclerView()
        setupListeners()
        loadMessages(initial = true)
    }

    private fun extractIntentData() {
        conversationId = intent.getIntExtra(EXTRA_CONVERSATION_ID, 0)
        patientName = intent.getStringExtra(EXTRA_PATIENT_NAME) ?: "المريض"
    }

    private fun initViews() {
        btnBack = findViewById(R.id.btnBack)
        tvAvatarInitials = findViewById(R.id.tvAvatarInitials)
        tvChatTitle = findViewById(R.id.tvChatTitle)
        tvChatSubtitle = findViewById(R.id.tvChatSubtitle)
        tvRetentionNotice = findViewById(R.id.tvRetentionNotice)
        layoutFilterWarning = findViewById(R.id.layoutFilterWarning)
        tvFilterWarning = findViewById(R.id.tvFilterWarning)
        rvMessages = findViewById(R.id.rvMessages)
        pbLoading = findViewById(R.id.pbLoading)
        tvEmptyState = findViewById(R.id.tvEmptyState)
        etMessage = findViewById(R.id.etMessage)
        btnSend = findViewById(R.id.btnSend)

        tvChatTitle.text = patientName
        tvChatSubtitle.text = "محادثة فورية مع المريض"
        val initial = if (patientName.isNotBlank()) patientName.trim().first().toString() else "م"
        tvAvatarInitials.text = initial
    }

    private fun setupRecyclerView() {
        adapter = ChatMessagesAdapter(patientName = patientName)
        val layoutManager = LinearLayoutManager(this)
        layoutManager.stackFromEnd = true
        rvMessages.layoutManager = layoutManager
        rvMessages.adapter = adapter
    }

    private fun setupListeners() {
        btnBack.setOnClickListener { finish() }

        // فحص فوري ومباشر أثناء كتابة الرسالة
        etMessage.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                val text = s?.toString()?.trim() ?: ""
                if (text.isEmpty()) {
                    layoutFilterWarning.visibility = View.GONE
                    return
                }

                val filterResult = ChatFilterUtils.validateMessage(text)
                if (!filterResult.isValid) {
                    val forbiddenWordsStr = if (filterResult.detectedWords.isNotEmpty()) {
                        " (" + filterResult.detectedWords.joinToString(", ") + ")"
                    } else ""
                    tvFilterWarning.text = (filterResult.reason ?: "محتوى غير مسموح") + forbiddenWordsStr
                    layoutFilterWarning.visibility = View.VISIBLE
                } else {
                    layoutFilterWarning.visibility = View.GONE
                }
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        btnSend.setOnClickListener {
            handleSendMessage()
        }
    }

    private fun loadMessages(initial: Boolean = false) {
        if (conversationId == 0) {
            Toast.makeText(this, "رقم المحادثة غير صالح", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        if (initial) pbLoading.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                val response = apiService.getMessages(conversationId)
                if (initial) pbLoading.visibility = View.GONE

                if (response.isSuccessful && response.body()?.success == true) {
                    val list = response.body()?.data ?: emptyList()
                    showRetentionNotice()
                    adapter.setMessages(list)
                    if (adapter.itemCount == 0) {
                        tvEmptyState.visibility = View.VISIBLE
                    } else {
                        tvEmptyState.visibility = View.GONE
                        if (initial) {
                            rvMessages.scrollToPosition(list.size - 1)
                        }
                    }
                }
            } catch (e: Exception) {
                if (initial) pbLoading.visibility = View.GONE
            }
        }
    }

    private fun startPolling() {
        pollingJob?.cancel()
        pollingJob = lifecycleScope.launch {
            while (isActive) {
                delay(3500)
                try {
                    adapter.removeExpiredMessages()
                    tvEmptyState.visibility = if (adapter.itemCount == 0) View.VISIBLE else View.GONE
                    val response = apiService.getMessages(conversationId)
                    if (response.isSuccessful && response.body()?.success == true) {
                        val list = response.body()?.data ?: emptyList()
                        showRetentionNotice()
                        adapter.setMessages(list)
                        tvEmptyState.visibility = if (adapter.itemCount == 0) View.VISIBLE else View.GONE
                    }
                } catch (ignored: Exception) {}
            }
        }
    }

    private fun showRetentionNotice() {
        tvRetentionNotice.text =
            "🔒 محادثة طبية مشفرة ومحمية بالكامل (AES-256-GCM) • تُخفى الرسائل بعد 48 ساعة"
    }

    private fun handleSendMessage() {
        if (isSending) return

        val text = etMessage.text.toString().trim()
        if (text.isEmpty()) return

        // 1. الفحص الصارم للدردشة في التطبيق
        val filterResult = ChatFilterUtils.validateMessage(text)
        if (!filterResult.isValid) {
            val forbidden = if (filterResult.detectedWords.isNotEmpty()) {
                "\nالكلمات المكتشفة: " + filterResult.detectedWords.joinToString(", ")
            } else ""

            AlertDialog.Builder(this)
                .setTitle("⚠️ تنبيه أمني للرسائل")
                .setMessage((filterResult.reason ?: "الرسالة تحتوي على أرقام أو محتوى محظور") + forbidden + "\n\nيُمنع استخدام الأرقام الرقمية أو كتابة الأعداد بالحروف أو مشاركة وسائل التواصل لحماية بياناتك والالتزام بسياسة المنصة.")
                .setPositiveButton("حسناً", null)
                .show()
            return
        }

        isSending = true
        btnSend.isEnabled = false
        btnSend.alpha = 0.5f

        lifecycleScope.launch {
            try {
                val res = apiService.sendMessage(conversationId, SendMessageRequest(text))
                if (res.isSuccessful && res.body()?.success == true && res.body()?.data != null) {
                    etMessage.setText("")
                    adapter.addMessage(res.body()!!.data!!)
                    tvEmptyState.visibility = View.GONE
                    rvMessages.smoothScrollToPosition(adapter.itemCount - 1)
                } else {
                    val errorMsg = res.body()?.message ?: "تعذر إرسال الرسالة"
                    Toast.makeText(this@ChatActivity, "⚠️ $errorMsg", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@ChatActivity, "⚠️ خطأ في الإرسال: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            } finally {
                isSending = false
                btnSend.isEnabled = true
                btnSend.alpha = 1.0f
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (conversationId > 0 && pollingJob?.isActive != true) {
            startPolling()
        }
    }

    override fun onPause() {
        super.onPause()
        pollingJob?.cancel()
    }

    override fun onDestroy() {
        super.onDestroy()
        pollingJob?.cancel()
    }

    companion object {
        const val EXTRA_CONVERSATION_ID = "extra_conversation_id"
        const val EXTRA_PATIENT_NAME = "extra_patient_name"

        fun start(context: Context, conversationId: Int, patientName: String) {
            val intent = Intent(context, ChatActivity::class.java).apply {
                putExtra(EXTRA_CONVERSATION_ID, conversationId)
                putExtra(EXTRA_PATIENT_NAME, patientName)
            }
            context.startActivity(intent)
        }
    }
}
