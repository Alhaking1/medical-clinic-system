import 'dotenv/config';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';

const db = new Database('./data/medical.db');
db.prepare("UPDATE patients SET status = 'approved', is_blocked = 0 WHERE id = 1").run();

const token = jwt.sign({ id: 1, role: 'admin', type: 'admin', full_name: 'Admin' }, process.env.JWT_SECRET);

// 1. تعطيل المحادثات
await fetch('http://localhost:8000/api/v1/admin/chat-settings', {
  method: 'PUT',
  headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ chat_enabled: false })
});

// 2. محاولة إنشاء محادثة بواسطة مريض
const patientToken = jwt.sign({ id: 1, role: 'patient', type: 'patient' }, process.env.JWT_SECRET);
const r2 = await fetch('http://localhost:8000/api/v1/chat/conversations', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + patientToken, 'Content-Type': 'application/json' },
  body: JSON.stringify({ doctor_id: 3 })
});
console.log('Graceful Chat status:', r2.status, await r2.json());

// 3. إعادة تفعيل المحادثات
await fetch('http://localhost:8000/api/v1/admin/chat-settings', {
  method: 'PUT',
  headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ chat_enabled: true })
});
console.log('Chat re-enabled successfully');
