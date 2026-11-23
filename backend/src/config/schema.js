import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import db from './database.js';

// ============================================================
// 🆕 ترحيل: إضافة google_maps_url لجدول clinics
// ============================================================
function migrateClinicsAddMaps() {
  try {
    const columns = db.prepare('PRAGMA table_info(clinics)').all();
    const columnNames = columns.map(c => c.name);

    if (!columnNames.includes('google_maps_url')) {
      db.exec('ALTER TABLE clinics ADD COLUMN google_maps_url TEXT');
      console.log('🆕 تمت إضافة عمود google_maps_url لجدول clinics');
    }
  } catch (err) {
    console.error('⚠️ خطأ في migrateClinicsAddMaps:', err.message);
  }
}

// ============================================================
// 🆕 ترحيل: إضافة مواعيد وساعات عمل العيادة والقالب المتكرر
// ============================================================
function migrateClinicsSchedule() {
  try {
    const columns = db.prepare('PRAGMA table_info(clinics)').all();
    const columnNames = columns.map(c => c.name);

    if (!columnNames.includes('is_24_hours')) {
      db.exec('ALTER TABLE clinics ADD COLUMN is_24_hours INTEGER DEFAULT 0');
      console.log('🆕 تمت إضافة عمود is_24_hours لجدول clinics');
    }
    if (!columnNames.includes('schedule_type')) {
      db.exec('ALTER TABLE clinics ADD COLUMN schedule_type TEXT DEFAULT "daily"');
      console.log('🆕 تمت إضافة عمود schedule_type لجدول clinics');
    }
    if (!columnNames.includes('open_time')) {
      db.exec('ALTER TABLE clinics ADD COLUMN open_time TEXT DEFAULT "08:00"');
      console.log('🆕 تمت إضافة عمود open_time لجدول clinics');
    }
    if (!columnNames.includes('close_time')) {
      db.exec('ALTER TABLE clinics ADD COLUMN close_time TEXT DEFAULT "22:00"');
      console.log('🆕 تمت إضافة عمود close_time لجدول clinics');
    }
    if (!columnNames.includes('weekly_schedule')) {
      db.exec('ALTER TABLE clinics ADD COLUMN weekly_schedule TEXT DEFAULT NULL');
      console.log('🆕 تمت إضافة عمود weekly_schedule لجدول clinics');
    }
    if (!columnNames.includes('image')) {
      db.exec('ALTER TABLE clinics ADD COLUMN image TEXT DEFAULT NULL');
      console.log('🆕 تمت إضافة عمود image لجدول clinics');
    }
    if (!columnNames.includes('facility_type')) {
      db.exec('ALTER TABLE clinics ADD COLUMN facility_type TEXT DEFAULT "clinic"');
      console.log('🆕 تمت إضافة عمود facility_type لجدول clinics (clinic, medical_center, pharmacy, hospital)');
    }

    // 🆕 ترحيل: إضافة أعمدة المرفقات لجدول chat_messages
    try {
      const msgCols = db.prepare('PRAGMA table_info(chat_messages)').all();
      const msgColNames = msgCols.map(c => c.name);
      if (!msgColNames.includes('attachment_url')) {
        db.exec('ALTER TABLE chat_messages ADD COLUMN attachment_url TEXT DEFAULT NULL');
        console.log('🆕 تمت إضافة عمود attachment_url لجدول chat_messages');
      }
      if (!msgColNames.includes('attachment_type')) {
        db.exec('ALTER TABLE chat_messages ADD COLUMN attachment_type TEXT DEFAULT NULL');
        console.log('🆕 تمت إضافة عمود attachment_type لجدول chat_messages');
      }
      if (!msgColNames.includes('attachment_name')) {
        db.exec('ALTER TABLE chat_messages ADD COLUMN attachment_name TEXT DEFAULT NULL');
        console.log('🆕 تمت إضافة عمود attachment_name لجدول chat_messages');
      }
    } catch (msgErr) {
      console.warn('⚠️ ترحيل chat_messages:', msgErr.message);
    }

    // تنظيف وتوحيد أوقات العيادات لتكون أرقام إنجليزية (ASCII) لمنع ظهور NaN
    const normalizeDigits = (str) => {
      if (!str) return '22:00';
      return str.toString()
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    };
    const allClinics = db.prepare('SELECT id, open_time, close_time FROM clinics').all();
    for (const c of allClinics) {
      const cleanOpen = normalizeDigits(c.open_time || '08:00');
      const cleanClose = normalizeDigits(c.close_time || '22:00');
      if (cleanOpen !== c.open_time || cleanClose !== c.close_time) {
        db.prepare('UPDATE clinics SET open_time = ?, close_time = ? WHERE id = ?').run(cleanOpen, cleanClose, c.id);
      }
    }
  } catch (err) {
    console.error('⚠️ خطأ في migrateClinicsSchedule:', err.message);
  }
}

