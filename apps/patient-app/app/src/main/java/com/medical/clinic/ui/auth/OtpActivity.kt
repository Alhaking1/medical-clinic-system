package com.medical.clinic.ui.auth

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.medical.clinic.R
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class OtpActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_otp)
    }
}
