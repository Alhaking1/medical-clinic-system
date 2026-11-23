package com.medical.clinic.staff.ui.secretary

import android.net.Uri
import android.os.Bundle
import android.text.InputType
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.medical.clinic.staff.R
import com.medical.clinic.staff.data.models.CreateOfferRequest
import com.medical.clinic.staff.data.models.OfferItem
import com.medical.clinic.staff.data.models.SecretaryDoctorItem
import com.medical.clinic.staff.data.repository.SecretaryRepository
import com.medical.clinic.staff.data.utils.Resource
import com.medical.clinic.staff.databinding.FragmentSecretaryOffersBinding
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject

@AndroidEntryPoint
class SecretaryOffersFragment : Fragment() {

    private var _binding: FragmentSecretaryOffersBinding? = null
    private val binding get() = _binding!!

    @Inject
    lateinit var secretaryRepository: SecretaryRepository

    @Inject
    lateinit var sessionManager: com.medical.clinic.staff.data.local.SessionManager

    private lateinit var offersAdapter: OffersAdapter

    private var currentOffersList = listOf<OfferItem>()
    private var completedOffersList = listOf<OfferItem>()
    private var clinicDoctorsList = listOf<SecretaryDoctorItem>()

    private val selectedImageUris = mutableListOf<Uri>()
    private var tvSelectedImagesCountView: TextView? = null

    private val pickImagesLauncher = registerForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
        selectedImageUris.clear()
        if (!uris.isNullOrEmpty()) {
            selectedImageUris.addAll(uris.take(3))
            tvSelectedImagesCountView?.text = "تم اختيار ${selectedImageUris.size} من 3 صور 🖼️"
            tvSelectedImagesCountView?.visibility = View.VISIBLE
        } else {
            tvSelectedImagesCountView?.text = "لم يتم اختيار صور"
            tvSelectedImagesCountView?.visibility = View.GONE
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSecretaryOffersBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupRecyclerView()
        setupListeners()
        loadDoctors()
        loadOffers()
    }

    private fun setupRecyclerView() {
        offersAdapter = OffersAdapter(
            onDelete = { /* Deleted disabled for secretary as per requirements */ },
            onRepeat = { offer ->
                com.medical.clinic.staff.ui.utils.ProfileGuard.checkOrPrompt(requireContext(), sessionManager) {
                    showRepeatOfferDialog(offer)
                }
            }
        )
        binding.rvOffers.layoutManager = LinearLayoutManager(requireContext())
        binding.rvOffers.adapter = offersAdapter
    }

    private fun setupListeners() {
        binding.swipeRefreshOffers.setOnRefreshListener {
            loadOffers()
        }

        binding.chipGroupOffers.setOnCheckedStateChangeListener { _, _ ->
            filterAndDisplayOffers()
        }

        binding.btnAddOffer.setOnClickListener {
            com.medical.clinic.staff.ui.utils.ProfileGuard.checkOrPrompt(requireContext(), sessionManager) {
                showAddOfferDialog()
            }
        }
    }

    private fun loadDoctors() {
        viewLifecycleOwner.lifecycleScope.launch {
            val res = secretaryRepository.getSecretaryDoctors()
            if (res is Resource.Success && res.data != null) {
                clinicDoctorsList = res.data
            }
        }
    }

    private fun loadOffers() {
        if (sessionManager.isGuestMode() || sessionManager.mustCompleteProfile()) {
            binding.swipeRefreshOffers.isRefreshing = false
            offersAdapter.submitList(emptyList())
            binding.layoutEmptyOffers.visibility = View.VISIBLE
            return
        }

        binding.swipeRefreshOffers.isRefreshing = true
        viewLifecycleOwner.lifecycleScope.launch {
            val res = secretaryRepository.getSecretaryOffers()
            binding.swipeRefreshOffers.isRefreshing = false

            if (res is Resource.Success && res.data != null) {
                val data = res.data
                currentOffersList = data.current ?: emptyList()
                completedOffersList = data.completed ?: emptyList()
                filterAndDisplayOffers()
            } else {
                Toast.makeText(requireContext(), res.message ?: "فشل جلب العروض", Toast.LENGTH_SHORT).show()
                filterAndDisplayOffers()
            }
        }
    }

    private fun filterAndDisplayOffers() {
        val isCurrent = binding.chipGroupOffers.checkedChipId == R.id.chipCurrentOffers
        val list = if (isCurrent) currentOffersList else completedOffersList
        offersAdapter.submitList(list)

        if (list.isEmpty()) {
            binding.layoutEmptyOffers.visibility = View.VISIBLE
            binding.tvEmptyOffersMessage.text = if (isCurrent) {
                "لا توجد عروض جارية أو معلقة حالياً"
            } else {
                "لا توجد عروض مكتملة سابقة"
            }
        } else {
            binding.layoutEmptyOffers.visibility = View.GONE
        }
    }

