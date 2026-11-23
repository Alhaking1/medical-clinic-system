# 👥 User Communication & Mobile App Session Recovery

## 1. Overview
Due to the security rotation of the `JWT_SECRET` following the 18-hour exposure window (Option A - Force Re-login), all pre-existing access tokens have been invalidated to guarantee that no forged or compromised session can access patient or clinical data.

---

## 2. Arabic User Notification Copy

### In-App Dialog / Push Notification:
> **العنوان:** 🔐 تحديث أمني هام لنظام الحسابات  
> **الرسالة:**  
> أهلاً بك في منصة العيادات الطبية. حرصاً على أعلى درجات الأمان وحماية خصوصية بياناتك الطبية والشخصية وفق أحدث المعايير الأمنية، تم تحديث بروتوكولات التشفير في المنصة.  
> نرجو تسجيل الدخول مرة أخرى لحسابك لمتابعة مواعيدك وخدماتك بكل يسر وأمان. شكراً لثقتكم بنا!

---

## 3. Recommended Android Implementation Snippet

Add session clearing and automatic redirect in the Android application's `AuthInterceptor.kt`:

```kotlin
if (response.code == 401 && !path.contains("auth/login")) {
    sessionManager.clearSession()
    Handler(Looper.getMainLooper()).post {
        Toast.makeText(context, "انتهت الجلسة لدواعي الأمان، يرجى إعادة تسجيل الدخول", Toast.LENGTH_LONG).show()
        val intent = Intent(context, LoginActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        context.startActivity(intent)
    }
}
```