// ============================================================
// 🆕 دالة ترحيل: إضافة email + google_id + picture لجدول patients
// ============================================================
function migratePatientsTable() {
  try {
    const columns = db.prepare('PRAGMA table_info(patients)').all();
    const columnNames = columns.map(c => c.name);

    if (!columnNames.includes('email')) {
      db.exec('ALTER TABLE patients ADD COLUMN email TEXT');
      console.log('🆕 تمت إضافة عمود email لجدول patients');
    }

    if (!columnNames.includes('google_id')) {
      db.exec('ALTER TABLE patients ADD COLUMN google_id TEXT');
      console.log('🆕 تمت إضافة عمود google_id لجدول patients');
    }

    if (!columnNames.includes('picture')) {
      db.exec('ALTER TABLE patients ADD COLUMN picture TEXT');
      console.log('🆕 تمت إضافة عمود picture لجدول patients');
    }

    if (!columnNames.includes('blood_group')) {
      db.exec('ALTER TABLE patients ADD COLUMN blood_group TEXT DEFAULT "O+"');
      console.log('🆕 تمت إضافة عمود blood_group لجدول patients');
    }

    if (!columnNames.includes('password_hash')) {
      db.exec('ALTER TABLE patients ADD COLUMN password_hash TEXT');
      console.log('🆕 تمت إضافة عمود password_hash لجدول patients');
    }

    if (!columnNames.includes('age')) {
      db.exec('ALTER TABLE patients ADD COLUMN age INTEGER');
      console.log('🆕 تمت إضافة عمود age لجدول patients');
    }

    if (!columnNames.includes('gender')) {
      db.exec('ALTER TABLE patients ADD COLUMN gender TEXT');
      console.log('🆕 تمت إضافة عمود gender لجدول patients');
    }

    if (!columnNames.includes('governorate')) {
      db.exec('ALTER TABLE patients ADD COLUMN governorate TEXT');
      console.log('🆕 تمت إضافة عمود governorate لجدول patients');
    }

    if (!columnNames.includes('avatar_url')) {
      db.exec('ALTER TABLE patients ADD COLUMN avatar_url TEXT DEFAULT NULL');
      try {
        db.exec('UPDATE patients SET avatar_url = picture WHERE avatar_url IS NULL AND picture IS NOT NULL');
      } catch (e) {}
      console.log('🆕 تمت إضافة عمود avatar_url لجدول patients');
    }

    try {
      db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_google_id ON patients(google_id) WHERE google_id IS NOT NULL');
    } catch (e) {}

    try {
      db.exec('CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email)');
    } catch (e) {}

  } catch (err) {
    console.error('⚠️ خطأ في migratePatientsTable:', err.message);
  }
}

function migrateAppointmentsTable() {
  try {
    const columns = db.prepare('PRAGMA table_info(appointments)').all();
    const columnNames = columns.map(c => c.name);

    if (!columnNames.includes('fee')) {
      db.exec('ALTER TABLE appointments ADD COLUMN fee INTEGER');
      console.log('🆕 تمت إضافة عمود fee لجدول appointments');
    }

    if (!columnNames.includes('period_id')) {
      db.exec('ALTER TABLE appointments ADD COLUMN period_id INTEGER');
      console.log('🆕 تمت إضافة عمود period_id لجدول appointments');
    }

  } catch (err) {
    console.error('⚠️ خطأ في migrateAppointmentsTable:', err.message);
  }
}

// ============================================================
// 🆕 ترحيل: إعادة إنشاء appointments بدون NOT NULL على slot_id
// ============================================================
function migrateAppointmentsRemoveSlotIdNotNull() {
  try {
    const tableInfo = db.prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='appointments'"
    ).get();

    if (!tableInfo) {
      console.log('⚠️ جدول appointments غير موجود — تخطي');
      return;
    }

    const createSql = tableInfo.sql || '';

    if (!createSql.includes('slot_id INTEGER NOT NULL')) {
      console.log('✅ appointments لا يحتاج ترحيل slot_id');
      return;
    }

    console.log('🔄 بدء ترحيل appointments — إزالة NOT NULL من slot_id...');

    db.pragma('foreign_keys = OFF');

    db.exec(`
      CREATE TABLE appointments_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_code TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        slot_id INTEGER,
        period_id INTEGER,
        status TEXT DEFAULT 'pending',
        payment_method TEXT,
        payment_status TEXT DEFAULT 'unpaid',
        reason TEXT,
        fee INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES patients(id),
        FOREIGN KEY (doctor_id) REFERENCES doctors(id),
        FOREIGN KEY (slot_id) REFERENCES slots(id),
        FOREIGN KEY (period_id) REFERENCES doctor_periods(id)
      )
    `);

    db.exec(`
      INSERT INTO appointments_new
        (id, booking_code, user_id, doctor_id, slot_id, period_id, status,
         payment_method, payment_status, reason, fee, created_at, updated_at)
      SELECT
        id, booking_code, user_id, doctor_id,
        CASE WHEN slot_id = 0 THEN NULL ELSE slot_id END,
        period_id, status,
        payment_method, payment_status, reason, fee, created_at, updated_at
      FROM appointments
    `);

    db.exec('DROP TABLE appointments');
    db.exec('ALTER TABLE appointments_new RENAME TO appointments');

    db.pragma('foreign_keys = ON');

    console.log('✅ اكتمل ترحيل appointments — slot_id يمكن أن يكون NULL');

  } catch (err) {
    console.error('❌ خطأ في migrateAppointmentsRemoveSlotIdNotNull:', err.message);
    try { db.pragma('foreign_keys = ON'); } catch (e) {}
  }
}


