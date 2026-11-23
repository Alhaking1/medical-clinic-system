package com.medical.clinic.staff.data.api

import android.util.Log
import com.google.gson.Gson
import com.medical.clinic.staff.data.local.SessionManager
import com.medical.clinic.staff.data.models.RefreshResponse
import okhttp3.Authenticator
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 🛡️ TokenAuthenticator (Staff App)
 * Intercepts HTTP 401 Unauthorized errors and transparently performs
 * Refresh Token Rotation (RTR) to keep the staff user session active.
 */
@Singleton
class TokenAuthenticator @Inject constructor(
    private val sessionManager: SessionManager,
    private val gson: Gson
) : Authenticator {

    companion object {
        private const val TAG = "StaffTokenAuth"
        private const val BASE_URL = "https://medical-booking-backend-production.up.railway.app/api/v1/"
    }

    private val refreshClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    @Synchronized
    override fun authenticate(route: Route?, response: Response): Request? {
        val path = response.request.url.encodedPath

        if (path.contains("auth/refresh-token") ||
            path.contains("auth/login") ||
            path.contains("auth/verify-otp") ||
            path.contains("auth/google")
        ) {
            return null
        }

        if (responseCount(response) >= 2) {
            Log.w(TAG, "Request already failed twice with 401. Giving up.")
            return null
        }

        val currentToken = sessionManager.getToken()
        val requestToken = response.request.header("Authorization")?.removePrefix("Bearer ")?.trim()

        if (!currentToken.isNullOrBlank() && currentToken != requestToken) {
            Log.d(TAG, "Token already refreshed by another concurrent thread. Retrying.")
            return response.request.newBuilder()
                .header("Authorization", "Bearer $currentToken")
                .build()
        }

        val refreshToken = sessionManager.getRefreshToken()
        if (refreshToken.isNullOrBlank()) {
            Log.w(TAG, "No refresh token stored in staff session.")
            return null
        }

        Log.d(TAG, "Attempting background refresh for staff session...")
        return try {
            val bodyJson = gson.toJson(mapOf("refreshToken" to refreshToken))
            val mediaType = "application/json; charset=utf-8".toMediaType()
            val refreshRequest = Request.Builder()
                .url("${BASE_URL}auth/refresh-token")
                .post(bodyJson.toRequestBody(mediaType))
                .build()

            val refreshResponse = refreshClient.newCall(refreshRequest).execute()
            if (refreshResponse.isSuccessful) {
                val respStr = refreshResponse.body?.string() ?: ""
                val refreshData = gson.fromJson(respStr, RefreshResponse::class.java)
                if (refreshData?.success == true && !refreshData.token.isNullOrBlank()) {
                    Log.i(TAG, "✅ Staff token refreshed successfully in background!")
                    sessionManager.saveToken(refreshData.token)
                    if (!refreshData.refreshToken.isNullOrBlank()) {
                        sessionManager.saveRefreshToken(refreshData.refreshToken)
                    }
                    response.request.newBuilder()
                        .header("Authorization", "Bearer ${refreshData.token}")
                        .build()
                } else {
                    Log.w(TAG, "Token refresh response unsuccessful: ${refreshData?.message}")
                    null
                }
            } else {
                Log.w(TAG, "Token refresh HTTP error: ${refreshResponse.code}")
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception during staff token refresh: ${e.message}")
            null
        }
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}
