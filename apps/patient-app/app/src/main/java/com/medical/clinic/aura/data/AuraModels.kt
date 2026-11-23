package com.medical.clinic.aura.data

import androidx.compose.ui.graphics.Color
import com.medical.clinic.data.models.DoctorItem

/** Presentation models for the AURA experience. */
data class AuraDoctor(
    val id: Int,
    val name: String,
    val specialty: String,
    val clinic: String,
    val city: String,
    val rating: Float,
    val reviews: Int,
    val fee: Int,
    val experience: Int,
    val bio: String,
    val nextSlot: String,
    val isOnline: Boolean = true,
    val gradient: List<Color>
) {
    val initial: String get() = name.replace("د. ", "").trim().firstOrNull()?.toString() ?: "ط"
    val firstName: String get() = name.replace("د. ", "").trim().split(" ").firstOrNull() ?: name

    fun toLegacyDoctor(): DoctorItem = DoctorItem(
        id = id,
        fullName = name.replace("د. ", ""),
        specialty = specialty,
        clinicName = clinic,
        governorate = city,
        address = clinic,
        avatar = null,
        bio = bio,
        experienceYears = experience,
        consultationFee = fee,
        slotDuration = 20,
        rating = rating,
        availableSeats = 8,
        isActive = 1,
        status = "approved",
        clinicIsOpen = true,
        clinicStatusLabel = "مفتوح الآن",
        clinicWorkingHours = "٤ م — ١٠ م"
    )
}

data class AuraOffer(
    val id: Int,
    val eyebrow: String,
    val title: String,
    val subtitle: String,
    val badge: String,
    val colors: List<Color>,
    val glyphTag: String
)

data class AuraAppointment(
    val id: Int,
    val doctorName: String,
    val specialty: String,
    val clinic: String,
    val dayLabel: String,
    val dateLabel: String,
    val time: String,
    val status: String,
    val statusColor: Color,
    val queueNumber: Int,
    val fee: Int,
    val minutesFromNow: Int,
    val upcoming: Boolean = true
)

object AuraDemoData {

    val doctors = listOf(
        AuraDoctor(
            id = 1,
            name = "د. خالد المقطري",
            specialty = "أمراض القلب",
            clinic = "مركز النبض التخصصي",
            city = "صنعاء",
            rating = 4.9f,
            reviews = 328,
            fee = 4500,
            experience = 12,
            bio = "استشاري أمراض القلب والأوعية الدموية، خبرة واسعة في القسطرة التشخيصية والعلاجية ومتابعة ضغط الدم.",
            nextSlot = "اليوم · ٤:٣٠ م",
            gradient = listOf(Color(0xFF00BFA5), Color(0xFF0D47A1))
        ),
        AuraDoctor(
            id = 2,
            name = "د. سارة العزي",
            specialty = "الجلدية والتجميل",
            clinic = "عيادة لومينا للجلد",
            city = "صنعاء",
            rating = 4.8f,
            reviews = 214,
            fee = 5000,
            experience = 9,
            bio = "متخصصة في الأمراض الجلدية والعلاج بالليزر، تصميم خطوط العلاج التجميلي الطبيعي.",
            nextSlot = "غداً · ١٠:٠٠ ص",
            gradient = listOf(Color(0xFFB388FF), Color(0xFF6A1B9A))
        ),
        AuraDoctor(
            id = 3,
            name = "د. أحمد الشامي",
            specialty = "جراحة العظام",
            clinic = "مستشفى الأمل التخصصي",
            city = "عدن",
            rating = 4.7f,
            reviews = 189,
            fee = 6000,
            experience = 15,
            bio = "جراح عظام ومفاصل، متخصص في جراحات المناظير وإعادة تأهيل الإصابات الرياضية.",
            nextSlot = "اليوم · ٧:٠٠ م",
            gradient = listOf(Color(0xFF2EE6C8), Color(0xFF00695C))
        ),
        AuraDoctor(
            id = 4,
            name = "د. ليلى الحكيمي",
            specialty = "طب الأطفال",
            clinic = "مركز البراعم",
            city = "تعز",
            rating = 5.0f,
            reviews = 412,
            fee = 3500,
            experience = 11,
            bio = "طبيبة أطفال، عناية بحديثي الولادة ومتابعة النمو والتغذية والتحصينات.",
            nextSlot = "اليوم · ٥:١٥ م",
            isOnline = false,
            gradient = listOf(Color(0xFFFFD166), Color(0xFFFF8A65))
        ),
        AuraDoctor(
            id = 5,
            name = "د. يوسف الصبري",
            specialty = "الباطنية والهضمية",
            clinic = "عيادات السكينة",
            city = "إب",
            rating = 4.6f,
            reviews = 156,
            fee = 4000,
            experience = 8,
            bio = "استشاري باطنية وجهاز هضمي، تشخيص مناظيري ومتابعة الأمراض المزمنة.",
            nextSlot = "الأحد · ٩:٣٠ ص",
            gradient = listOf(Color(0xFF7C4DFF), Color(0xFF00B8D4))
        )
    )

