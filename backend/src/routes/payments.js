import express from 'express';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = express.Router();

// قائمة المدفوعات
router.get('/', authenticate, authorize('admin', 'secretary'), (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT pay.*,
             a.booking_code,
             a.queue_number,
             a.is_golden,
             a.transaction_id as appointment_transaction_id,
             p.full_name as patient_name
      FROM payments pay
      LEFT JOIN appointments a ON pay.appointment_id = a.id
      LEFT JOIN patients p ON a.user_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND pay.status = ?';
      params.push(status);
    }

    query += ' ORDER BY pay.created_at DESC';

    const payments = db.prepare(query).all(...params);
    res.json({ success: true, data: payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// تأكيد دفع
router.patch('/:id/confirm', authenticate, authorize('admin', 'secretary'), (req, res) => {
  try {
    const payment = db
      .prepare('SELECT * FROM payments WHERE id = ?')
      .get(req.params.id);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'الدفعة غير موجودة' });
    }

    db.prepare(`
      UPDATE payments SET
        status = 'confirmed',
        confirmed_by = ?,
        confirmed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.id, req.params.id);

    // تحديث حالة الحجز والترقية للمقعد الذهبي إن وُجد مقعد شاغر
    const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(payment.appointment_id);
    let upgradedQueueNumber = appointment ? appointment.queue_number : null;
    let upgradedIsGolden = appointment ? appointment.is_golden : 0;

    if (appointment) {
      if (appointment.is_golden !== 1) {
        let goldenSeatsCount = 3;
        const setting = db.prepare("SELECT value FROM system_settings WHERE key = 'golden_seats_count'").get();
        if (setting && setting.value) goldenSeatsCount = parseInt(setting.value, 10) || 3;

        let queryTaken = 'SELECT queue_number FROM appointments WHERE doctor_id = ? AND status != "cancelled"';
        const paramsTaken = [appointment.doctor_id];
        if (appointment.period_id) {
          queryTaken += ' AND period_id = ?';
          paramsTaken.push(appointment.period_id);
        } else if (appointment.slot_id) {
          queryTaken += ' AND slot_id = ?';
          paramsTaken.push(appointment.slot_id);
        }
        const takenNumbers = db.prepare(queryTaken).all(...paramsTaken).map(r => r.queue_number);

        for (let s = 1; s <= goldenSeatsCount; s++) {
          if (!takenNumbers.includes(s)) {
            upgradedQueueNumber = s;
            upgradedIsGolden = 1;
            break;
          }
        }
      }

      db.prepare(`
        UPDATE appointments
        SET payment_status = 'paid', queue_number = ?, is_golden = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(upgradedQueueNumber, upgradedIsGolden, appointment.id);

      try {
        createNotification(
          appointment.user_id,
          'patient',
          upgradedIsGolden === 1 ? 'تهانينا! تم تأكيد دفعك وترقية حجزك للمقعد الذهبي 👑' : 'تم تأكيد دفع حجزك بنجاح ✅',
          upgradedIsGolden === 1 
            ? `تم تأكيد استلام الحوالة لحجزك #${appointment.booking_code}. حصلت على المقعد الأولي ذو الأولوية رقم #${upgradedQueueNumber}!`
            : `تم تأكيد سداد حجزك #${appointment.booking_code} بنجاح. دورك في العيادة هو رقم #${upgradedQueueNumber}.`,
          'payment_confirmed',
          { appointment_id: appointment.id, booking_code: appointment.booking_code, queue_number: upgradedQueueNumber }
        );
      if (appointment.doctor_id) {
        try {
          createNotification(
            appointment.doctor_id,
            'doctor',
            `تأكيد دفع الحجز #${appointment.booking_code} 💳`,
            `تم تأكيد سداد الحجز #${appointment.booking_code} للمريض. رقم الدور: #${upgradedQueueNumber}.`,
            'payment_confirmed',
            { appointment_id: appointment.id, booking_code: appointment.booking_code }
          );
        } catch (_) {}
      }
    } catch (ne) {}
    }

    res.json({
      success: true,
      message: upgradedIsGolden === 1 ? `تم تأكيد الدفع وترقية الحجز للمقعد الذهبي #${upgradedQueueNumber} 👑` : 'تم تأكيد الدفع بنجاح'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// رفض دفع
router.patch('/:id/reject', authenticate, authorize('admin'), (req, res) => {
  try {
    const payment = db.prepare('SELECT p.*, a.booking_code, a.user_id as patient_id FROM payments p LEFT JOIN appointments a ON p.appointment_id = a.id WHERE p.id = ?').get(req.params.id);

    db.prepare(`
      UPDATE payments SET
        status = 'rejected',
        confirmed_by = ?,
        confirmed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.id, req.params.id);

    if (payment && payment.patient_id) {
      try {
        createNotification(
          payment.patient_id,
          'patient',
          'تعذر تأكيد الحوالة ⚠️',
          `لم يتم تأكيد الحوالة للحجز #${payment.booking_code || ''}. يرجى التحقق من رقم الحوالة أو التواصل مع العيادة.`
        );
      } catch (_) {}
    }

    res.json({ success: true, message: 'تم رفض الدفع' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;