    private fun showAddOfferDialog() {
        if (clinicDoctorsList.isEmpty()) {
            viewLifecycleOwner.lifecycleScope.launch {
                val res = secretaryRepository.getSecretaryDoctors()
                if (res is Resource.Success && !res.data.isNullOrEmpty()) {
                    clinicDoctorsList = res.data
                }
            }
        }
        displayAddOfferDialog()
    }

    private fun displayAddOfferDialog() {
        val context = requireContext()
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 24, 48, 24)
        }

        // اختيار الطبيب المشمول بالعرض أو كامل العيادة
        val tvDocLabel = TextView(context).apply {
            text = "نطاق سريان العرض: *"
            textSize = 13f
            setPadding(0, 8, 0, 4)
        }
        layout.addView(tvDocLabel)

        val docOptions = mutableListOf<String>()
        docOptions.add("🏥 عرض عام لكامل العيادة (جميع التخصصات والأطباء)")
        clinicDoctorsList.forEach { doc ->
            docOptions.add("👨‍⚕️ ${doc.fullName} (${doc.specialty ?: "طبيب"})")
        }

        val spDoctor = Spinner(context).apply {
            adapter = ArrayAdapter(context, android.R.layout.simple_spinner_dropdown_item, docOptions)
        }
        layout.addView(spDoctor)

        // عنوان العرض
        val tvTitleLabel = TextView(context).apply {
            text = "عنوان العرض: *"
            textSize = 13f
            setPadding(0, 12, 0, 4)
        }
        layout.addView(tvTitleLabel)

        val etTitle = EditText(context).apply {
            hint = "مثال: خصم 30% على كشف العيون"
            com.medical.clinic.staff.ui.utils.InputValidationUtils.applySafeTextRules(this, 60)
        }
        layout.addView(etTitle)

        // تفاصيل العرض
        val tvDescLabel = TextView(context).apply {
            text = "تفاصيل ووصف العرض:"
            textSize = 13f
            setPadding(0, 12, 0, 4)
        }
        layout.addView(tvDescLabel)

        val etDesc = EditText(context).apply {
            hint = "مثال: كشف شامل وفحص دقيق بمناسبة افتتاح الفرع"
            com.medical.clinic.staff.ui.utils.InputValidationUtils.applySafeTextRules(this, 200)
        }
        layout.addView(etDesc)

        // نسبة الخصم
        val tvDiscountLabel = TextView(context).apply {
            text = "نسبة الخصم %: *"
            textSize = 13f
            setPadding(0, 12, 0, 4)
        }
        layout.addView(tvDiscountLabel)

        val etDiscount = EditText(context).apply {
            hint = "مثال: 25"
            inputType = InputType.TYPE_CLASS_NUMBER
            setText("20")
            filters = arrayOf(android.text.InputFilter.LengthFilter(3))
        }
        layout.addView(etDiscount)

        // مدة العرض بالأيام
        val tvDurationLabel = TextView(context).apply {
            text = "مدة سريان العرض: *"
            textSize = 13f
            setPadding(0, 12, 0, 4)
        }
        layout.addView(tvDurationLabel)

        val durationOptions = listOf("يوم واحد (1 يوم)", "يومان (2 يوم)", "3 أيام", "أسبوع كامل (7 أيام)", "أسبوعان (14 يوماً)", "شهر كامل (30 يوماً)")
        val durationDaysValues = listOf(1, 2, 3, 7, 14, 30)

        val spDuration = Spinner(context).apply {
            adapter = ArrayAdapter(context, android.R.layout.simple_spinner_dropdown_item, durationOptions)
            setSelection(3) // 7 days
        }
        layout.addView(spDuration)

        // صور العرض
        selectedImageUris.clear()
        val tvImagesLabel = TextView(context).apply {
            text = "صور العرض (اختياري - حتى 3 صور):"
            textSize = 13f
            setPadding(0, 16, 0, 6)
        }
        layout.addView(tvImagesLabel)

        val btnPickImages = com.google.android.material.button.MaterialButton(context).apply {
            text = "📷 اختيار صور للعرض (حتى 3)"
            setOnClickListener {
                pickImagesLauncher.launch("image/*")
            }
        }
        layout.addView(btnPickImages)

        tvSelectedImagesCountView = TextView(context).apply {
            text = "لم يتم اختيار صور بعد"
            textSize = 12f
            setTextColor(android.graphics.Color.parseColor("#0D9488"))
            setPadding(0, 6, 0, 12)
            visibility = View.GONE
        }
        layout.addView(tvSelectedImagesCountView)

        AlertDialog.Builder(context)
            .setTitle("🏷️ إضافة عرض ترويجي جديد")
            .setView(layout)
            .setPositiveButton("إرسال للموافقة") { _, _ ->
                val title = com.medical.clinic.staff.ui.utils.InputValidationUtils.sanitize(etTitle.text.toString())
                val desc = com.medical.clinic.staff.ui.utils.InputValidationUtils.sanitize(etDesc.text.toString())
                val discountVal = etDiscount.text.toString().toIntOrNull() ?: 20
                val selectedPos = spDoctor.selectedItemPosition
                val selectedDoctorId = if (selectedPos > 0 && selectedPos <= clinicDoctorsList.size) {
                    clinicDoctorsList[selectedPos - 1].id
                } else {
                    null // عرض عام لكامل العيادة
                }
                val days = durationDaysValues[spDuration.selectedItemPosition]

                if (title.isBlank()) {
                    Toast.makeText(context, "⚠️ عنوان العرض مطلوب", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                createOffer(title, desc, discountVal, selectedDoctorId, days)
            }
            .setNegativeButton("إلغاء", null)
            .show()
    }

    private fun createOffer(title: String, desc: String, discount: Int, doctorId: Int?, durationDays: Int) {
        val imagesToUpload = ArrayList(selectedImageUris)

        viewLifecycleOwner.lifecycleScope.launch {
            val req = CreateOfferRequest(
                title = title,
                description = desc,
                doctorId = doctorId,
                discountPercent = discount,
                discountPercentage = discount.toDouble(),
                durationDays = durationDays
            )
            val res = secretaryRepository.createOffer(req)
            if (res is Resource.Success && res.data != null) {
                val createdOfferId = res.data.id

                // رفع الصور إن وجدت
                if (imagesToUpload.isNotEmpty()) {
                    val parts = imagesToUpload.mapNotNull { uri ->
                        uriToPart(uri, "images")
                    }
                    if (parts.isNotEmpty()) {
                        secretaryRepository.uploadOfferImages(createdOfferId, parts)
                    }
                }

                Toast.makeText(
                    requireContext(),
                    "تم إرسال العرض بنجاح وهو بانتظار اعتماد إدارة المنصة ⏳",
                    Toast.LENGTH_LONG
                ).show()

                binding.chipCurrentOffers.isChecked = true
                loadOffers()
            } else {
                Toast.makeText(requireContext(), res.message ?: "فشل إنشاء العرض", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showRepeatOfferDialog(offer: OfferItem) {
        val context = requireContext()
        val container = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 24, 48, 24)
        }

        val tvInfo = TextView(context).apply {
            text = "تكرار العرض: \"${offer.title}\"\n👨‍⚕️ الطبيب: ${offer.doctorName ?: "طبيب العيادة"}\nخصم: ${offer.discountPercent ?: 10}%"
            textSize = 14f
            setTextColor(android.graphics.Color.parseColor("#1E293B"))
            setPadding(0, 0, 0, 20)
        }
        container.addView(tvInfo)

        val tvDurationLabel = TextView(context).apply {
            text = "حدد مدة العرض الجديدة بالأيام: *"
            textSize = 13f
            setPadding(0, 8, 0, 4)
        }
        container.addView(tvDurationLabel)

        val durationOptions = listOf("يوم واحد (1 يوم)", "يومان (2 يوم)", "3 أيام", "أسبوع كامل (7 أيام)", "أسبوعان (14 يوماً)", "شهر كامل (30 يوماً)")
        val durationDaysValues = listOf(1, 2, 3, 7, 14, 30)

        val spDuration = Spinner(context).apply {
            adapter = ArrayAdapter(context, android.R.layout.simple_spinner_dropdown_item, durationOptions)
            setSelection(3) // 7 days by default
        }
        container.addView(spDuration)

        AlertDialog.Builder(context)
            .setTitle("🔄 تكرار وتجديد العرض")
            .setView(container)
            .setPositiveButton("تكرار وإرسال للموافقة") { _, _ ->
                val days = durationDaysValues[spDuration.selectedItemPosition]
                repeatOffer(offer.id, days)
            }
            .setNegativeButton("إلغاء", null)
            .show()
    }

    private fun repeatOffer(offerId: Int, durationDays: Int) {
        viewLifecycleOwner.lifecycleScope.launch {
            val res = secretaryRepository.repeatOffer(offerId, durationDays)
            if (res is Resource.Success) {
                Toast.makeText(
                    requireContext(),
                    "تم تكرار العرض بنجاح وإرساله لإدارة المنصة للموافقة عليه ⏳",
                    Toast.LENGTH_LONG
                ).show()
                binding.chipCurrentOffers.isChecked = true
                loadOffers()
            } else {
                Toast.makeText(requireContext(), res.message ?: "فشل تكرار العرض", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun uriToPart(uri: Uri, partName: String): MultipartBody.Part? {
        return try {
            val contentResolver = requireContext().contentResolver
            val inputStream = contentResolver.openInputStream(uri) ?: return null
            val fileBytes = inputStream.readBytes()
            inputStream.close()
            val requestBody = fileBytes.toRequestBody("image/*".toMediaTypeOrNull())
            MultipartBody.Part.createFormData(partName, "offer_img_${System.currentTimeMillis()}.jpg", requestBody)
        } catch (e: Exception) {
            null
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
