import db from './src/config/database.js';

console.log('🌱 بدء إضافة البيانات...');

// ═══════════════════════════════════════════
// 🏥 إضافة العيادات
// ═══════════════════════════════════════════
const clinics = [
  { name: 'عيادة النور', governorate: 'صنعاء', address: 'شارع الزبيري - أمام مستشفى الكويت', phone: '967777111111' },
  { name: 'عيادة الشفاء', governorate: 'صنعاء', address: 'شارع حدة - جوار صيدلية النهدي', phone: '967777222222' },
  { name: 'مستشفى السلام', governorate: 'صنعاء', address: 'شارع الستين - جوار مسجد الرحمة', phone: '967777333333' },
  { name: 'مركز البصر', governorate: 'عدن', address: 'شارع المعلا - جوار البنك الأهلي', phone: '967777444444' },
  { name: 'عيادة العظام', governorate: 'تعز', address: 'شارع جمال - أمام حديقة الشهداء', phone: '967777555555' }
];

console.log('🏥 إضافة العيادات...');
clinics.forEach(clinic => {
  try {
    const existing = db.prepare('SELECT * FROM clinics WHERE name = ?').get(clinic.name);
    if (!existing) {
      db.prepare(`
        INSERT INTO clinics (name, governorate, address, phone, is_active)
        VALUES (?, ?, ?, ?, 1)
      `).run(clinic.name, clinic.governorate, clinic.address, clinic.phone);
      console.log(`  ✅ ${clinic.name}`);
    } else {
      console.log(`  ⏭️  ${clinic.name} (موجودة)`);
    }
  } catch (e) {
    console.log(`  ❌ ${clinic.name}: ${e.message}`);
  }
});

// ═══════════════════════════════════════════
// 👨‍⚕️ إضافة الأطباء
// ═══════════════════════════════════════════
const doctors = [
  {
    full_name: 'د. أحمد محمد',
    specialty: 'قلب',
    clinic_name: 'عيادة النور',
    governorate: 'صنعاء',
    phone: '967777100001',
    consultation_fee: 5000,
    slot_duration: 20,
    bio: 'طبيب قلب وأوعية دموية بخبرة 15 سنة. حاصل على البورد العربي.',
    experience_years: 15,
    rating: 4.8
  },
  {
    full_name: 'د. سارة علي',
    specialty: 'جلدية',
    clinic_name: 'عيادة الشفاء',
    governorate: 'صنعاء',
    phone: '967777100002',
    consultation_fee: 4000,
    slot_duration: 20,
    bio: 'أخصائية جلدية وتجميل بخبرة 10 سنوات.',
    experience_years: 10,
    rating: 4.9
  },
  {
    full_name: 'د. خالد عبدالله',
    specialty: 'أطفال',
    clinic_name: 'مستشفى السلام',
    governorate: 'صنعاء',
    phone: '967777100003',
    consultation_fee: 3500,
    slot_duration: 15,
    bio: 'طبيب أطفال وحديثي الولادة بخبرة 12 سنة.',
    experience_years: 12,
    rating: 4.7
  },
  {
    full_name: 'د. منى حسن',
    specialty: 'عيون',
    clinic_name: 'مركز البصر',
    governorate: 'عدن',
    phone: '967777100004',
    consultation_fee: 6000,
    slot_duration: 20,
    bio: 'أخصائية عيون وجراحة الليزك.',
    experience_years: 8,
    rating: 4.6
  },
  {
    full_name: 'د. عمر يوسف',
    specialty: 'عظام',
    clinic_name: 'عيادة العظام',
    governorate: 'تعز',
    phone: '967777100005',
    consultation_fee: 7000,
    slot_duration: 25,
    bio: 'استشاري جراحة العظام والمفاصل.',
    experience_years: 18,
    rating: 4.9
  },
  {
    full_name: 'د. ليلى إبراهيم',
    specialty: 'نساء وتوليد',
    clinic_name: 'عيادة الشفاء',
    governorate: 'صنعاء',
    phone: '967777100006',
    consultation_fee: 5500,
    slot_duration: 20,
    bio: 'أخصائية نساء وتوليد بخبرة 14 سنة.',
    experience_years: 14,
    rating: 4.8
  },
  {
    full_name: 'د. يوسف الحكيمي',
    specialty: 'باطنية',
    clinic_name: 'عيادة النور',
    governorate: 'صنعاء',
    phone: '967777100007',
    consultation_fee: 4500,
    slot_duration: 20,
    bio: 'أخصائي باطنية وقلب.',
    experience_years: 11,
    rating: 4.7
  },
  {
    full_name: 'د. هدى سالم',
    specialty: 'نفسية',
    clinic_name: 'مستشفى السلام',
    governorate: 'صنعاء',
    phone: '967777100008',
    consultation_fee: 6000,
    slot_duration: 30,
    bio: 'أخصائية نفسية وعلاج سلوكي.',
    experience_years: 9,
    rating: 4.9
  }
];

