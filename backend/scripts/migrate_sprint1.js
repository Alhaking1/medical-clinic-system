import Database from 'better-sqlite3';
const db = new Database('C:/Users/lenovo/backend/data/medical.db');

try {
  db.exec("ALTER TABLE appointments ADD COLUMN attendance_status TEXT DEFAULT 'pending';");
  console.log('Added attendance_status');
} catch (e) {
  console.log('attendance_status:', e.message);
}

try {
  db.exec("ALTER TABLE appointments ADD COLUMN sequential_booking_number INTEGER;");
  console.log('Added sequential_booking_number');
} catch (e) {
  console.log('sequential_booking_number:', e.message);
}

// Backfill sequential_booking_number for existing records if null
try {
  const clinics = db.prepare("SELECT DISTINCT clinic_id FROM appointments WHERE clinic_id IS NOT NULL").all();
  for (const c of clinics) {
    const appts = db.prepare("SELECT id, created_at FROM appointments WHERE clinic_id = ? ORDER BY created_at ASC").all(c.clinic_id);
    let seq = 1;
    for (const a of appts) {
      db.prepare("UPDATE appointments SET sequential_booking_number = ? WHERE id = ? AND sequential_booking_number IS NULL").run(seq++, a.id);
    }
  }
  console.log('Sequential numbers backfilled for existing records');
} catch (e) {
  console.log('Backfill error:', e.message);
}

const cols = db.prepare("PRAGMA table_info(appointments)").all().map(c => c.name);
console.log('Appointments columns:', cols);
