import express from 'express';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

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

// ═══════════════════════════════════════════
// 🔔 الذكاء الاصطناعي للطابور: إرسال تنبيهات تقدم الطابور واقتراب الدور
// ═══════════════════════════════════════════
export function notifyQueueProgress(doctorId, currentQueueNumber, currentApptId = null) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. جلب بيانات الطبيب والعيادة
    const doctor = db.prepare('SELECT id, full_name, clinic_name FROM doctors WHERE id = ?').get(doctorId);
    const docName = doctor?.full_name ? ('د. ' + doctor.full_name) : 'الطبيب';
    const clinicName = doctor?.clinic_name || 'العيادة';

    // 2. إشعار المريض صاحب الدور الحالي (الذي حان دوره للدخول الآن)
    let currentAppt = null;
    if (currentApptId) {
      currentAppt = db.prepare(`
        SELECT a.*, p.id as patient_user_id, p.full_name as patient_name
        FROM appointments a
        LEFT JOIN patients p ON a.user_id = p.id
        WHERE a.id = ?
      `).get(currentApptId);
    } else {
      currentAppt = db.prepare(`
        SELECT a.*, p.id as patient_user_id, p.full_name as patient_name
        FROM appointments a
        LEFT JOIN patients p ON a.user_id = p.id
        WHERE a.doctor_id = ? AND a.queue_number = ?
          AND a.status NOT IN ('cancelled', 'completed')
          AND (DATE(COALESCE((SELECT date FROM doctor_periods WHERE id = a.period_id), (SELECT date FROM slots WHERE id = a.slot_id), a.created_at)) = DATE(?))
        ORDER BY a.id DESC LIMIT 1
      `).get(doctorId, currentQueueNumber, today);
    }

    if (currentAppt && currentAppt.patient_user_id) {
      createNotification(
        currentAppt.patient_user_id,
        'patient',
        '🏥 حان دورك الآن في العيادة!',
        `عزيزي ${currentAppt.patient_name || 'المريض'}، حان دورك رقم (#${currentQueueNumber}) الآن! يرجى التوجه فوراً لغرفة كشف ${docName} في ${clinicName}.`,
        'queue_turn_now',
        { appointment_id: currentAppt.id, queue_number: currentQueueNumber, doctor_id: doctorId }
      );
    }

    // 3. إشعار المريض التالي مباشرة (المتبقي قبله مريض واحد فقط: currentQueueNumber + 1)
    const nextAppt = db.prepare(`
      SELECT a.*, p.id as patient_user_id, p.full_name as patient_name
      FROM appointments a
      LEFT JOIN patients p ON a.user_id = p.id
      WHERE a.doctor_id = ? AND a.queue_number = ?
        AND a.status NOT IN ('cancelled', 'completed')
        AND (DATE(COALESCE((SELECT date FROM doctor_periods WHERE id = a.period_id), (SELECT date FROM slots WHERE id = a.slot_id), a.created_at)) = DATE(?))
      ORDER BY a.id DESC LIMIT 1
    `).get(doctorId, currentQueueNumber + 1, today);

    if (nextAppt && nextAppt.patient_user_id) {
      createNotification(
        nextAppt.patient_user_id,
        'patient',
        '⏳ أنت المريض التالي!',
        `عزيزي ${nextAppt.patient_name || 'المريض'}، يتبقى مريض واحد فقط أمامك (دورك #${currentQueueNumber + 1}). يرجى الاستعداد عند باب غرفة كشف ${docName}.`,
        'queue_next_soon',
        { appointment_id: nextAppt.id, queue_number: currentQueueNumber + 1, doctor_id: doctorId }
      );
    }

    // 4. إشعار المريض الذي يبتعد بـ 3 أدوار (المتبقي قبله 3 مرضى: currentQueueNumber + 3)
    const threeAwayAppt = db.prepare(`
      SELECT a.*, p.id as patient_user_id, p.full_name as patient_name
      FROM appointments a
      LEFT JOIN patients p ON a.user_id = p.id
      WHERE a.doctor_id = ? AND a.queue_number = ?
        AND a.status NOT IN ('cancelled', 'completed')
        AND (DATE(COALESCE((SELECT date FROM doctor_periods WHERE id = a.period_id), (SELECT date FROM slots WHERE id = a.slot_id), a.created_at)) = DATE(?))
      ORDER BY a.id DESC LIMIT 1
    `).get(doctorId, currentQueueNumber + 3, today);

    if (threeAwayAppt && threeAwayAppt.patient_user_id) {
      createNotification(
        threeAwayAppt.patient_user_id,
        'patient',
        '⏱️ تنبيه: تبقّى 3 مرضى قبل دورك!',
        `عزيزي ${threeAwayAppt.patient_name || 'المريض'}، يجري الآن كشف دور رقم #${currentQueueNumber}. تبقّى 3 مرضى فقط قبل دورك (#${currentQueueNumber + 3}). يرجى التواجد في صالة الانتظار.`,
        'queue_approaching',
        { appointment_id: threeAwayAppt.id, queue_number: currentQueueNumber + 3, doctor_id: doctorId }
      );
    }
  } catch (err) {
    console.error('⚠️ خطأ في إرسال إشعارات تقدم الطابور:', err.message);
  }
}

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
// POST /queue — إضافة مريض للطابور
// ═══════════════════════════════════════════
router.post('/', authenticate, authorize('secretary', 'admin'), (req, res) => {
  try {
    const { appointment_id, doctor_id, patient_name, patient_phone } = req.body;

    if (!doctor_id) {
      return res.status(400).json({
        success: false,
        message: 'doctor_id مطلوب'
      });
    }

    if (!canAccessDoctor(req.user, doctor_id)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول لهذا الطبيب'
      });
    }

    const doctor = db.prepare(
      'SELECT id FROM doctors WHERE id = ? AND is_deleted = 0'
    ).get(doctor_id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'الطبيب غير موجود'
      });
    }

    let finalPatientName = patient_name;
    let finalPatientPhone = patient_phone;

    if (appointment_id) {
      const appointment = db.prepare(`
        SELECT a.*, p.full_name as p_name, p.phone as p_phone
        FROM appointments a
        LEFT JOIN patients p ON a.user_id = p.id
        WHERE a.id = ? AND a.doctor_id = ?
      `).get(appointment_id, doctor_id);

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'الحجز غير موجود لهذا الطبيب'
        });
      }

      const existing = db.prepare(`
        SELECT id FROM queue
        WHERE appointment_id = ?
          AND DATE(checked_in_at) = DATE('now')
          AND status != 'done'
      `).get(appointment_id);

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'هذا المريض موجود بالفعل في الطابور'
        });
      }

      finalPatientName = appointment.patient_name || appointment.p_name || finalPatientName;
      finalPatientPhone = appointment.p_phone || finalPatientPhone;
    }

    const queueNumber = getNextQueueNumber(doctor_id);

    const result = db.prepare(`
      INSERT INTO queue
        (appointment_id, doctor_id, patient_name, patient_phone, queue_number, status)
      VALUES (?, ?, ?, ?, ?, 'waiting')
    `).run(
      appointment_id || null,
      doctor_id,
      finalPatientName || 'مريض',
      finalPatientPhone || null,
      queueNumber
    );

    const queueItem = db.prepare('SELECT * FROM queue WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'تم إضافة المريض للطابور',
      data: queueItem
    });
  } catch (err) {
    console.error('خطأ في إضافة الطابور:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// GET /queue/doctor/:doctorId — طابور الطبيب
// ═══════════════════════════════════════════
router.get('/doctor/:doctorId', authenticate, (req, res) => {
  try {
    const { doctorId } = req.params;
    const { status, date } = req.query;

    if (!canAccessDoctor(req.user, doctorId)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول لهذا الطابور'
      });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    let query = `
      SELECT q.*,
             a.booking_code,
             a.status as appointment_status,
             a.payment_status,
             a.fee,
             a.is_golden,
             a.transaction_id,
             a.patient_relationship,
             a.patient_age,
             a.patient_gender,
             a.family_member_id,
             d.full_name as doctor_name
      FROM queue q
      LEFT JOIN appointments a ON q.appointment_id = a.id
      LEFT JOIN doctors d ON q.doctor_id = d.id
      WHERE q.doctor_id = ?
        AND DATE(q.checked_in_at) = DATE(?)
    `;
    const params = [doctorId, targetDate];

    if (status) {
      query += ' AND q.status = ?';
      params.push(status);
    }

    query += `
      ORDER BY
        CASE q.status
          WHEN 'in_progress' THEN 1
          WHEN 'waiting' THEN 2
          WHEN 'done' THEN 3
          ELSE 4
        END,
        q.queue_number ASC
    `;

    const queue = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: queue,
      meta: {
        total: queue.length,
        waiting: queue.filter(q => q.status === 'waiting').length,
        in_progress: queue.filter(q => q.status === 'in_progress').length,
        done: queue.filter(q => q.status === 'done').length,
        date: targetDate
      }
    });
  } catch (err) {
    console.error('خطأ في جلب الطابور:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// GET /queue/doctor/:doctorId/stats — إحصائيات اليوم
// ═══════════════════════════════════════════
router.get('/doctor/:doctorId/stats', authenticate, (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!canAccessDoctor(req.user, doctorId)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    const today = new Date().toISOString().split('T')[0];

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done
      FROM queue
      WHERE doctor_id = ?
        AND DATE(checked_in_at) = DATE(?)
    `).get(doctorId, today);

    const appointments = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show
      FROM appointments
      WHERE doctor_id = ?
        AND DATE(created_at) = DATE(?)
    `).get(doctorId, today);

    res.json({
      success: true,
      data: {
        queue: stats || { total: 0, waiting: 0, in_progress: 0, done: 0 },
        appointments: appointments || { total: 0, completed: 0, no_show: 0 },
        date: today
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// PUT /queue/:id — تحديث الحالة
// ═══════════════════════════════════════════
router.put('/:id', authenticate, authorize('doctor', 'secretary', 'admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['waiting', 'in_progress', 'done'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'الحالة يجب أن تكون: waiting, in_progress, أو done'
      });
    }

    const item = db.prepare('SELECT * FROM queue WHERE id = ?').get(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'العنصر غير موجود في الطابور'
      });
    }

    if (!canAccessDoctor(req.user, item.doctor_id)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    let updateQuery = 'UPDATE queue SET status = ?';
    const updateParams = [status];

    if (status === 'in_progress') {
      updateQuery += ', started_at = COALESCE(started_at, CURRENT_TIMESTAMP)';
    } else if (status === 'done') {
      updateQuery += ', finished_at = CURRENT_TIMESTAMP';
    }

    updateQuery += ' WHERE id = ?';
    updateParams.push(id);

        db.prepare(updateQuery).run(...updateParams);

    if (status === 'in_progress') {
      notifyQueueProgress(item.doctor_id, item.queue_number, item.appointment_id);
    } else if (status === 'done') {
      notifyQueueProgress(item.doctor_id, item.queue_number + 1);
    }

    const updated = db.prepare('SELECT * FROM queue WHERE id = ?').get(id);

    res.json({
      success: true,
      message: 'تم تحديث الحالة',
      data: updated
    });
  } catch (err) {
    console.error('خطأ في تحديث الطابور:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// DELETE /queue/:id — إزالة من الطابور
// ═══════════════════════════════════════════
router.delete('/:id', authenticate, authorize('secretary', 'admin'), (req, res) => {
  try {
    const { id } = req.params;

    const item = db.prepare('SELECT * FROM queue WHERE id = ?').get(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'العنصر غير موجود'
      });
    }

    if (!canAccessDoctor(req.user, item.doctor_id)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    db.prepare('DELETE FROM queue WHERE id = ?').run(id);

    res.json({
      success: true,
      message: 'تم الإزالة من الطابور'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ═══════════════════════════════════════════
// POST /queue/:id/call — نداء المريض وإشعار الطابور
// ═══════════════════════════════════════════
router.post('/:id/call', authenticate, authorize('doctor', 'secretary', 'admin'), (req, res) => {
  try {
    const { id } = req.params;
    const item = db.prepare('SELECT * FROM queue WHERE id = ?').get(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'العنصر غير موجود في الطابور' });
    }
    if (!canAccessDoctor(req.user, item.doctor_id)) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }

    db.prepare(`
      UPDATE queue 
      SET status = 'in_progress', started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
      WHERE id = ?
    `).run(id);

    if (item.appointment_id) {
      db.prepare(`
        UPDATE appointments
        SET status = 'in_progress', attendance_status = 'arrived', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(item.appointment_id);
    }

    notifyQueueProgress(item.doctor_id, item.queue_number, item.appointment_id);

    res.json({
      success: true,
      message: `تم نداء المريض دور #${item.queue_number} وإشعار المرضى القادمين بنجاح 🔔`
    });
  } catch (err) {
    console.error('خطأ في نداء المريض:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// GET /queue/live-status/:appointmentId — استعلام العداد التنازلي الحي للمريض
// ═══════════════════════════════════════════
router.get('/live-status/:appointmentId', authenticate, (req, res) => {
  try {
    const apptId = Number(req.params.appointmentId);
    const appointment = db.prepare(`
      SELECT a.*, d.full_name as doctor_name, d.clinic_name,
             p.full_name as patient_name
      FROM appointments a
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN patients p ON a.user_id = p.id
      WHERE a.id = ?
    `).get(apptId);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Find currently serving queue number (in_progress in queue, or max done + 1)
    const inProgressRow = db.prepare(`
      SELECT queue_number FROM queue
      WHERE doctor_id = ? AND status = 'in_progress' AND DATE(checked_in_at) = DATE(?)
      ORDER BY queue_number ASC LIMIT 1
    `).get(appointment.doctor_id, today);

    const maxDoneRow = db.prepare(`
      SELECT MAX(queue_number) as max_done FROM queue
      WHERE doctor_id = ? AND status = 'done' AND DATE(checked_in_at) = DATE(?)
    `).get(appointment.doctor_id, today);

    const currentServing = inProgressRow?.queue_number || ((maxDoneRow?.max_done || 0) + 1);
    const myQueue = appointment.queue_number || 1;
    const patientsAhead = Math.max(0, myQueue - currentServing);
    const avgConsultationMinutes = 12; // متوسط كشف 12 دقيقة لكل مريض
    const estimatedWaitMinutes = patientsAhead * avgConsultationMinutes;

    let statusText = 'قيد الانتظار';
    if (patientsAhead === 0) {
      statusText = 'حان دورك الآن! يرجى الدخول للطبيب 🏥';
    } else if (patientsAhead === 1) {
      statusText = 'أنت المريض التالي! استعد عند الباب ⏳';
    } else {
      statusText = `يتبقى ${patientsAhead} مرضى قبل دورك ⏱️`;
    }

    res.json({
      success: true,
      data: {
        appointment_id: apptId,
        doctor_id: appointment.doctor_id,
        doctor_name: appointment.doctor_name || 'الطبيب',
        clinic_name: appointment.clinic_name || 'العيادة',
        my_queue_number: myQueue,
        current_serving_number: currentServing,
        patients_ahead: patientsAhead,
        estimated_wait_minutes: estimatedWaitMinutes,
        status_text: statusText
      }
    });
  } catch (err) {
    console.error('خطأ في جلب حالة الطابور الحية:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ═══════════════════════════════════════════
// 📡 Real-time SSE Live Queue Stream
// ═══════════════════════════════════════════
router.get('/stream/:appointmentId', (req, res) => {
  const apptId = req.params.appointmentId;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendQueueUpdate = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const appt = db.prepare(`
        SELECT a.*, d.full_name as doctor_name, d.clinic_name
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        WHERE a.id = ?
      `).get(apptId);

      if (!appt) {
        res.write(`data: ${JSON.stringify({ error: 'الحجز غير موجود' })}\n\n`);
        return;
      }

      const inProgressRow = db.prepare(`
        SELECT queue_number FROM queue
        WHERE doctor_id = ? AND status = 'in_progress' AND DATE(checked_in_at) = DATE(?)
        ORDER BY queue_number ASC LIMIT 1
      `).get(appt.doctor_id, today);

      const maxDoneRow = db.prepare(`
        SELECT MAX(queue_number) as max_done FROM queue
        WHERE doctor_id = ? AND status = 'done' AND DATE(checked_in_at) = DATE(?)
      `).get(appt.doctor_id, today);

      const currentServing = inProgressRow?.queue_number || ((maxDoneRow?.max_done || 0) + 1);
      const myQueue = appt.queue_number || 1;
      const patientsAhead = Math.max(0, myQueue - currentServing);
      const estimatedWaitMinutes = patientsAhead * 12;

      let statusText = 'قيد الانتظار';
      if (patientsAhead === 0) statusText = 'حان دورك الآن! يرجى الدخول للطبيب 🏥';
      else if (patientsAhead === 1) statusText = 'أنت المريض التالي! استعد عند الباب ⏳';
      else statusText = `يتبقى ${patientsAhead} مرضى قبل دورك ⏱️`;

      const payload = {
        appointment_id: apptId,
        my_queue_number: myQueue,
        current_serving_number: currentServing,
        patients_ahead: patientsAhead,
        estimated_wait_minutes: estimatedWaitMinutes,
        status_text: statusText,
        updated_at: new Date().toISOString()
      };

      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (e) {
      console.error('SSE Stream Error:', e);
    }
  };

  // Send initial data immediately
  sendQueueUpdate();

  // Send heartbeat / updates every 5 seconds
  const intervalId = setInterval(sendQueueUpdate, 5000);

  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});

export default router;

