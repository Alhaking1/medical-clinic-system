import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || './data/medical.db';
const dbDir = path.dirname(dbPath);

// ── 1. تأكد من وجود المجلد ─────────────────────
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('📁 أنشئ مجلد قاعدة البيانات:', dbDir);
}

// ── 2. فحص ترويسة SQLite قبل الفتح ─────────────
const SQLITE_HEADER = Buffer.from('SQLite format 3\0', 'utf8');

function isValidSqlite(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null; // غير موجود = جديد
    const stat = fs.statSync(filePath);
    if (stat.size === 0) return false; // فارغ = تالف

    const fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(16);
    fs.readSync(fd, header, 0, 16, 0);
    fs.closeSync(fd);

    return header.equals(SQLITE_HEADER);
  } catch (err) {
    console.error('⚠️  خطأ في فحص الملف:', err.message);
    return false;
  }
}

const validity = isValidSqlite(dbPath);

if (validity === false) {
  const corrupted = `${dbPath}.corrupted.${Date.now()}`;
  console.error('❌ ملف قاعدة البيانات تالف — سيُعاد تسميته إلى:', corrupted);
  try {
    fs.renameSync(dbPath, corrupted);
    // احذف ملفات WAL/SHM المرافقة
    for (const suffix of ['-wal', '-shm', '-journal']) {
      const f = dbPath + suffix;
      if (fs.existsSync(f)) {
        fs.renameSync(f, corrupted + suffix);
      }
    }
  } catch (err) {
    console.error('⚠️  فشل في إعادة التسمية:', err.message);
    fs.unlinkSync(dbPath); // احذف بدلاً من ذلك
  }
}

// ── 3. افتح قاعدة البيانات ─────────────────────
let db;
try {
  db = new Database(dbPath);
} catch (err) {
  console.error('❌ فشل فتح قاعدة البيانات:', err.message);
  throw err;
}

// ── 4. إعدادات الأداء والسلامة ─────────────────
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');

// ── 5. تسجيل حالة قاعدة البيانات وهجرة الأعمدة ───────────────
try {
  const clinicCols = db.prepare('PRAGMA table_info(clinics)').all().map(c => c.name);
  if (clinicCols.length > 0 && !clinicCols.includes('commission_rate')) {
    db.prepare('ALTER TABLE clinics ADD COLUMN commission_rate REAL DEFAULT NULL').run();
    console.log('✅ تم إضافة عمود commission_rate إلى جدول clinics');
  }

  // إضافة رصيد المحفظة إلى جدول المرضى
  const patientCols = db.prepare('PRAGMA table_info(patients)').all().map(c => c.name);
  if (patientCols.length > 0 && !patientCols.includes('balance')) {
    db.prepare('ALTER TABLE patients ADD COLUMN balance REAL DEFAULT 0.0').run();
    console.log('✅ تم إضافة عمود balance إلى جدول patients');
  }

  // جدول معاملات المحفظة (شحن، خصم، استرجاع)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL, -- 'deposit', 'payment', 'refund', 'admin_adjustment'
      description TEXT,
      appointment_id INTEGER,
      created_by TEXT, -- 'patient', 'admin', 'system'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
    )
  `).run();

  // جدول طلبات شحن المحفظة (التحويلات المرسلة للأدمن للموافقة)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS wallet_deposit_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      reference_number TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
      admin_notes TEXT,
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )
  `).run();
  console.log('✅ تم فحص وإنشاء جدول wallet_deposit_requests بنجاح');

} catch (e) {
  console.error('Migration notice:', e.message);
}


const sizeKB = (fs.statSync(dbPath).size / 1024).toFixed(2);
console.log('✅ قاعدة البيانات متصلة:', dbPath);
console.log(`   📊 الحجم: ${sizeKB} KB`);
console.log(`   🔒 journal_mode: ${db.pragma('journal_mode', { simple: true })}`);
console.log(`   🔗 foreign_keys: ${db.pragma('foreign_keys', { simple: true })}`);

export default db;
