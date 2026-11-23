package com.medical.clinic.ui.chat

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
import com.medical.clinic.R
import com.medical.clinic.data.api.ApiClient
import com.medical.clinic.data.api.ChatMessage
import com.medical.clinic.data.api.CreateConversationRequest
import com.medical.clinic.data.api.SendMessageRequest
import com.medical.clinic.data.local.ChatStorageManager
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.utils.ChatFilterUtils
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class ChatActivity : AppCompatActivity() {

    @Inject
    lateinit var apiClient: ApiClient

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
    private var doctorId: Int = 0
    private var secretaryId: Int = 0
    private var targetType: String = "doctor"
    private var staffName: String = "الطبيب"
    private var clinicName: String = "العيادة"

    private var pollingJob: Job? = null
    private var isSending: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_chat)

        extractIntentData()
        initViews()
        setupRecyclerView()
        setupListeners()
        loadLocalCache()
        loadOrCreateConversation()
    }

    private fun extractIntentData() {
        conversationId = intent.getIntExtra(EXTRA_CONVERSATION_ID, 0)
        doctorId = intent.getIntExtra(EXTRA_DOCTOR_ID, 0)
        secretaryId = intent.getIntExtra(EXTRA_SECRETARY_ID, 0)
        targetType = intent.getStringExtra(EXTRA_TARGET_TYPE) ?: "doctor"
        staffName = intent.getStringExtra(EXTRA_NAME) ?: "الطبيب"
        clinicName = intent.getStringExtra(EXTRA_CLINIC_NAME) ?: "العيادة"
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

        tvChatTitle.text = staffName
        tvChatSubtitle.text = clinicName
        val initial = if (staffName.isNotBlank()) staffName.trim().first().toString() else "ط"
        tvAvatarInitials.text = initial

        tvRetentionNotice.text = ChatStorageManager.getRetentionDisplayText()
    }

    private fun setupRecyclerView() {
        adapter = ChatMessagesAdapter(isPatientApp = true, staffName = staffName)
        val layoutManager = LinearLayoutManager(this)
        layoutManager.stackFromEnd = true
        rvMessages.layoutManager = layoutManager
        rvMessages.adapter = adapter
    }

    private fun loadLocalCache() {
        if (conversationId <= 0) return
        val cached = ChatStorageManager.getMessages(this, conversationId)
        if (cached.isNotEmpty()) {
            adapter.setMessages(cached)
            tvEmptyState.visibility = View.GONE
            rvMessages.scrollToPosition(cached.size - 1)
        }
        tvRetentionNotice.text = ChatStorageManager.getRetentionDisplayText()
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
                    btnSend.isEnabled = false
                    btnSend.alpha = 0.4f
                } else {
                    layoutFilterWarning.visibility = View.GONE
                    btnSend.isEnabled = true
                    btnSend.alpha = 1.0f
                }
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        etMessage.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == android.view.inputmethod.EditorInfo.IME_ACTION_SEND) {
                handleSendMessage()
                true
            } else false
        }

        btnSend.setOnClickListener {
            handleSendMessage()
        }
    }

    private fun loadOrCreateConversation() {
        if (!sessionManager.isLoggedIn()) {
            Toast.makeText(this, "يرجى تسجيل الدخول أولاً للدردشة", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        if (conversationId > 0) {
            loadLocalCache()
        } else {
            pbLoading.visibility = View.VISIBLE
        }

        lifecycleScope.launch {
            try {
                if (conversationId == 0) {
                    val req = CreateConversationRequest(
                        doctor_id = if (doctorId > 0) doctorId else null,
                        secretary_id = if (secretaryId > 0) secretaryId else null,
                        target_type = targetType
                    )
                    val res = apiClient.apiService.createConversation(req)
                    if (res.success && res.data != null) {
                        conversationId = res.data.id
                        loadLocalCache()
                    }
                }

                if (conversationId > 0) {
                    fetchMessages(scrollToBottom = true)
                    startPolling()
                } else {
                    pbLoading.visibility = View.GONE
                    Toast.makeText(this@ChatActivity, "تعذر فتح المحادثة", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                // في حال وجود رسائل مخزنة محلياً لا نظهر خطأ مزعج
                val cached = ChatStorageManager.getMessages(this@ChatActivity, conversationId)
                if (cached.isEmpty()) {
                    Toast.makeText(this@ChatActivity, "خطأ في الاتصال: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private suspend fun fetchMessages(scrollToBottom: Boolean = false) {
        if (conversationId == 0) return

        try {
            val res = apiClient.apiService.getMessages(conversationId)
            pbLoading.visibility = View.GONE
            if (res.success && res.data != null) {
                val list = ChatStorageManager.filterRecentMessages(res.data)
                ChatStorageManager.saveMessages(this@ChatActivity, conversationId, list)

                adapter.setMessages(list)
                if (list.isEmpty()) {
                    tvEmptyState.visibility = View.VISIBLE
                } else {
                    tvEmptyState.visibility = View.GONE
                    if (scrollToBottom) {
                        rvMessages.scrollToPosition(list.size - 1)
                    }
                }
            }
        } catch (e: Exception) {
            pbLoading.visibility = View.GONE
        }
    }

    private fun startPolling() {
        pollingJob?.cancel()
        pollingJob = lifecycleScope.launch {
            while (isActive) {
                delay(3500)
                fetchMessages(scrollToBottom = false)
            }
        }
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

        if (conversationId == 0) {
            Toast.makeText(this, "جاري إعداد المحادثة، يرجى الانتظار...", Toast.LENGTH_SHORT).show()
            return
        }

        isSending = true
        btnSend.isEnabled = false
        btnSend.alpha = 0.5f

        lifecycleScope.launch {
            try {
                val res = apiClient.apiService.sendMessage(conversationId, SendMessageRequest(text))
                if (res.success && res.data != null) {
                    etMessage.setText("")
                    ChatStorageManager.addMessage(this@ChatActivity, conversationId, res.data)
                    adapter.addMessage(res.data)
                    tvEmptyState.visibility = View.GONE
                    rvMessages.smoothScrollToPosition(adapter.itemCount - 1)
                } else {
                    val msg = res.message ?: "تعذر إرسال الرسالة"
                    Toast.makeText(this@ChatActivity, "⚠️ $msg", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@ChatActivity, "⚠️ تعذر إرسال الرسالة: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            } finally {
                isSending = false
                btnSend.isEnabled = true
                btnSend.alpha = 1.0f
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (conversationId > 0) {
            loadLocalCache()
            if (pollingJob?.isActive != true) {
                startPolling()
            }
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
        const val EXTRA_DOCTOR_ID = "extra_doctor_id"
        const val EXTRA_SECRETARY_ID = "extra_secretary_id"
        const val EXTRA_TARGET_TYPE = "extra_target_type"
        const val EXTRA_NAME = "extra_name"
        const val EXTRA_CLINIC_NAME = "extra_clinic_name"

        fun start(
            context: android.content.Context,
            doctorId: Int = 0,
            secretaryId: Int = 0,
            targetType: String = "doctor",
            name: String = "",
            clinicName: String = "",
            conversationId: Int = 0
        ) {
            val intent = Intent(context, ChatActivity::class.java).apply {
                putExtra(EXTRA_DOCTOR_ID, doctorId)
                putExtra(EXTRA_SECRETARY_ID, secretaryId)
                putExtra(EXTRA_TARGET_TYPE, targetType)
                putExtra(EXTRA_NAME, name)
                putExtra(EXTRA_CLINIC_NAME, clinicName)
                putExtra(EXTRA_CONVERSATION_ID, conversationId)
            }
            context.startActivity(intent)
        }
    }
}
