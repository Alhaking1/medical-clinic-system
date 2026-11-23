package com.medical.clinic.data.api

import android.util.Log
import com.google.gson.Gson
import com.medical.clinic.data.local.SessionManager
import com.medical.clinic.data.models.RefreshResponse
import com.medical.clinic.utils.Constants
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
 * 🛡️ TokenAuthenticator
 * Automatically intercepts HTTP 401 Unauthorized errors across all requests.
 * Executes a seamless token refresh using the Refresh Token Rotation mechanism.
 * Retries the original failed request with the new access token.
 */
@Singleton
class TokenAuthenticator @Inject constructor(
    private val sessionManager: SessionManager
) : Authenticator {

    companion object {
        private const val TAG = "TokenAuthenticator"
    }

    private val refreshClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()

    @Synchronized
    override fun authenticate(route: Route?, response: Response): Request? {
        val path = response.request.url.encodedPath

        // Do not attempt refresh on auth endpoints to prevent loops
        if (path.contains("auth/refresh-token") ||
            path.contains("auth/login") ||
            path.contains("auth/google") ||
            path.contains("auth/register")
        ) {
            return null
        }

        // Limit retries to 2 attempts max
        if (responseCount(response) >= 2) {
            Log.w(TAG, "Request already failed twice with 401. Giving up.")
            return null
        }

        val currentToken = sessionManager.getToken()
        val requestToken = response.request.header("Authorization")?.removePrefix("Bearer ")?.trim()

        // If another thread already refreshed the token, just retry with the updated token
        if (!currentToken.isNullOrBlank() && currentToken != requestToken) {
            Log.d(TAG, "Token was already refreshed by another concurrent call. Retrying.")
            return response.request.newBuilder()
                .header("Authorization", "Bearer $currentToken")
                .build()
        }

        val refreshToken = sessionManager.getRefreshToken()
        if (refreshToken.isNullOrBlank()) {
            Log.w(TAG, "No refresh token available in session.")
            return null
        }

        Log.d(TAG, "Attempting background token refresh via Refresh Token Rotation...")
        return try {
            val bodyJson = gson.toJson(mapOf("refreshToken" to refreshToken))
            val mediaType = "application/json; charset=utf-8".toMediaType()
            val refreshRequest = Request.Builder()
                .url("${Constants.BASE_URL_EMULATOR}auth/refresh-token")
                .post(bodyJson.toRequestBody(mediaType))
                .build()

            val refreshResponse = refreshClient.newCall(refreshRequest).execute()
            if (refreshResponse.isSuccessful) {
                val respStr = refreshResponse.body?.string() ?: ""
                val refreshData = gson.fromJson(respStr, RefreshResponse::class.java)
                if (refreshData?.success == true && !refreshData.token.isNullOrBlank()) {
                    Log.i(TAG, "✅ Token refreshed successfully in background!")
                    sessionManager.saveToken(refreshData.token)
                    if (!refreshData.refreshToken.isNullOrBlank()) {
                        sessionManager.saveRefreshToken(refreshData.refreshToken)
                    }

                    // Retry original request with the fresh Access Token
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
            Log.e(TAG, "Exception during token refresh: ${e.message}")
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
