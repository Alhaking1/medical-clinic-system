import express from 'express';
import fs from 'fs';
import path from 'path';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import { performBackup } from '../utils/backup.js';

const router = express.Router();

// ==================== قائمة طلبات التسجيل ====================
router.get('/requests', authenticate, authorize('admin'), (req, res) => {
  try {
    const { status, type } = req.query;

    // مزامنة حالة الطلبات المعلقة مع حالة الحسابات الفعلية لمنع ظهور طلبات لحسابات موثقة ومفعلة بالفعل
    // مزامنة حالة الطلبات مع حالة الحسابات الفعلية
    try {
      // إذا كان الحساب معتمد في جدوله الأصلي، يجب أن تكون كافة طلباته معتمدة approved
      db.prepare(`
        UPDATE registration_requests
        SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP
        WHERE (
          (type = 'doctor' AND user_id IN (SELECT id FROM doctors WHERE status = 'approved')) OR
          (type = 'secretary' AND user_id IN (SELECT id FROM secretaries WHERE status = 'approved')) OR
          (type = 'patient' AND user_id IN (SELECT id FROM patients WHERE status = 'approved'))
        ) AND status != 'approved'
      `).run();

      // إذا كان الحساب مرفوض وحالته الفعلية rejected ولم يتم اعتماده لاحقاً
      db.prepare(`
        UPDATE registration_requests
        SET status = 'rejected', reviewed_at = CURRENT_TIMESTAMP
        WHERE status = 'pending' AND (
          (type = 'doctor' AND user_id IN (SELECT id FROM doctors WHERE status = 'rejected')) OR
          (type = 'secretary' AND user_id IN (SELECT id FROM secretaries WHERE status = 'rejected')) OR
          (type = 'patient' AND user_id IN (SELECT id FROM patients WHERE status = 'rejected'))
        )
      `).run();
    } catch (_) {}

    let query = 'SELECT * FROM registration_requests WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';

    const requests = db.prepare(query).all(...params);

    const stmtDoctor = db.prepare('SELECT id, full_name, specialty, phone, email, clinic_name, governorate, consultation_fee, phone_verified, status, is_active, created_at FROM doctors WHERE id = ?');
    const stmtPatient = db.prepare('SELECT id, full_name, phone, email, age, gender, governorate, blood_group, phone_verified, status, is_blocked, created_at FROM patients WHERE id = ?');
    const stmtSecretary = db.prepare('SELECT id, full_name, phone, email, clinic_id, phone_verified, status, is_active, created_at FROM secretaries WHERE id = ?');

    const seenUsers = new Set();
    const detailedRequests = [];

    for (const reqItem of requests) {
      let user = null;
      if (reqItem.type === 'doctor') {
        user = stmtDoctor.get(reqItem.user_id) || null;
      } else if (reqItem.type === 'patient') {
        user = stmtPatient.get(reqItem.user_id) || null;
      } else if (reqItem.type === 'secretary') {
        user = stmtSecretary.get(reqItem.user_id) || null;
      }

      if (!user) continue;

      // إذا كان الحساب معتمد حالياً، لا يظهر في المرفوضة أو المعلقة إطلاقاً
      if ((status === 'pending' || status === 'rejected') && user.status === 'approved') continue;

      // إذا كان الفلتر approved والحساب ليس approved، نتخطاه
      if (status === 'approved' && user.status !== 'approved') continue;

      // إذا كان الفلتر rejected والحساب ليس rejected، نتخطاه
      if (status === 'rejected' && user.status !== 'rejected') continue;

      // منع تكرار نفس الحساب في القائمة لنفس النوع
      const key = `${reqItem.type}_${reqItem.user_id}`;
      if (seenUsers.has(key)) continue;
      seenUsers.add(key);

      detailedRequests.push({ ...reqItem, user });
    }

    res.json({ success: true, data: detailedRequests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إحصائيات الطلبات ====================
router.get('/requests/stats', authenticate, authorize('admin'), (req, res) => {
  try {
    // ═══════════════════════════════════════════
    // إحصائيات من الجداول الفعلية
    // ═══════════════════════════════════════════

    const doctors = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM doctors
      WHERE is_deleted = 0
    `).get();

    const secretaries = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM secretaries
    `).get();

    const patients = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM patients
    `).get();

    const stats = {
      total: (doctors.total || 0) + (secretaries.total || 0) + (patients.total || 0),
      pending: (doctors.pending || 0) + (secretaries.pending || 0) + (patients.pending || 0),
      approved: (doctors.approved || 0) + (secretaries.approved || 0) + (patients.approved || 0),
      rejected: (doctors.rejected || 0) + (secretaries.rejected || 0) + (patients.rejected || 0),

      pending_doctors: doctors.pending || 0,
      pending_secretaries: secretaries.pending || 0,
      pending_patients: patients.pending || 0,

      total_doctors: doctors.total || 0,
      total_secretaries: secretaries.total || 0,
      total_patients: patients.total || 0,

      approved_doctors: doctors.approved || 0,
      approved_secretaries: secretaries.approved || 0,
      approved_patients: patients.approved || 0,
    };

    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== اعتماد طلب ====================
router.patch('/requests/:id/approve', authenticate, authorize('admin'), (req, res) => {
  try {
    const requestId = Number(req.params.id);

    const request = db
      .prepare('SELECT * FROM registration_requests WHERE id = ?')
      .get(requestId);

    if (!request) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    if (request.status === 'approved') {
      return res.status(400).json({ success: false, message: 'هذا الطلب معتمد ومفعل بالفعل' });
    }

    if (request.type === 'doctor') {
      db.prepare(`
        UPDATE doctors SET
          status = 'approved',
          approved_at = CURRENT_TIMESTAMP,
          approved_by = ?,
          is_active = 1
        WHERE id = ?
      `).run(req.user.id, request.user_id);

      createNotification(
        request.user_id,
        'doctor',
        'تم اعتماد وتوثيق حسابك الطبي بنجاح 🎉',
        'مرحباً بك دكتور! تمت مراجعة واعتماد حسابك من إدارة النظام. يمكنك الآن استقبال الحجوزات وإدارة العيادة.'
      );
    } else if (request.type === 'patient') {
      db.prepare(`
        UPDATE patients SET
          status = 'approved',
          approved_at = CURRENT_TIMESTAMP,
          approved_by = ?
        WHERE id = ?
      `).run(req.user.id, request.user_id);

      createNotification(
        request.user_id,
        'patient',
        'تم اعتماد وتوثيق حسابك بنجاح ✅',
        'أهلاً بك! تم توثيق وتفعيل حسابك في تطبيق طبيبك بنجاح. يمكنك الآن الاستفادة من كافة الخدمات والحجوزات.'
      );
    } else if (request.type === 'secretary') {
      db.prepare(`
        UPDATE secretaries SET
          status = 'approved',
          is_active = 1
        WHERE id = ?
      `).run(request.user_id);

      createNotification(
        request.user_id,
        'secretary',
        'تم اعتماد حساب السكرتارية بنجاح 🎉',
        'مرحباً بك! تم اعتماد وتفعيل حسابك كسكرتيرة عيادة بنجاح. يمكنك الآن إدارة جدول المواعيد والحجوزات.'
      );
    }

    db.prepare(`
      UPDATE registration_requests SET
        status = 'approved',
        reviewed_by = ?,
        reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ? OR (type = ? AND user_id = ?)
    `).run(req.user.id, requestId, request.type, request.user_id);

    res.json({ success: true, message: 'تم اعتماد الطلب' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== رفض طلب ====================
router.patch('/requests/:id/reject', authenticate, authorize('admin'), (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { notes } = req.body;

    const request = db
      .prepare('SELECT * FROM registration_requests WHERE id = ?')
      .get(requestId);

    if (!request) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'تمت مراجعة هذا الطلب مسبقاً' });
    }

    if (request.type === 'doctor') {
      db.prepare(`UPDATE doctors SET status = 'rejected' WHERE id = ?`).run(request.user_id);
      createNotification(request.user_id, 'doctor', 'تحديث بشأن طلب التسجيل ⚠️', `تم رفض طلب الاعتماد من قبل الإدارة. ${notes || ''}`);
    } else if (request.type === 'patient') {
      db.prepare(`UPDATE patients SET status = 'rejected' WHERE id = ?`).run(request.user_id);
      createNotification(request.user_id, 'patient', 'تحديث بشأن طلب التوثيق ⚠️', `تم رفض طلب التوثيق من قبل الإدارة. ${notes || ''}`);
    } else if (request.type === 'secretary') {
      db.prepare(`UPDATE secretaries SET status = 'rejected' WHERE id = ?`).run(request.user_id);
      createNotification(request.user_id, 'secretary', 'تحديث بشأن طلب التسجيل ⚠️', `تم رفض طلب الاعتماد من قبل الإدارة. ${notes || ''}`);
    }

    db.prepare(`
      UPDATE registration_requests SET
        status = 'rejected',
        reviewed_by = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        notes = ?
      WHERE id = ? OR (type = ? AND user_id = ?)
    `).run(req.user.id, notes || null, requestId, request.type, request.user_id);

    res.json({ success: true, message: 'تم رفض الطلب' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إعدادات الدردشة العامة للمنصة ====================
router.get('/chat-settings', authenticate, authorize('admin'), (req, res) => {
  try {
    const enabledRow = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_enabled'").get();
    const modeRow = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_mode'").get();
    const retentionHoursRow = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_retention_hours'").get();
    const retentionDaysRow = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_retention_days'").get();

    let retentionHours = retentionHoursRow ? parseInt(retentionHoursRow.value, 10) : (parseInt(retentionDaysRow?.value || '2', 10) * 24 || 48);

    res.json({
      success: true,
      data: {
        chat_enabled: enabledRow ? enabledRow.value !== '0' : true,
        chat_mode: modeRow?.value || 'all',
        retention_hours: retentionHours,
        retention_days: Math.round(retentionHours / 24)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/chat-settings', authenticate, authorize('admin'), (req, res) => {
  try {
    const { chat_enabled, chat_mode, retention_hours, retention_days } = req.body;

    if (chat_enabled !== undefined) {
      const val = chat_enabled ? '1' : '0';
      db.prepare(`
        INSERT INTO system_settings (key, value, updated_at) VALUES ('chat_enabled', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `).run(val);
    }

    if (chat_mode !== undefined) {
      db.prepare(`
        INSERT INTO system_settings (key, value, updated_at) VALUES ('chat_mode', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `).run(chat_mode);
    }

    if (retention_hours !== undefined) {
      const hours = parseInt(retention_hours, 10) || 48;
      db.prepare(`
        INSERT INTO system_settings (key, value, updated_at) VALUES ('chat_retention_hours', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `).run(hours.toString());
      db.prepare(`
        INSERT INTO system_settings (key, value, updated_at) VALUES ('chat_retention_days', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `).run(Math.round(hours / 24).toString());
    } else if (retention_days !== undefined) {
      const days = parseInt(retention_days, 10) || 0;
      db.prepare(`
        INSERT INTO system_settings (key, value, updated_at) VALUES ('chat_retention_days', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `).run(days.toString());
      db.prepare(`
        INSERT INTO system_settings (key, value, updated_at) VALUES ('chat_retention_hours', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `).run((days * 24).toString());
    }

    res.json({
      success: true,
      message: 'تم حفظ وتطبيق إعدادات المراسلة والدردشة بنجاح ✅'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== حظر/رفع حظر طبيب من الدردشة ====================
router.patch('/doctors/:id/chat-ban', authenticate, authorize('admin'), (req, res) => {
  try {
    const doctorId = Number(req.params.id);
    const { is_chat_banned, reason } = req.body;

    const doc = db.prepare('SELECT id, full_name FROM doctors WHERE id = ?').get(doctorId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'الطبيب غير موجود' });
    }

    const bannedVal = is_chat_banned ? 1 : 0;
    const banReason = reason || (bannedVal ? 'مخالفة سياسة المنصة والتعليمات' : null);

    db.prepare(`
      UPDATE doctors SET
        is_chat_banned = ?,
        chat_ban_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(bannedVal, banReason, doctorId);

    createNotification(
      doctorId,
      'doctor',
      bannedVal ? 'تنبيه: تم حظر خاصية الدردشة ⚠️' : 'إشعار: تم رفع الحظر عن الدردشة ✅',
      bannedVal
        ? `تم حظر إمكانية التواصل المباشر معك داخل التطبيق نظراً لـ: ${banReason}`
        : 'تم تفعيل إمكانية التواصل والدردشة معك مجدداً.'
    );

    res.json({
      success: true,
      message: bannedVal ? 'تم حظر الطبيب من المراسلة بنجاح' : 'تم رفع الحظر عن مراسلة الطبيب بنجاح',
      data: { doctor_id: doctorId, is_chat_banned: bannedVal, reason: banReason }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== حظر/رفع حظر سكرتيرة من الدردشة ====================
router.patch('/secretaries/:id/chat-ban', authenticate, authorize('admin'), (req, res) => {
  try {
    const secId = Number(req.params.id);
    const { is_chat_banned, reason } = req.body;

    const sec = db.prepare('SELECT id, full_name FROM secretaries WHERE id = ?').get(secId);
    if (!sec) {
      return res.status(404).json({ success: false, message: 'السكرتيرة غير موجودة' });
    }

    const bannedVal = is_chat_banned ? 1 : 0;
    const banReason = reason || (bannedVal ? 'مخالفة سياسة المنصة' : null);

    db.prepare(`
      UPDATE secretaries SET
        is_chat_banned = ?,
        chat_ban_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(bannedVal, banReason, secId);

    createNotification(
      secId,
      'secretary',
      bannedVal ? 'تنبيه: تم حظر خاصية الدردشة ⚠️' : 'إشعار: تم رفع الحظر عن الدردشة ✅',
      bannedVal
        ? `تم حظر إمكانية تواصل المرضى معك داخل التطبيق نظراً لـ: ${banReason}`
        : 'تم تفعيل إمكانية التواصل والدردشة معك مجدداً.'
    );

    res.json({
      success: true,
      message: bannedVal ? 'تم حظر السكرتيرة من المراسلة بنجاح' : 'تم رفع الحظر عن مراسلة السكرتيرة بنجاح',
      data: { secretary_id: secId, is_chat_banned: bannedVal, reason: banReason }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تعديل قالب وساعات عمل العيادة بواسطة الأدمن ====================
router.put('/clinics/:id/schedule', authenticate, authorize('admin'), (req, res) => {
  try {
    const clinicId = Number(req.params.id);
    const clinic = db.prepare('SELECT * FROM clinics WHERE id = ?').get(clinicId);
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'العيادة غير موجودة' });
    }

    const {
      is_24_hours,
      schedule_type,
      open_time,
      close_time,
      weekly_schedule
    } = req.body;

    const weeklyStr = typeof weekly_schedule === 'object' && weekly_schedule !== null
      ? JSON.stringify(weekly_schedule)
      : (weekly_schedule || null);

    const normalizeDigits = (str) => {
      if (!str) return null;
      return str.toString()
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    };

    const cleanOpen = normalizeDigits(open_time);
    const cleanClose = normalizeDigits(close_time);

    db.prepare(`
      UPDATE clinics SET
        is_24_hours = COALESCE(?, is_24_hours),
        schedule_type = COALESCE(?, schedule_type),
        open_time = COALESCE(?, open_time),
        close_time = COALESCE(?, close_time),
        weekly_schedule = COALESCE(?, weekly_schedule)
      WHERE id = ?
    `).run(
      is_24_hours !== undefined ? (is_24_hours ? 1 : 0) : null,
      schedule_type || null,
      cleanOpen,
      cleanClose,
      weeklyStr,
      clinicId
    );

    res.json({
      success: true,
      message: 'تم حفظ وتطبيق مواعيد وساعات عمل العيادة بنجاح بواسطة الإدارة ✅'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 GET /revenue-analytics
// إحصائيات الإيرادات المفصلة: العائد اليومي والشهري والإجمالي والعائد من كل عيادة وعائد الإدارة وعائد العيادة
// ═══════════════════════════════════════════
router.get('/revenue-analytics', authenticate, authorize('admin'), (req, res) => {
  try {
    const { period, clinic_id, start_date, end_date } = req.query;

    // جلب نسبة عمولة المنصة الافتراضية
    let globalCommissionRate = 10;
    try {
      const setting = db.prepare("SELECT value FROM settings WHERE key = 'platform_commission_rate'").get();
      if (setting && setting.value) {
        globalCommissionRate = parseFloat(setting.value) || 10;
      }
    } catch (_) {}

    // جلب كافة العيادات مع نسب عمولاتها
    const allClinics = db.prepare('SELECT id, name, commission_rate FROM clinics WHERE is_active = 1').all();
    const clinicMap = {};
    allClinics.forEach(c => {
      clinicMap[c.id] = {
        id: c.id,
        name: c.name,
        commission_rate: (c.commission_rate !== null && c.commission_rate !== undefined)
          ? parseFloat(c.commission_rate)
          : globalCommissionRate,
        appointments_count: 0,
        gross_revenue: 0,
        admin_revenue: 0,
        clinic_revenue: 0
      };
    });

    // استعلام الحجوزات مع تفاصيل الطبيب والعيادة
    let query = `
      SELECT a.id, a.doctor_id, a.status, a.fee, a.created_at,
             d.full_name as doctor_name, d.consultation_fee as default_fee,
             COALESCE(dc.clinic_id, d.clinic_id) as clinic_id,
             c.name as clinic_name,
             c.commission_rate as clinic_commission_rate
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN doctor_clinics dc ON dc.doctor_id = d.id
      LEFT JOIN clinics c ON c.id = COALESCE(dc.clinic_id, d.clinic_id)
      WHERE a.status NOT IN ('cancelled')
    `;

    const params = [];
    if (clinic_id) {
      query += ' AND (COALESCE(dc.clinic_id, d.clinic_id) = ? OR c.id = ?)';
      params.push(clinic_id, clinic_id);
    }

    if (start_date) {
      query += ' AND date(a.created_at) >= date(?)';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND date(a.created_at) <= date(?)';
      params.push(end_date);
    }

    query += ' ORDER BY a.created_at DESC';

    const appointments = db.prepare(query).all(...params);

    // توقيت اليمن (UTC+3)
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const yemenTime = new Date(utc + (3600000 * 3));
    const todayStr = yemenTime.toISOString().slice(0, 10);
    const thisMonthStr = yemenTime.toISOString().slice(0, 7); // YYYY-MM

    let totalAppointments = appointments.length;
    let totalGrossRevenue = 0;
    let totalAdminRevenue = 0;
    let totalClinicRevenue = 0;

    let todayGross = 0;
    let todayAdmin = 0;
    let todayClinic = 0;
    let todayAppointments = 0;

    let monthGross = 0;
    let monthAdmin = 0;
    let monthClinic = 0;
    let monthAppointments = 0;

    const dailyBreakdown = {}; // YYYY-MM-DD -> stats

    appointments.forEach(appt => {
      const fee = (appt.fee !== null && appt.fee !== undefined && appt.fee !== '')
        ? parseFloat(appt.fee)
        : (parseFloat(appt.default_fee) || 0);

      const commRate = (appt.clinic_commission_rate !== null && appt.clinic_commission_rate !== undefined)
        ? parseFloat(appt.clinic_commission_rate)
        : (appt.clinic_id && clinicMap[appt.clinic_id] ? clinicMap[appt.clinic_id].commission_rate : globalCommissionRate);

      const adminCut = (fee * commRate) / 100;
      const clinicCut = Math.max(0, fee - adminCut);

      totalGrossRevenue += fee;
      totalAdminRevenue += adminCut;
      totalClinicRevenue += clinicCut;

      const dateStr = (appt.created_at || '').slice(0, 10);
      const mStr = (appt.created_at || '').slice(0, 7);

      if (dateStr === todayStr) {
        todayGross += fee;
        todayAdmin += adminCut;
        todayClinic += clinicCut;
        todayAppointments += 1;
      }

      if (mStr === thisMonthStr) {
        monthGross += fee;
        monthAdmin += adminCut;
        monthClinic += clinicCut;
        monthAppointments += 1;
      }

      // تجميع يومي
      if (dateStr) {
        if (!dailyBreakdown[dateStr]) {
          dailyBreakdown[dateStr] = {
            date: dateStr,
            appointments_count: 0,
            gross_revenue: 0,
            admin_revenue: 0,
            clinic_revenue: 0
          };
        }
        dailyBreakdown[dateStr].appointments_count += 1;
        dailyBreakdown[dateStr].gross_revenue += fee;
        dailyBreakdown[dateStr].admin_revenue += adminCut;
        dailyBreakdown[dateStr].clinic_revenue += clinicCut;
      }

      // تجميع لكل عيادة
      if (appt.clinic_id && clinicMap[appt.clinic_id]) {
        clinicMap[appt.clinic_id].appointments_count += 1;
        clinicMap[appt.clinic_id].gross_revenue += fee;
        clinicMap[appt.clinic_id].admin_revenue += adminCut;
        clinicMap[appt.clinic_id].clinic_revenue += clinicCut;
      }
    });

    const clinicsList = Object.values(clinicMap).map(c => ({
      ...c,
      gross_revenue: Math.round(c.gross_revenue * 100) / 100,
      admin_revenue: Math.round(c.admin_revenue * 100) / 100,
      clinic_revenue: Math.round(c.clinic_revenue * 100) / 100
    })).sort((a, b) => b.gross_revenue - a.gross_revenue);

    const dailyList = Object.values(dailyBreakdown).map(d => ({
      ...d,
      gross_revenue: Math.round(d.gross_revenue * 100) / 100,
      admin_revenue: Math.round(d.admin_revenue * 100) / 100,
      clinic_revenue: Math.round(d.clinic_revenue * 100) / 100
    })).sort((a, b) => b.date.localeCompare(a.date));

    res.json({
      success: true,
      data: {
        summary: {
          global_commission_rate: globalCommissionRate,
          total_appointments: totalAppointments,
          total_gross_revenue: Math.round(totalGrossRevenue * 100) / 100,
          total_admin_revenue: Math.round(totalAdminRevenue * 100) / 100,
          total_clinic_revenue: Math.round(totalClinicRevenue * 100) / 100,
          today: {
            appointments_count: todayAppointments,
            gross_revenue: Math.round(todayGross * 100) / 100,
            admin_revenue: Math.round(todayAdmin * 100) / 100,
            clinic_revenue: Math.round(todayClinic * 100) / 100
          },
          this_month: {
            appointments_count: monthAppointments,
            gross_revenue: Math.round(monthGross * 100) / 100,
            admin_revenue: Math.round(monthAdmin * 100) / 100,
            clinic_revenue: Math.round(monthClinic * 100) / 100
          }
        },
        clinics: clinicsList,
        daily: dailyList
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// REQ 2: Advanced Patient Records (GET /api/v1/admin/medical-records)
// ═══════════════════════════════════════════
router.get('/medical-records', authenticate, authorize('admin'), (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      clinic_id,
      doctor_id,
      search,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let whereClauses = ['1=1'];
    const params = [];

    if (clinic_id) {
      whereClauses.push('(d.clinic_id = ? OR c.id = ?)');
      params.push(clinic_id, clinic_id);
    }

    if (doctor_id) {
      whereClauses.push('a.doctor_id = ?');
      params.push(doctor_id);
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      whereClauses.push('(p.full_name LIKE ? OR p.phone LIKE ? OR a.booking_code LIKE ?)');
      params.push(s, s, s);
    }

    const whereStr = whereClauses.join(' AND ');

    // جلب إجمالي السجلات للترقيم
    const countSql = `
      SELECT COUNT(*) as total
      FROM appointments a
      LEFT JOIN patients p ON a.user_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN clinics c ON (d.clinic_id = c.id OR d.clinic_name = c.name)
      LEFT JOIN medical_records mr ON mr.appointment_id = a.id
      WHERE ${whereStr}
    `;
    const countRow = db.prepare(countSql).get(...params);
    const totalRecords = countRow?.total || 0;

    // جلب البيانات مع السجل الطبي والحجز والتفاصيل
    const dataSql = `
      SELECT 
        a.id as appointment_id,
        a.booking_code,
        a.sequential_booking_number,
        a.status as appointment_status,
        a.attendance_status,
        a.created_at as booked_at,
        p.id as patient_id,
        p.full_name as patient_name,
        p.phone as patient_phone,
        p.gender as patient_gender,
        p.blood_group as patient_blood_group,
        p.age as patient_age,
        d.id as doctor_id,
        d.full_name as doctor_name,
        d.specialty as doctor_specialty,
        COALESCE(c.name, d.clinic_name) as clinic_name,
        COALESCE(c.id, d.clinic_id) as clinic_id,
        mr.id as record_id,
        mr.diagnosis,
        mr.prescription,
        mr.lab_tests,
        mr.notes,
        mr.follow_up_date,
        mr.created_at as record_date
      FROM appointments a
      LEFT JOIN patients p ON a.user_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN clinics c ON (d.clinic_id = c.id OR d.clinic_name = c.name)
      LEFT JOIN medical_records mr ON mr.appointment_id = a.id
      WHERE ${whereStr}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const records = db.prepare(dataSql).all(...params, Number(limit), offset);

    res.json({
      success: true,
      data: records,
      pagination: {
        total: totalRecords,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalRecords / Number(limit))
      }
    });
  } catch (err) {
    console.error('❌ خطأ في جلب السجلات الطبية للأدمن:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// REQ 8: Manual & Scheduled Backups
// ═══════════════════════════════════════════
const BACKUP_DIR = process.env.BACKUP_PATH || (fs.existsSync('/data') ? '/data/backups' : path.join(process.cwd(), 'backups'));

// POST /api/v1/admin/system/backup (إنشاء نسخة جديدة وتنزيلها أو حفظها)
router.post('/system/backup', authenticate, authorize('admin'), async (req, res) => {
  try {
    const backupFile = await performBackup();
    if (!backupFile || !fs.existsSync(backupFile)) {
      return res.status(500).json({ success: false, message: 'فشل إنشاء النسخة الاحتياطية' });
    }

    const { download } = req.query;
    if (download === 'true') {
      res.setHeader('Content-Type', 'application/x-sqlite3');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(backupFile)}"`);
      const fileStream = fs.createReadStream(backupFile);
      return fileStream.pipe(res);
    }

    const stats = fs.statSync(backupFile);
    res.json({
      success: true,
      message: 'تم إنشاء النسخة الاحتياطية بنجاح 🛡️',
      backup: {
        filename: path.basename(backupFile),
        size_bytes: stats.size,
        size_formatted: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
        created_at: stats.mtime
      }
    });
  } catch (err) {
    console.error('❌ خطأ في تشغيل النسخ الاحتياطي:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/admin/system/backup/download (تنزيل ملف .db مباشرة إلى المتصفح)
router.get('/system/backup/download', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { filename } = req.query;
    let targetPath;

    if (filename) {
      const sanitized = path.basename(filename);
      targetPath = path.join(BACKUP_DIR, sanitized);
      if (!fs.existsSync(targetPath)) {
        return res.status(404).json({ success: false, message: 'ملف النسخة الاحتياطية غير موجود' });
      }
    } else {
      // إذا لم يُحدد ملف، نقوم بعمل نسخة فورية وبثها مباشرة للمتصفح
      targetPath = await performBackup();
      if (!targetPath || !fs.existsSync(targetPath)) {
        // Fallback إلى قاعدة البيانات الحية الحالية
        targetPath = path.join(process.cwd(), 'data', 'medical.db');
      }
    }

    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(targetPath)}"`);
    const stream = fs.createReadStream(targetPath);
    stream.pipe(res);
  } catch (err) {
    console.error('❌ خطأ في تنزيل النسخة:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/admin/system/backups (عرض قائمة النسخ المتوفرة وإعدادات الجدولة)
router.get('/system/backups', authenticate, authorize('admin'), (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('medical-') && f.endsWith('.db'))
      .map(f => {
        const fullPath = path.join(BACKUP_DIR, f);
        const stats = fs.statSync(fullPath);
        return {
          filename: f,
          size_bytes: stats.size,
          size_formatted: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
          created_at: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // إعداد تردد الجدولة المحفوظ في system_settings
    const schedRow = db.prepare("SELECT value FROM system_settings WHERE key = 'backup_frequency'").get();
    const frequency = schedRow?.value || 'daily';

    res.json({
      success: true,
      frequency,
      backups: files
    });
  } catch (err) {
    console.error('❌ خطأ في جلب قائمة النسخ الاحتياطية:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/admin/system/backup/frequency (تعديل تردد النسخ الاحتياطي: daily | weekly)
router.put('/system/backup/frequency', authenticate, authorize('admin'), (req, res) => {
  try {
    const { frequency } = req.body;
    if (!['daily', 'weekly', 'every_6_hours'].includes(frequency)) {
      return res.status(400).json({ success: false, message: "التردد غير صالح (المسموح: daily | weekly | every_6_hours)" });
    }

    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('backup_frequency', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(frequency);

    res.json({
      success: true,
      message: `تم ضبط جدول النسخ الاحتياطي إلى: ${frequency}`,
      frequency
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
