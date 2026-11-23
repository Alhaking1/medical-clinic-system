import express from 'express';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ═══════════════════════════════════════════
// Helper: التحقق من صلاحية المستخدم على الطبيب
// ═══════════════════════════════════════════
function canAccessDoctor(user, doctorId) {
  if (user.type === 'admin') return true;
  if (user.type === 'doctor') return user.id === Number(doctorId);

  if (user.type === 'secretary') {
    const secretary = db.prepare(
      'SELECT clinic_id FROM secretaries WHERE id = ?'
    ).get(user.id);

    if (!secretary || !secretary.clinic_id) return false;

    const doctor = db.prepare(`
      SELECT d.id FROM doctors d
      LEFT JOIN doctor_clinics dc ON d.id = dc.doctor_id
      WHERE d.id = ?
        AND (dc.clinic_id = ? OR d.clinic_name = (SELECT name FROM clinics WHERE id = ?))
    `).get(doctorId, secretary.clinic_id, secretary.clinic_id);

    return !!doctor;
  }

  return false;
}

// ═══════════════════════════════════════════
// Helper: توليد رقم الطابور التالي
// ═══════════════════════════════════════════
function getNextQueueNumber(doctorId) {
  const today = new Date().toISOString().split('T')[0];
  const row = db.prepare(`
    SELECT MAX(queue_number) as max_num
    FROM queue
    WHERE doctor_id = ?
      AND DATE(checked_in_at) = DATE(?)
  `).get(doctorId, today);

  return (row?.max_num || 0) + 1;
}