// ============================================================
// 🆕 ترحيل: doctors — إضافة أعمدة ناقصة
// ============================================================
function migrateDoctorsTable() {
  try {
    const columns = db.prepare('PRAGMA table_info(doctors)').all();
    const columnNames = columns.map(c => c.name);
    
    // قائمة الأعمدة المطلوبة
    const requiredColumns = [
      { name: 'google_maps_url', type: 'TEXT' },
      { name: 'must_change_password', type: 'INTEGER DEFAULT 0' },
      { name: 'password_changed_at', type: 'DATETIME' },
      { name: 'pending_approval', type: 'INTEGER' },
      { name: 'created_by_secretary_id', type: 'INTEGER' },
      { name: 'must_complete_profile', type: 'INTEGER DEFAULT 0' },
      { name: 'commission_rate', type: 'REAL' },
      { name: 'clinic_id', type: 'INTEGER' },
      { name: 'updated_at', type: 'DATETIME' },
      { name: 'approved_at', type: 'DATETIME' },
      { name: 'approved_by', type: 'INTEGER' },
      { name: 'permissions', type: 'TEXT' },
      { name: 'allow_direct_chat', type: 'INTEGER DEFAULT 0' },
      { name: 'is_chat_banned', type: 'INTEGER DEFAULT 0' },
      { name: 'chat_ban_reason', type: 'TEXT' },
      { name: 'avatar_url', type: 'TEXT' },
    ];
    
    for (const col of requiredColumns) {
      if (!columnNames.includes(col.name)) {
        try {
          db.exec(`ALTER TABLE doctors ADD COLUMN ${col.name} ${col.type}`);
          console.log(`🆕 doctors: أُضيف عمود ${col.name}`);
        } catch (e) {
          console.warn(`⚠️ فشل إضافة ${col.name}: ${e.message}`);
        }
      }
    }
  } catch (err) {
    console.error('⚠️ خطأ في migrateDoctorsTable:', err.message);
  }
}

// ============================================================
// 🆕 ترحيل: secretaries — إضافة أعمدة ناقصة
// ============================================================
function migrateSecretariesTable() {
  try {
    const columns = db.prepare('PRAGMA table_info(secretaries)').all();
    const columnNames = columns.map(c => c.name);
    
    const requiredColumns = [
      { name: 'updated_at', type: 'DATETIME' },
      { name: 'must_complete_profile', type: 'INTEGER DEFAULT 0' },
      { name: 'must_change_password', type: 'INTEGER DEFAULT 0' },
      { name: 'password_changed_at', type: 'DATETIME' },
      { name: 'email', type: 'TEXT' },
      { name: 'avatar', type: 'TEXT' },
      { name: 'governorate', type: 'TEXT' },
      { name: 'address', type: 'TEXT' },
      { name: 'notes', type: 'TEXT' },
      { name: 'is_chat_banned', type: 'INTEGER DEFAULT 0' },
      { name: 'chat_ban_reason', type: 'TEXT' },
      { name: 'avatar_url', type: 'TEXT' },
    ];
    
    for (const col of requiredColumns) {
      if (!columnNames.includes(col.name)) {
        try {
          db.exec(`ALTER TABLE secretaries ADD COLUMN ${col.name} ${col.type}`);
          console.log(`🆕 secretaries: أُضيف عمود ${col.name}`);
        } catch (e) {
          console.warn(`⚠️ فشل إضافة ${col.name}: ${e.message}`);
        }
      }
    }
  } catch (err) {
    console.error('⚠️ خطأ في migrateSecretariesTable:', err.message);
  }
}

// ============================================================
// 🆕 ترحيل: إضافة is_stopped لجدول doctor_periods
// ============================================================
function migratePeriodsAddStopped() {
  try {
    const columns = db.prepare('PRAGMA table_info(doctor_periods)').all();
    const columnNames = columns.map(c => c.name);

    if (!columnNames.includes('is_stopped')) {
      db.exec('ALTER TABLE doctor_periods ADD COLUMN is_stopped INTEGER DEFAULT 0');
      console.log('🆕 doctor_periods: أُضيف عمود is_stopped');
    }
  } catch (err) {
    console.error('⚠️ خطأ في migratePeriodsAddStopped:', err.message);
  }
}

// ============================================================
// 🆕 تنظيف وترقية العيادات وربطها بالأطباء
// ============================================================
function migrateCleanAndSeedClinics() {
  try {
    // 1. حذف أي عيادات تحتوي علامات استفهام أو رموز تالفة
    db.prepare("DELETE FROM clinics WHERE name LIKE '%?%' OR name LIKE '????%'").run();

    // 2. قائمة العيادات والمستشفيات الحقيقية
    const defaultClinics = [
      { name: 'عيادة النور', gov: 'صنعاء', addr: 'شارع الزبيري - أمام مستشفى الكويت', phone: '781238648' },
      { name: 'عيادة الشفاء', gov: 'صنعاء', addr: 'شارع حدة - جوار صيدلية النهدي', phone: '781238648' },
      { name: 'مستشفى السلام', gov: 'صنعاء', addr: 'شارع الستين - جوار مسجد الرحمة', phone: '781238648' },
      { name: 'مركز البصر', gov: 'عدن', addr: 'شارع المعلا - جوار البنك الأهلي', phone: '781238648' },
      { name: 'عيادة العظام', gov: 'تعز', addr: 'شارع جمال - أمام حديقة الشهداء', phone: '781238648' },
      { name: 'مستشفى الأمل التخصصي', gov: 'صنعاء', addr: 'شارع الأربعين - سعوان', phone: '781238648' },
      { name: 'مستشفى صابر الدولي', gov: 'عدن', addr: 'المنصورة - ريمي', phone: '781238648' },
      { name: 'مستشفى الصفوة', gov: 'تعز', addr: 'الحوبان - جولة الذكرة', phone: '781238648' },
      { name: 'مستشفى حضرموت الحديث', gov: 'حضرموت', addr: 'المكلا - الشرج', phone: '781238648' },
      { name: 'مستشفى السعيدة', gov: 'صنعاء', addr: 'مذبح - شارع الستين', phone: '781238648' },
    ];

    const insertClinic = db.prepare(`
      INSERT INTO clinics (name, governorate, address, phone, is_active)
      VALUES (?, ?, ?, ?, 1)
    `);

    for (const c of defaultClinics) {
      const exist = db.prepare('SELECT id FROM clinics WHERE name = ?').get(c.name);
      if (!exist) {
        insertClinic.run(c.name, c.gov, c.addr, c.phone);
      } else {
        db.prepare('UPDATE clinics SET governorate = ?, address = ?, phone = ?, is_active = 1 WHERE id = ?')
          .run(c.gov, c.addr, c.phone, exist.id);
      }
    }

    // 3. ربط الأطباء بالعيادات الصحيحة
    const allClinics = db.prepare('SELECT id, name FROM clinics').all();
    for (const c of allClinics) {
      db.prepare('UPDATE doctors SET clinic_id = ? WHERE clinic_name = ?').run(c.id, c.name);
    }

    console.log('✅ تم تنظيف وترقية العيادات وربط الأطباء بنجاح');
  } catch (err) {
    console.error('⚠️ خطأ في migrateCleanAndSeedClinics:', err.message);
  }
}

