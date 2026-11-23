import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import { OAuth2Client } from 'google-auth-library';
import { checkPhoneExists, checkEmailExists, buildDuplicateMessage } from '../utils/validation.js';
import { createNotification, notifyAdmins } from './notifications.js';

const router = express.Router();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID || '399127188969-459at9sedg9ech13b45m3cm2ok6oh2ra.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ═══════════════════════════════════════════
// Helper: جلب إعداد من settings
// ═══════════════════════════════════════════
function getSetting(key, defaultValue = null) {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

// ═══════════════════════════════════════════
// Helper: بناء استجابة الطبيب
// ═══════════════════════════════════════════
function buildDoctorResponse(user) {
  const doctor = db.prepare(`
    SELECT d.id, d.full_name, d.specialty, d.clinic_name, d.avatar,
           d.consultation_fee, d.slot_duration, d.email, d.phone,
           d.commission_rate, d.must_complete_profile, d.status,
           c.id as clinic_id, c.name as clinic_full_name,
           c.governorate as clinic_governorate
    FROM doctors d
    LEFT JOIN clinics c ON d.clinic_name = c.name
    WHERE d.id = ?
  `).get(user.id);

  const permissions = {
    view_queue: true,
    receive_patient: true,
    view_appointments: true,
    view_patients: true,
    view_slots: true,
    medical_records: true,
    view_own_schedule: true
  };

  return {
    user: {
      ...doctor,
      role: 'doctor',
      type: 'doctor',
      must_change_password: 0,
    },
    permissions
  };
}

// ═══════════════════════════════════════════
// Helper: بناء استجابة السكرتيرة
// ═══════════════════════════════════════════
function buildSecretaryResponse(user) {
  const secretary = db.prepare(`
    SELECT s.id, s.full_name, s.email, s.phone, s.clinic_id, s.avatar,
           s.governorate, s.address, s.must_complete_profile, s.status,
           c.name as clinic_name, c.governorate as clinic_governorate,
           c.address as clinic_address, c.google_maps_url
    FROM secretaries s
    LEFT JOIN clinics c ON s.clinic_id = c.id
    WHERE s.id = ?
  `).get(user.id);

  let savedPermissions = {};
  try {
    savedPermissions = user.permissions ? JSON.parse(user.permissions) : {};
  } catch (e) {}

  const permissions = {
    view_queue: true,
    check_in: true,
    view_appointments: true,
    edit_appointments: true,
    view_patients: true,
    view_slots: true,
    manage_slots: true,
    view_payments: true,
    confirm_payments: false,
    manage_doctors: true,
    approve_doctors: true,
    ...savedPermissions
  };

  return {
    user: {
      ...secretary,
      role: 'secretary',
      type: 'secretary',
      must_change_password: 0,
    },
    permissions
  };
}

// ═══════════════════════════════════════════
// POST /google-login-staff
//    Google Login للطبيب/السكرتيرة
// ═══════════════════════════════════════════
router.post('/google-login-staff', async (req, res) => {
  try {
    const { idToken, role } = req.body;

    // 1. التحقق من المدخلات
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'idToken مطلوب'
      });
    }

    if (!role || !['doctor', 'secretary'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الدور: doctor أو secretary'
      });
    }

    // 2. التحقق من Google
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID
      });
    } catch (err) {
      console.error('❌ فشل التحقق من Google:', err.message);
      return res.status(401).json({
        success: false,
        message: 'رمز Google غير صالح'
      });
    }

    const payload = ticket.getPayload();
    const email = payload.email?.toLowerCase();
    const fullName = payload.name || 'مستخدم';
    const picture = payload.picture || null;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم استلام البريد من Google'
      });
    }

    // 3. البحث في الجدول الصحيح
    let user = null;
    const table = role === 'doctor' ? 'doctors' : 'secretaries';

    if (role === 'doctor') {
      user = db.prepare(
        'SELECT * FROM doctors WHERE LOWER(email) = ? AND is_deleted = 0'
      ).get(email);
    } else {
      user = db.prepare(
        'SELECT * FROM secretaries WHERE LOWER(email) = ?'
      ).get(email);
    }

    // ═══════════════════════════════════════════
    // الحالة 1: المستخدم موجود
    // ═══════════════════════════════════════════
    if (user) {
      // تحديث الصورة
      if (picture && picture !== user.avatar) {
        db.prepare(`UPDATE ${table} SET avatar = ? WHERE id = ?`).run(picture, user.id);
      }

      // التحقق من الحالة
      if (user.status === 'pending') {
        // ✅ إصدار token حتى لـ pending (للسماح بإكمال الملف)
        const pendingToken = jwt.sign(
          { id: user.id, email, role, type: role },
          process.env.JWT_SECRET,
          { expiresIn: '365d' }
        );

        const pendingResponseData = role === 'doctor'
          ? buildDoctorResponse(user)
          : buildSecretaryResponse(user);

        return res.json({
          success: true,
          user_status: 'pending',
          message: 'حسابك قيد المراجعة',
          token: pendingToken,
          ...pendingResponseData,
          is_new_user: false,
          must_complete_profile: user.must_complete_profile === 1
        });
      }

      if (user.status === 'rejected') {
        let rejectReason = '';
        try {
          const lastReq = db.prepare(`
            SELECT notes FROM registration_requests
            WHERE user_id = ? AND type = ? AND status = 'rejected'
            ORDER BY reviewed_at DESC, id DESC LIMIT 1
          `).get(user.id, role);
          if (lastReq && lastReq.notes) {
            rejectReason = lastReq.notes.trim();
          }
        } catch (_) {}

        const reasonMsg = rejectReason ? `سبب الرفض: ${rejectReason}` : 'يرجى مراجعة وتعديل بياناتك أو التواصل مع الإدارة لإعادة التقديم.';
        return res.status(403).json({
          success: false,
          user_status: 'rejected',
          can_retry: true,
          rejection_reason: rejectReason || null,
          message: `تم رفض حسابك من قبل الإدارة. ${reasonMsg}`
        });
      }

      if (user.is_active === 0) {
        return res.status(403).json({
          success: false,
          user_status: 'inactive',
          message: 'حسابك موقوف حالياً'
        });
      }

      // ✅ approved → دخول فوري (لا يحتاج إكمال ملف)
      // للمستخدم المعتمد، نتجاهل must_complete_profile من DB (تضارب بيانات)
      const token = jwt.sign(
        { id: user.id, email, role, type: role },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      const responseData = role === 'doctor'
        ? buildDoctorResponse(user)
        : buildSecretaryResponse(user);

      const mustCompleteForApproved = false;

      return res.json({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        token,
        user: {
          ...responseData.user,
          must_complete_profile: mustCompleteForApproved
        },
        permissions: responseData.permissions,
        is_new_user: false,
        must_complete_profile: mustCompleteForApproved
      });
    }

    // ═══════════════════════════════════════════
    // الحالة 2: المستخدم جديد → إنشاء
    // ═══════════════════════════════════════════

    // فحص إعدادات التسجيل
    const allowKey = role === 'doctor'
      ? 'allow_doctor_self_register'
      : 'allow_secretary_self_register';

    if (getSetting(allowKey, '1') !== '1') {
      return res.status(403).json({
        success: false,
        message: 'التسجيل الذاتي معطّل حالياً. تواصل مع الإدارة.'
      });
    }

    // ✅ فحص تكرار email في نفس الجدول
    const emailCheck = checkEmailExists(table, email);
    if (emailCheck.exists) {
      return res.status(400).json({
        success: false,
        message: buildDuplicateMessage('email', emailCheck.ownerType)
      });
    }

    let result;

    if (role === 'doctor') {
      result = db.prepare(`
        INSERT INTO doctors 
        (full_name, email, avatar, specialty, consultation_fee, status, must_complete_profile, is_active, phone_verified)
        VALUES (?, ?, ?, 'غير محدد', 0, 'pending', 1, 1, 1)
      `).run(fullName, email, picture);
    } else {
      result = db.prepare(`
        INSERT INTO secretaries 
        (full_name, email, avatar, phone, status, must_complete_profile, is_active, phone_verified)
        VALUES (?, ?, ?, ?, 'pending', 1, 1, 1)
      `).run(fullName, email, picture, 'google_' + Date.now() + '_' + Math.random().toString(36).substring(7));
    }

    const newUser = db.prepare(`SELECT * FROM ${table} WHERE id = ?`)
      .get(result.lastInsertRowid);

    // ✅ إضافة registration_request
    try {
      const rrRes = db.prepare(`
        INSERT INTO registration_requests (type, user_id, data, status)
        VALUES (?, ?, ?, 'pending')
      `).run(
        role,
        newUser.id,
        JSON.stringify({
          full_name: fullName,
          email: email,
          method: 'google',
          role: role
        })
      );

      const roleAr = role === 'doctor' ? 'طبيب' : 'سكرتيرة';
      notifyAdmins(
        `طلب اعتماد ${roleAr} جديد (Google) 🩺`,
        `سجل ${roleAr} جديد: ${fullName || email} عبر Google وهو بانتظار الاعتماد.`,
        `${role}_registration_request`,
        { request_id: rrRes.lastInsertRowid, user_id: newUser.id, type: role }
      );
    } catch (e) {
      console.error('⚠️ فشل إنشاء registration_request:', e.message);
    }

    // إصدار JWT مؤقت
    const token = jwt.sign(
      { id: newUser.id, email, role, type: role },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    return res.status(201).json({
      success: true,
      message: 'مرحباً! يرجى إكمال بياناتك',
      token,
      user: {
        id: newUser.id,
        full_name: newUser.full_name,
        email: newUser.email,
        avatar: newUser.avatar,
        role,
        type: role,
        status: 'pending',
        must_complete_profile: true
      },
      is_new_user: true,
      must_complete_profile: true
    });

  } catch (err) {
    console.error('❌ خطأ في google-login-staff:', err);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      debug_error: err.message,
      debug_stack: err.stack ? err.stack.split('\n').slice(0, 3) : []
    });
  }
});

