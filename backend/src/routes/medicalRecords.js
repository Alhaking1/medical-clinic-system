import express from 'express';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ═══════════════════════════════════════════
// Helper: التحقق من صلاحية الطبيب على الحجز
// ═══════════════════════════════════════════
function canDoctorAccessAppointment(user, appointment) {
  if (user.type === 'admin') return true;
  if (user.type === 'doctor') return user.id === appointment.doctor_id;
  return false;
}

// ═══════════════════════════════════════════
// POST /medical-records — إنشاء سجل طبي
// ═══════════════════════════════════════════
router.post('/', authenticate, authorize('doctor', 'admin'), (req, res) => {
  try {
    const {
      appointment_id,
      diagnosis,
      prescription,
      lab_tests,
      notes,
      follow_up_date
    } = req.body;

    if (!appointment_id) {
      return res.status(400).json({
        success: false,
        message: 'appointment_id مطلوب'
      });
    }

    // التحقق من الحجز
    const appointment = db.prepare(`
      SELECT a.*, p.full_name as patient_name
      FROM appointments a
      LEFT JOIN patients p ON a.user_id = p.id
      WHERE a.id = ?
    `).get(appointment_id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'الحجز غير موجود'
      });
    }

    // التحقق من الصلاحية
    if (!canDoctorAccessAppointment(req.user, appointment)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بإضافة سجل لهذا الحجز'
      });
    }

    // التحقق: هل يوجد سجل مسبق؟
    const existing = db.prepare(`
      SELECT id FROM medical_records WHERE appointment_id = ?
    `).get(appointment_id);

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'يوجد سجل طبي لهذا الحجز مسبقاً. استخدم PUT للتعديل.',
        data: { id: existing.id }
      });
    }

    // إدراج
    const result = db.prepare(`
      INSERT INTO medical_records
        (appointment_id, user_id, doctor_id, diagnosis, prescription, lab_tests, notes, follow_up_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      appointment_id,
      appointment.user_id,
      appointment.doctor_id,
      diagnosis || null,
      prescription || null,
      lab_tests || null,
      notes || null,
      follow_up_date || null
    );

    const record = db.prepare(`
      SELECT r.*,
             p.full_name as patient_name,
             p.phone as patient_phone,
             d.full_name as doctor_name,
             a.booking_code
      FROM medical_records r
      LEFT JOIN patients p ON r.user_id = p.id
      LEFT JOIN doctors d ON r.doctor_id = d.id
      LEFT JOIN appointments a ON r.appointment_id = a.id
      WHERE r.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء السجل الطبي',
      data: record
    });
  } catch (err) {
    console.error('خطأ في إنشاء السجل الطبي:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// GET /medical-records/appointment/:appointmentId
// ═══════════════════════════════════════════
router.get('/appointment/:appointmentId', authenticate, authorize('doctor', 'admin'), (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = db.prepare(
      'SELECT * FROM appointments WHERE id = ?'
    ).get(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'الحجز غير موجود'
      });
    }

    if (!canDoctorAccessAppointment(req.user, appointment)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    const records = db.prepare(`
      SELECT r.*,
             p.full_name as patient_name,
             p.phone as patient_phone,
             d.full_name as doctor_name
      FROM medical_records r
      LEFT JOIN patients p ON r.user_id = p.id
      LEFT JOIN doctors d ON r.doctor_id = d.id
      WHERE r.appointment_id = ?
      ORDER BY r.created_at DESC
    `).all(appointmentId);

    res.json({
      success: true,
      data: records,
      meta: { count: records.length, appointment_id: appointmentId }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// GET /medical-records/patient/:patientId
// ═══════════════════════════════════════════
router.get('/patient/:patientId', authenticate, authorize('doctor', 'admin'), (req, res) => {
  try {
    const { patientId } = req.params;

    // الطبيب يرى فقط سجلاته هو (لحماية خصوصية الطبيب الآخر)
    let query = `
      SELECT r.*,
             p.full_name as patient_name,
             p.phone as patient_phone,
             d.full_name as doctor_name,
             a.booking_code
      FROM medical_records r
      LEFT JOIN patients p ON r.user_id = p.id
      LEFT JOIN doctors d ON r.doctor_id = d.id
      LEFT JOIN appointments a ON r.appointment_id = a.id
      WHERE r.user_id = ?
    `;
    const params = [patientId];

    if (req.user.type === 'doctor') {
      query += ' AND r.doctor_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY r.created_at DESC';

    const records = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: records,
      meta: { count: records.length, patient_id: patientId }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// GET /medical-records/my — سجلات المريض الحالي
// ═══════════════════════════════════════════
router.get('/my', authenticate, (req, res) => {
  try {
    if (req.user.type !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'هذا المسار للمرضى فقط'
      });
    }

    const records = db.prepare(`
      SELECT r.*,
             d.full_name as doctor_name,
             d.specialty as doctor_specialty,
             a.booking_code,
             per.date as period_date,
             per.start_time as period_start_time
      FROM medical_records r
      LEFT JOIN doctors d ON r.doctor_id = d.id
      LEFT JOIN appointments a ON r.appointment_id = a.id
      LEFT JOIN doctor_periods per ON a.period_id = per.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `).all(req.user.id);

    res.json({
      success: true,
      data: records,
      meta: { count: records.length }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// PUT /medical-records/:id — تعديل سجل (خلال 24 ساعة)
// ═══════════════════════════════════════════
router.put('/:id', authenticate, authorize('doctor', 'admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { diagnosis, prescription, lab_tests, notes, follow_up_date } = req.body;

    const record = db.prepare('SELECT * FROM medical_records WHERE id = ?').get(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'السجل غير موجود'
      });
    }

    // الطبيب يعدّل فقط سجلاته
    if (req.user.type === 'doctor' && record.doctor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتعديل سجل لطبيب آخر'
      });
    }

    // الأدمن يعدّل دائماً — الطبيب فقط خلال 24 ساعة
    if (req.user.type === 'doctor') {
      const hoursSince = (Date.now() - new Date(record.created_at).getTime()) / (1000 * 60 * 60);
      if (hoursSince > 24) {
        return res.status(403).json({
          success: false,
          message: 'لا يمكن تعديل السجل بعد 24 ساعة من إنشائه'
        });
      }
    }

    db.prepare(`
      UPDATE medical_records
      SET diagnosis = COALESCE(?, diagnosis),
          prescription = COALESCE(?, prescription),
          lab_tests = COALESCE(?, lab_tests),
          notes = COALESCE(?, notes),
          follow_up_date = COALESCE(?, follow_up_date)
      WHERE id = ?
    `).run(
      diagnosis || null,
      prescription || null,
      lab_tests || null,
      notes || null,
      follow_up_date || null,
      id
    );

    const updated = db.prepare('SELECT * FROM medical_records WHERE id = ?').get(id);

    res.json({
      success: true,
      message: 'تم تعديل السجل',
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// DELETE /medical-records/:id — حذف (أدمن فقط)
// ═══════════════════════════════════════════
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const { id } = req.params;

    const record = db.prepare('SELECT id FROM medical_records WHERE id = ?').get(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'السجل غير موجود'
      });
    }

    db.prepare('DELETE FROM medical_records WHERE id = ?').run(id);

    res.json({
      success: true,
      message: 'تم حذف السجل الطبي'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