    val offers = listOf(
        AuraOffer(
            id = 1,
            eyebrow = "AURA CARE",
            title = "فحص القلب الشامل",
            subtitle = "تخطيط قلب + استشارة + تقرير رقمي",
            badge = "خصم ٢٥٪",
            colors = listOf(Color(0xFF00E5C3), Color(0xFF00695C), Color(0xFF6A1B9A)),
            glyphTag = "نبضك يستحق الأفضل"
        ),
        AuraOffer(
            id = 2,
            eyebrow = "SMILE LAB",
            title = "ابتسامة هوليوود",
            subtitle = "تبييض بالليزر وجلسة تصميم رقمي",
            badge = "هدية مجانية",
            colors = listOf(Color(0xFFB388FF), Color(0xFF4A148C), Color(0xFF00695C)),
            glyphTag = "تصميم ابتسامة ثلاثي الأبعاد"
        ),
        AuraOffer(
            id = 3,
            eyebrow = "FAMILY HEALTH",
            title = "باقة العائلة",
            subtitle = "٤ استشارات أطفال + متابعة نمو",
            badge = "وفّر ٤٠٪",
            colors = listOf(Color(0xFFFFD166), Color(0xFFFF7043), Color(0xFF6A1B9A)),
            glyphTag = "صحة العائلة في مكان واحد"
        )
    )

    val appointments = listOf(
        AuraAppointment(
            id = 101,
            doctorName = "د. خالد المقطري",
            specialty = "أمراض القلب",
            clinic = "مركز النبض التخصصي",
            dayLabel = "اليوم",
            dateLabel = "٢٤ أكتوبر",
            time = "٤:٣٠ م",
            status = "مؤكد",
            statusColor = Color(0xFF39F5A6),
            queueNumber = 3,
            fee = 4500,
            minutesFromNow = 105
        ),
        AuraAppointment(
            id = 102,
            doctorName = "د. سارة العزي",
            specialty = "الجلدية والتجميل",
            clinic = "عيادة لومينا للجلد",
            dayLabel = "غداً",
            dateLabel = "٢٥ أكتوبر",
            time = "١٠:٠٠ ص",
            status = "بانتظار الدفع",
            statusColor = Color(0xFFFFD166),
            queueNumber = 1,
            fee = 5000,
            minutesFromNow = 1230
        ),
        AuraAppointment(
            id = 103,
            doctorName = "د. أحمد الشامي",
            specialty = "جراحة العظام",
            clinic = "مستشفى الأمل التخصصي",
            dayLabel = "الاثنين",
            dateLabel = "٢٧ أكتوبر",
            time = "٧:٠٠ م",
            status = "مؤكد",
            statusColor = Color(0xFF39F5A6),
            queueNumber = 5,
            fee = 6000,
            minutesFromNow = 4300
        )
    )

    val pastAppointments = listOf(
        AuraAppointment(
            id = 201,
            doctorName = "د. ليلى الحكيمي",
            specialty = "طب الأطفال",
            clinic = "مركز البراعم",
            dayLabel = "١٢ أكتوبر",
            dateLabel = "٢٠٢٦",
            time = "٥:١٥ م",
            status = "مكتمل",
            statusColor = Color(0xFF90A4AE),
            queueNumber = 2,
            fee = 3500,
            minutesFromNow = -9000,
            upcoming = false
        ),
        AuraAppointment(
            id = 202,
            doctorName = "د. يوسف الصبري",
            specialty = "الباطنية",
            clinic = "عيادات السكينة",
            dayLabel = "٣ أكتوبر",
            dateLabel = "٢٠٢٦",
            time = "٩:٣٠ ص",
            status = "مكتمل",
            statusColor = Color(0xFF90A4AE),
            queueNumber = 4,
            fee = 4000,
            minutesFromNow = -21000,
            upcoming = false
        )
    )

    val unreadMessages = 3
}
