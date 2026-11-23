package com.medical.clinic.staff.ui.utils

import android.text.InputFilter
import android.text.Spanned
import android.widget.EditText
import java.util.regex.Pattern

object InputValidationUtils {

    // Regex for Arabic letters (including hamzas, taa marbuta, alif maksura) and spaces only
    private val ARABIC_LETTERS_PATTERN = Pattern.compile("^[\\u0621-\\u064A\\u066E-\\u06D3\\u0671-\\u06D5\\s]*$")

    // Dangerous tokens/patterns for Anti-XSS and Anti-Injection
    private val DANGEROUS_TAGS = Pattern.compile("(?i)<script.*?>.*?</script>|<.*?>|javascript:|alert\\(|onerror=|onload=|eval\\(")

    /**
     * InputFilter that permits ONLY Arabic letters and spaces, up to maxLength (default 25)
     * Strictly disallows English letters, numbers, and symbols.
     */
    class ArabicLettersOnlyFilter(private val maxLength: Int = 25) : InputFilter {
        override fun filter(
            source: CharSequence,
            start: Int,
            end: Int,
            dest: Spanned,
            dstart: Int,
            dend: Int
        ): CharSequence? {
            val keep = maxLength - (dest.length - (dend - dstart))
            if (keep <= 0) return ""

            val subSource = source.subSequence(start, end)
            val filtered = StringBuilder()
            for (i in 0 until subSource.length) {
                val c = subSource[i]
                if (isArabicLetterOrSpace(c)) {
                    filtered.append(c)
                }
            }

            if (filtered.length > keep) {
                return filtered.substring(0, keep)
            }
            if (filtered.length != subSource.length) {
                return filtered.toString()
            }
            return null
        }

        private fun isArabicLetterOrSpace(c: Char): Boolean {
            if (c == ' ') return true
            val code = c.code
            // Exclude Arabic-Indic digits (0660-0669 and 06F0-06F9)
            if (code in 0x0660..0x0669 || code in 0x06F0..0x06F9) return false
            // Arabic alphabet unicode range
            return (code in 0x0621..0x064A || code in 0x0671..0x06D3)
        }
    }

    /**
     * InputFilter that permits ONLY numeric digits 0-9, up to maxLength (default 9)
     * Strictly disallows letters, spaces, and symbols.
     */
    class DigitsOnlyFilter(private val maxLength: Int = 9) : InputFilter {
        override fun filter(
            source: CharSequence,
            start: Int,
            end: Int,
            dest: Spanned,
            dstart: Int,
            dend: Int
        ): CharSequence? {
            val keep = maxLength - (dest.length - (dend - dstart))
            if (keep <= 0) return ""

            val filtered = StringBuilder()
            for (i in start until end) {
                val c = source[i]
                if (c in '0'..'9') {
                    filtered.append(c)
                }
            }

            if (filtered.length > keep) {
                return filtered.substring(0, keep)
            }
            if (filtered.length != (end - start)) {
                return filtered.toString()
            }
            return null
        }
    }

    /**
     * InputFilter for Passwords: max 8 characters, disallows dangerous injection characters (< > " ' ;)
     */
    class PasswordFilter(private val maxLength: Int = 8) : InputFilter {
        override fun filter(
            source: CharSequence,
            start: Int,
            end: Int,
            dest: Spanned,
            dstart: Int,
            dend: Int
        ): CharSequence? {
            val keep = maxLength - (dest.length - (dend - dstart))
            if (keep <= 0) return ""

            val filtered = StringBuilder()
            for (i in start until end) {
                val c = source[i]
                if (c !in listOf('<', '>', '"', '\'', ';', '\\', '`', '{', '}')) {
                    filtered.append(c)
                }
            }

            if (filtered.length > keep) {
                return filtered.substring(0, keep)
            }
            if (filtered.length != (end - start)) {
                return filtered.toString()
            }
            return null
        }
    }

    /**
     * General Safe Text Filter: disallows script tags, HTML tags, and limits length
     */
    class SafeTextFilter(private val maxLength: Int = 100) : InputFilter {
        override fun filter(
            source: CharSequence,
            start: Int,
            end: Int,
            dest: Spanned,
            dstart: Int,
            dend: Int
        ): CharSequence? {
            val keep = maxLength - (dest.length - (dend - dstart))
            if (keep <= 0) return ""

            val filtered = StringBuilder()
            for (i in start until end) {
                val c = source[i]
                if (c !in listOf('<', '>', '`', '{', '}', ';')) {
                    filtered.append(c)
                }
            }

            if (filtered.length > keep) {
                return filtered.substring(0, keep)
            }
            if (filtered.length != (end - start)) {
                return filtered.toString()
            }
            return null
        }
    }

    /**
     * Sanitize any string input to strip HTML, scripts, and SQL injection tokens
     */
    fun sanitize(input: String?): String {
        if (input.isNullOrBlank()) return ""
        var clean = input.trim()
        clean = DANGEROUS_TAGS.matcher(clean).replaceAll("")
        clean = clean.replace(Regex("[<>\"';`\\\\{}]"), "")
        return clean
    }

    fun isStrictlyArabicName(text: String): Boolean {
        val trimmed = text.trim()
        if (trimmed.length < 3 || trimmed.length > 25) return false
        return ARABIC_LETTERS_PATTERN.matcher(trimmed).matches()
    }

    fun isValidPhone(phone: String): Boolean {
        val clean = phone.trim().replace(Regex("^(\\+?967)"), "")
        return Regex("^7[0-9]{8}\$").matches(clean)
    }

    fun isValidPassword(password: String): Boolean {
        val trimmed = password.trim()
        return trimmed.length in 6..8
    }

    fun applyArabicNameRules(editText: EditText, maxLength: Int = 25) {
        editText.filters = arrayOf(ArabicLettersOnlyFilter(maxLength))
    }

    fun applyPhoneRules(editText: EditText, maxLength: Int = 9) {
        editText.filters = arrayOf(DigitsOnlyFilter(maxLength))
    }

    fun applyPasswordRules(editText: EditText, maxLength: Int = 8) {
        editText.filters = arrayOf(PasswordFilter(maxLength))
    }

    fun applySafeTextRules(editText: EditText, maxLength: Int = 100) {
        editText.filters = arrayOf(SafeTextFilter(maxLength))
    }
}
