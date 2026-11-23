const Database = require('better-sqlite3');
const db = new Database('./data/medical.db');

console.log('🔧 Migration: إضافة حقول العمولة والملف الشخصي\n');

// ═══════════════════════════════════════════
// 1. جدول doctors
// ═══════════════════════════════════════════
const doctorsCols = db.prepare("PRAGMA table_info(doctors)").all().map(c => c.name);

if (!doctorsCols.includes('must_complete_profile')) {
    db.exec('ALTER TABLE doctors ADD COLUMN must_complete_profile INTEGER DEFAULT 0');
    console.log('✅ doctors.must_complete_profile');
}

if (!doctorsCols.includes('commission_rate')) {
    db.exec('ALTER TABLE doctors ADD COLUMN commission_rate REAL DEFAULT NULL');
    console.log('✅ doctors.commission_rate (نسبة خاصة للطبيب)');
}

// ═══════════════════════════════════════════
// 2. جدول secretaries
// ═══════════════════════════════════════════
const secCols = db.prepare("PRAGMA table_info(secretaries)").all().map(c => c.name);

if (!secCols.includes('must_complete_profile')) {
    db.exec('ALTER TABLE secretaries ADD COLUMN must_complete_profile INTEGER DEFAULT 0');
    console.log('✅ secretaries.must_complete_profile');
}

if (!secCols.includes('avatar')) {
    db.exec('ALTER TABLE secretaries ADD COLUMN avatar TEXT');
    console.log('✅ secretaries.avatar');
}

if (!secCols.includes('governorate')) {
    db.exec('ALTER TABLE secretaries ADD COLUMN governorate TEXT');
    console.log('✅ secretaries.governorate');
}

if (!secCols.includes('address')) {
    db.exec('ALTER TABLE secretaries ADD COLUMN address TEXT');
    console.log('✅ secretaries.address');
}

if (!secCols.includes('notes')) {
    db.exec('ALTER TABLE secretaries ADD COLUMN notes TEXT');
    console.log('✅ secretaries.notes');
}

// ═══════════════════════════════════════════
// 3. جدول جديد: settings (لإعدادات المنصة)
// ═══════════════════════════════════════════
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('✅ settings (جدول جديد)');

// ═══════════════════════════════════════════
// 4. جدول جديد: doctor_commission_history
//    (سجل العمولات لكل موعد)
// ═══════════════════════════════════════════
db.exec(`
  CREATE TABLE IF NOT EXISTS doctor_commission_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    consultation_fee INTEGER NOT NULL,
    commission_rate REAL NOT NULL,
    commission_amount INTEGER NOT NULL,
    doctor_amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    settled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
  )
`);
console.log('✅ doctor_commission_history (جدول جديد)');

// ═══════════════════════════════════════════
// 5. إضافة إعدادات افتراضية
// ═══════════════════════════════════════════
const defaultSettings = [
    { key: 'platform_commission_rate', value: '10', description: 'نسبة عمولة المنصة الافتراضية (%)' },
    { key: 'platform_name', value: 'العيادة الذكية', description: 'اسم المنصة' },
    { key: 'platform_phone', value: '', description: 'هاتف المنصة' },
    { key: 'platform_email', value: '', description: 'بريد المنصة' },
    { key: 'min_booking_fee', value: '0', description: 'الحد الأدنى لسعر الاستشارة' },
    { key: 'max_booking_fee', value: '100000', description: 'الحد الأقصى لسعر الاستشارة' },
    { key: 'allow_doctor_self_register', value: '1', description: 'السماح بتسجيل الأطباء ذاتياً' },
    { key: 'allow_secretary_self_register', value: '1', description: 'السماح بتسجيل السكرتيرات ذاتياً' }
];

const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, description)
    VALUES (?, ?, ?)
`);

defaultSettings.forEach(s => {
    insertSetting.run(s.key, s.value, s.description);
});
console.log('✅ إعدادات افتراضية (' + defaultSettings.length + ')');

// ═══════════════════════════════════════════
// 6. عرض النتيجة
// ═══════════════════════════════════════════
console.log('\n📋 جدول doctors:');
db.prepare("PRAGMA table_info(doctors)").all()
  .filter(c => ['id','email','commission_rate','must_complete_profile'].includes(c.name))
  .forEach(c => console.log('   - ' + c.name));

console.log('\n📋 جدول secretaries:');
db.prepare("PRAGMA table_info(secretaries)").all()
  .filter(c => ['id','email','avatar','governorate','must_complete_profile'].includes(c.name))
  .forEach(c => console.log('   - ' + c.name));

console.log('\n📋 الإعدادات:');
db.prepare("SELECT key, value FROM settings").all().forEach(s => {
    console.log('   ' + s.key + ' = ' + s.value);
});

db.close();
console.log('\n✅ تمت Migration بنجاح');
