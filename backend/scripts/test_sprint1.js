import 'dotenv/config';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';

const db = new Database('./data/medical.db');
const patient = db.prepare('SELECT id FROM patients LIMIT 1').get() || { id: 1 };
const doctor = db.prepare('SELECT id FROM doctors LIMIT 1').get() || { id: 1 };

const info = db.prepare(`
  INSERT INTO appointments (booking_code, user_id, doctor_id, status, payment_method, payment_status, attendance_status, sequential_booking_number)
  VALUES ('BK-TEST-101', ?, ?, 'confirmed', 'cash', 'unpaid', 'pending', 1)
`).run(patient.id, doctor.id);

console.log('Inserted test appointment id:', info.lastInsertRowid);

// Add a dummy medical record
try {
  db.prepare(`
    INSERT INTO medical_records (appointment_id, user_id, doctor_id, diagnosis, prescription, notes)
    VALUES (?, ?, ?, 'فحص عام وسليم', 'باراسيتامول 500 ملجم', 'حالة المريض مستقرة')
  `).run(info.lastInsertRowid, patient.id, doctor.id);
} catch (e) {
  console.log('Record error:', e.message);
}

const token = jwt.sign({ id: 1, role: 'admin', type: 'admin', full_name: 'Admin' }, process.env.JWT_SECRET);

const r1 = await fetch('http://localhost:8000/api/v1/admin/medical-records?limit=5', {
  headers: { 'Authorization': 'Bearer ' + token }
});
console.log('Medical records status:', r1.status, await r1.json());

const r2 = await fetch(`http://localhost:8000/api/v1/appointments/${info.lastInsertRowid}/attendance`, {
  method: 'PATCH',
  headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'arrived' })
});
console.log('Attendance status:', r2.status, await r2.json());
