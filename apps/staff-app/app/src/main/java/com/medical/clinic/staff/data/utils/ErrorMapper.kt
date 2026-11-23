package com.medical.clinic.staff.data.utils

import java.net.ConnectException
import java.net.NoRouteToHostException
import java.net.SocketException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.net.ssl.SSLException

/**
 * ErrorMapper — تحويل رسائل الأخطاء التقنية والشبكية إلى رسائل عربية واضحة ومفهومة للمستخدم
 */
object ErrorMapper {

    /**
     * تحويل Exception إلى رسالة عربية سهلة وواضحة
     */
    fun fromException(e: Throwable?): String {
        if (e == null) return "حدث خطأ غير معروف"

        return when (e) {
            is UnknownHostException -> "لا يتوفر اتصال بالإنترنت، يرجى التحقق من اتصال الشبكة 📡"
            is ConnectException -> "تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً 🔌"
            is SocketTimeoutException -> "انتهت مهلة الاتصال بالخادم، يرجى المحاولة مرة أخرى ⏱️"
            is NoRouteToHostException -> "لا يمكن الوصول إلى الخادم، تحقق من الاتصال بالإنترنت 📡"
            is SocketException -> "انقطع الاتصال بالشبكة، يرجى المحاولة مرة أخرى 📵"
            is SSLException -> "حدث خطأ في الاتصال الآمن مع الخادم 🔒"
            else -> fromString(e.message)
        }
    }

    /**
     * تحويل نص الخطأ إلى رسالة عربية واضحة
     */
    fun fromString(error: String?): String {
        if (error.isNullOrBlank()) {
            return "حدث خطأ غير معروف، يرجى المحاولة مرة أخرى"
        }

        val lower = error.lowercase()

        return when {
            // ═══════════════════════════════════════════
            // أخطاء الشبكة والاتصال بالإنترنت
            // ═══════════════════════════════════════════
            lower.contains("unable to resolve host") ||
            lower.contains("no address associated with hostname") ||
            lower.contains("unknownhost") ||
            lower.contains("network is unreachable") ||
            lower.contains("no route to host") ->
                "لا يتوفر اتصال بالإنترنت، يرجى التحقق من اتصال الشبكة 📡"

            lower.contains("failed to connect") ||
            lower.contains("connection refused") ||
            lower.contains("econnrefused") ->
                "تعذر الاتصال بالخادم حالياً، يرجى المحاولة لاحقاً 🔌"

            lower.contains("timeout") ||
            lower.contains("timed out") ||
            lower.contains("etimedout") ->
                "انتهت مهلة الاتصال بالخادم، يرجى المحاولة مرة أخرى ⏱️"

            lower.contains("software caused connection abort") ||
            lower.contains("connection reset") ||
            lower.contains("unexpected end of stream") ||
            lower.contains("broken pipe") ->
                "انقطع الاتصال بالشبكة، يرجى إعادة المحاولة 📵"

            lower.contains("ssl") ||
            lower.contains("certpath") ||
            lower.contains("certificate") ->
                "حدث خطأ في أمان الاتصال مع الخادم 🔒"

            // ═══════════════════════════════════════════
            // رموز استجابة HTTP
            // ═══════════════════════════════════════════
            lower.contains("401") || lower.contains("unauthorized") ->
                "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً 🔐"

            lower.contains("403") || lower.contains("forbidden") ->
                "ليس لديك صلاحية لتنفيذ هذا الإجراء 🚫"

            lower.contains("404") || lower.contains("not found") ->
                "البيانات المطلوبة غير موجودة أو المسار غير متاح 🔍"

            lower.contains("500") || lower.contains("internal server error") ->
                "حدث خطأ في الخادم، جاري معالجة الأمر حاول لاحقاً ⚠️"

            lower.contains("502") || lower.contains("bad gateway") ->
                "الخادم غير متاح حالياً، جاري إعادة التشغيل ⚠️"

            lower.contains("503") || lower.contains("service unavailable") ->
                "الخادم تحت الصيانة المؤقتة، يرجى المحاولة بعد قليل 🛠️"

            else -> error
        }
    }

    /**
     * فحص هل الخطأ شبكي
     */
    fun isNetworkError(e: Throwable?): Boolean {
        return e is UnknownHostException
            || e is ConnectException
            || e is SocketTimeoutException
            || e is NoRouteToHostException
            || e is SocketException
    }
}
