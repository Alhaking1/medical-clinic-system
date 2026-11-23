package com.medical.clinic.staff.ui.utils

import java.util.regex.Pattern

/**
 * 🛡️ ChatFilterUtils (Staff App)
 * محرك الفحص والفلترة الصارم لرسائل الدردشة داخل تطبيق الكادر الطبي (منع الأرقام والأعداد والحيل بنسبة 100%)
 */
object ChatFilterUtils {

    // 1. فحص الأرقام الرقمية (إنجليزية وعربية وأوردية)
    private val DIGITS_PATTERN = Pattern.compile("[0-9\\u0660-\\u0669\\u06F0-\\u06F9]")

    // 2. قاموس الأعداد باللغة العربية
    private val ARABIC_NUMBER_WORDS = setOf(
        "صفر",
        "واحد", "واحده", "وحده", "وحيد",
        "اثنان", "اثنين", "اثنتان", "اثنتين", "ثنتين",
        "ثلاثة", "ثلاثه", "ثلاث",
        "اربعة", "اربعه", "اربع",
        "خمسة", "خمسه", "خمس",
        "ستة", "سته", "ست",
        "سبعة", "سبعه", "سبع",
        "ثمانية", "ثمانيه", "ثماني", "ثمان",
        "تسعة", "تسعه", "تسع",
        "عشرة", "عشره", "عشر",
        "عشرون", "عشرين",
        "ثلاثون", "ثلاثين",
        "اربعون", "اربعين",
        "خمسون", "خمسين",
        "ستون", "ستين",
        "سبعون", "سبعين",
        "ثمانون", "ثمانين",
        "تسعون", "تسعين",
        "مائة", "مائه", "مئة", "مئه", "مئتان", "مئتين",
        "ثلاثمائة", "ثلاثمائه", "اربعمائة", "اربعمائه",
        "خمسمائة", "خمسمائه", "ستمائة", "ستمائه",
        "سبعمائة", "سبعمائه", "ثمانمائة", "ثمانمائه",
        "تسعمائة", "تسعمائه",
        "الف", "الفان", "الفين", "الاف",
        "مليون", "ملايين", "مليار", "مليارات"
    )

    // 3. قاموس الأعداد باللغة الإنجليزية
    private val ENGLISH_NUMBER_WORDS = setOf(
        "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
        "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
        "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
        "hundred", "thousand", "million", "billion",
        "zeros", "ones", "twos", "threes", "fours", "fives", "sixes", "sevens", "eights", "nines", "tens",
        "twenties", "thirties", "forties", "fifties", "sixties", "seventies", "eighties", "nineties",
        "hundreds", "thousands", "millions", "billions"
    )

    // 4. كلمات التواصل الخارجي
    private val CONTACT_KEYWORDS = listOf(
        "whatsapp", "whats app", "what's app", "telegram", "call me", "phone number", "mobile number", "my number",
        "واتساب", "واتس اب", "واتس", "تليجرام", "تلغرام", "اتصل بي", "رقمي", "رقم هاتفي", "رقم جوالي", "فون"
    )

    data class FilterResult(
        val isValid: Boolean,
        val reason: String?,
        val detectedWords: List<String>
    )

    fun validateMessage(text: String?): FilterResult {
        if (text.isNullOrBlank()) {
            return FilterResult(false, "الرسالة فارغة", emptyList())
        }

        // 1. فحص الأرقام الرقمية
        if (DIGITS_PATTERN.matcher(text).find()) {
            return FilterResult(
                isValid = false,
                reason = "يُمنع استخدام الأرقام الرقمية في الرسائل",
                detectedWords = listOf("أرقام")
            )
        }

        val lower = text.lowercase()

        // 2. فحص وسائل التواصل
        val detectedContact = mutableListOf<String>()
        for (kw in CONTACT_KEYWORDS) {
            if (lower.contains(kw)) {
                detectedContact.add(kw)
            }
        }
        if (detectedContact.isNotEmpty()) {
            return FilterResult(
                isValid = false,
                reason = "يُمنع مشاركة وسائل وتطبيقات التواصل الخارجي",
                detectedWords = detectedContact
            )
        }

        // 3. فحص الأعداد بالإنجليزية
        val detectedEnglish = mutableListOf<String>()
        val englishTokens = lower.split(Regex("[^a-z0-9]+"))
        for (token in englishTokens) {
            if (token.isNotEmpty() && ENGLISH_NUMBER_WORDS.contains(token)) {
                detectedEnglish.add(token)
            }
        }

        // فحص الحروف الإنجليزية المقطعة (مثل s e v e n)
        val engSpacedRegex = Regex("(?:(?<=^|\\s)[a-z]\\s+){2,}[a-z](?=\\s|$)")
        val engSpacedMatches = engSpacedRegex.findAll(lower)
        for (m in engSpacedMatches) {
            val combined = m.value.replace(Regex("\\s+"), "")
            if (ENGLISH_NUMBER_WORDS.contains(combined)) {
                detectedEnglish.add(m.value.trim())
            }
        }

        if (detectedEnglish.isNotEmpty()) {
            return FilterResult(
                isValid = false,
                reason = "يُمنع كتابة الأعداد بالحروف الإنجليزية",
                detectedWords = detectedEnglish
            )
        }

        // 4. فحص الأعداد بالعربية
        val detectedArabic = mutableListOf<String>()
        val normalized = normalizeArabic(text)
        val arabicTokens = normalized.split(Regex("[^\\u0621-\\u064A]+"))

        val prefixes = listOf("وال", "بال", "فال", "كال", "لل", "ولل", "وب", "وف", "وك", "ال", "و", "ف", "ب", "ل", "ك")
        for (token in arabicTokens) {
            if (token.isBlank()) continue
            if (ARABIC_NUMBER_WORDS.contains(token)) {
                detectedArabic.add(token)
                continue
            }
            for (prefix in prefixes) {
                if (token.startsWith(prefix) && token.length > prefix.length + 2) {
                    val stripped = token.substring(prefix.length)
                    if (ARABIC_NUMBER_WORDS.contains(stripped)) {
                        detectedArabic.add(token)
                        break
                    }
                }
            }
        }

        // فحص الحروف العربية المقطعة (مثل س ب ع ه)
        val arSpacedRegex = Regex("(?:(?<=^|\\s)[\\u0621-\\u064A]\\s+){2,}[\\u0621-\\u064A](?=\\s|$)")
        val arSpacedMatches = arSpacedRegex.findAll(normalized)
        for (m in arSpacedMatches) {
            val combined = m.value.replace(Regex("\\s+"), "")
            if (ARABIC_NUMBER_WORDS.contains(combined)) {
                detectedArabic.add(m.value.trim())
            }
        }

        if (detectedArabic.isNotEmpty()) {
            return FilterResult(
                isValid = false,
                reason = "يُمنع كتابة الأعداد بالحروف العربية في المحادثة",
                detectedWords = detectedArabic.distinct()
            )
        }

        // ✅ سليمة وخالية من الأرقام
        return FilterResult(true, null, emptyList())
    }

    private fun normalizeArabic(text: String): String {
        return text
            .replace(Regex("[\\u064B-\\u065F\\u0670]"), "") // تشكيل
            .replace("\\u0640", "") // تطويل
            .replace(Regex("[أإآٱ]"), "ا")
            .replace("ة", "ه")
            .replace("ى", "ي")
            .trim()
    }
}
