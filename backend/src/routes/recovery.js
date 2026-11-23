import express from 'express';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ═══════════════════════════════════════════
// 🔓 PUBLIC — حالة طلب الاستعادة (للتطبيق)
// ═══════════════════════════════════════════
router.get('/status/:phone', (req, res) => {
  try {
    const cleanPhone = String(req.params.phone || '').trim().replace(/^(\+?967)/, '');

    if (!/^[0-9]{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف غير صحيح',
      });
    }

    const request = db.prepare(`
      SELECT id, user_id, status, data, created_at, reviewed_at, notes
      FROM registration_requests
      WHERE type = 'password_reset'
        AND json_extract(data, '$.phone') = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(cleanPhone);

    if (!request) {
      return res.json({
        success: true,
        has_request: false,
        status: null,
        message: 'لا يوجد طلب استعادة سابق',
      });
    }

    // اقرأ user_type المحفوظ في data
    let submittedData = {};
    try { submittedData = JSON.parse(request.data || '{}'); } catch (e) {}

    const savedUserType = submittedData.user_type;

    let userName = null;
    let userRole = null;

    // اعتمد على user_type المحفوظ أولاً
    if (savedUserType) {
      if (savedUserType === 'patient') {
        const p = db.prepare('SELECT full_name FROM patients WHERE id = ?').get(request.user_id);
        if (p) { userName = p.full_name; userRole = 'patient'; }
      } else if (savedUserType === 'doctor') {
        const d = db.prepare('SELECT full_name FROM doctors WHERE id = ?').get(request.user_id);
        if (d) { userName = d.full_name; userRole = 'doctor'; }
      } else if (savedUserType === 'secretary') {
        const s = db.prepare('SELECT full_name FROM secretaries WHERE id = ?').get(request.user_id);
        if (s) { userName = s.full_name; userRole = 'secretary'; }
      }
    }

    // fallback: ابحث في كل الجداول
    if (!userName) {
      const patient = db.prepare('SELECT full_name FROM patients WHERE id = ?').get(request.user_id);
      if (patient) { userName = patient.full_name; userRole = 'patient'; }

      if (!userName) {
        const doctor = db.prepare('SELECT full_name FROM doctors WHERE id = ?').get(request.user_id);
        if (doctor) { userName = doctor.full_name; userRole = 'doctor'; }
      }

      if (!userName) {
        const secretary = db.prepare('SELECT full_name FROM secretaries WHERE id = ?').get(request.user_id);
        if (secretary) { userName = secretary.full_name; userRole = 'secretary'; }
      }
    }

    let message = 'طلبك قيد المراجعة من قبل الإدارة';
    if (request.status === 'approved') message = 'تم اعتماد طلبك. يرجى تعيين كلمة مرور جديدة';
    else if (request.status === 'rejected') message = request.notes || 'تم رفض طلبك. تواصل مع الدعم';

    return res.json({
      success: true,
      has_request: true,
      request_id: request.id,
      status: request.status,
      user_name: userName,
      user_role: userRole,
      created_at: request.created_at,
      reviewed_at: request.reviewed_at,
      notes: request.notes,
      message,
    });
  } catch (err) {
    console.error('❌ خطأ في recovery/status:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🔐 ADMIN — قائمة طلبات الاستعادة
// ═══════════════════════════════════════════
router.get('/requests', authenticate, authorize('admin'), (req, res) => {
  try {
    const statusFilter = req.query.status || 'pending';

    const requests = db.prepare(`
      SELECT
        rr.id, rr.type, rr.user_id, rr.data, rr.status,
        rr.reviewed_by, rr.reviewed_at, rr.notes, rr.created_at
      FROM registration_requests rr
      WHERE rr.type = 'password_reset'
        AND rr.status = ?
      ORDER BY rr.created_at DESC
    `).all(statusFilter);

    const enriched = requests.map((r) => {
      let data = {};
      try { data = JSON.parse(r.data || '{}'); } catch (e) {}

      let registeredUser = null;

      if (data.phone) {
        const patient = db.prepare(`
          SELECT id, full_name, phone, email, status, is_blocked
          FROM patients WHERE phone = ?
        `).get(data.phone);
        if (patient) registeredUser = { ...patient, user_type: 'patient' };

        if (!registeredUser) {
          const doctor = db.prepare(`
            SELECT id, full_name, phone, email, status, is_deleted
            FROM doctors WHERE phone = ? AND is_deleted = 0
          `).get(data.phone);
          if (doctor) registeredUser = { ...doctor, user_type: 'doctor' };
        }

        if (!registeredUser) {
          const secretary = db.prepare(`
            SELECT id, full_name, phone, email, status
            FROM secretaries WHERE phone = ?
          `).get(data.phone);
          if (secretary) registeredUser = { ...secretary, user_type: 'secretary' };
        }
      }

      return {
        id: r.id,
        user_id: r.user_id,
        status: r.status,
        created_at: r.created_at,
        reviewed_at: r.reviewed_at,
        notes: r.notes,
        submitted: data,
        registered: registeredUser,
        match_confirmed: !!registeredUser,
      };
    });

    res.json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (err) {
    console.error('❌ خطأ في recovery/requests:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🔐 ADMIN — إحصائيات
// ═══════════════════════════════════════════
router.get('/stats', authenticate, authorize('admin'), (req, res) => {
  try {
    const pending = db.prepare(`SELECT COUNT(*) as c FROM registration_requests WHERE type = 'password_reset' AND status = 'pending'`).get();
    const approved = db.prepare(`SELECT COUNT(*) as c FROM registration_requests WHERE type = 'password_reset' AND status = 'approved'`).get();
    const rejected = db.prepare(`SELECT COUNT(*) as c FROM registration_requests WHERE type = 'password_reset' AND status = 'rejected'`).get();

    res.json({
      success: true,
      data: {
        pending: pending.c,
        approved: approved.c,
        rejected: rejected.c,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🔐 ADMIN — موافقة
// ═══════════════════════════════════════════
router.patch('/requests/:id/approve', authenticate, authorize('admin'), (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const adminId = req.user.id;

    const request = db.prepare(`
      SELECT * FROM registration_requests
      WHERE id = ? AND type = 'password_reset'
    `).get(requestId);

    if (!request) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `الطلب ليس قيد المراجعة (الحالة: ${request.status})`,
      });
    }

    db.prepare(`
      UPDATE registration_requests
      SET status = 'approved',
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          notes = ?
      WHERE id = ?
    `).run(adminId, 'تم اعتماد طلب الاستعادة', requestId);

    console.log(`✅ [Recovery] اعتماد الطلب #${requestId} بواسطة الأدمن #${adminId}`);

    res.json({
      success: true,
      message: 'تم اعتماد الطلب. المستخدم سيتمكن من تعيين كلمة مرور جديدة.',
    });
  } catch (err) {
    console.error('❌ خطأ في approve:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🔐 ADMIN — رفض
// ═══════════════════════════════════════════
router.patch('/requests/:id/reject', authenticate, authorize('admin'), (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const adminId = req.user.id;
    const { reason } = req.body;

    const request = db.prepare(`
      SELECT * FROM registration_requests
      WHERE id = ? AND type = 'password_reset'
    `).get(requestId);

    if (!request) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `الطلب ليس قيد المراجعة (الحالة: ${request.status})`,
      });
    }

    db.prepare(`
      UPDATE registration_requests
      SET status = 'rejected',
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          notes = ?
      WHERE id = ?
    `).run(adminId, reason || 'تم رفض الطلب', requestId);

    console.log(`❌ [Recovery] رفض الطلب #${requestId} بواسطة الأدمن #${adminId}`);

    res.json({
      success: true,
      message: 'تم رفض الطلب',
    });
  } catch (err) {
    console.error('❌ خطأ في reject:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🔓 POST /check-account
//    التحقق من وجود الحساب قبل الاستعادة
// ═══════════════════════════════════════════
router.post('/check-account', (req, res) => {
  try {
    const rawLogin = req.body.login || req.body.phone || req.body.email;
    const requestedRole = req.body.role || null;

    if (!rawLogin) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف أو البريد الإلكتروني مطلوب',
      });
    }

    const cleanLogin = String(rawLogin).trim();

    // كشف نوع المدخل
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanLogin);
    const cleanPhone = cleanLogin.replace(/^(\+?967)/, '');
    const isPhone = /^[0-9]{9}$/.test(cleanPhone);

    if (!isEmail && !isPhone) {
      return res.status(400).json({
        success: false,
        message: 'أدخل رقم هاتف صحيح (9 أرقام) أو بريد إلكتروني صحيح',
      });
    }

    // ═══ ابحث عن المستخدم بأولوية الدور المطلوب ═══
    let user = null;
    let userType = null;

    const findDoctor = () => {
      if (isEmail) return db.prepare('SELECT * FROM doctors WHERE LOWER(email) = ? AND is_deleted = 0').get(cleanLogin.toLowerCase());
      return db.prepare('SELECT * FROM doctors WHERE phone = ? AND is_deleted = 0').get(cleanPhone);
    };
    const findSecretary = () => {
      if (isEmail) return db.prepare('SELECT * FROM secretaries WHERE LOWER(email) = ?').get(cleanLogin.toLowerCase());
      return db.prepare('SELECT * FROM secretaries WHERE phone = ?').get(cleanPhone);
    };
    const findPatient = () => {
      if (isEmail) return db.prepare('SELECT * FROM patients WHERE LOWER(email) = ?').get(cleanLogin.toLowerCase());
      return db.prepare('SELECT * FROM patients WHERE phone = ?').get(cleanPhone);
    };

    if (requestedRole === 'doctor') {
      user = findDoctor();
      if (user) userType = 'doctor';
      if (!user) { user = findSecretary(); if (user) userType = 'secretary'; }
      if (!user) { user = findPatient(); if (user) userType = 'patient'; }
    } else if (requestedRole === 'secretary') {
      user = findSecretary();
      if (user) userType = 'secretary';
      if (!user) { user = findDoctor(); if (user) userType = 'doctor'; }
      if (!user) { user = findPatient(); if (user) userType = 'patient'; }
    } else {
      user = findPatient();
      if (user) userType = 'patient';
      if (!user) { user = findDoctor(); if (user) userType = 'doctor'; }
      if (!user) { user = findSecretary(); if (user) userType = 'secretary'; }
    }

    // ═══ الحساب غير موجود ═══
    if (!user) {
      console.log(`🆕 [CheckAccount] غير مسجل: ${cleanLogin}`);
      return res.json({
        success: true,
        account_exists: false,
        action: 'register_new',
        message: 'هذا الحساب غير مسجل. سيتم توجيهك لإنشاء حساب جديد.',
      });
    }

    // ═══ الحساب موجود ═══
    const hasPassword = !!(user.password_hash);
    const hasGoogle = !!(user.google_id);
    const hasEmail = !!(user.email);

    // فحص هل يوجد طلب استعادة سابق معلق
    const pendingReq = db.prepare(`
      SELECT id FROM registration_requests
      WHERE type = 'password_reset' AND user_id = ? AND status = 'pending'
      LIMIT 1
    `).get(user.id);

    console.log(`✅ [CheckAccount] موجود: ${cleanLogin} (${userType})`);

    return res.json({
      success: true,
      account_exists: true,
      user_type: userType,
      role: userType,
      has_password: hasPassword,
      has_old_password: hasPassword,
      has_google: hasGoogle,
      has_email: hasEmail,
      requires_password_verification: hasPassword,
      is_google_only: !hasPassword && hasGoogle,
      user_name: user.full_name,
      display_name: user.full_name,
      pending_request: !!pendingReq,
      status: user.status
    });

  } catch (err) {
    console.error('❌ خطأ في check-account:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🔓 POST /request
//    طلب استعادة + التحقق من pw القديمة
// ═══════════════════════════════════════════
router.post('/request', async (req, res) => {
  try {
    const rawLogin = req.body.login || req.body.phone || req.body.email;
    const { old_password, full_name, reason, method } = req.body;

    if (!rawLogin) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف أو البريد الإلكتروني مطلوب',
      });
    }

    const cleanLogin = String(rawLogin).trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanLogin);
    const cleanPhone = cleanLogin.replace(/^(\+?967)/, '');
    const cleanName = full_name ? String(full_name).trim() : '';

    // ═══ ابحث عن المستخدم ═══
    let user = null;
    let userType = null;

    if (isEmail) {
      user = db.prepare('SELECT * FROM patients WHERE LOWER(email) = ?').get(cleanLogin.toLowerCase());
      if (user) userType = 'patient';
    } else {
      user = db.prepare('SELECT * FROM patients WHERE phone = ?').get(cleanPhone);
      if (user) userType = 'patient';
    }

    if (!user) {
      if (isEmail) {
        user = db.prepare('SELECT * FROM doctors WHERE LOWER(email) = ? AND is_deleted = 0').get(cleanLogin.toLowerCase());
      } else {
        user = db.prepare('SELECT * FROM doctors WHERE phone = ? AND is_deleted = 0').get(cleanPhone);
      }
      if (user) userType = 'doctor';
    }

    if (!user) {
      if (isEmail) {
        user = db.prepare('SELECT * FROM secretaries WHERE LOWER(email) = ?').get(cleanLogin.toLowerCase());
      } else {
        user = db.prepare('SELECT * FROM secretaries WHERE phone = ?').get(cleanPhone);
      }
      if (user) userType = 'secretary';
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'الحساب غير موجود',
        action: 'register_new',
      });
    }

    const hasPassword = !!(user.password_hash);
    const hasGoogle = !!(user.google_id);

    // ═══════════════════════════════════════════
    // الحالة 1: حساب Google (بدون pw) → اعتماد فوري
    // ═══════════════════════════════════════════
    if (!hasPassword) {
      console.log(`🚀 [Recovery] حساب Google — اعتماد تلقائي: ${cleanLogin}`);

      const requestData = JSON.stringify({
        full_name: cleanName || user.full_name,
        login: cleanLogin,
        user_type: userType,
        has_google: true,
        requested_at: new Date().toISOString(),
      });

      const result = db.prepare(`
        INSERT INTO registration_requests (type, user_id, data, status, reviewed_at, notes)
        VALUES ('password_reset', ?, ?, 'approved', CURRENT_TIMESTAMP, 'اعتماد تلقائي — حساب Google')
      `).run(user.id, requestData);

      return res.json({
        success: true,
        message: 'تم التحقق من حسابك. يمكنك تعيين كلمة مرور جديدة.',
        request_id: result.lastInsertRowid,
        status: 'approved',
        auto_approved: true,
        user_type: userType,
        user_role: userType,
      });
    }

    // ═══════════════════════════════════════════
    // الحالة 2: حساب عادي → تحقق من pw
    // ═══════════════════════════════════════════
    if (!old_password) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور القديمة مطلوبة',
      });
    }

    const bcrypt = (await import('bcryptjs')).default;
    const isPasswordCorrect = bcrypt.compareSync(old_password, user.password_hash);

    // ═══ 2a: pw صحيحة → اعتماد فوري ═══
    if (isPasswordCorrect) {
      console.log(`🚀 [Recovery] اعتماد تلقائي (pw صحيحة): ${cleanLogin}`);

      const requestData = JSON.stringify({
        full_name: cleanName || user.full_name,
        login: cleanLogin,
        user_type: userType,
        password_verified: true,
        requested_at: new Date().toISOString(),
      });

      const result = db.prepare(`
        INSERT INTO registration_requests (type, user_id, data, status, reviewed_at, notes)
        VALUES ('password_reset', ?, ?, 'approved', CURRENT_TIMESTAMP, 'اعتماد تلقائي — تطابق كلمة المرور')
      `).run(user.id, requestData);

      return res.json({
        success: true,
        message: 'تم التحقق من كلمة المرور. يمكنك تعيين كلمة مرور جديدة.',
        request_id: result.lastInsertRowid,
        status: 'approved',
        auto_approved: true,
        user_type: userType,
        user_role: userType,
      });
    }

    // ═══ 2b: pw خطأ → احسب تطابق الاسم ═══
    let matchRatio = 0;
    if (cleanName && user.full_name) {
      const storedName = String(user.full_name).trim().toLowerCase();
      const providedWords = cleanName.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
      const matchedWords = providedWords.filter((w) => storedName.includes(w));
      matchRatio = providedWords.length > 0 ? matchedWords.length / providedWords.length : 0;
    }

    // اسم غير مطابق بما يكفي → رفض
    if (matchRatio < 0.6) {
      console.log(`❌ [Recovery] رفض (pw خطأ + اسم ضعيف ${Math.round(matchRatio * 100)}%): ${cleanLogin}`);
      return res.status(403).json({
        success: false,
        message: 'كلمة المرور غير صحيحة والبيانات المُدخلة لا تتطابق مع السجلات.',
      });
    }

    // pw خطأ + اسم مطابق → مراجعة أدمن
    console.log(`📋 [Recovery] مراجعة يدوية (pw خطأ + اسم ${Math.round(matchRatio * 100)}%): ${cleanLogin}`);

    const requestData = JSON.stringify({
      full_name: cleanName,
      login: cleanLogin,
      user_type: userType,
      password_verified: false,
      match_ratio: matchRatio,
      requested_at: new Date().toISOString(),
    });

    const result = db.prepare(`
      INSERT INTO registration_requests (type, user_id, data, status, notes)
      VALUES ('password_reset', ?, ?, 'pending', 'كلمة المرور خاطئة — يحتاج مراجعة')
    `).run(user.id, requestData);

    return res.json({
      success: true,
      message: 'كلمة المرور غير صحيحة. سيتم مراجعة طلبك من الأدمن.',
      request_id: result.lastInsertRowid,
      status: 'pending',
      auto_approved: false,
      requires_admin_review: true,
      user_type: userType,
      user_role: userType,
      match_ratio: matchRatio,
    });

  } catch (err) {
    console.error('❌ خطأ في recovery/request:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});
export default router;