// ============================================================
// 🆕 ترحيل: registration_requests — إضافة password_reset
// ============================================================
function migrateRegistrationRequests() {
  try {
    const currentSql = db
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='registration_requests'")
      .get();

    if (!currentSql) {
      console.log('⚠️ registration_requests غير موجود — تخطي');
      return;
    }

    // تحقق إذا password_reset موجود مسبقًا
    if (currentSql.sql.includes('password_reset')) {
      console.log('✅ registration_requests: password_reset موجود');
      return;
    }

    console.log('🔄 ترحيل registration_requests — إضافة password_reset...');

    // احفظ البيانات القديمة
    const oldData = db.prepare('SELECT * FROM registration_requests').all();
    console.log(`📦 عدد الصفوف: ${oldData.length}`);

    // أوقف المفاتيح الأجنبية
    db.pragma('foreign_keys = OFF');

    // أنشئ الجدول الجديد
    db.exec(`
      CREATE TABLE registration_requests_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('doctor', 'patient', 'secretary', 'password_reset')),
        user_id INTEGER NOT NULL,
        data TEXT,
        status TEXT DEFAULT 'pending',
        reviewed_by INTEGER,
        reviewed_at DATETIME,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // انقل البيانات
    const stmt = db.prepare(`
      INSERT INTO registration_requests_new
        (id, type, user_id, data, status, reviewed_by, reviewed_at, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const row of oldData) {
      stmt.run(
        row.id, row.type, row.user_id, row.data, row.status,
        row.reviewed_by, row.reviewed_at, row.notes, row.created_at
      );
    }

    // استبدل الجدول
    db.exec('DROP TABLE registration_requests');
    db.exec('ALTER TABLE registration_requests_new RENAME TO registration_requests');

    // أعد المفاتيح الأجنبية
    db.pragma('foreign_keys = ON');

    console.log('✅ تم ترحيل registration_requests بنجاح');
  } catch (err) {
    console.error('❌ خطأ في migrateRegistrationRequests:', err.message);
    try { db.pragma('foreign_keys = ON'); } catch (e) {}
  }
}
export function initDatabase() {
  // جدول الأدمن
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // جدول العيادات — ✅ مع google_maps_url
  db.exec(`
    CREATE TABLE IF NOT EXISTS clinics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      governorate TEXT,
      address TEXT,
      phone TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      google_maps_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // جدول الأطباء — ⚠️ بدون google_maps_url
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      clinic_name TEXT,
      governorate TEXT,
      address TEXT,
      phone TEXT UNIQUE,
      email TEXT,
      password_hash TEXT,
      avatar TEXT,
      bio TEXT,
      experience_years INTEGER DEFAULT 0,
      consultation_fee INTEGER NOT NULL DEFAULT 0,
      slot_duration INTEGER DEFAULT 20,
      is_active INTEGER DEFAULT 1,
      is_deleted INTEGER DEFAULT 0,
      phone_verified INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      approved_at DATETIME,
      approved_by INTEGER,
      permissions TEXT,
      rating REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // جدول ربط الطبيب بعيادات متعددة
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctor_clinics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      clinic_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
      UNIQUE(doctor_id, clinic_id)
    )
  `);

  // جدول السكرتيرات
  db.exec(`
    CREATE TABLE IF NOT EXISTS secretaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      clinic_id INTEGER,
      password_hash TEXT,
      permissions TEXT,
      phone_verified INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL
    )
  `);

  // جدول ربط السكرتيرة بأطباء متعددين
  db.exec(`
    CREATE TABLE IF NOT EXISTS secretary_doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      secretary_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (secretary_id) REFERENCES secretaries(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      UNIQUE(secretary_id, doctor_id)
    )
  `);

  // جدول المرضى
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      age INTEGER,
      gender TEXT CHECK(gender IN ('male', 'female')),
      governorate TEXT,
      password_hash TEXT,
      phone_verified INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      approved_at DATETIME,
      approved_by INTEGER,
      permissions TEXT,
      is_blocked INTEGER DEFAULT 0,
      no_show_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // جدول طلبات التسجيل
  db.exec(`
    CREATE TABLE IF NOT EXISTS registration_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('doctor', 'patient', 'secretary', 'password_reset')),
      user_id INTEGER NOT NULL,
      data TEXT,
      status TEXT DEFAULT 'pending',
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // جدول أكواد OTP
  db.exec(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      user_type TEXT NOT NULL CHECK(user_type IN ('doctor', 'patient', 'secretary', 'admin')),
      purpose TEXT DEFAULT 'login',
      is_used INTEGER DEFAULT 0,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // جدول الفترات الزمنية القديم (slots)
  db.exec(`
    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      is_booked INTEGER DEFAULT 0,
      is_closed INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      UNIQUE(doctor_id, date, start_time)
    )
  `);

  // جدول قوالب الجدول الأسبوعي
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctor_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      max_bookings INTEGER DEFAULT 10,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      UNIQUE(doctor_id, day_of_week, start_time)
    )
  `);

  // جدول الفترات الفعلية
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctor_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      date DATE NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      max_bookings INTEGER DEFAULT 10,
      booked_count INTEGER DEFAULT 0,
      is_cancelled INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      UNIQUE(doctor_id, date, start_time)
    )
  `);

  // فهارس
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_periods_doctor_date ON doctor_periods(doctor_id, date)');
  } catch (e) {}

  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_schedules_doctor_day ON doctor_schedules(doctor_id, day_of_week)');
  } catch (e) {}

  // جدول الحجوزات
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_code TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      slot_id INTEGER,
      period_id INTEGER,
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      payment_status TEXT DEFAULT 'unpaid',
      reason TEXT,
      fee INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id),
      FOREIGN KEY (slot_id) REFERENCES slots(id)
    )
  `);

  // جدول المدفوعات
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      method TEXT NOT NULL,
      receipt_image TEXT,
      status TEXT DEFAULT 'pending',
      confirmed_by INTEGER,
      confirmed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
      FOREIGN KEY (confirmed_by) REFERENCES admins(id)
    )
  `);

  // جدول الطابور
  db.exec(`
    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER,
      doctor_id INTEGER NOT NULL,
      patient_name TEXT,
      patient_phone TEXT,
      queue_number INTEGER NOT NULL,
      status TEXT DEFAULT 'waiting',
      checked_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      finished_at DATETIME,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    )
  `);

  // سجل العمليات الطبية
  db.exec(`
    CREATE TABLE IF NOT EXISTS medical_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      diagnosis TEXT,
      prescription TEXT,
      lab_tests TEXT,
      notes TEXT,
      follow_up_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id),
      FOREIGN KEY (user_id) REFERENCES patients(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    )
  `);

  // جدول العروض
  db.exec(`
    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      doctor_id INTEGER,
      clinic_id INTEGER,
      original_price INTEGER,
      discounted_price INTEGER,
      discount_percent INTEGER,
      image_url TEXT,
      start_date DATETIME,
      end_date DATETIME,
      is_active INTEGER DEFAULT 1,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
    )
  `);

  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_offers_active ON offers(is_active, end_date)');
  } catch (e) {}

  // جدول صور العروض
  db.exec(`
    CREATE TABLE IF NOT EXISTS offer_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      offer_id INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
    )
  `);

  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_offer_images ON offer_images(offer_id, sort_order)');
  } catch (e) {}

  // ═══════════════════════════════════════════
  // ترحيل الجداول
  // ═══════════════════════════════════════════
  migrateClinicsAddMaps();
  migratePatientsTable();
  migrateAppointmentsTable();
  migrateAppointmentsRemoveSlotIdNotNull();


  // ═══════════════════════════════════════════
  // 🆕 جدول التفويض بين السكرتيرات
  // ═══════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS secretary_delegations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_secretary_id INTEGER NOT NULL,
      to_secretary_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      valid_from DATE NOT NULL,
      valid_until DATE NOT NULL,
      max_bookings INTEGER,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','expired','cancelled')),
      message TEXT,
      response_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME,
      FOREIGN KEY (from_secretary_id) REFERENCES secretaries(id) ON DELETE CASCADE,
      FOREIGN KEY (to_secretary_id) REFERENCES secretaries(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    )
  `);

  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_delegations_to ON secretary_delegations(to_secretary_id, status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_delegations_from ON secretary_delegations(from_secretary_id, status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_delegations_doctor ON secretary_delegations(doctor_id, status)');
  } catch (e) {}
  console.log('✅ تم إنشاء الجداول بنجاح');
  // 🆕 Migrations — إضافة أعمدة ناقصة
  migrateDoctorsTable();
  migrateSecretariesTable();
  migrateClinicsAddMaps();
  migratePatientsTable();
  migratePeriodsAddStopped();
  migrateRegistrationRequests();
  migrateCleanAndSeedClinics();
  migratePerformanceIndexes();
  migrateChatTables();
  migrateGoldenBookingsAndReviews();
  migrateClinicsSchedule();
  migrateNotificationsAndLeaves();
  migrateOffersTable();
  migratePrescriptionsTables();
}