console.log('\n👨‍⚕️ إضافة الأطباء...');
doctors.forEach(doctor => {
  try {
    const existing = db.prepare('SELECT * FROM doctors WHERE phone = ?').get(doctor.phone);
    if (!existing) {
      const clinic = db.prepare('SELECT id FROM clinics WHERE name = ?').get(doctor.clinic_name);
      const result = db.prepare(`
        INSERT INTO doctors (
          full_name, specialty, clinic_name, governorate,
          phone, consultation_fee, slot_duration, bio,
          experience_years, rating, status, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 1)
      `).run(
        doctor.full_name, doctor.specialty, doctor.clinic_name, doctor.governorate,
        doctor.phone, doctor.consultation_fee, doctor.slot_duration, doctor.bio,
        doctor.experience_years, doctor.rating
      );

      // ربط الطبيب بالعيادة
      if (clinic) {
        try {
          db.prepare(`
            INSERT INTO doctor_clinics (doctor_id, clinic_id)
            VALUES (?, ?)
          `).run(result.lastInsertRowid, clinic.id);
        } catch (e) {}
      }

      console.log(`  ✅ ${doctor.full_name} (${doctor.specialty})`);
    } else {
      console.log(`  ⏭️  ${doctor.full_name} (موجود)`);
    }
  } catch (e) {
    console.log(`  ❌ ${doctor.full_name}: ${e.message}`);
  }
});

// ═══════════════════════════════════════════
// 📅 إضافة Slots
// ═══════════════════════════════════════════
console.log('\n📅 إضافة المواعيد...');
const today = new Date();
const times = ['09:00', '09:20', '09:40', '10:00', '10:20', '10:40', '11:00', '11:20', '16:00', '16:20', '16:40', '17:00'];

const allDoctors = db.prepare("SELECT id FROM doctors WHERE status = 'approved'").all();

allDoctors.forEach(doctor => {
  // إضافة slots لـ 7 أيام قادمة
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    times.forEach((time, index) => {
      const [hours, minutes] = time.split(':');
      const endMinutes = parseInt(minutes) + 20;
      const endHours = parseInt(hours) + Math.floor(endMinutes / 60);
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

      try {
        db.prepare(`
          INSERT OR IGNORE INTO slots (doctor_id, date, start_time, end_time, is_booked, is_closed)
          VALUES (?, ?, ?, ?, 0, 0)
        `).run(doctor.id, dateStr, time, endTime);
      } catch (e) {}
    });
  }
});

const slotsCount = db.prepare('SELECT COUNT(*) as count FROM slots').get();
console.log(`  ✅ تمت إضافة ${slotsCount.count} موعد`);

// ═══════════════════════════════════════════
// ✅ ملخص
// ═══════════════════════════════════════════
console.log('\n═══════════════════════════════');
console.log('📊 ملخص:');
console.log(`  🏥 العيادات: ${db.prepare('SELECT COUNT(*) as c FROM clinics').get().c}`);
console.log(`  👨‍⚕️ الأطباء: ${db.prepare('SELECT COUNT(*) as c FROM doctors').get().c}`);
console.log(`  📅 المواعيد: ${db.prepare('SELECT COUNT(*) as c FROM slots').get().c}`);
console.log('═══════════════════════════════\n');
console.log('✅ اكتملت إضافة البيانات بنجاح!');