import express from 'express';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ==================== مواعيد طبيب ====================
router.get('/doctor/:doctorId', (req, res) => {
  try {
    const { date } = req.query;

    let query = 'SELECT * FROM slots WHERE doctor_id = ?';
    const params = [req.params.doctorId];

    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }

    query += ' ORDER BY date, start_time';

    const slots = db.prepare(query).all(...params);
    res.json({ success: true, data: slots });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إنشاء مواعيد لطبيب (توليد تلقائي) ====================
router.post('/generate', authenticate, (req, res) => {
  try {
    const { doctor_id, date, start_time, end_time, duration } = req.body;

    if (!doctor_id || !date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة',
      });
    }

    const durationMin = Number(duration) || 20;

    const [startH, startM] = start_time.split(':').map(Number);
    const [endH, endM] = end_time.split(':').map(Number);

    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (endTotal <= startTotal) {
      return res.status(400).json({
        success: false,
        message: 'وقت النهاية يجب أن يكون بعد وقت البداية',
      });
    }

    const slots = [];
    for (let t = startTotal; t + durationMin <= endTotal; t += durationMin) {
      const h = Math.floor(t / 60).toString().padStart(2, '0');
      const m = (t % 60).toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
    }

    const insert = db.prepare(`
      INSERT OR IGNORE INTO slots (doctor_id, date, start_time, end_time, created_by)
      VALUES (?, ?, ?, ?, ?)
    `);

    let created = 0;
    for (const slot of slots) {
      const [h, m] = slot.split(':').map(Number);
      const endMin = h * 60 + m + durationMin;
      const endH = Math.floor(endMin / 60).toString().padStart(2, '0');
      const endM = (endMin % 60).toString().padStart(2, '0');

      const result = insert.run(
        doctor_id,
        date,
        slot,
        `${endH}:${endM}`,
        req.user.id
      );
      if (result.changes > 0) created++;
    }

    res.json({
      success: true,
      message: `تم إنشاء ${created} موعد`,
      data: { created, total: slots.length },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== فتح/إغلاق موعد ====================
router.patch('/:id/toggle', authenticate, authorize('admin', 'doctor', 'secretary'), (req, res) => {
  try {
    const slot = db.prepare('SELECT * FROM slots WHERE id = ?').get(req.params.id);

    if (!slot) {
      return res.status(404).json({ success: false, message: 'الموعد غير موجود' });
    }

    if (slot.is_booked) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تعديل موعد محجوز',
      });
    }

    const newStatus = slot.is_closed ? 0 : 1;
    db.prepare('UPDATE slots SET is_closed = ? WHERE id = ?').run(
      newStatus,
      req.params.id
    );

    res.json({
      success: true,
      message: newStatus ? 'تم إغلاق الموعد' : 'تم فتح الموعد',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== حذف موعد ====================
router.delete('/:id', authenticate, authorize('admin', 'doctor', 'secretary'), (req, res) => {
  try {
    const slot = db.prepare('SELECT * FROM slots WHERE id = ?').get(req.params.id);

    if (!slot) {
      return res.status(404).json({ success: false, message: 'الموعد غير موجود' });
    }

    if (slot.is_booked) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حذف موعد محجوز',
      });
    }

    db.prepare('DELETE FROM slots WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: 'تم حذف الموعد' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== حذف كل مواعيد يوم (غير محجوزة) ====================
router.delete('/doctor/:doctorId/date/:date', authenticate, authorize('admin', 'doctor', 'secretary'), (req, res) => {
  try {
    const result = db
      .prepare(
        'DELETE FROM slots WHERE doctor_id = ? AND date = ? AND is_booked = 0'
      )
      .run(req.params.doctorId, req.params.date);

    res.json({
      success: true,
      message: `تم حذف ${result.changes} موعد`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;