function migratePrescriptionsTables() {
  try {
    // 1. جدول بنك الأدوية medications
    db.exec(`
      CREATE TABLE IF NOT EXISTS medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doctor_id INTEGER,
        name TEXT NOT NULL,
        active_ingredient TEXT,
        default_dosage TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_medications_doctor ON medications(doctor_id);
      CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(name);
    `);

    // 2. جدول الروشتات prescriptions
    db.exec(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        appointment_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        patient_id INTEGER NOT NULL,
        diagnosis TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES doctors(id),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      );
      CREATE INDEX IF NOT EXISTS idx_prescriptions_appt ON prescriptions(appointment_id);
      CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
      CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
    `);

    // 3. جدول بنود الروشتة prescription_items
    db.exec(`
      CREATE TABLE IF NOT EXISTS prescription_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prescription_id INTEGER NOT NULL,
        medication_name TEXT NOT NULL,
        dosage TEXT DEFAULT 'جرعة اعتيادية',
        frequency TEXT DEFAULT 'مرتين يومياً',
        duration TEXT DEFAULT '5 أيام',
        instructions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_prescription_items_rx ON prescription_items(prescription_id);
    `);

    // 4. التأكد من وجود عمود logo_url في جدول العيادات clinics
    const clinicCols = db.prepare('PRAGMA table_info(clinics)').all().map(c => c.name);
    if (!clinicCols.includes('logo_url')) {
      db.exec('ALTER TABLE clinics ADD COLUMN logo_url TEXT DEFAULT NULL');
      console.log('🆕 clinics: أُضيف عمود logo_url');
    }

    // 5. التأكد من وجود أعمدة الإحصائيات في جدول العروض offers
    const offerCols = db.prepare('PRAGMA table_info(offers)').all().map(c => c.name);
    if (!offerCols.includes('facility_id')) {
      db.exec('ALTER TABLE offers ADD COLUMN facility_id INTEGER DEFAULT NULL');
    }
    if (!offerCols.includes('provider_name')) {
      db.exec('ALTER TABLE offers ADD COLUMN provider_name TEXT DEFAULT NULL');
    }
    if (!offerCols.includes('target_audience')) {
      db.exec('ALTER TABLE offers ADD COLUMN target_audience TEXT DEFAULT NULL');
    }
    if (!offerCols.includes('max_capacity')) {
      db.exec('ALTER TABLE offers ADD COLUMN max_capacity INTEGER DEFAULT NULL');
    }
    if (!offerCols.includes('booked_count')) {
      db.exec('ALTER TABLE offers ADD COLUMN booked_count INTEGER DEFAULT 0');
    }

    // 6. جدول حجوزات العروض offer_bookings
    db.exec(`
      CREATE TABLE IF NOT EXISTS offer_bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        offer_id INTEGER NOT NULL,
        patient_id INTEGER NOT NULL,
        status TEXT DEFAULT 'confirmed',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );
    `);

    // 7. التأكد من أعمدة appointments (attendance_status, sequential_booking_number)
    const apptCols = db.prepare('PRAGMA table_info(appointments)').all().map(c => c.name);
    if (!apptCols.includes('attendance_status')) {
      db.exec("ALTER TABLE appointments ADD COLUMN attendance_status TEXT DEFAULT 'pending'");
    }
    if (!apptCols.includes('sequential_booking_number')) {
      db.exec("ALTER TABLE appointments ADD COLUMN sequential_booking_number INTEGER DEFAULT NULL");
    }

    console.log('✅ تم ترحيل وفحص جداول الروشتات (prescriptions, prescription_items, medications) وعمود logo_url بنجاح');
  } catch (err) {
    console.error('⚠️ خطأ في migratePrescriptionsTables:', err.message);
  }
}

function migrateOffersTable() {
  try {
    const columns = db.prepare('PRAGMA table_info(offers)').all();
    const columnNames = columns.map(c => c.name);

    if (!columnNames.includes('status')) {
      db.exec("ALTER TABLE offers ADD COLUMN status TEXT DEFAULT 'approved'");
      console.log('🆕 offers: أُضيف عمود status');
    }
    if (!columnNames.includes('rejection_reason')) {
      db.exec('ALTER TABLE offers ADD COLUMN rejection_reason TEXT DEFAULT NULL');
      console.log('🆕 offers: أُضيف عمود rejection_reason');
    }
    if (!columnNames.includes('created_by_role')) {
      db.exec("ALTER TABLE offers ADD COLUMN created_by_role TEXT DEFAULT 'admin'");
      console.log('🆕 offers: أُضيف عمود created_by_role');
    }

    // حذف العروض التجريبية القديمة نهائياً
    db.prepare(`
      DELETE FROM offers 
      WHERE id IN (3, 4) 
         OR title LIKE '%باقة الفحص الدوري%' 
         OR title LIKE '%باقة العناية بالبشرة%'
         OR title LIKE '%باقة الاطمئنان%'
         OR title LIKE '%باقة فحص النظر%'
         OR title LIKE '%فحص المفاصل%'
    `).run();
    console.log('🗑️ تم تنظيف وحذف العروض التجريبية القديمة');
  } catch (err) {
    console.error('⚠️ خطأ في migrateOffersTable:', err.message);
  }
}

function migrateNotificationsAndLeaves() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        user_type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        type TEXT DEFAULT 'info',
        data TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, user_type, is_read);

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
      );

      CREATE TABLE IF NOT EXISTS doctor_leaves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doctor_id INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'planned',
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notified_at DATETIME,
        FOREIGN KEY (doctor_id) REFERENCES doctors(id)
      );
    `);
    console.log('✅ تم فحص وإنشاء جداول الإشعارات والعمولات والإجازات');
  } catch (err) {
    console.error('⚠️ خطأ في migrateNotificationsAndLeaves:', err.message);
  }
}

