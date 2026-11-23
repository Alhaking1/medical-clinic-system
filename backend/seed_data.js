import db from './src/config/database.js';

console.log('Seeding schedules, periods & offers...');

try {
  // Update Doctor 1 consultation fee
  db.prepare('UPDATE doctors SET consultation_fee = 4500 WHERE id = 1 AND consultation_fee = 0').run();

  // Insert schedules for doctors 1..9
  const insertSchedule = db.prepare(`
    INSERT OR IGNORE INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, max_bookings, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  const insertPeriod = db.prepare(`
    INSERT OR IGNORE INTO doctor_periods (doctor_id, date, start_time, end_time, max_bookings, booked_count, is_cancelled, is_stopped)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0)
  `);

  const today = new Date();
  const formatDate = d => {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  };

  for (let docId = 1; docId <= 9; docId++) {
    for (let day = 0; day <= 6; day++) { // Sunday=0 to Saturday=6
      if (day !== 5) { // skip Friday
        insertSchedule.run(docId, day, '09:00', '13:00', 12);
        insertSchedule.run(docId, day, '16:00', '20:00', 10);
      }
    }

    // Insert periods for next 14 days
    for (let i = 0; i < 14; i++) {
      const pDate = new Date(today);
      pDate.setDate(today.getDate() + i);
      if (pDate.getDay() !== 5) {
        const dStr = formatDate(pDate);
        const bookedM = (docId * 2 + i) % 8; // 0..7
        const bookedE = (docId + i * 2) % 6; // 0..5
        insertPeriod.run(docId, dStr, '09:00', '13:00', 12, bookedM);
        insertPeriod.run(docId, dStr, '16:00', '20:00', 10, bookedE);
      }
    }
  }

  // Insert sample real offers
  db.prepare('DELETE FROM offers').run();
  const insertOffer = db.prepare(`
    INSERT INTO offers (title, description, doctor_id, clinic_id, original_price, discounted_price, discount_percent, start_date, end_date, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now', '+30 days'), 1)
  `);

  insertOffer.run('باقة فحص النظر والقرنية الشامل', 'تشمل قياس ضغط العين، حدة البصر، وتصوير قاع العين بأحدث الأجهزة مع استشارة استشارية العيون د. منى حسن.', 5, 1, 10000, 6000, 40);
  insertOffer.run('باقة الاطمئنان على صحة القلب', 'تشمل تخطيط القلب الكهربائي ECG، فحص كفاءة عضلة القلب، وقياس ضغط الدم الشرياني مع استشاري القلب د. أحمد محمد.', 2, 1, 15000, 10500, 30);
  insertOffer.run('باقة الفحص الدوري والنمو للأطفال', 'فحص شامل لنمو الطفل، نسبة الهيموجلوبين، وفيتامين د مع استشاري طب الأطفال د. خالد عبدالله.', 4, 2, 8000, 5200, 35);
  insertOffer.run('باقة العناية بالبشرة ونضارة الوجه', 'جلسة تنظيف عميق للبشرة ونضارة مع استشارة متخصصة لدى د. سارة علي.', 3, 2, 12000, 9000, 25);
  insertOffer.run('فحص المفاصل والكشف المبكر للخشونة', 'فحص سريري كامل للمفاصل والعمود الفقري مع إرشادات العلاج الوقائي مع د. عمر يوسف.', 6, 3, 10000, 8000, 20);

  console.log('✅ Successfully seeded periods and offers!');
} catch (e) {
  console.error('❌ Error seeding:', e);
}
