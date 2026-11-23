package com.medical.clinic.staff.data.utils

object Constants {
    const val ROLE_DOCTOR = "doctor"
    const val ROLE_SECRETARY = "secretary"

    const val STATUS_APPROVED = "approved"
    const val STATUS_PENDING = "pending"
    const val STATUS_REJECTED = "rejected"

    const val QUEUE_WAITING = "waiting"
    const val QUEUE_IN_PROGRESS = "in_progress"
    const val QUEUE_DONE = "done"
    const val QUEUE_CANCELLED = "cancelled"
    const val QUEUE_NO_SHOW = "no_show"

    const val PREF_TOKEN = "jwt_token"
    const val PREF_USER = "current_user"
    const val PREF_ROLE = "user_role"

    const val GOOGLE_WEB_CLIENT_ID = "399127188969-459at9sedg9ech13b45m3cm2ok6oh2ra.apps.googleusercontent.com"

    const val EXTRA_ROLE = "extra_role"
    const val EXTRA_PHONE = "extra_phone"
    const val EXTRA_USER_NAME = "extra_user_name"
    const val EXTRA_DOCTOR_ID = "extra_doctor_id"

    val MEDICAL_SPECIALTIES = listOf(
        "طب عام",
        "أمراض باطنية",
        "جراحة عامة",
        "طب الأطفال وحديثي الولادة",
        "نساء وتوليد وعقم",
        "جراحة العظام والمفاصل",
        "أمراض القلب والأوعية الدموية",
        "طب وجراحة العيون",
        "أنف وأذن وحنجرة",
        "أمراض وجراحة المسالك البولية",
        "أمراض الجلدية والتناسلية والتجميل",
        "طب وجراحة الفم والأسنان",
        "أمراض المخ والأعصاب",
        "جراحة المخ والأعصاب والعمود الفقري",
        "أمراض الجهاز الهضمي والكبد والمناظير",
        "أمراض الصدر والحساسية",
        "أمراض الكلى والغسيل الكلوي",
        "الطب النفسي وعلاج الإدمان",
        "علاج طبيعي وتأهيل حركي",
        "أشعة تشخيصية وتصوير طبي",
        "تخدير وعناية مركزة",
        "أورام وعلاج إشعاعي",
        "جراحة تجميل وترميم",
        "جراحة الأوعية الدموية",
        "طب الطوارئ والحوادث"
    )

    val YEMEN_GOVERNORATES = listOf(
        "صنعاء",
        "عدن",
        "تعز",
        "إب",
        "الحديدة",
        "ذمار",
        "حضرموت",
        "مأرب",
        "حجة",
        "عمران",
        "صعدة",
        "أبين",
        "لحج",
        "شبوة",
        "البيضاء",
        "الضالع",
        "المهرة",
        "سقطرى",
        "الجوف",
        "ريمة",
        "المحويت"
    )
}