function migrateChatTables() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER,
        secretary_id INTEGER,
        clinic_id INTEGER,
        target_type TEXT NOT NULL CHECK(target_type IN ('doctor', 'secretary')),
        last_message TEXT,
        last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        patient_unread_count INTEGER DEFAULT 0,
        staff_unread_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
        FOREIGN KEY (secretary_id) REFERENCES secretaries(id) ON DELETE SET NULL,
        FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        sender_type TEXT NOT NULL CHECK(sender_type IN ('patient', 'doctor', 'secretary')),
        sender_id INTEGER NOT NULL,
        message_text TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_chat_conv_patient ON chat_conversations(patient_id);
      CREATE INDEX IF NOT EXISTS idx_chat_conv_doctor ON chat_conversations(doctor_id);
      CREATE INDEX IF NOT EXISTS idx_chat_conv_sec ON chat_conversations(secretary_id);
      CREATE INDEX IF NOT EXISTS idx_chat_msgs_conv ON chat_messages(conversation_id, created_at);

      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      INSERT OR IGNORE INTO system_settings (key, value) VALUES ('chat_retention_days', '0');
      INSERT OR IGNORE INTO system_settings (key, value) VALUES ('chat_retention_hours', '48');
      INSERT OR IGNORE INTO system_settings (key, value) VALUES ('chat_enabled', '1');
      INSERT OR IGNORE INTO system_settings (key, value) VALUES ('chat_mode', 'all');
    `);
    console.log('✅ تم إنشاء جداول الدردشة وإعدادات النظام بنجاح');
  } catch (err) {
    console.error('⚠️ خطأ في migrateChatTables:', err.message);
  }
}


function migrateGoldenBookingsAndReviews() {
  try {
    const columns = db.prepare('PRAGMA table_info(appointments)').all();
    const columnNames = columns.map(c => c.name);

    if (!columnNames.includes('queue_number')) {
      db.exec('ALTER TABLE appointments ADD COLUMN queue_number INTEGER DEFAULT 1');
      console.log('🆕 appointments: أُضيف عمود queue_number');
    }
    if (!columnNames.includes('is_golden')) {
      db.exec('ALTER TABLE appointments ADD COLUMN is_golden INTEGER DEFAULT 0');
      console.log('🆕 appointments: أُضيف عمود is_golden');
    }
    if (!columnNames.includes('transaction_id')) {
      db.exec('ALTER TABLE appointments ADD COLUMN transaction_id TEXT');
      console.log('🆕 appointments: أُضيف عمود transaction_id');
    }
    const payCols = db.prepare('PRAGMA table_info(payments)').all().map(c => c.name);
    if (!payCols.includes('transaction_id')) {
      db.exec('ALTER TABLE payments ADD COLUMN transaction_id TEXT');
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS appointment_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        appointment_id INTEGER UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        clinic_id INTEGER,
        secretary_id INTEGER,
        rating_hospital INTEGER DEFAULT 5,
        rating_doctor INTEGER DEFAULT 5,
        rating_secretary INTEGER DEFAULT 5,
        rating_service INTEGER DEFAULT 5,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_reviews_appt ON appointment_reviews(appointment_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_doc ON appointment_reviews(doctor_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_user ON appointment_reviews(user_id);
    `);

    db.prepare("INSERT OR IGNORE INTO system_settings (key, value) VALUES ('golden_seats_count', '3')").run();

    console.log('✅ تم ترحيل جداول وأعمدة الحجز الذهبي والتقييمات بنجاح');
  } catch (err) {
    console.error('⚠️ خطأ في migrateGoldenBookingsAndReviews:', err.message);
  }
}

