import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = express.Router();



// ==================== ملف المريض الحالي ====================
router.get('/me', authenticate, (req, res) => {
  try {
    if (req.user.type !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'هذا المسار للمرضى فقط',
      });
    }

    const patient = db
      .prepare('SELECT id, full_name, phone, email, google_id, picture, age, gender, governorate, blood_group, status, phone_verified, is_blocked, no_show_count, COALESCE(balance, 0.0) as balance, created_at FROM patients WHERE id = ?')
      .get(req.user.id);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'المريض غير موجود' });
    }

    res.json({
      success: true,
      data: {
        ...patient,
        type: 'patient',
        role: 'patient',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تعديل ملف المريض الحالي ====================
router.put('/me', authenticate, (req, res) => {
  try {
    if (req.user.type !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'هذا المسار للمرضى فقط',
      });
    }

    const { full_name, age, gender, governorate, blood_group, phone, email, password } = req.body;

    const patient = db
      .prepare('SELECT * FROM patients WHERE id = ?')
      .get(req.user.id);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'المريض غير موجود' });
    }

    if (full_name && full_name.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'الاسم يجب أن يكون 3 أحرف على الأقل',
      });
    }

    if (password) {
      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'كلمة المرور يجب أن تتكون من 6 أرقام أو أحرف على الأقل',
        });
      }
    }

    if (age !== undefined && age !== null && (age < 1 || age > 120)) {
      return res.status(400).json({
        success: false,
        message: 'العمر يجب أن يكون بين 1 و 120',
      });
    }

    if (gender !== undefined && !['male', 'female'].includes(gender)) {
      return res.status(400).json({
        success: false,
        message: 'الجنس غير صالح',
      });
    }

    if (phone !== undefined && phone !== null && phone !== '') {
      const existing = db
        .prepare('SELECT id, full_name FROM patients WHERE phone = ? AND id != ?')
        .get(phone, req.user.id);

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'الرقم مسجل مسبقاً، جرّب رقماً آخر',
        });
      }
    }

    const updates = [];
    const values = [];

    if (full_name !== undefined && full_name !== null) {
      updates.push('full_name = ?');
      values.push(full_name);
    }

    if (age !== undefined && age !== null) {
      updates.push('age = ?');
      values.push(Number(age));
    }

    if (gender !== undefined && gender !== null) {
      updates.push('gender = ?');
      values.push(gender);
    }

    if (governorate !== undefined) {
      updates.push('governorate = ?');
      values.push(governorate);
    }

    if (blood_group !== undefined) {
      updates.push('blood_group = ?');
      values.push(blood_group);
    }

    if (phone !== undefined && phone !== null && phone !== '') {
      updates.push('phone = ?');
      values.push(phone);
    }

    if (email !== undefined && email !== null && email !== '') {
      updates.push('email = ?');
      values.push(email);
    }

    if (password) {
      const passwordHash = bcrypt.hashSync(password, 10);
      updates.push('password_hash = ?');
      values.push(passwordHash);
    }

    // تعيين الحالة قيد المراجعة لاعتمادها من الأدمن
    updates.push("status = 'pending'");

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لا توجد بيانات للتحديث',
      });
    }

    values.push(req.user.id);

    try {
      db.prepare(`
        UPDATE patients SET ${updates.join(', ')} WHERE id = ?
      `).run(...values);

      // تسجيل أو تحديث طلب مراجعة في registration_requests للأدمن
      const requestData = JSON.stringify({
        full_name,
        phone,
        governorate,
        age: age ? Number(age) : undefined,
        blood_group,
        email,
        completed_at: new Date().toISOString()
      });

      const existingReq = db.prepare("SELECT id FROM registration_requests WHERE type = 'patient' AND user_id = ?").get(req.user.id);
      if (existingReq) {
        db.prepare(`
          UPDATE registration_requests
          SET status = 'pending', data = ?, reviewed_by = NULL, reviewed_at = NULL, notes = NULL, created_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(requestData, existingReq.id);
      } else {
        db.prepare(`
          INSERT INTO registration_requests (type, user_id, data, status)
          VALUES ('patient', ?, ?, 'pending')
        `).run(req.user.id, requestData);
      }
    } catch (dbErr) {
      if (dbErr.message && dbErr.message.includes('UNIQUE')) {
        return res.status(400).json({
          success: false,
          message: 'الرقم مسجل مسبقاً، جرّب رقماً آخر',
        });
      }
      throw dbErr;
    }

    const updated = db
      .prepare('SELECT id, full_name, phone, email, google_id, picture, age, gender, governorate, blood_group, status FROM patients WHERE id = ?')
      .get(req.user.id);

    res.json({
      success: true,
      message: 'تم تحديث البيانات بنجاح',
      data: updated,
    });
  } catch (err) {
    console.error('خطأ في تعديل المريض:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});



// ==================== طلب شحن المحفظة من قبل المريض ====================
router.post('/me/wallet/deposit-request', authenticate, (req, res) => {
  try {
    const userRole = req.user.type || req.user.role;
    if (userRole !== 'patient') {
      return res.status(403).json({ success: false, message: 'هذا المسار للمرضى فقط' });
    }

    const { amount, method, reference_number, notes } = req.body;
    const rawAmount = parseFloat(amount);
    if (isNaN(rawAmount) || rawAmount === 0) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال مبلغ شحن صالح' });
    }
    const numAmount = Math.abs(rawAmount);

    if (!reference_number || !reference_number.trim()) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال رقم الحوالة أو السند' });
    }

    const insertResult = db.prepare(`
      INSERT INTO wallet_deposit_requests (patient_id, amount, method, reference_number, notes, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(req.user.id, numAmount, method || 'حوالة', reference_number.trim(), notes || null);

    console.log(`💰 [Wallet Request] New deposit request #${insertResult.lastInsertRowid} by patient #${req.user.id}: ${numAmount} YER`);

    res.status(201).json({
      success: true,
      message: 'تم إرسال طلب شحن المحفظة للإدارة بنجاح، سيتم اعتماد الرصيد فور التحقق من الحوالة ✅',
      data: {
        id: insertResult.lastInsertRowid,
        amount: numAmount,
        method: method || 'حوالة',
        reference_number: reference_number.trim(),
        status: 'pending'
      }
    });
  } catch (err) {
    console.error('خطأ في إرسال طلب الشحن:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== قائمة طلبات شحن المحفظة (Admin فقط) ====================
router.get('/wallet/deposit-requests', authenticate, authorize('admin'), (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT wdr.*, p.full_name as patient_name, p.phone as patient_phone, p.balance as current_balance
      FROM wallet_deposit_requests wdr
      JOIN patients p ON wdr.patient_id = p.id
    `;
    const params = [];
    if (status) {
      query += ' WHERE wdr.status = ?';
      params.push(status);
    }
    query += ' ORDER BY wdr.created_at DESC';

    const list = db.prepare(query).all(...params);
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('خطأ في جلب طلبات شحن المحفظة:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== اعتماد أو رفض طلب شحن المحفظة (Admin فقط) ====================
router.patch('/wallet/deposit-requests/:id/review', authenticate, authorize('admin'), (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { action, notes } = req.body; // action: 'approve' | 'reject'

    const reqItem = db.prepare('SELECT * FROM wallet_deposit_requests WHERE id = ?').get(requestId);
    if (!reqItem) {
      return res.status(404).json({ success: false, message: 'طلب الشحن غير موجود' });
    }

    if (reqItem.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'تمت معالجة هذا الطلب مسبقاً' });
    }

    if (action === 'approve') {
      const { customAmount } = req.body;
      const finalAmount = (customAmount !== undefined && customAmount !== null && !isNaN(Number(customAmount)) && Number(customAmount) > 0)
        ? Math.abs(Number(customAmount))
        : reqItem.amount;

      const patient = db.prepare('SELECT id, balance FROM patients WHERE id = ?').get(reqItem.patient_id);
      if (!patient) {
        return res.status(404).json({ success: false, message: 'المريض غير موجود' });
      }

      const currentBalance = patient.balance || 0.0;
      const newBalance = currentBalance + finalAmount;

      try {
        executeDepositApprovalTx(finalAmount, req.user.id, notes || null, requestId, patient.id, reqItem.method, reqItem.reference_number);
      } catch (depErr) {
        if (depErr.message === 'ALREADY_PROCESSED') {
          return res.status(409).json({ success: false, message: 'تمت معالجة هذا الطلب مسبقاً' });
        }
        throw depErr;
      }

      try {
        createNotification(
          patient.id,
          'patient',
          'تم شحن رصيد محفظتك بنجاح 💰',
          `تمت الموافقة على طلب الشحن بمبلغ ${finalAmount.toLocaleString()} ر.ي ورصيدك الحالي الآن ${newBalance.toLocaleString()} ر.ي.`,
          'wallet_update',
          { balance: newBalance, amount: finalAmount }
        );
      } catch (_) {}

      res.json({
        success: true,
        message: `تم اعتماد شحن ${finalAmount.toLocaleString()} ر.ي وإضافتها لمحفظة المريض بنجاح ✅`,
        data: { new_balance: newBalance, approved_amount: finalAmount }
      });
    } else {
      db.prepare(`
        UPDATE wallet_deposit_requests
        SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, notes = ?
        WHERE id = ?
      `).run(req.user.id, notes || null, requestId);

      try {
        createNotification(
          reqItem.patient_id,
          'patient',
          'رفض طلب شحن المحفظة ❌',
          `تم رفض طلب شحن المحفظة بمبلغ ${reqItem.amount.toLocaleString()} ر.ي (${notes || 'بيانات الحوالة غير صحيحة'}).`,
          'wallet_update',
          { amount: reqItem.amount }
        );
      } catch (_) {}

      res.json({
        success: true,
        message: 'تم رفض طلب الشحن'
      });
    }
  } catch (err) {
    console.error('خطأ في مراجعة طلب الشحن:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== محفظة المريض: جلب الرصيد وسجل العمليات ====================
router.get('/me/wallet', authenticate, (req, res) => {
  try {
    const userRole = req.user.type || req.user.role;
    if (userRole !== 'patient') {
      return res.status(403).json({ success: false, message: 'هذا المسار للمرضى فقط' });
    }

    const patient = db.prepare('SELECT id, COALESCE(balance, 0.0) as balance FROM patients WHERE id = ?').get(req.user.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'المريض غير موجود' });
    }

    const transactions = db.prepare(`
      SELECT * FROM wallet_transactions
      WHERE patient_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    res.json({
      success: true,
      data: {
        balance: patient.balance,
        transactions: transactions || []
      }
    });
  } catch (err) {
    console.error('خطأ في جلب المحفظة:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تعديل/شحن رصيد المريض (Admin فقط) ====================
router.post('/:id/adjust-balance', authenticate, authorize('admin'), (req, res) => {
  try {
    const patientId = Number(req.params.id);
    const { amount, type = 'deposit', description = 'شحن رصيد بواسطة الإدارة' } = req.body;

    const rawAmount = parseFloat(amount);
    if (isNaN(rawAmount) || rawAmount === 0) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال مبلغ صحيح' });
    }

    // تحويل المبلغ دائماً إلى قيمة موجبة قطعية
    const absAmount = Math.abs(rawAmount);

    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'المريض غير موجود' });
    }

    const currentBalance = patient.balance || 0.0;
    const isDeduction = (rawAmount < 0) || type === 'deduct' || type === 'deduction';

    if (isDeduction) {
      // التحقق من أن المبلغ المتوفر كافٍ للخصم (الرصيد المتوفر يجب أن يكون أكبر من أو يساوي المبلغ المراد خصمه)
      if (currentBalance < absAmount) {
        return res.status(400).json({
          success: false,
          message: `عذراً، رصيد المريض الحالي (${currentBalance.toLocaleString()} ر.ي) غير كافٍ لخصم مبلغ (${absAmount.toLocaleString()} ر.ي). لا يمكن أن يصبح الرصيد بالسالب.`
        });
      }

      const newBalance = Math.max(0, currentBalance - absAmount);
      db.prepare('UPDATE patients SET balance = ? WHERE id = ?').run(newBalance, patientId);

      db.prepare(`
        INSERT INTO wallet_transactions (patient_id, amount, type, description, created_by)
        VALUES (?, ?, 'deduction', ?, 'admin')
      `).run(patientId, -absAmount, description);

      // إشعار فوري للمريض
      try {
        createNotification(
          patientId,
          'patient',
          'خصم من رصيد المحفظة 💳',
          `تم خصم ${absAmount.toLocaleString()} ر.ي من رصيدك. رصيدك الحالي الآن: ${newBalance.toLocaleString()} ر.ي. (${description})`,
          'wallet_update',
          { balance: newBalance, change: -absAmount }
        );
      } catch (notifErr) {
        console.warn('تعذر إرسال إشعار الخصم:', notifErr.message);
      }

      return res.json({
        success: true,
        message: `تم خصم ${absAmount.toLocaleString()} ر.ي من رصيد المريض بنجاح ✅`,
        data: { new_balance: newBalance }
      });

    } else {
      // عملية إيداع / شحن رصيد
      const newBalance = currentBalance + absAmount;
      db.prepare('UPDATE patients SET balance = ? WHERE id = ?').run(newBalance, patientId);

      db.prepare(`
        INSERT INTO wallet_transactions (patient_id, amount, type, description, created_by)
        VALUES (?, ?, 'deposit', ?, 'admin')
      `).run(patientId, absAmount, description);

      // إشعار فوري للمريض
      try {
        createNotification(
          patientId,
          'patient',
          'شحن رصيد المحفظة 💰',
          `تم شحن رصيدك بمبلغ ${absAmount.toLocaleString()} ر.ي بنجاح! رصيدك الحالي الآن: ${newBalance.toLocaleString()} ر.ي. (${description})`,
          'wallet_update',
          { balance: newBalance, change: absAmount }
        );
      } catch (notifErr) {
        console.warn('تعذر إرسال إشعار الشحن:', notifErr.message);
      }

      return res.json({
        success: true,
        message: `تم شحن رصيد المريض بمبلغ ${absAmount.toLocaleString()} ر.ي بنجاح ✅`,
        data: { new_balance: newBalance }
      });
    }
  } catch (err) {
    console.error('خطأ في تعديل رصيد المريض:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ==================== حذف حساب المريض الحالي (Self-Delete) ====================
// ⚠️ مهم: يجب أن يكون قبل /:id — وإلا سيفسّره كـ id
// ✅ متطلب Google Play: حذف الحساب من داخل التطبيق
router.delete('/me', authenticate, (req, res) => {
  try {
    if (req.user.type !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'هذا المسار للمرضى فقط',
      });
    }

    const patientId = req.user.id;

    const patient = db
      .prepare('SELECT * FROM patients WHERE id = ?')
      .get(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'المريض غير موجود',
      });
    }

    console.log(`🗑️ [Self-Delete] بدء حذف حساب: ${patient.full_name} (${patient.phone})`);

    try {
      db.prepare('DELETE FROM medical_records WHERE user_id = ?').run(patientId);
    } catch (e) {}

    try {
      const appointments = db
        .prepare('SELECT id FROM appointments WHERE user_id = ?')
        .all(patientId);

      for (const apt of appointments) {
        try { db.prepare('DELETE FROM queue WHERE appointment_id = ?').run(apt.id); } catch (e) {}
        try { db.prepare('DELETE FROM payments WHERE appointment_id = ?').run(apt.id); } catch (e) {}
      }

      db.prepare('DELETE FROM appointments WHERE user_id = ?').run(patientId);
    } catch (e) {}

    try {
      db.prepare('DELETE FROM registration_requests WHERE user_id = ? AND type = ?')
        .run(patientId, 'patient');
    } catch (e) {}

    try {
      if (patient.phone && !patient.phone.startsWith('google_')) {
        db.prepare('DELETE FROM otp_codes WHERE phone = ?').run(patient.phone);
      }
    } catch (e) {}

    db.prepare('DELETE FROM patients WHERE id = ?').run(patientId);

    console.log(`🗑️ [Self-Delete] اكتمل: ${patient.full_name}`);

    res.json({
      success: true,
      message: 'تم حذف حسابك بنجاح. نأسف لرحيلك!',
    });
  } catch (err) {
    console.error('❌ خطأ في حذف الحساب:', err);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف الحساب: ' + err.message,
    });
  }
});

// ==================== قائمة المرضى (Admin فقط) ====================
router.get('/', authenticate, authorize('admin'), (req, res) => {
  try {
    const { search } = req.query;

    let query = "SELECT * FROM patients WHERE status = 'approved'";
    const params = [];

    if (search) {
      query += ' AND (full_name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const patients = db.prepare(query).all(...params);
    res.json({ success: true, data: patients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== مريض واحد (Admin فقط) ====================
router.get('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const patient = db
      .prepare('SELECT * FROM patients WHERE id = ?')
      .get(req.params.id);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'المريض غير موجود' });
    }

    res.json({ success: true, data: patient });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== حظر/إلغاء حظر (Admin فقط) ====================
router.patch('/:id/toggle-block', authenticate, authorize('admin'), (req, res) => {
  try {
    const patient = db
      .prepare('SELECT * FROM patients WHERE id = ?')
      .get(req.params.id);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'المريض غير موجود' });
    }

    const newBlocked = patient.is_blocked ? 0 : 1;
    const newStatus = newBlocked ? 'blocked' : 'approved';

    db.prepare('UPDATE patients SET is_blocked = ?, status = ? WHERE id = ?').run(
      newBlocked,
      newStatus,
      req.params.id
    );

    res.json({
      success: true,
      message: newBlocked ? 'تم حظر المريض بنجاح وقطع جلسته' : 'تم إلغاء حظر المريض بنجاح',
      is_blocked: newBlocked,
      status: newStatus,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إحصائيات المريض (Admin فقط) ====================
router.get('/:id/stats', authenticate, authorize('admin'), (req, res) => {
  try {
    const patientId = Number(req.params.id);

    const patient = db
      .prepare('SELECT * FROM patients WHERE id = ?')
      .get(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'المريض غير موجود',
      });
    }

    const totalAppointments = db
      .prepare('SELECT COUNT(*) as count FROM appointments WHERE user_id = ?')
      .get(patientId).count;

    const completedAppointments = db
      .prepare("SELECT COUNT(*) as count FROM appointments WHERE user_id = ? AND status = 'completed'")
      .get(patientId).count;

    const cancelledAppointments = db
      .prepare("SELECT COUNT(*) as count FROM appointments WHERE user_id = ? AND status = 'cancelled'")
      .get(patientId).count;

    const pendingAppointments = db
      .prepare("SELECT COUNT(*) as count FROM appointments WHERE user_id = ? AND status = 'pending'")
      .get(patientId).count;

    const confirmedAppointments = db
      .prepare("SELECT COUNT(*) as count FROM appointments WHERE user_id = ? AND status = 'confirmed'")
      .get(patientId).count;

    const noShowAppointments = db
      .prepare("SELECT COUNT(*) as count FROM appointments WHERE user_id = ? AND status = 'no_show'")
      .get(patientId).count;

    const totalPaid = db
      .prepare("SELECT COALESCE(SUM(fee), 0) as total FROM appointments WHERE user_id = ? AND payment_status = 'paid'")
      .get(patientId).total;

    const lastAppointment = db
      .prepare(`
        SELECT a.*, 
              d.full_name as doctor_name,
              s.date as slot_date,
              s.start_time as slot_time
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN slots s ON a.slot_id = s.id
        WHERE a.user_id = ?
        ORDER BY a.created_at DESC
        LIMIT 1
      `)
      .get(patientId);

    res.json({
      success: true,
      data: {
        total_appointments: totalAppointments,
        completed_appointments: completedAppointments,
        cancelled_appointments: cancelledAppointments,
        pending_appointments: pendingAppointments,
        confirmed_appointments: confirmedAppointments,
        no_show_appointments: noShowAppointments,
        total_paid: totalPaid,
        last_appointment: lastAppointment || null,
      },
    });
  } catch (err) {
    console.error('خطأ في جلب إحصائيات المريض:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== حذف مريض (Hard Delete) — Admin فقط ====================
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const patientId = Number(req.params.id);

    const patient = db
      .prepare('SELECT * FROM patients WHERE id = ?')
      .get(patientId);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'المريض غير موجود' });
    }

    db.prepare('DELETE FROM appointments WHERE user_id = ?').run(patientId);
    db.prepare('DELETE FROM medical_records WHERE user_id = ?').run(patientId);
    db.prepare('DELETE FROM registration_requests WHERE user_id = ? AND type = ?').run(patientId, 'patient');
    db.prepare('DELETE FROM patients WHERE id = ?').run(patientId);

    console.log(`🗑️ [Delete] تم حذف المريض: ${patient.full_name} (${patient.phone})`);

    res.json({
      success: true,
      message: `تم حذف المريض ${patient.full_name}`,
    });
  } catch (err) {
    console.error('خطأ في حذف المريض:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;