package com.medical.clinic.ui.chat

import android.os.Bundle
import android.view.View
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.medical.clinic.R
import com.medical.clinic.data.api.ApiClient
import com.medical.clinic.data.local.ChatStorageManager
import com.medical.clinic.data.local.SessionManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class PatientConversationsActivity : AppCompatActivity() {

    @Inject
    lateinit var apiClient: ApiClient

    @Inject
    lateinit var sessionManager: SessionManager

    private lateinit var btnBack: ImageButton
    private lateinit var tvRetentionBadge: TextView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var rvConversations: RecyclerView
    private lateinit var pbLoading: ProgressBar
    private lateinit var layoutEmpty: LinearLayout
    private lateinit var adapter: PatientConversationsAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_patient_conversations)

        initViews()
        setupRecyclerView()
        setupListeners()
    }

    override fun onResume() {
        super.onResume()
        loadConversations()
    }

    private fun initViews() {
        btnBack = findViewById(R.id.btnBack)
        tvRetentionBadge = findViewById(R.id.tvRetentionBadge)
        swipeRefresh = findViewById(R.id.swipeRefresh)
        rvConversations = findViewById(R.id.rvConversations)
        pbLoading = findViewById(R.id.pbLoading)
        layoutEmpty = findViewById(R.id.layoutEmpty)

        tvRetentionBadge.text = ChatStorageManager.getRetentionDisplayText()
    }

    private fun setupRecyclerView() {
        adapter = PatientConversationsAdapter { conversation ->
            val isDoc = conversation.target_type == "doctor"
            val chatTitle = if (isDoc) {
                conversation.doctor_name ?: "الطبيب"
            } else {
                val clinic = conversation.clinic_name?.takeIf { it.isNotBlank() } ?: "العيادة"
                "سكرتيرة عيادة $clinic"
            }

            ChatActivity.start(
                context = this,
                conversationId = conversation.id,
                doctorId = conversation.doctor_id ?: 0,
                secretaryId = conversation.secretary_id ?: 0,
                targetType = conversation.target_type,
                name = chatTitle,
                clinicName = conversation.clinic_name ?: "العيادة الطبية"
            )
        }
        rvConversations.layoutManager = LinearLayoutManager(this)
        rvConversations.adapter = adapter
    }

    private fun setupListeners() {
        btnBack.setOnClickListener { finish() }
        swipeRefresh.setOnRefreshListener {
            loadConversations()
        }
    }

    private fun loadConversations() {
        if (!sessionManager.isLoggedIn()) {
            layoutEmpty.visibility = View.VISIBLE
            return
        }

        lifecycleScope.launch {
            try {
                if (!swipeRefresh.isRefreshing) {
                    pbLoading.visibility = View.VISIBLE
                }

                val response = apiClient.apiService.getConversations()
                pbLoading.visibility = View.GONE
                swipeRefresh.isRefreshing = false

                if (response.success) {
                    val list = response.data
                        .orEmpty()
                        .filter { ChatStorageManager.isConversationVisible(it.last_message_at) }
                    adapter.setConversations(list)
                    if (list.isEmpty()) {
                        layoutEmpty.visibility = View.VISIBLE
                    } else {
                        layoutEmpty.visibility = View.GONE
                    }
                } else {
                    layoutEmpty.visibility = View.VISIBLE
                }
            } catch (e: retrofit2.HttpException) {
                pbLoading.visibility = View.GONE
                swipeRefresh.isRefreshing = false
                // إذا كان 401 أو غير مسجل في السيرفر بعد، نظهر الشاشة الفارغة بشكل نظيف
                layoutEmpty.visibility = View.VISIBLE
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                swipeRefresh.isRefreshing = false
                layoutEmpty.visibility = View.VISIBLE
            }
        }
    }
}
