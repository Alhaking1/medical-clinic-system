package com.medical.clinic.ui.patient

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.medical.clinic.R
import com.medical.clinic.data.api.ApiClient
import com.medical.clinic.data.models.DoctorItem
import com.medical.clinic.data.models.OfferItem
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class OffersActivity : AppCompatActivity() {

    @Inject
    lateinit var apiClient: ApiClient

    private lateinit var rvOffers: RecyclerView
    private lateinit var pbOffers: ProgressBar
    private lateinit var tvEmpty: TextView
    private var swipeRefresh: androidx.swiperefreshlayout.widget.SwipeRefreshLayout? = null
    private var layoutEmpty: View? = null
    private lateinit var adapter: OffersAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_offers)

        val toolbar = findViewById<Toolbar>(R.id.toolbarOffers)
        setSupportActionBar(toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        toolbar.setNavigationOnClickListener { finish() }

        rvOffers = findViewById(R.id.rvOffers)
        pbOffers = findViewById(R.id.pbOffers)
        tvEmpty = findViewById(R.id.tvEmptyOffers)
        layoutEmpty = findViewById(R.id.layoutEmptyOffers)
        swipeRefresh = findViewById(R.id.swipeRefreshOffers)
        swipeRefresh?.setColorSchemeResources(R.color.brand_primary)
        swipeRefresh?.setOnRefreshListener { loadOffers() }
        findViewById<View>(R.id.btnRefreshOffers)?.setOnClickListener { loadOffers() }

        adapter = OffersAdapter(emptyList()) { offer ->
            onOfferSelected(offer)
        }
        rvOffers.layoutManager = LinearLayoutManager(this)
        rvOffers.adapter = adapter

        loadOffers()
    }

    private fun loadOffers() {
        pbOffers.visibility = View.VISIBLE
        tvEmpty.visibility = View.GONE; layoutEmpty?.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val res = apiClient.apiService.getOffers()
                pbOffers.visibility = View.GONE; swipeRefresh?.isRefreshing = false
                if (res.success && !res.data.isNullOrEmpty()) {
                    adapter.updateData(res.data)
                    tvEmpty.visibility = View.GONE; layoutEmpty?.visibility = View.GONE
                } else {
                    adapter.updateData(emptyList())
                    tvEmpty.visibility = View.VISIBLE; layoutEmpty?.visibility = View.VISIBLE
                }
            } catch (e: Exception) {
                pbOffers.visibility = View.GONE; swipeRefresh?.isRefreshing = false
                adapter.updateData(emptyList())
                tvEmpty.visibility = View.VISIBLE; layoutEmpty?.visibility = View.VISIBLE
            }
        }
    }

    private fun onOfferSelected(offer: OfferItem) {
        val docItem = DoctorItem(
            id = offer.doctorId ?: 1,
            fullName = offer.doctorName ?: "طبيب معتمد",
            specialty = offer.doctorSpecialty ?: "استشاري",
            clinicName = offer.clinicName ?: "العيادة الطبية",
            consultationFee = offer.originalPrice ?: offer.discountedPrice ?: 5000,
            bio = offer.description,
            hasActiveOffer = true,
            offerTitle = offer.title,
            offerDiscountPercent = offer.discountPercent ?: 0,
            discountedFee = offer.discountedPrice
        )
        val intent = Intent(this, DoctorDetailsActivity::class.java)
        intent.putExtra("doctor", docItem)
        startActivity(intent)
    }
}