// ═══════════════════════════════════════════
// GET /check-in/search — البحث عن حجز
// ═══════════════════════════════════════════
router.get('/search', authenticate, authorize('secretary', 'admin'), (req, res) => {
  try {
    const { q, doctor_id } = req.query;

    if (!q || q.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'يجب إدخال 3 أحرف على الأقل للبحث'
      });
    }

    const searchTerm = `%${q.trim()}%`;

    // البحث في الحجوزات اليومية (confirmed + pending)
    let query = `
      SELECT
        a.id, a.booking_code, a.status, a.payment_status, a.fee,
        a.doctor_id, a.period_id, a.created_at,
        p.full_name as patient_name,
        p.phone as patient_phone,
        d.full_name as doctor_name,
        d.specialty as doctor_specialty,
        d.clinic_name,
        per.date as period_date,
        per.start_time as period_start_time,
        per.end_time as period_end_time,
        (SELECT id FROM queue WHERE appointment_id = a.id AND DATE(checked_in_at) = DATE('now') AND status != 'done' LIMIT 1) as queue_id
      FROM appointments a
      LEFT JOIN patients p ON a.user_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN doctor_periods per ON a.period_id = per.id
      WHERE (a.booking_code LIKE ? OR p.phone LIKE ?)
        AND a.status NOT IN ('cancelled', 'no_show')
    `;
    const params = [searchTerm, searchTerm];

    if (doctor_id) {
      query += ' AND a.doctor_id = ?';
      params.push(doctor_id);
    }

    query += ' ORDER BY a.created_at DESC LIMIT 20';

    let appointments = db.prepare(query).all(...params);

    // فلترة حسب دور السكرتيرة (فقط أطباء عيادتها)
    if (req.user.type === 'secretary') {
      appointments = appointments.filter(a => canAccessDoctor(req.user, a.doctor_id));
    }

    res.json({
      success: true,
      data: appointments,
      meta: { count: appointments.length, query: q }
    });
  } catch (err) {
    console.error('خطأ في البحث:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// GET /check-in/today — حجوزات اليوم
// ═══════════════════════════════════════════
router.get('/today', authenticate, authorize('secretary', 'admin', 'doctor'), (req, res) => {
  try {
    const { doctor_id } = req.query;
    const today = new Date().toISOString().split('T')[0];

    let query = `
      SELECT
        a.id, a.booking_code, a.status, a.payment_status, a.fee,
        a.doctor_id,
        p.full_name as patient_name,
        p.phone as patient_phone,
        d.full_name as doctor_name,
        d.specialty as doctor_specialty,
        per.date as period_date,
        per.start_time as period_start_time,
        per.end_time as period_end_time,
        (SELECT id FROM queue WHERE appointment_id = a.id AND DATE(checked_in_at) = DATE('now') LIMIT 1) as queue_id,
        (SELECT queue_number FROM queue WHERE appointment_id = a.id AND DATE(checked_in_at) = DATE('now') LIMIT 1) as queue_number,
        (SELECT status FROM queue WHERE appointment_id = a.id AND DATE(checked_in_at) = DATE('now') LIMIT 1) as queue_status
      FROM appointments a
      LEFT JOIN patients p ON a.user_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN doctor_periods per ON a.period_id = per.id
      WHERE DATE(per.date) = DATE(?)
        AND a.status NOT IN ('cancelled', 'no_show')
    `;
    const params = [today];

    if (doctor_id) {
      query += ' AND a.doctor_id = ?';
      params.push(doctor_id);
    }

    // الطبيب يرى حجوزاته فقط
    if (req.user.type === 'doctor') {
      query += ' AND a.doctor_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY per.start_time ASC';

    let appointments = db.prepare(query).all(...params);

    // فلترة السكرتيرة
    if (req.user.type === 'secretary') {
      appointments = appointments.filter(a => canAccessDoctor(req.user, a.doctor_id));
    }

    res.json({
      success: true,
      data: appointments,
      meta: {
        date: today,
        total: appointments.length,
        checked_in: appointments.filter(a => a.queue_id).length,
        waiting: appointments.filter(a => a.queue_status === 'waiting').length
      }
    });
  } catch (err) {
    console.error('خطأ في جلب حجوزات اليوم:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// POST /check-in — تسجيل وصول
// ═══════════════════════════════════════════
router.post('/', authenticate, authorize('secretary', 'admin'), (req, res) => {
  try {
    const { appointment_id, booking_code, phone } = req.body;

    if (!appointment_id && !booking_code && !phone) {
      return res.status(400).json({
        success: false,
        message: 'يجب تقديم appointment_id أو booking_code أو phone'
      });
    }

    // البحث عن الحجز
    let appointment = null;
    if (appointment_id) {
      appointment = db.prepare(`
        SELECT a.*, p.full_name as patient_name, p.phone as patient_phone,
               d.full_name as doctor_name, per.date as period_date,
               per.start_time as period_start_time, per.end_time as period_end_time
        FROM appointments a
        LEFT JOIN patients p ON a.user_id = p.id
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN doctor_periods per ON a.period_id = per.id
        WHERE a.id = ?
      `).get(appointment_id);
    } else if (booking_code) {
      appointment = db.prepare(`
        SELECT a.*, p.full_name as patient_name, p.phone as patient_phone,
               d.full_name as doctor_name, per.date as period_date,
               per.start_time as period_start_time, per.end_time as period_end_time
        FROM appointments a
        LEFT JOIN patients p ON a.user_id = p.id
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN doctor_periods per ON a.period_id = per.id
        WHERE a.booking_code = ?
      `).get(booking_code);
    } else if (phone) {
      // آخر حجز نشط لهذا الرقم
      const cleanPhone = String(phone).replace(/^(\+?967)/, '');
      appointment = db.prepare(`
        SELECT a.*, p.full_name as patient_name, p.phone as patient_phone,
               d.full_name as doctor_name, per.date as period_date,
               per.start_time as period_start_time, per.end_time as period_end_time
        FROM appointments a
        LEFT JOIN patients p ON a.user_id = p.id
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN doctor_periods per ON a.period_id = per.id
        WHERE p.phone = ?
          AND a.status NOT IN ('cancelled', 'no_show', 'completed')
        ORDER BY a.created_at DESC
        LIMIT 1
      `).get(cleanPhone);
    }

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على الحجز'
      });
    }

    // التحقق من الحالة
    if (['cancelled', 'no_show'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تسجيل وصول لهذا الحجز (ملغي أو غائب)'
      });
    }

    // التحقق من الصلاحية
    if (!canAccessDoctor(req.user, appointment.doctor_id)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتسجيل وصول لهذا الطبيب'
      });
    }

    // التحقق: هل هو مسجّل مسبقاً في الطابور؟
    const existingQueue = db.prepare(`
      SELECT * FROM queue
      WHERE appointment_id = ?
        AND DATE(checked_in_at) = DATE('now')
        AND status != 'done'
    `).get(appointment.id);

    if (existingQueue) {
      return res.status(400).json({
        success: false,
        message: 'هذا المريض مسجّل بالفعل في الطابور',
        data: existingQueue
      });
    }

    // توليد رقم الطابور
    const queueNumber = getNextQueueNumber(appointment.doctor_id);

    // إضافة للطابور
    const result = db.prepare(`
      INSERT INTO queue
        (appointment_id, doctor_id, patient_name, patient_phone, queue_number, status)
      VALUES (?, ?, ?, ?, ?, 'waiting')
    `).run(
      appointment.id,
      appointment.doctor_id,
      appointment.patient_name || 'مريض',
      appointment.patient_phone || null,
      queueNumber
    );

    // تحديث حالة الحجز إلى confirmed (إذا كان pending)
    if (appointment.status === 'pending') {
      db.prepare(`
        UPDATE appointments
        SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(appointment.id);
    }

    const queueItem = db.prepare('SELECT * FROM queue WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'تم تسجيل الوصول بنجاح',
      data: {
        queue: queueItem,
        appointment: {
          id: appointment.id,
          booking_code: appointment.booking_code,
          patient_name: appointment.patient_name,
          doctor_name: appointment.doctor_name,
          period_start_time: appointment.period_start_time,
          period_date: appointment.period_date
        }
      }
    });
  } catch (err) {
    console.error('خطأ في تسجيل الوصول:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
