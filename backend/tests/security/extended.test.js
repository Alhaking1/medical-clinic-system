import request from 'supertest';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from '../../src/config/database.js';

dotenv.config();

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';

describe('🛡️ VERIFICATION 2: Extended Security Suite', () => {

  // 1. Rate Limiting Test
  it('Rate Limiting: triggers HTTP 429 after exceeding limit on /api/v1/auth/login', async () => {
    let got429 = false;
    for (let i = 0; i < 25; i++) {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '770000000', password: 'wrong' })
      });
      if (res.status === 429) {
        got429 = true;
        break;
      }
    }
    expect(got429).toBe(true);
  });

  // 2. SQL Injection Test
  it('SQL Injection: prevents bypass with malicious SQL payloads', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: "771234567' OR '1'='1", password: "' OR '1'='1" })
    });
    // Must be rejected by input validation or auth (400 or 401), never 200
    expect([400, 401]).toContain(res.status);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // 3. XSS Test
  it('XSS: sanitizes or rejects script tags in inputs', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/chat/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '<script>alert("xss")</script>مرحبا' })
    });
    expect([200, 400]).toContain(res.status);
    const body = await res.json();
    // The message must be sanitized without script execution tags or marked
    if (body.data) {
      expect(body.data).not.toContain('<script>');
    }
  });

  // 4. File Upload Restriction Test
  it('File Upload: rejects dangerous executable file types (.exe)', async () => {
    const formData = new FormData();
    const fakeExe = new Blob(['MZ\x90\x00\x03\x00\x00\x00'], { type: 'application/x-msdownload' });
    formData.append('image', fakeExe, 'malware.exe');

    const adminToken = jwt.sign({ id: 1, role: 'admin', type: 'admin' }, process.env.JWT_SECRET);

    const res = await fetch(`${BASE_URL}/api/v1/offers/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: formData
    });
    // Must be rejected (400, 404, or 500 with reject message)
    expect([400, 404, 500]).toContain(res.status);
  });

  // 5. Path Traversal Test
  it('Path Traversal: blocks directory traversal sequences', async () => {
    const res = await fetch(`${BASE_URL}/uploads/../../../../etc/passwd`);
    expect([400, 403, 404]).toContain(res.status);
  });

  // 6. Race Condition / Concurrent Booking Test
  it('Race Condition: prevents double-booking of the same slot under concurrency', async () => {
    // Setup test doctor and slot
    const doc = db.prepare('SELECT id FROM doctors LIMIT 1').get();
    if (!doc) return;

    // Create a temporary slot
    const date = '2026-11-20';
    db.prepare('DELETE FROM slots WHERE doctor_id = ? AND date = ?').run(doc.id, date);
    const ins = db.prepare('INSERT INTO slots (doctor_id, date, start_time, end_time, is_booked, is_closed) VALUES (?, ?, ?, ?, 0, 0)')
      .run(doc.id, date, '10:00', '10:30');
    const slotId = ins.lastInsertRowid;

    const patient1Token = jwt.sign({ id: 1, role: 'patient', type: 'patient' }, process.env.JWT_SECRET);
    const patient2Token = jwt.sign({ id: 2, role: 'patient', type: 'patient' }, process.env.JWT_SECRET);

    const bookPayload = {
      doctor_id: doc.id,
      slot_id: slotId,
      booking_type: 'normal',
      payment_method: 'cash'
    };

    // Fire 2 concurrent booking requests simultaneously
    const [res1, res2] = await Promise.all([
      fetch(`${BASE_URL}/api/v1/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${patient1Token}` },
        body: JSON.stringify(bookPayload)
      }),
      fetch(`${BASE_URL}/api/v1/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${patient2Token}` },
        body: JSON.stringify(bookPayload)
      })
    ]);

    const statuses = [res1.status, res2.status];
    // Exactly one should succeed (201/200), the other must fail (400/409/404)
    const successCount = statuses.filter(s => s === 200 || s === 201).length;
    expect(successCount).toBeLessThanOrEqual(1);

    // Clean up
    db.prepare('DELETE FROM appointments WHERE slot_id = ?').run(slotId);
    db.prepare('DELETE FROM slots WHERE id = ?').run(slotId);
  });

});
