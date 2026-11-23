package com.medical.clinic.staff.ui.chat

import android.os.Bundle
import android.view.View
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.medical.clinic.staff.R
import com.medical.clinic.staff.data.api.ApiService
import com.medical.clinic.staff.data.local.SessionManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class ConversationsActivity : AppCompatActivity() {

    @Inject
    lateinit var apiService: ApiService

    @Inject
    lateinit var sessionManager: SessionManager

    private lateinit var btnBack: ImageButton
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var rvConversations: RecyclerView
    private lateinit var pbLoading: ProgressBar
    private lateinit var layoutEmpty: LinearLayout
    private lateinit var adapter: ConversationsAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_conversations)

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
        swipeRefresh = findViewById(R.id.swipeRefresh)
        rvConversations = findViewById(R.id.rvConversations)
        pbLoading = findViewById(R.id.pbLoading)
        layoutEmpty = findViewById(R.id.layoutEmpty)
    }

    private fun setupRecyclerView() {
        adapter = ConversationsAdapter { conversation ->
            val pName = conversation.patientName ?: "المريض"
            ChatActivity.start(
                context = this,
                conversationId = conversation.id,
                patientName = pName
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
        lifecycleScope.launch {
            try {
                if (!swipeRefresh.isRefreshing) {
                    pbLoading.visibility = View.VISIBLE
                }

                val response = apiService.getConversations()

                if (response.isSuccessful && response.body()?.success == true) {
                    val list = response.body()?.data ?: emptyList()
                    adapter.setConversations(list)
                    if (list.isEmpty()) {
                        layoutEmpty.visibility = View.VISIBLE
                    } else {
                        layoutEmpty.visibility = View.GONE
                    }
                } else {
                    var msg = response.body()?.message
                    if (msg.isNullOrBlank()) {
                        try {
                            val errJson = response.errorBody()?.string()
                            if (!errJson.isNullOrBlank()) {
                                msg = org.json.JSONObject(errJson)
                                    .optString("message")
                                    .takeIf { it.isNotBlank() }
                            }
                        } catch (_: Exception) {}
                    }
                    val finalMsg = msg ?: "تعذر جلب المحادثات"
                    Toast.makeText(this@ConversationsActivity, "⚠️ $finalMsg", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@ConversationsActivity, "⚠️ خطأ في الاتصال: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                pbLoading.visibility = View.GONE
                swipeRefresh.isRefreshing = false
            }
        }
    }
}
