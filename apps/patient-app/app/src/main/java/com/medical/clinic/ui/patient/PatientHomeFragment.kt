package com.medical.clinic.ui.patient

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.graphics.Color
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.chip.ChipGroup
import com.medical.clinic.R
import com.medical.clinic.data.api.ApiClient
import com.medical.clinic.data.api.NotificationItem
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.data.models.Clinic
import com.medical.clinic.data.models.DoctorItem
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class PatientHomeFragment : Fragment() {

    @Inject
    lateinit var apiClient: ApiClient

    @Inject
    lateinit var sessionManager: SessionManager

    private lateinit var rvHospitals: RecyclerView
    private lateinit var rvDoctors: RecyclerView
    private lateinit var hospitalsAdapter: HospitalsAdapter
    private lateinit var doctorsAdapter: DoctorsAdapter

    private lateinit var etSearch: EditText
    private lateinit var chipGroupCities: ChipGroup
    private lateinit var cardExclusiveOffers: View
    private lateinit var tvPatientName: TextView
    private lateinit var btnNotifications: View
    private lateinit var swipeRefreshLayout: androidx.swiperefreshlayout.widget.SwipeRefreshLayout
    private var btnHeaderChat: View? = null
    private var tvHeaderChatBadge: TextView? = null
    private var btnHeaderThemeToggle: View? = null
    private var tvHeaderThemeIcon: TextView? = null

    private var allHospitals: List<Clinic> = emptyList()
    private var allDoctors: List<DoctorItem> = emptyList()
    private var selectedCity: String? = null
    private var selectedSpecialty: String? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_patient_home, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        initViews(view)
        setupRecyclerViews()
        setupListeners(view)
        loadUserData()
        loadDataFromBackend()
    }

    override fun onResume() {
        super.onResume()
        loadUserData()
        loadDataFromBackend()
        updateChatBadge()
    }

    private fun updateChatBadge() {
        if (!sessionManager.isLoggedIn()) {
            tvHeaderChatBadge?.visibility = View.GONE
            return
        }
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val res = apiClient.apiService.getConversations()
                if (res.success && res.data != null) {
                    val totalUnread = res.data.sumOf { 
                        if (it.patient_unread_count > 0) it.patient_unread_count else it.unread_count 
                    }
                    if (totalUnread > 0) {
                        tvHeaderChatBadge?.visibility = View.VISIBLE
                        tvHeaderChatBadge?.text = if (totalUnread > 99) "99+" else totalUnread.toString()
                    } else {
                        tvHeaderChatBadge?.visibility = View.GONE
                    }
                }
            } catch (e: Exception) {
                // Ignore badge update failure
            }
        }
    }

    private fun initViews(view: View) {
        swipeRefreshLayout = view.findViewById(R.id.swipeRefreshLayout)
        swipeRefreshLayout.setColorSchemeColors(android.graphics.Color.parseColor("#0D9488"), android.graphics.Color.parseColor("#10B981"))
        swipeRefreshLayout.setOnRefreshListener {
            loadUserData()
            loadDataFromBackend()
            updateChatBadge()
        }
        rvHospitals = view.findViewById(R.id.rvHospitals)
        rvDoctors = view.findViewById(R.id.rvDoctors)
        etSearch = view.findViewById(R.id.etSearchHome)
        chipGroupCities = view.findViewById(R.id.chipGroupCities)
        cardExclusiveOffers = view.findViewById(R.id.cardExclusiveOffers)
        tvPatientName = view.findViewById(R.id.tvPatientName)
        btnNotifications = view.findViewById(R.id.btnNotifications)
        btnHeaderChat = view.findViewById(R.id.btnHeaderChat)
        tvHeaderChatBadge = view.findViewById(R.id.tvHeaderChatBadge)
        btnHeaderThemeToggle = view.findViewById(R.id.btnHeaderThemeToggle)
        tvHeaderThemeIcon = view.findViewById(R.id.tvHeaderThemeIcon)
        updateThemeToggleIcon()
    }

    private fun setupRecyclerViews() {
        hospitalsAdapter = HospitalsAdapter(emptyList()) { hospital ->
            val intent = Intent(requireContext(), HospitalDetailsActivity::class.java)
            intent.putExtra("hospital", hospital)
            startActivity(intent)
        }
        rvHospitals.layoutManager = LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)
        rvHospitals.adapter = hospitalsAdapter

        doctorsAdapter = DoctorsAdapter(emptyList(),
            onDoctorClick = { doc -> openDoctorDetails(doc) },
            onBookClick = { doc -> openDoctorDetails(doc) }
        )
        rvDoctors.layoutManager = LinearLayoutManager(requireContext())
        rvDoctors.adapter = doctorsAdapter
    }

    private fun setupListeners(view: View) {
        // زر تبديل الوضع الليلي والنهاري الفوري مع حركة تدوير سلسة
        btnHeaderThemeToggle?.setOnClickListener {
            tvHeaderThemeIcon?.animate()
                ?.rotationBy(360f)
                ?.scaleX(1.3f)
                ?.scaleY(1.3f)
                ?.setDuration(300)
                ?.withEndAction {
                    tvHeaderThemeIcon?.scaleX = 1.0f
                    tvHeaderThemeIcon?.scaleY = 1.0f
                }
                ?.start()

            val newMode = com.medical.clinic.utils.ThemeManager.toggleTheme(requireContext())
            updateThemeToggleIcon()
            val msg = if (newMode == com.medical.clinic.utils.ThemeManager.ThemeMode.DARK) {
                "تم تفعيل الوضع الليلي 🌙"
            } else {
                "تم تفعيل الوضع الفاتح ☀️"
            }
            android.widget.Toast.makeText(requireContext(), msg, android.widget.Toast.LENGTH_SHORT).show()
        }

        // زر الإشعارات والتنبيهات
        btnNotifications.setOnClickListener {
            showNotificationsDialog()
        }

        // زر سجل المحفظة والشحن السريع من الشاشة الرئيسية
        val openWalletAction = View.OnClickListener {
            if (!sessionManager.isLoggedIn()) {
                android.widget.Toast.makeText(requireContext(), "⚠️ يرجى تسجيل الدخول أولاً للوصول إلى المحفظة", android.widget.Toast.LENGTH_SHORT).show()
                val intent = Intent(requireContext(), com.medical.clinic.ui.auth.LoginActivity::class.java)
                startActivity(intent)
                return@OnClickListener
            }
            showWalletTransactionsDialog()
        }
        view.findViewById<View?>(R.id.layoutPatientWalletBar)?.setOnClickListener(openWalletAction)
        view.findViewById<View?>(R.id.btnHomeRechargeWallet)?.setOnClickListener(openWalletAction)

        // زر المحادثات المباشرة مع الأطباء والسكرتارية
        btnHeaderChat?.setOnClickListener {
            if (!sessionManager.isLoggedIn()) {
                android.widget.Toast.makeText(requireContext(), "⚠️ يرجى تسجيل الدخول أولاً للوصول إلى المحادثات", android.widget.Toast.LENGTH_SHORT).show()
                val intent = Intent(requireContext(), com.medical.clinic.ui.auth.LoginActivity::class.java)
                startActivity(intent)
                return@setOnClickListener
            }
            val intent = Intent(requireContext(), com.medical.clinic.ui.chat.PatientConversationsActivity::class.java)
            startActivity(intent)
        }

        // بنر العروض الحصرية
        cardExclusiveOffers.setOnClickListener {
            startActivity(Intent(requireContext(), OffersActivity::class.java))
        }

        // البحث اللحظي
        etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                filterData(s?.toString())
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        // فلترة المحافظات
        chipGroupCities.setOnCheckedStateChangeListener { _, checkedIds ->
            selectedCity = when {
                checkedIds.contains(R.id.chipSanaa) -> "صنعاء"
                checkedIds.contains(R.id.chipAden) -> "عدن"
                checkedIds.contains(R.id.chipTaiz) -> "تعز"
                checkedIds.contains(R.id.chipHadramout) -> "حضرموت"
                checkedIds.contains(R.id.chipIbb) -> "إب"
                checkedIds.contains(R.id.chipHodeidah) -> "الحديدة"
                else -> null
            }
            filterData(etSearch.text?.toString())
        }

        // فلترة التخصصات البصرية الموحدة
        setupVisualSpecialties(view)

        // زر عرض كل المستشفيات
        view.findViewById<View?>(R.id.tvViewAllHospitals)?.setOnClickListener {
            // التمرير لأول قائمة المستشفيات وإعادة ضبط الفلترة
            rvHospitals.smoothScrollToPosition(0)
            android.widget.Toast.makeText(requireContext(), "عرض جميع المستشفيات والعيادات المتاحة (${allHospitals.size})", android.widget.Toast.LENGTH_SHORT).show()
        }

        // زر عرض كل المحافظات
        view.findViewById<View?>(R.id.tvViewAllCities)?.setOnClickListener {
            val yemenCities = arrayOf("الكل", "صنعاء", "عدن", "تعز", "الحديدة", "إب", "حضرموت", "ذمار", "مأرب", "لحج", "أبين", "صعدة")
            android.app.AlertDialog.Builder(requireContext())
                .setTitle("اختر المحافظة")
                .setItems(yemenCities) { _, which ->
                    val chosen = yemenCities[which]
                    selectedCity = if (chosen == "الكل") null else chosen
                    filterData(etSearch.text?.toString())
                    android.widget.Toast.makeText(requireContext(), "تمت تصفية العيادات بحسب: $chosen", android.widget.Toast.LENGTH_SHORT).show()
                }
                .setNegativeButton("إلغاء", null)
                .show()
        }
    }

    private data class SpecialtyCategoryItem(
        val key: String?,
        val layoutId: Int,
        val frameId: Int,
        val tvId: Int,
        val defaultBgRes: Int,
        val label: String
    )

    private fun setupVisualSpecialties(view: View) {
        val items = listOf(
            SpecialtyCategoryItem(null, R.id.specCategoryAll, R.id.frameSpecAll, R.id.tvSpecAll, R.drawable.bg_circle_pastel_teal, "الكل"),
            SpecialtyCategoryItem("باطنية", R.id.specCategoryInternal, R.id.frameSpecInternal, R.id.tvSpecInternal, R.drawable.bg_circle_pastel_teal, "باطنية"),
            SpecialtyCategoryItem("أطفال", R.id.specCategoryPediatric, R.id.frameSpecPediatric, R.id.tvSpecPediatric, R.drawable.bg_circle_pastel_amber, "أطفال"),
            SpecialtyCategoryItem("قلب", R.id.specCategoryCardio, R.id.frameSpecCardio, R.id.tvSpecCardio, R.drawable.bg_circle_pastel_pink, "قلب"),
            SpecialtyCategoryItem("عظام", R.id.specCategoryOrtho, R.id.frameSpecOrtho, R.id.tvSpecOrtho, R.drawable.bg_circle_pastel_cyan, "عظام"),
            SpecialtyCategoryItem("عيون", R.id.specCategoryOphthal, R.id.frameSpecOphthal, R.id.tvSpecOphthal, R.drawable.bg_circle_pastel_teal, "عيون"),
            SpecialtyCategoryItem("جلدية", R.id.specCategoryDerma, R.id.frameSpecDerma, R.id.tvSpecDerma, R.drawable.bg_circle_pastel_purple, "جلدية"),
            SpecialtyCategoryItem("نساء", R.id.specCategoryGyne, R.id.frameSpecGyne, R.id.tvSpecGyne, R.drawable.bg_circle_pastel_pink, "نساء وولادة"),
            SpecialtyCategoryItem("أسنان", R.id.specCategoryDental, R.id.frameSpecDental, R.id.tvSpecDental, R.drawable.bg_circle_pastel_cyan, "أسنان"),
            SpecialtyCategoryItem("أعصاب", R.id.specCategoryNeuro, R.id.frameSpecNeuro, R.id.tvSpecNeuro, R.drawable.bg_circle_pastel_purple, "مخ وأعصاب"),
            SpecialtyCategoryItem("أنف", R.id.specCategoryENT, R.id.frameSpecENT, R.id.tvSpecENT, R.drawable.bg_circle_pastel_amber, "أنف وأذن"),
            SpecialtyCategoryItem("مسالك", R.id.specCategoryUrology, R.id.frameSpecUrology, R.id.tvSpecUrology, R.drawable.bg_circle_pastel_teal, "مسالك بولية"),
            SpecialtyCategoryItem("نفسية", R.id.specCategoryPsych, R.id.frameSpecPsych, R.id.tvSpecPsych, R.drawable.bg_circle_pastel_amber, "نفسية")
        )

        fun updateSelectionUI(selectedKey: String?) {
            for (item in items) {
                val frame = view.findViewById<View>(item.frameId)
                val tv = view.findViewById<TextView>(item.tvId)
                val isSelected = (item.key == selectedKey)
                if (isSelected) {
                    frame?.setBackgroundResource(R.drawable.bg_circle_specialty_active)
                    tv?.setTextColor(resources.getColor(R.color.brand_primary, null))
                } else {
                    frame?.setBackgroundResource(item.defaultBgRes)
                    tv?.setTextColor(resources.getColor(R.color.on_surface_dark, null))
                }
            }
        }

        for (item in items) {
            val layout = view.findViewById<View>(item.layoutId) ?: continue
            layout.setOnClickListener {
                selectedSpecialty = item.key
                updateSelectionUI(item.key)
                filterData(etSearch.text?.toString())
            }
        }
    }

    private fun loadUserData() {
        val user = sessionManager.getUser()
        val fullName = user?.fullName?.trim()?.takeIf { it.isNotBlank() }
        val firstName = fullName?.split(" ")?.firstOrNull()?.takeIf { it.isNotBlank() }
        val greetingText = if (!firstName.isNullOrBlank()) "أهلاً بك يا $firstName • نتمنى لك يوماً صحياً ✨" else "أهلاً بك • نتمنى لك يوماً صحياً ✨"
        view?.findViewById<TextView>(R.id.tvWelcomeGreeting)?.text = greetingText

        val tvBalance = view?.findViewById<TextView>(R.id.tvHomePatientBalance)
        val initialBalance = user?.balance ?: 0.0
        tvBalance?.text = "${String.format(java.util.Locale.US, "%,.2f", initialBalance)} ر.ي"

        val ivAvatar = view?.findViewById<android.widget.ImageView>(R.id.ivPatientAvatar)
        if (ivAvatar != null) {
            val avatarUrl = user?.bestAvatar
            if (!avatarUrl.isNullOrBlank()) {
                val fullUrl = if (avatarUrl.startsWith("http")) {
                    avatarUrl
                } else {
                    com.medical.clinic.BuildConfig.BASE_URL.removeSuffix("/api/v1/").removeSuffix("/") + if (avatarUrl.startsWith("/")) avatarUrl else "/$avatarUrl"
                }
                com.bumptech.glide.Glide.with(this)
                    .load(fullUrl)
                    .transition(com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions.withCrossFade(300))
                    .circleCrop()
                    .placeholder(R.drawable.ic_tabeebak_logo)
                    .error(R.drawable.ic_tabeebak_logo)
                    .into(ivAvatar)
            } else {
                ivAvatar.setImageResource(R.drawable.ic_tabeebak_logo)
            }
        }

        if (sessionManager.isLoggedIn()) {
            viewLifecycleOwner.lifecycleScope.launch {
                try {
                    val res = apiClient.apiService.getPatientProfile()
                    if (res.success && res.data != null) {
                        sessionManager.saveUser(res.data)
                        val updatedBal = res.data.balance ?: 0.0
                        tvBalance?.text = "${String.format(java.util.Locale.US, "%,.2f", updatedBal)} ر.ي"
                    }
                } catch (_: Exception) {}
            }
        }
    }

    private fun loadDataFromBackend() {
        // ⚡ كاش محلي فوري للأطباء والعيادات لتسريع الاستجابة أثناء ضعف الإنترنت في اليمن
        if (allHospitals.isEmpty()) {
            sessionManager.getString("cached_patient_hospitals")?.let { cachedJson ->
                try {
                    val listType = object : com.google.gson.reflect.TypeToken<List<Clinic>>() {}.type
                    val list = com.google.gson.Gson().fromJson<List<Clinic>>(cachedJson, listType)
                    if (!list.isNullOrEmpty()) {
                        allHospitals = list
                        filterData(etSearch.text?.toString())
                    }
                } catch (_: Exception) {}
            }
        }
        if (allDoctors.isEmpty()) {
            sessionManager.getString("cached_patient_doctors")?.let { cachedJson ->
                try {
                    val listType = object : com.google.gson.reflect.TypeToken<List<DoctorItem>>() {}.type
                    val list = com.google.gson.Gson().fromJson<List<DoctorItem>>(cachedJson, listType)
                    if (!list.isNullOrEmpty()) {
                        allDoctors = list
                        filterData(etSearch.text?.toString())
                    }
                } catch (_: Exception) {}
            }
        }

        lifecycleScope.launch {
            try {
                // جلب المستشفيات من السيرفر
                val clinicsResponse = apiClient.apiService.getClinics()
                if (clinicsResponse.success && clinicsResponse.data != null) {
                    allHospitals = clinicsResponse.data
                    sessionManager.saveString("cached_patient_hospitals", com.google.gson.Gson().toJson(allHospitals))
                    filterData(etSearch.text?.toString())
                } else if (allHospitals.isEmpty()) {
                    useDefaultHospitals()
                }
            } catch (e: Exception) {
                if (allHospitals.isEmpty()) {
                    useDefaultHospitals()
                }
            }

            try {
                // جلب الأطباء من السيرفر
                val doctorsResponse = apiClient.apiService.getDoctors()
                if (doctorsResponse.success && doctorsResponse.data != null) {
                    allDoctors = doctorsResponse.data
                    sessionManager.saveString("cached_patient_doctors", com.google.gson.Gson().toJson(allDoctors))
                    filterData(etSearch.text?.toString())
                } else if (allDoctors.isEmpty()) {
                    useDefaultDoctors()
                }
            } catch (e: Exception) {
                if (allDoctors.isEmpty()) {
                    useDefaultDoctors()
                }
            } finally {
                swipeRefreshLayout.isRefreshing = false
            }
        }
    }

    private fun filterData(query: String?) {
        val q = query?.trim()?.lowercase() ?: ""

        // فلترة الأطباء
        val filteredDocs = allDoctors.filter { doc ->
            val isActive = (doc.isActive ?: 1) == 1
            val isApproved = (doc.status ?: "approved") == "approved"
            if (!isActive || !isApproved) return@filter false

            val matchesQuery = q.isEmpty() ||
                    doc.fullName.lowercase().contains(q) ||
                    doc.specialty.lowercase().contains(q) ||
                    (doc.clinicName?.lowercase()?.contains(q) == true)

            val matchesCity = selectedCity == null ||
                    (doc.governorate?.contains(selectedCity!!) == true) ||
                    (doc.clinicName?.contains(selectedCity!!) == true)

            val matchesSpecialty = selectedSpecialty == null ||
                    doc.specialty.contains(selectedSpecialty!!)

            matchesQuery && matchesCity && matchesSpecialty
        }
        doctorsAdapter.updateData(filteredDocs)

        // فلترة المستشفيات
        val filteredHospitals = allHospitals.filter { h ->
            val matchesQuery = q.isEmpty() ||
                    h.name.lowercase().contains(q) ||
                    (h.address?.lowercase()?.contains(q) == true)

            val matchesCity = selectedCity == null ||
                    (h.governorate?.contains(selectedCity!!) == true)

            matchesQuery && matchesCity
        }
        hospitalsAdapter.updateData(filteredHospitals)
    }

    private fun openDoctorDetails(doc: DoctorItem) {
        val intent = Intent(requireContext(), DoctorDetailsActivity::class.java)
        intent.putExtra("doctor", doc)
        startActivity(intent)
    }

    private fun useDefaultHospitals() {
        allHospitals = listOf(
            Clinic(1, "مستشفى الأمل التخصصي", "صنعاء", "شارع حدة", "01400000", null, 1, null),
            Clinic(2, "مستشفى صابر الدولي", "عدن", "المنصورة", "02300000", null, 1, null),
            Clinic(3, "مستشفى الصفوة", "تعز", "الحوبان", "04200000", null, 1, null),
            Clinic(4, "مستشفى حضرموت الحديث", "حضرموت", "المكلا", "05300000", null, 1, null)
        )
        hospitalsAdapter.updateData(allHospitals)
    }

    private fun useDefaultDoctors() {
        allDoctors = listOf(
            DoctorItem(1, "أحمد محمد سالم", "استشاري أمراض باطنية", "مستشفى الأمل التخصصي", "صنعاء", "حدة", null, "استشاري أمراض باطنية وجهاز هضمي", 12, 4500, 20, 4.9f, 10),
            DoctorItem(2, "أحمد محمد", "استشاري أمراض القلب والأوعية الدموية", "مستشفى الأمل التخصصي", "صنعاء", "حدة", null, "استشاري قسطرة وجراحة القلب", 15, 5000, 20, 4.8f, 12),
            DoctorItem(3, "سارة علي", "أخصائية أمراض الجلدية والتجميل", "مستشفى صابر الدولي", "عدن", "المنصورة", null, "أخصائية أمراض الجلد والليزر", 10, 4000, 20, 4.9f, 8),
            DoctorItem(4, "خالد عبدالله", "استشاري طب وجراحة الأطفال", "مستشفى صابر الدولي", "عدن", "المنصورة", null, "استشاري طب الأطفال وحديثي الولادة", 12, 3500, 15, 4.7f, 14),
            DoctorItem(5, "منى حسن", "استشارية طب وجراحة العيون", "مستشفى الأمل التخصصي", "صنعاء", "حدة", null, "استشارية جراحة القرنية والعيون", 14, 6000, 20, 4.8f, 9),
            DoctorItem(6, "عمر يوسف", "استشاري جراحة العظام والمفاصل", "مستشفى الصفوة", "تعز", "الحوبان", null, "استشاري تبديل المفاصل والكسور", 18, 7000, 25, 4.9f, 6)
        )
        doctorsAdapter.updateData(allDoctors)
    }

    private fun showNotificationsDialog() {
        val bottomSheet = BottomSheetDialog(requireContext())
        val sheetView = layoutInflater.inflate(R.layout.dialog_notifications, null)
        bottomSheet.setContentView(sheetView)

        val rvNotifs = sheetView.findViewById<RecyclerView>(R.id.rvNotificationsDialog)
        val pbLoading = sheetView.findViewById<ProgressBar>(R.id.pbNotificationsLoading)
        val llEmpty = sheetView.findViewById<View>(R.id.llEmptyNotifications)
        val btnMarkAllRead = sheetView.findViewById<TextView>(R.id.btnMarkAllRead)
        val btnClose = sheetView.findViewById<View>(R.id.btnCloseNotifications)

        val adapter = NotificationsAdapter(emptyList()) { item ->
            lifecycleScope.launch {
                try {
                    apiClient.apiService.markNotificationRead(item.id)
                } catch (e: Exception) {
                    // ignore
                }
            }
        }
        rvNotifs.layoutManager = LinearLayoutManager(requireContext())
        rvNotifs.adapter = adapter

        btnClose.setOnClickListener { bottomSheet.dismiss() }

        btnMarkAllRead.setOnClickListener {
            lifecycleScope.launch {
                try {
                    apiClient.apiService.markAllNotificationsRead()
                    Toast.makeText(requireContext(), "تم تحديد الكل كمقروء", Toast.LENGTH_SHORT).show()
                    loadNotifications(adapter, pbLoading, llEmpty)
                } catch (e: Exception) {
                    Toast.makeText(requireContext(), "تم تحديد الكل كمقروء", Toast.LENGTH_SHORT).show()
                }
            }
        }

        loadNotifications(adapter, pbLoading, llEmpty)
        bottomSheet.show()
    }

    private fun loadNotifications(
        adapter: NotificationsAdapter,
        pbLoading: ProgressBar,
        llEmpty: View
    ) {
        pbLoading.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                val res = apiClient.apiService.getNotifications()
                pbLoading.visibility = View.GONE
                if (res.success && !res.data.isNullOrEmpty()) {
                    adapter.updateList(res.data)
                    llEmpty.visibility = View.GONE
                } else {
                    val fallback = listOf(
                        NotificationItem(
                            id = 1,
                            user_id = 0,
                            user_type = "patient",
                            title = "مرحباً بك في منصة طبيبك 🌟",
                            body = "أهلاً بك في منصة طبيبك الطبية الموحدة في اليمن. يمكنك الآن حجز المواعيد والاستفادة من أفضل العروض.",
                            type = "welcome",
                            is_read = 1,
                            created_at = "اليوم"
                        ),
                        NotificationItem(
                            id = 2,
                            user_id = 0,
                            user_type = "patient",
                            title = "تنبيه بمواعيد الكشف 🕒",
                            body = "تذكر الحضور إلى العيادة قبل موعد الزيارة المحدد بنصف ساعة لضمان تثبيت دورك.",
                            type = "reminder",
                            is_read = 0,
                            created_at = "منذ ساعة"
                        ),
                        NotificationItem(
                            id = 3,
                            user_id = 0,
                            user_type = "patient",
                            title = "عروض وباقات طبية مخفّضة 🎁",
                            body = "خصم يصل إلى 40% على الفحوصات الشاملة في المستشفيات الشريكة. تصفح قسم العروض الآن.",
                            type = "offer",
                            is_read = 0,
                            created_at = "اليوم"
                        )
                    )
                    adapter.updateList(fallback)
                    llEmpty.visibility = View.GONE
                }
            } catch (e: Exception) {
                pbLoading.visibility = View.GONE
                val fallback = listOf(
                    NotificationItem(
                        id = 1,
                        user_id = 0,
                        user_type = "patient",
                        title = "مرحباً بك في منصة طبيبك 🌟",
                        body = "أهلاً بك في منصة طبيبك الطبية الموحدة في اليمن.",
                        type = "welcome",
                        is_read = 1,
                        created_at = "اليوم"
                    ),
                    NotificationItem(
                        id = 2,
                        user_id = 0,
                        user_type = "patient",
                        title = "تذكير المواعيد 🕒",
                        body = "احرص على التواجد قبل موعد الكشف بنصف ساعة.",
                        type = "reminder",
                        is_read = 0,
                        created_at = "اليوم"
                    )
                )
                adapter.updateList(fallback)
                llEmpty.visibility = View.GONE
            }
        }
    }

    private fun showWalletTransactionsDialog() {
        val user = sessionManager.getUser()
        val currentBalance = user?.balance ?: 0.0

        val context = requireContext()
        val container = android.widget.LinearLayout(context).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(40, 24, 40, 24)
        }

        val tvBalance = TextView(context).apply {
            text = "الرصيد المتاح: ${String.format(java.util.Locale.US, "%,.2f", currentBalance)} ر.ي"
            textSize = 18f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setTextColor(Color.parseColor("#0D9488"))
            gravity = android.view.Gravity.CENTER
            setPadding(0, 0, 0, 20)
        }
        container.addView(tvBalance)

        val btnDeposit = com.google.android.material.button.MaterialButton(context).apply {
            text = "➕ شحن رصيد المحفظة الآن"
            setBackgroundColor(Color.parseColor("#0D9488"))
            setTextColor(Color.WHITE)
            cornerRadius = 20
        }
        container.addView(btnDeposit)

        val tvHistoryTitle = TextView(context).apply {
            text = "📋 سجل العمليات الأخيرة:"
            textSize = 14f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setTextColor(Color.parseColor("#374151"))
            setPadding(0, 24, 0, 10)
        }
        container.addView(tvHistoryTitle)

        val tvHistoryContent = TextView(context).apply {
            text = "جاري تحميل سجل العمليات..."
            textSize = 13f
            setTextColor(Color.parseColor("#6B7280"))
            setLineSpacing(1.2f, 1.2f)
        }
        container.addView(tvHistoryContent)

        val dialog = androidx.appcompat.app.AlertDialog.Builder(context)
            .setTitle("💳 محفظة طبيبك الطبية")
            .setView(container)
            .setPositiveButton("إغلاق", null)
            .create()

        btnDeposit.setOnClickListener {
            dialog.dismiss()
            showDepositRequestDialog()
        }

        // جلب سجل المعاملات من الخادم
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val res = apiClient.apiService.getPatientWallet()
                if (res.success && res.data != null) {
                    val bal = (res.data["balance"] as? Number)?.toDouble() ?: currentBalance
                    tvBalance.text = "الرصيد المتاح: ${String.format(java.util.Locale.US, "%,.2f", bal)} ر.ي"
                    view?.findViewById<TextView>(R.id.tvHomePatientBalance)?.text = "${String.format(java.util.Locale.US, "%,.2f", bal)} ر.ي"

                    val txList = res.data["transactions"] as? List<Map<String, Any>>
                    if (txList.isNullOrEmpty()) {
                        tvHistoryContent.text = "لا توجد حركات سابقة حتى الآن.\nيمكنك شحن رصيدك بالضغط على الزر أعلاه ⬆️"
                    } else {
                        val sb = StringBuilder()
                        txList.take(5).forEach { tx ->
                            val amt = (tx["amount"] as? Number)?.toDouble() ?: 0.0
                            val desc = tx["description"] as? String ?: "عملية محفظة"
                            val type = tx["type"] as? String ?: ""
                            val sign = if (type == "deposit" || amt > 0) "+" else "-"
                            sb.append("• $sign${String.format(java.util.Locale.US, "%,.2f", kotlin.math.abs(amt))} ر.ي : $desc\n\n")
                        }
                        tvHistoryContent.text = sb.toString().trimEnd()
                    }
                }
            } catch (e: Exception) {
                tvHistoryContent.text = "يمكنك شحن رصيدك عبر زر شحن الرصيد أعلاه وسيقوم الأدمن باعتماده فوراً."
            }
        }

        dialog.show()
    }

    private fun showDepositRequestDialog() {
        val context = requireContext()
        val layout = android.widget.LinearLayout(context).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(40, 20, 40, 20)
        }

        val tvInstructions = TextView(context).apply {
            text = """
                📌 طرق التحويل المتاحة:
                • الكريمي المميز: 3012345678 (طبيبك للخدمات الطبية)
                • المحافظ الإلكترونية (جوالي / ون كاش / فلوسك): 781238648
                • شبكات الصرافة (النجم / الامتياز): باسم "طبيبك المركزي"
                
                بعد إتمام التحويل، أدخل المبلغ ورقم الحوالة/العملية بالأسفل وسيتم إضافة الرصيد إلى محفظتك فور موافقة الإدارة:
            """.trimIndent()
            textSize = 13f
            setTextColor(Color.parseColor("#374151"))
            setLineSpacing(1.2f, 1.2f)
            setPadding(0, 0, 0, 16)
        }
        layout.addView(tvInstructions)

        val spMethods = android.widget.Spinner(context)
        val methodOptions = arrayOf("حوالة صرافة (النجم / الامتياز)", "بنك الكريمي", "محفظة جوالي / ون كاش", "حوالة مصرفية أخرى")
        val spinnerAdapter = android.widget.ArrayAdapter(context, android.R.layout.simple_spinner_dropdown_item, methodOptions)
        spMethods.adapter = spinnerAdapter
        layout.addView(spMethods)

        val etAmount = android.widget.EditText(context).apply {
            hint = "المبلغ المحول (ر.ي) *"
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL
            setPadding(20, 24, 20, 24)
        }
        layout.addView(etAmount)

        val etReference = android.widget.EditText(context).apply {
            hint = "رقم الحوالة أو السند أو العملية *"
            inputType = android.text.InputType.TYPE_CLASS_TEXT
            setPadding(20, 24, 20, 24)
        }
        layout.addView(etReference)

        val etNotes = android.widget.EditText(context).apply {
            hint = "ملاحظات إضافية (اختياري، مثلاً اسم المحول)"
            inputType = android.text.InputType.TYPE_CLASS_TEXT
            setPadding(20, 24, 20, 24)
        }
        layout.addView(etNotes)

        androidx.appcompat.app.AlertDialog.Builder(context)
            .setTitle("💰 طلب شحن المحفظة")
            .setView(layout)
            .setPositiveButton("إرسال الطلب للأدمن 📤") { dialog, _ ->
                val amountStr = etAmount.text.toString().trim()
                val refStr = etReference.text.toString().trim()
                val notesStr = etNotes.text.toString().trim()
                val methodStr = spMethods.selectedItem?.toString() ?: "حوالة"

                val rawAmountNum = amountStr.toDoubleOrNull()
                if (rawAmountNum == null || rawAmountNum == 0.0) {
                    android.widget.Toast.makeText(context, "يرجى إدخال مبلغ صحيح", android.widget.Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val amountNum = kotlin.math.abs(rawAmountNum)
                if (refStr.isBlank()) {
                    android.widget.Toast.makeText(context, "يرجى إدخال رقم الحوالة أو العملية", android.widget.Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                viewLifecycleOwner.lifecycleScope.launch {
                    try {
                        val body = mapOf(
                            "amount" to amountNum,
                            "method" to methodStr,
                            "reference_number" to refStr,
                            "notes" to notesStr
                        )
                        val res = apiClient.apiService.submitWalletDepositRequest(body)
                        if (res.success) {
                            android.widget.Toast.makeText(context, res.message ?: "تم إرسال طلب الشحن بنجاح! سيتم اعتماده قريباً ✅", android.widget.Toast.LENGTH_LONG).show()
                            loadUserData()
                        } else {
                            android.widget.Toast.makeText(context, res.message ?: "تعذر إرسال الطلب", android.widget.Toast.LENGTH_LONG).show()
                        }
                    } catch (e: Exception) {
                        android.widget.Toast.makeText(context, "حدث خطأ: ${e.message}", android.widget.Toast.LENGTH_LONG).show()
                    }
                }
            }
            .setNegativeButton("إلغاء", null)
            .show()
    }

    private fun updateThemeToggleIcon() {
        context?.let { ctx ->
            val isNight = com.medical.clinic.utils.ThemeManager.isNightActive(ctx)
            tvHeaderThemeIcon?.text = if (isNight) "☀️" else "🌙"
        }
    }
}

