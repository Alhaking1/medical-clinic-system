package com.medical.clinic.ui.assistant

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.EditText
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.R
import com.medical.clinic.data.api.ApiClient
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.data.models.AssistantAction
import com.medical.clinic.data.models.AssistantChatMessage
import com.medical.clinic.data.models.AssistantDoctorCard
import com.medical.clinic.data.models.DoctorItem
import com.medical.clinic.ui.main.MainActivity
import com.medical.clinic.ui.patient.DoctorDetailsActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class ClinicalAssistantActivity : AppCompatActivity() {

    @Inject
    lateinit var apiClient: ApiClient

    @Inject
    lateinit var sessionManager: SessionManager

    private lateinit var rvMessages: RecyclerView
    private lateinit var adapter: AssistantMessagesAdapter
    private lateinit var etInput: EditText
    private lateinit var btnSend: ImageButton
    private lateinit var layoutThinking: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_clinical_assistant)

        rvMessages = findViewById(R.id.rvAssistantMessages)
        etInput = findViewById(R.id.etAssistantInput)
        btnSend = findViewById(R.id.btnSendAssistant)
        layoutThinking = findViewById(R.id.layoutThinking)

        findViewById<ImageButton>(R.id.btnBackAssistant).setOnClickListener { finish() }

        setupRecyclerView()
        setupSuggestionChips()

        btnSend.setOnClickListener {
            val text = etInput.text.toString().trim()
            if (text.isNotBlank()) {
                sendMessage(text)
            }
        }

        // Add initial welcoming message
        showInitialWelcome()
    }

    private fun setupRecyclerView() {
        adapter = AssistantMessagesAdapter(
            onDoctorClick = { docCard -> openDoctorDetails(docCard) },
            onActionClick = { act -> handleAction(act) }
        )
        val lm = LinearLayoutManager(this).apply {
            stackFromEnd = true
        }
        rvMessages.layoutManager = lm
        rvMessages.adapter = adapter
    }

    private fun setupSuggestionChips() {
        findViewById<View>(R.id.chipEmergency)?.setOnClickListener {
            sendMessage("ما هي علامات الخطر والطوارئ التي تستدعي الإسعاف فوراً؟")
        }
        findViewById<View>(R.id.chipGoldenSeat)?.setOnClickListener {
            sendMessage("ما هو الحجز الذهبي وكيف أحصل على مقعد أولي #1؟")
        }
        findViewById<View>(R.id.chipFamilyBooking)?.setOnClickListener {
            sendMessage("كيف أحجز موعداً طبياً لأحد أفراد عائلتي أو أطفالي؟")
        }
        findViewById<View>(R.id.chipNfcArrival)?.setOnClickListener {
            sendMessage("كيف أؤكد حضوري بالعيادة عبر تقنية NFC وزر أنا في العيادة؟")
        }
        findViewById<View>(R.id.chipWalletRecharge)?.setOnClickListener {
            sendMessage("كيف أشحن رصيد المحفظة للاستفادة من خصم 5% على الكشف؟")
        }
    }

    private fun showInitialWelcome() {
        val welcomeMsg = AssistantChatMessage(
            sender = "assistant",
            badge = "🤖 مرحباً بك في عيادتك",
            text = "أهلاً بك! أنا مساعدك الطبي ومرشدك الذكي 🩺✨\n\nيمكنني مساعدتك في:\n1. **توجيهك للتخصص الطبي المناسب** عند شعورك بأي أعراض مع اقتراح أفضل الأطباء المتاحين.\n2. **شرح طريقة استخدام التطبيق** (الحجز الذهبي، حجز العائلة، إثبات الحضور بالـ NFC، المحفظة، والروشتات دون إنترنت).\n\nاختر أحد الاقتراحات أدناه أو صف لي ما تشعر به الآن!",
            type = "GENERAL_GUIDE",
            actions = listOf(
                AssistantAction(type = "PROMPT", text = "أعاني من صداع ودوخة", label = "🩺 فحص صداع ودوخة"),
                AssistantAction(type = "PROMPT", text = "كيف أحجز موعد طبيب خطوة بخطوة؟", label = "📅 شرح طريقة الحجز خطوة بخطوة"),
                AssistantAction(type = "PROMPT", text = "كيف أغير صورتي الشخصية بأمان؟", label = "👤 طريقة تغيير صورتي بأمان")
            )
        )
        adapter.addMessage(welcomeMsg)
    }

    private fun sendMessage(queryText: String) {
        // Add User Message
        val userMsg = AssistantChatMessage(
            sender = "user",
            text = queryText
        )
        adapter.addMessage(userMsg)
        etInput.setText("")
        rvMessages.smoothScrollToPosition(adapter.itemCount - 1)

        layoutThinking.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                val res = apiClient.apiService.sendAssistantMessage(mapOf("message" to queryText))
                layoutThinking.visibility = View.GONE

                if (res.success) {
                    val assistantMsg = AssistantChatMessage(
                        sender = "assistant",
                        text = res.reply,
                        type = res.type,
                        badge = res.badge,
                        doctors = res.doctors,
                        actions = res.actions
                    )
                    adapter.addMessage(assistantMsg)
                    val targetIndex = adapter.itemCount - 1
                    rvMessages.post {
                        val lm = rvMessages.layoutManager as? androidx.recyclerview.widget.LinearLayoutManager
                        lm?.scrollToPositionWithOffset(targetIndex, 0)
                    }
                } else {
                    showErrorMessage("عذراً، لم أتمكن من معالجة الطلب حالياً. يرجى المحاولة ثانية.")
                }
            } catch (e: Exception) {
                layoutThinking.visibility = View.GONE
                showErrorMessage("تعذر الاتصال بالمساعد الذكي: ${e.localizedMessage ?: "تحقق من اتصالك"}")
            }
        }
    }

    private fun showErrorMessage(msg: String) {
        val err = AssistantChatMessage(
            sender = "assistant",
            badge = "⚠️ تنبيه اتصال",
            text = msg,
            type = "GENERAL_GUIDE"
        )
        adapter.addMessage(err)
        val targetIndex = adapter.itemCount - 1
        rvMessages.post {
            val lm = rvMessages.layoutManager as? androidx.recyclerview.widget.LinearLayoutManager
            lm?.scrollToPositionWithOffset(targetIndex, 0)
        }
    }

    private fun openDoctorDetails(docCard: AssistantDoctorCard) {
        val doctorItem = DoctorItem(
            id = docCard.id,
            fullName = docCard.name,
            specialty = docCard.specialty,
            clinicName = docCard.clinic,
            consultationFee = docCard.fee?.toInt() ?: 5000,
            avatar = docCard.avatar
        )
        val intent = Intent(this, DoctorDetailsActivity::class.java).apply {
            putExtra("doctor", doctorItem)
        }
        startActivity(intent)
    }

    private fun handleAction(act: AssistantAction) {
        when (act.type) {
            "CALL" -> {
                val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${act.target ?: "191"}"))
                startActivity(intent)
            }
            "PROMPT" -> {
                if (!act.text.isNullOrBlank()) {
                    sendMessage(act.text)
                }
            }
            "NAVIGATE" -> {
                when (act.target) {
                    "DOCTORS" -> {
                        val intent = Intent(this, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP
                        }
                        startActivity(intent)
                        finish()
                    }
                    "FAMILY", "WALLET" -> {
                        val intent = Intent(this, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP
                        }
                        startActivity(intent)
                        finish()
                    }
                    "APPOINTMENTS" -> {
                        val intent = Intent(this, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP
                        }
                        startActivity(intent)
                        finish()
                    }
                    "RECORDS" -> {
                        val intent = Intent(this, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP
                        }
                        startActivity(intent)
                        finish()
                    }
                }
            }
        }
    }
}
