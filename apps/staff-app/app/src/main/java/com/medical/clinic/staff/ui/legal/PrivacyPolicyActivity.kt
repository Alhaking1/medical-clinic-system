package com.medical.clinic.staff.ui.legal

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.medical.clinic.staff.databinding.ActivityPrivacyPolicyBinding

class PrivacyPolicyActivity : AppCompatActivity() {

    private lateinit var binding: ActivityPrivacyPolicyBinding

    companion object {
        const val PRIVACY_URL = "https://medical-booking-backend-production.up.railway.app/privacy"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPrivacyPolicyBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnBackPrivacy.setOnClickListener {
            finish()
        }

        binding.btnOpenWebPrivacy.setOnClickListener {
            try {
                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(PRIVACY_URL))
                startActivity(browserIntent)
            } catch (e: Exception) {
                Toast.makeText(this, "تعذر فتح المتصفح: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
