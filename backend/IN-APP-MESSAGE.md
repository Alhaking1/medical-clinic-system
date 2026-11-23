# 📢 إشعار أمني هام للمستخدمين (Security & Session Update)

## 1. الرسالة الموجهة للمستخدمين داخل التطبيق (In-App Notification / Dialog)

**العنوان:**  
🔐 **تحديث أمني شامل لحماية بياناتك**

**نص الرسالة:**  
> مرحباً بك! حرصاً منا على أعلى معايير الأمان وحماية خصوصية بياناتك الطبية والشخصية وفق المعايير الدولية، تم إجراء ترقية أمنية هامة للمنصة.  
> لقد انتهت جلستك الحالية لضمان سلامة حسابك. يرجى تسجيل الدخول مجدداً للمتابعة والاستفادة من خدمات العيادة بكل سهولة وأمان.

**زر الإجراء:**  
[تسجيل الدخول الآن]

---

## 2. كود معالجة انتهاء الجلسة في تطبيقات الأندرويد (Patient & Staff Apps)

لتوجيه المستخدم تلقائياً إلى شاشة الدخول مع إشعار ودي عند استلام رمز `401 Unauthorized` بدلاً من حدوث أخطاء غير مفهومة، نقوم بتحديث الـ `AuthInterceptor`:

```kotlin
// In AuthInterceptor.kt
package com.medical.clinic.data.api

import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import com.medical.clinic.data.local.SessionManager
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthInterceptor @Inject constructor(
    private val sessionManager: SessionManager,
    private val context: Context
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val path = originalRequest.url.encodedPath

        val token = sessionManager.getToken()
        val requestBuilder = originalRequest.newBuilder()
            .header("Accept", "application/json")
            .header("Content-Type", "application/json; charset=utf-8")

        if (!token.isNullOrBlank() && !path.contains("auth/login")) {
            requestBuilder.header("Authorization", "Bearer $token")
        }

        val response = chain.proceed(requestBuilder.build())

        // 🚨 عند انتهاء صلاحية الجلسة أو تدوير مفاتيح الأمان
        if (response.code == 401 && !path.contains("auth/login")) {
            sessionManager.clearSession()

            Handler(Looper.getMainLooper()).post {
                Toast.makeText(
                    context,
                    "انتهت الجلسة لدواعي الأمان، يرجى تسجيل الدخول مجدداً",
                    Toast.LENGTH_LONG
                ).show()
                
                // إعادة التوجيه إلى شاشة تسجيل الدخول
                val intent = Intent(context, com.medical.clinic.ui.auth.LoginActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                }
                context.startActivity(intent)
            }
        }

        return response
    }
}
```

---

## 3. معلومات الدعم الفني والمساعدة (Contact Support)
- **البريد الإلكتروني:** support@tabeebak.app
- **مركز المساعدة:** داخل التطبيق -> الإعدادات -> اتصل بنا / الدعم الفني
- **الاستجابة:** على مدار 24 ساعة للإجابة على أي استفسارات تخص تسجيل الدخول أو استعادة الحساب.