function migratePerformanceIndexes() {
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_reg_requests_status_type ON registration_requests(status, type, created_at);
      CREATE INDEX IF NOT EXISTS idx_reg_requests_user ON registration_requests(user_id, type);
      CREATE INDEX IF NOT EXISTS idx_doctors_phone ON doctors(phone);
      CREATE INDEX IF NOT EXISTS idx_doctors_clinic_name ON doctors(clinic_name);
      CREATE INDEX IF NOT EXISTS idx_doctors_status ON doctors(status, is_active, is_deleted);
      CREATE INDEX IF NOT EXISTS idx_secretaries_phone ON secretaries(phone);
      CREATE INDEX IF NOT EXISTS idx_secretaries_clinic ON secretaries(clinic_id);
      CREATE INDEX IF NOT EXISTS idx_secretaries_status ON secretaries(status, is_active);
      CREATE INDEX IF NOT EXISTS idx_doctor_clinics_both ON doctor_clinics(clinic_id, doctor_id);
      CREATE INDEX IF NOT EXISTS idx_doctor_periods_perf ON doctor_periods(doctor_id, date, is_cancelled, is_stopped);
      CREATE INDEX IF NOT EXISTS idx_clinics_active_name ON clinics(is_active, name);
    `);

    // 🚀 تطبيق فهارس الأداء المتقدمة من indexes.sql
    const indexesPath = path.join(process.cwd(), 'src/config/indexes.sql');
    if (fs.existsSync(indexesPath)) {
      const sql = fs.readFileSync(indexesPath, 'utf8');
      db.exec(sql);
    }

    console.log('⚡ تم إنشاء وفحص جميع فهارس تحسين الأداء بنجاح');
  } catch (err) {
    console.warn('⚠️ خطأ في migratePerformanceIndexes:', err.message);
  }
}

export function seedAdmin() {
  const existing = db.prepare('SELECT * FROM admins WHERE username = ?').get('admin');

  if (!existing) {
    // 🆕 قراءة من environment
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123456';
    const adminUsername = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
    const adminFullName = process.env.ADMIN_DEFAULT_NAME || 'المدير العام';

    if (!adminPassword) {
      console.error('❌ ADMIN_DEFAULT_PASSWORD غير محدد في .env');
      console.error('⚠️ لن يتم إنشاء حساب الأدمن تلقائياً');
      return;
    }

    if (adminPassword.length < 8) {
      console.error('❌ ADMIN_DEFAULT_PASSWORD قصير جداً — يجب أن يكون 8 أحرف على الأقل');
      return;
    }

    const passwordHash = bcrypt.hashSync(adminPassword, 12);

    db.prepare(`
      INSERT INTO admins (username, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `).run(adminUsername, passwordHash, adminFullName, 'admin');

    console.log('✅ تم إنشاء الأدمن الافتراضي');
    console.log('   اسم المستخدم:', adminUsername);
    console.log('   كلمة المرور: [محفوظة في .env]');
  } else {
    const adminPassword = 'admin123456';
    const passwordHash = bcrypt.hashSync(adminPassword, 12);
    db.prepare('UPDATE admins SET password_hash = ?, is_active = 1 WHERE username = ?').run(passwordHash, 'admin');
  }
}

export function seedDefaultData() {
  try {
    // 1. Clinics
    const clinicCount = db.prepare('SELECT COUNT(*) as count FROM clinics').get().count;
    if (clinicCount === 0) {
      const insertClinic = db.prepare(`
        INSERT INTO clinics (name, governorate, address, phone, is_active)
        VALUES (?, ?, ?, ?, 1)
      `);
      insertClinic.run('الامل', 'صنعاء', 'الأربعين', '7867858758');
      insertClinic.run('عيادة النور', 'صنعاء', 'شارع الزبيري - أمام مستشفى الكويت', '967777111111');
      insertClinic.run('عيادة الشفاء', 'صنعاء', 'شارع حدة - جوار صيدلية النهدي', '967777222222');
      insertClinic.run('مستشفى السلام', 'صنعاء', 'شارع الستين - جوار مسجد الرحمة', '967777333333');
      insertClinic.run('مركز البصر', 'عدن', 'شارع المعلا - جوار البنك الأهلي', '967777444444');
      insertClinic.run('عيادة العظام', 'تعز', 'شارع جمال - أمام حديقة الشهداء', '967777555555');
      console.log('✅ تم تزويد العيادات الافتراضية');
    }

    // 2. Doctors
    const doctorCount = db.prepare('SELECT COUNT(*) as count FROM doctors WHERE is_deleted = 0').get().count;
    if (doctorCount < 9) {
      const doctorsList = [
        { name: 'د. أحمد محمد سالم', spec: 'باطنية', clinic: 'عيادة النور', phone: '781234567', fee: 4500, gov: 'صنعاء' },
        { name: 'د. أحمد محمد', spec: 'قلب', clinic: 'عيادة النور', phone: '967777100001', fee: 5000, gov: 'صنعاء' },
        { name: 'د. سارة علي', spec: 'جلدية', clinic: 'عيادة الشفاء', phone: '967777100002', fee: 4000, gov: 'صنعاء' },
        { name: 'د. خالد عبدالله', spec: 'أطفال', clinic: 'مستشفى السلام', phone: '967777100003', fee: 3500, gov: 'صنعاء' },
        { name: 'د. منى حسن', spec: 'عيون', clinic: 'مركز البصر', phone: '967777100004', fee: 6000, gov: 'عدن' },
        { name: 'د. عمر يوسف', spec: 'عظام', clinic: 'عيادة العظام', phone: '967777100005', fee: 7000, gov: 'تعز' },
        { name: 'د. ليلى إبراهيم', spec: 'نساء وتوليد', clinic: 'عيادة الشفاء', phone: '967777100006', fee: 5500, gov: 'صنعاء' },
        { name: 'د. يوسف الحكيمي', spec: 'باطنية', clinic: 'عيادة النور', phone: '967777100007', fee: 4500, gov: 'صنعاء' },
        { name: 'د. هدى سالم', spec: 'نفسية', clinic: 'مستشفى السلام', phone: '967777100008', fee: 6000, gov: 'صنعاء' }
      ];

      for (const d of doctorsList) {
        const exist = db.prepare('SELECT id FROM doctors WHERE phone = ?').get(d.phone);
        if (!exist) {
          db.prepare(`
            INSERT INTO doctors (full_name, specialty, clinic_name, phone, consultation_fee, governorate, is_active, status, experience_years, rating, slot_duration)
            VALUES (?, ?, ?, ?, ?, ?, 1, 'approved', 10, 4.8, 20)
          `).run(d.name, d.spec, d.clinic, d.phone, d.fee, d.gov);
        }
      }
      console.log('✅ تم تزويد الأطباء الافتراضيين');
    }

    // 3. Schedules & Periods
    const periodCount = db.prepare("SELECT COUNT(*) as count FROM doctor_periods WHERE date >= date('now')").get().count;
    if (periodCount === 0) {
      const insertPeriod = db.prepare(`
        INSERT OR IGNORE INTO doctor_periods (doctor_id, date, start_time, end_time, max_bookings, booked_count, is_cancelled, is_stopped)
        VALUES (?, ?, ?, ?, ?, ?, 0, 0)
      `);
      const today = new Date();
      const formatDate = dt => {
        const y = dt.getFullYear();
        const mo = String(dt.getMonth() + 1).padStart(2, '0');
        const da = String(dt.getDate()).padStart(2, '0');
        return `${y}-${mo}-${da}`;
      };

      const docRows = db.prepare('SELECT id FROM doctors WHERE is_deleted = 0').all();
      for (const doc of docRows) {
        for (let i = 0; i < 14; i++) {
          const pDate = new Date(today);
          pDate.setDate(today.getDate() + i);
          if (pDate.getDay() !== 5) {
            const dStr = formatDate(pDate);
            const bookedM = (doc.id * 2 + i) % 8;
            const bookedE = (doc.id + i * 2) % 6;
            insertPeriod.run(doc.id, dStr, '09:00', '13:00', 12, bookedM);
            insertPeriod.run(doc.id, dStr, '16:00', '20:00', 10, bookedE);
          }
        }
      }
      console.log('✅ تم تزويد فترات الحجز للأطباء');
    }

    // 4. Offers: لا نضيف عروضاً تجريبية بعد الآن
  } catch (err) {
    console.error('⚠️ خطأ في seedDefaultData:', err.message);
  }
}
