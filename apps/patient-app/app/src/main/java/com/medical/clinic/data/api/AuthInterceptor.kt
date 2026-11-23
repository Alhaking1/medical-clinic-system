package com.medical.clinic.data.api

import com.medical.clinic.data.local.SessionManager
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * يُضيف JWT تلقائياً لكل طلب
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val sessionManager: SessionManager
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        // إذا كان الطلب لا يحتاج توكن (login, register)
        val path = originalRequest.url.encodedPath
        if (path.contains("auth/login") ||
            path.contains("auth/register") ||
            path.contains("auth/google") ||
            path.contains("health")
        ) {
            return chain.proceed(originalRequest)
        }

        // إضافة التوكن
        val token = sessionManager.getToken()
        val newRequest = if (!token.isNullOrBlank()) {
            originalRequest.newBuilder()
                .header("Authorization", "Bearer $token")
                .header("Accept", "application/json")
                .header("Content-Type", "application/json; charset=utf-8")
                .build()
        } else {
            originalRequest.newBuilder()
                .header("Accept", "application/json")
                .header("Content-Type", "application/json; charset=utf-8")
                .build()
        }

        return chain.proceed(newRequest)
    }
}