// ═══════════════════════════════════════════
// GET /google-config
//    يرجع WEB_CLIENT_ID للتطبيق (اختياري)
// ═══════════════════════════════════════════
router.get('/google-config', (req, res) => {
  res.json({
    success: true,
    web_client_id: process.env.GOOGLE_WEB_CLIENT_ID || ''
  });
});

// ═══════════════════════════════════════════
// POST /guest-login-staff
//    دخول سريع للطبيب/السكرتيرة (اسم + هاتف)
//    status = 'pending' حتى الموافقة
// ═══════════════════════════════════════════
router.post('/guest-login-staff', async (req, res) => {
  try {
    const { full_name, phone, role } = req.body;

    // 1. التحقق
    if (!full_name || full_name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'الاسم مطلوب (3 أحرف على الأقل)'
      });
    }

    if (!phone || !/^7[0-9]{8}$/.test(phone.replace(/^(\+?967)/, ''))) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف غير صحيح (9 أرقام تبدأ بـ 7)'
      });
    }

    if (!role || !['doctor', 'secretary'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الدور'
      });
    }

    const cleanPhone = phone.replace(/^(\+?967)/, '');
    const cleanName = full_name.trim();
    const table = role === 'doctor' ? 'doctors' : 'secretaries';

    // 2. هل الهاتف مستخدم؟
    let user = db.prepare(
      `SELECT * FROM ${table} WHERE phone = ?`
    ).get(cleanPhone);

    if (user) {
      // ✅ موجود — دخول فوري (إذا كان approved)
      if (user.status === 'approved' && user.is_active === 1) {
        const token = jwt.sign(
          { id: user.id, phone: cleanPhone, role, type: role },
          process.env.JWT_SECRET,
          { expiresIn: '30d' }
        );

        const responseData = role === 'doctor'
          ? buildDoctorResponse(user)
          : buildSecretaryResponse(user);

        return res.json({
          success: true,
          message: 'مرحباً بعودتك',
          token,
          ...responseData,
          is_new_user: false,
          must_complete_profile: user.must_complete_profile === 1
        });
      }

      // إذا كان قيد المراجعة (pending)
      if (user.status === 'pending') {
        const token = jwt.sign(
          { id: user.id, phone: cleanPhone, role, type: role },
          process.env.JWT_SECRET,
          { expiresIn: '365d' }
        );

        const needsProfile = user.must_complete_profile === 1;

        return res.json({
          success: true,
          message: needsProfile
            ? 'يرجى متابعة إكمال بياناتك'
            : 'حسابك قيد المراجعة والاعتماد من قبل إدارة النظام',
          token,
          user: {
            id: user.id,
            full_name: user.full_name,
            phone: user.phone,
            role,
            type: role,
            status: 'pending',
            must_complete_profile: needsProfile ? 1 : 0
          },
          is_new_user: false,
          user_status: 'pending',
          must_complete_profile: needsProfile
        });
      }

      // rejected
      let rejectReason = '';
      try {
        const lastReq = db.prepare(`
          SELECT notes FROM registration_requests
          WHERE user_id = ? AND type = ? AND status = 'rejected'
          ORDER BY reviewed_at DESC, id DESC LIMIT 1
        `).get(user.id, role);
        if (lastReq && lastReq.notes) {
          rejectReason = lastReq.notes.trim();
        }
      } catch (_) {}

      const reasonMsg = rejectReason ? `سبب الرفض: ${rejectReason}` : 'يرجى مراجعة وتحديث بياناتك ثم إعادة التسجيل.';
      return res.status(403).json({
        success: false,
        user_status: 'rejected',
        can_retry: true,
        rejection_reason: rejectReason || null,
        message: `تم رفض حسابك من قبل إدارة النظام. ${reasonMsg}`
      });
    }

    // 3. جديد — إنشاء
    // ✅ فحص تكرار phone في نفس الجدول
    const phoneCheck = checkPhoneExists(table, cleanPhone);
    if (phoneCheck.exists) {
      return res.status(400).json({
        success: false,
        message: buildDuplicateMessage('phone', phoneCheck.ownerType)
      });
    }

    let result;

    if (role === 'doctor') {
      result = db.prepare(`
        INSERT INTO doctors 
        (full_name, phone, specialty, status, must_complete_profile, is_active, phone_verified)
        VALUES (?, ?, 'غير محدد', 'pending', 1, 1, 1)
      `).run(cleanName, cleanPhone);
    } else {
      result = db.prepare(`
        INSERT INTO secretaries 
        (full_name, phone, status, must_complete_profile, is_active, phone_verified)
        VALUES (?, ?, 'pending', 1, 1, 1)
      `).run(cleanName, cleanPhone);
    }

    const newUser = db.prepare(`SELECT * FROM ${table} WHERE id = ?`)
      .get(result.lastInsertRowid);

    // ✅ إضافة registration_request لتسجيل الضيف للكادر الطبي
    try {
      const rrRes = db.prepare(`
        INSERT INTO registration_requests (type, user_id, data, status)
        VALUES (?, ?, ?, 'pending')
      `).run(
        role,
        newUser.id,
        JSON.stringify({
          full_name: cleanName,
          phone: cleanPhone,
          method: 'guest_staff',
          role: role
        })
      );

      const roleAr = role === 'doctor' ? 'طبيب' : 'سكرتيرة';
      notifyAdmins(
        `طلب اعتماد ${roleAr} جديد (تسجيل ضيف) 🩺`,
        `سجل ${roleAr} جديد: ${cleanName} (${cleanPhone}) وهو بانتظار الاعتماد.`,
        `${role}_registration_request`,
        { request_id: rrRes.lastInsertRowid, user_id: newUser.id, type: role }
      );
    } catch (e) {
      console.error('⚠️ فشل إنشاء registration_request:', e.message);
    }

    // JWT مؤقت
    const token = jwt.sign(
      { id: newUser.id, phone: cleanPhone, role, type: role },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    return res.status(201).json({
      success: true,
      message: 'مرحباً! يرجى إكمال بياناتك',
      token,
      user: {
        id: newUser.id,
        full_name: newUser.full_name,
        phone: newUser.phone,
        role,
        type: role,
        status: 'pending',
        must_complete_profile: true
      },
      is_new_user: true,
      must_complete_profile: true
    });

  } catch (err) {
    console.error('❌ خطأ في guest-login-staff:', err);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      debug_error: err.message,
      debug_stack: err.stack ? err.stack.split('\n').slice(0, 3) : []
    });
  }
});

export default router;
