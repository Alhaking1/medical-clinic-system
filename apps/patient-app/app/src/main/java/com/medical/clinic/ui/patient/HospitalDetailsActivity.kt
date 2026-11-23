package com.medical.clinic.ui.patient

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.R
import com.medical.clinic.data.api.ApiClient
import com.medical.clinic.data.models.Clinic
import com.medical.clinic.data.models.DoctorItem
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class HospitalDetailsActivity : AppCompatActivity() {

    @Inject
    lateinit var apiClient: ApiClient

    private lateinit var rvDoctors: RecyclerView
    private lateinit var doctorsAdapter: DoctorsAdapter

    private var hospital: Clinic? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_hospital_details)

        hospital = intent.getSerializableExtra("hospital") as? Clinic

        val toolbar = findViewById<Toolbar>(R.id.toolbarHospital)
        setSupportActionBar(toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        toolbar.setNavigationOnClickListener { finish() }

        val tvTitle = findViewById<TextView>(R.id.tvHospitalTitle)
        val tvLocation = findViewById<TextView>(R.id.tvHospitalLocation)
        val tvStatus = findViewById<TextView>(R.id.tvHospitalDetailStatus)
        val tvHours = findViewById<TextView>(R.id.tvHospitalDetailHours)
        val btnCall = findViewById<Button>(R.id.btnCallHospital)
        val btnMap = findViewById<Button>(R.id.btnMapHospital)
        rvDoctors = findViewById(R.id.rvHospitalDoctors)

        tvTitle.text = hospital?.name ?: "المستشفى"
        tvLocation.text = listOfNotNull(hospital?.governorate, hospital?.address).joinToString(" - ")

        val isOpen = hospital?.isOpen ?: true
        tvStatus.text = hospital?.statusLabel ?: if (isOpen) "🟢 مفتوح الآن" else "🔴 مغلق حالياً"
        tvStatus.setTextColor(if (isOpen) 0xFF059669.toInt() else 0xFFDC2626.toInt())

        val hoursDisplay = hospital?.workingHoursDisplay
        if (!hoursDisplay.isNullOrBlank()) {
            tvHours.text = hoursDisplay
            tvHours.visibility = View.VISIBLE
        } else {
            tvHours.visibility = View.GONE
        }

        btnCall.setOnClickListener {
            val hospName = hospital?.name ?: "المستشفى"
            val waUri = Uri.parse("https://wa.me/967781238648?text=" + Uri.encode("مرحباً خدمة عملاء طبيبك، أحتاج استفسار بخصوص الحجز في $hospName"))
            try {
                startActivity(Intent(Intent.ACTION_VIEW, waUri))
            } catch (e: Exception) {
                android.widget.Toast.makeText(this, "خدمة العملاء: 781238648", android.widget.Toast.LENGTH_LONG).show()
            }
        }

        btnMap.setOnClickListener {
            val query = hospital?.name ?: "مستشفى في اليمن"
            val mapsUri = Uri.parse("geo:0,0?q=" + Uri.encode(query))
            try {
                val mapIntent = Intent(Intent.ACTION_VIEW, mapsUri)
                startActivity(mapIntent)
            } catch (e: Exception) {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/search/?api=1&query=" + Uri.encode(query))))
            }
        }

        setupRecyclerView()
        loadHospitalDoctors()
    }

    private fun setupRecyclerView() {
        doctorsAdapter = DoctorsAdapter(emptyList(),
            onDoctorClick = { doc -> openDoctorBooking(doc) },
            onBookClick = { doc -> openDoctorBooking(doc) }
        )
        rvDoctors.layoutManager = LinearLayoutManager(this)
        rvDoctors.adapter = doctorsAdapter
    }

    private fun loadHospitalDoctors() {
        lifecycleScope.launch {
            try {
                val res = apiClient.apiService.getDoctors(clinic = hospital?.name)
                if (res.success && res.data != null) {
                    val activeDocs = res.data.filter { (it.isActive ?: 1) == 1 && (it.status ?: "approved") == "approved" }
                    doctorsAdapter.updateData(activeDocs)
                } else {
                    fallbackDoctors()
                }
            } catch (e: Exception) {
                fallbackDoctors()
            }
        }
    }

    private fun fallbackDoctors() {
        val hName = hospital?.name ?: "مستشفى الأمل"
        val sample = listOf(
            DoctorItem(1, "أحمد خالد", "استشاري طب وجراحة العيون", hName, "صنعاء", "حدة", null, "استشاري طب وجراحة العيون", 12, 5000, 20, 4.9f, 8),
            DoctorItem(4, "محمد اليريمي", "أخصائي جراحة المسالك البولية", hName, "صنعاء", "حدة", null, "أخصائي جراحة المسالك البولية", 10, 4500, 20, 4.8f, 6)
        )
        doctorsAdapter.updateData(sample)
    }

    private fun openDoctorBooking(doc: DoctorItem) {
        val intent = Intent(this, DoctorDetailsActivity::class.java)
        intent.putExtra("doctor", doc)
        startActivity(intent)
    }
}
