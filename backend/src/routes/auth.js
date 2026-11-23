import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { sendWhatsAppMessage } from '../utils/whatsapp.js';
import { OAuth2Client } from 'google-auth-library';
import { otpLimiter, guestRegisterLimiter, adminLoginLimiter, verifyOtpLimiter } from '../middleware/rateLimiters.js';
import { getStaffByLogin, checkPhoneExists, checkEmailExists, buildDuplicateMessage } from '../utils/validation.js';
import { createNotification, notifyAdmins } from './notifications.js';

const router = express.Router();
// ==================== توليد OTP ====================
function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

// ═══════════════════════════════════════════
// 🛡️ REFRESH TOKENS & SESSION MANAGEMENT
// ═══════════════════════════════════════════
db.exec(`
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_type TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    revoked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    replaced_by_token TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id, user_type);
`);

const ACCESS_TOKEN_EXPIRY = '90d';
const REFRESH_TOKEN_DAYS = 30;

function issueUserSession(user, userType) {
  const payload = {
    id: user.id,
    phone: user.phone || null,
    email: user.email || null,
    username: user.username || null,
    role: userType,
    type: userType
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    db.prepare(`
      INSERT INTO refresh_tokens (user_id, user_type, token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(user.id, userType, refreshToken, expiresAt);
  } catch (err) {
    console.error('⚠️ Error storing refresh token:', err.message);
  }

  return { token, refreshToken, expiresIn: 1800 };
}


// ═══════════════════════════════════════════
// 🆕 توليد JWT لمريض
// ═══════════════════════════════════════════
function generatePatientToken(patient) {
  const session = issueUserSession(patient, 'patient');
  return session.token;
}

router.post('/setup-admin', (req, res) => {
  try {
    const { secret, password } = req.body;
    if (secret !== 'tabeebak-admin-secret-2026') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const pwd = password || 'admin123456';
    const hash = bcrypt.hashSync(pwd, 12);
    const existing = db.prepare("SELECT id FROM admins WHERE username = 'admin'").get();
    if (existing) {
      db.prepare("UPDATE admins SET password_hash = ?, is_active = 1 WHERE username = 'admin'").run(hash);
    } else {
      db.prepare(`
        INSERT INTO admins (username, password_hash, full_name, role, is_active)
        VALUES ('admin', ?, 'المدير العام', 'admin', 1)
      `).run(hash);
    }
    res.json({ success: true, message: 'Admin setup successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تسجيل دخول الأدمن ====================
router.post('/login', adminLoginLimiter, (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'اسم المستخدم وكلمة المرور مطلوبان',
      });
    }

    const admin = db
      .prepare('SELECT * FROM admins WHERE username = ? AND is_active = 1')
      .get(username);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة',
      });
    }

    const isValid = bcrypt.compareSync(password, admin.password_hash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة',
      });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role, type: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        username: admin.username,
        full_name: admin.full_name,
        role: admin.role,
        type: 'admin',
      },
      permissions: { all: true },
    });
  } catch (err) {
    console.error('خطأ في تسجيل الدخول:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ==================== إرسال OTP (تسجيل دخول) ====================
router.post('/login-otp/send', otpLimiter, async (req, res) => {
  try {
    const { phone, user_type } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'رقم الهاتف مطلوب' });
    }

    // البحث في كل الأنواع
    let user = null;
    let actualType = user_type || 'patient';

    if (user_type === 'doctor') {
      user = db.prepare('SELECT * FROM doctors WHERE phone = ? AND is_deleted = 0').get(phone);
    } else if (user_type === 'secretary') {
      user = db.prepare('SELECT * FROM secretaries WHERE phone = ?').get(phone);
    } else if (user_type === 'patient') {
      user = db.prepare('SELECT * FROM patients WHERE phone = ?').get(phone);
    } else {
      user = db.prepare('SELECT * FROM patients WHERE phone = ?').get(phone);
      if (user) actualType = 'patient';
      else {
        user = db.prepare('SELECT * FROM doctors WHERE phone = ? AND is_deleted = 0').get(phone);
        if (user) actualType = 'doctor';
        else {
          user = db.prepare('SELECT * FROM secretaries WHERE phone = ?').get(phone);
          if (user) actualType = 'secretary';
        }
      }
    }

    // ✅ إذا لم يكن موجوداً وكان مريضاً → تسجيل تلقائي بحالة pending (تتطلب اعتماد الأدمن)
    if (!user) {
      if (actualType === 'patient' || user_type === 'patient' || !user_type) {
        try {
          const insertResult = db.prepare(`
            INSERT INTO patients (full_name, phone, status, phone_verified)
            VALUES (?, ?, 'pending', 0)
          `).run('مريض جديد', phone);

          user = db.prepare('SELECT * FROM patients WHERE id = ?').get(insertResult.lastInsertRowid);
          actualType = 'patient';

          console.log(`⏳ [تسجيل جديد بحاجة اعتماد الأدمن] مريض: ${phone}`);

          try {
            db.prepare(`
              INSERT INTO registration_requests (type, user_id, data, status)
              VALUES ('patient', ?, ?, 'pending')
            `).run(insertResult.lastInsertRowid, JSON.stringify({ phone, auto_registered: true }));
          } catch (e) {}
        } catch (insertErr) {
          console.error('خطأ في التسجيل:', insertErr);
          return res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء التسجيل',
          });
        }
      } else {
        return res.status(404).json({
          success: false,
          message: 'رقم الهاتف غير مسجل',
        });
      }
    }

    if (user.is_blocked || user.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'حسابك محظور من قبل إدارة المنصة' });
    }

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    db.prepare('DELETE FROM otp_codes WHERE phone = ? AND is_used = 0').run(phone);

    db.prepare(`
      INSERT INTO otp_codes (phone, code, user_type, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(phone, code, actualType, expiresAt.toISOString());

    console.log(`📱 OTP: ${phone} → ${code} (${actualType})`);

    const message = `🔐 كود التحقق الخاص بك:

*${code}*

⏰ صالح لمدة 5 دقائق فقط.

منصة الحجز الطبي`;

    console.log('🔵 [Auth] بدء إرسال واتساب...');
    const sendResult = await sendWhatsAppMessage(phone, message);
    console.log('🔵 [Auth] sendResult:', JSON.stringify(sendResult));

    res.json({
      success: true,
      message: sendResult.success ? 'تم إرسال الكود عبر واتساب' : 'تم إنشاء الكود',
      ...(process.env.NODE_ENV === 'development' && { code }),
      whatsapp: sendResult.success,
    });
  } catch (err) {
    console.error('خطأ في إرسال OTP:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== التحقق من OTP ====================
router.post('/login-otp/verify', verifyOtpLimiter, (req, res) => {
  try {
    const { phone, code, user_type } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ success: false, message: 'الهاتف والكود مطلوبان' });
    }

    const otp = db
      .prepare(`
        SELECT * FROM otp_codes
        WHERE phone = ? AND code = ? AND is_used = 0
        ORDER BY created_at DESC
        LIMIT 1
      `)
      .get(phone, code);

    if (!otp) {
      return res.status(401).json({ success: false, message: 'الكود غير صحيح' });
    }

    const now = new Date();
    const expiresAt = new Date(otp.expires_at);

    if (now > expiresAt) {
      return res.status(401).json({ success: false, message: 'انتهت صلاحية الكود' });
    }

    db.prepare('UPDATE otp_codes SET is_used = 1 WHERE id = ?').run(otp.id);

    // جلب المستخدم
    let user = null;
    let role = user_type || otp.user_type || 'patient';

    if (role === 'doctor') {
      user = db.prepare('SELECT * FROM doctors WHERE phone = ? AND is_deleted = 0').get(phone);
    } else if (role === 'secretary') {
      user = db.prepare('SELECT * FROM secretaries WHERE phone = ?').get(phone);
    } else {
      user = db.prepare('SELECT * FROM patients WHERE phone = ?').get(phone);
      role = 'patient';
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ success: false, message: 'حسابك محظور' });
    }

    // تعليم الهاتف كموثّق
    if (role === 'patient') {
      db.prepare('UPDATE patients SET phone_verified = 1 WHERE id = ?').run(user.id);
    } else if (role === 'doctor') {
      try {
        db.prepare('UPDATE doctors SET phone_verified = 1 WHERE id = ?').run(user.id);
      } catch (e) {}
    } else if (role === 'secretary') {
      try {
        db.prepare('UPDATE secretaries SET phone_verified = 1 WHERE id = ?').run(user.id);
      } catch (e) {}
    }

    // إذا كان الحساب pending → لا JWT
    if (user.status === 'pending') {
      return res.json({
        success: true,
        message: 'تم التحقق من رقمك. حسابك قيد المراجعة من قبل الإدارة.',
        user_status: 'pending',
        user: {
          id: user.id,
          full_name: user.full_name,
          phone: user.phone,
          role,
          status: 'pending',
        },
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

      const reasonMsg = rejectReason ? `سبب الرفض: ${rejectReason}` : 'يرجى مراجعة وتحديث بياناتك ثم إعادة التسجيل أو التواصل مع الدعم.';
      return res.status(403).json({
        success: false,
        message: `تم رفض حسابك من قبل الإدارة. ${reasonMsg}`,
        user_status: 'rejected',
        can_retry: true,
        rejection_reason: rejectReason || null
      });
    }

    // ✅ الحساب معتمد → إصدار JWT
    const session = issueUserSession(user, role);
    const token = session.token;
    const refreshToken = session.refreshToken;

    // جلب الصلاحيات
    let permissions = { all: true };
    let extraData = {};

    if (role === 'doctor') {
      const doctor = db
        .prepare(`
          SELECT d.id, d.full_name, d.specialty, d.clinic_name, d.avatar,
                 COALESCE(d.allow_direct_chat, 0) as allow_direct_chat,
                 c.id as clinic_id, c.name as clinic_full_name
          FROM doctors d
          LEFT JOIN clinics c ON d.clinic_name = c.name
          WHERE d.id = ?
        `)
        .get(user.id);

      extraData = doctor || {};
      permissions = {
        view_queue: true,
        receive_patient: true,
        view_appointments: true,
        view_patients: true,
        view_slots: true,
        video_calls: true,
        medical_records: true,
      };
    } else if (role === 'secretary') {
      const secretary = db
        .prepare(`
          SELECT s.id, s.full_name, s.phone, s.clinic_id, s.permissions,
                 c.name as clinic_name, c.governorate as clinic_governorate
          FROM secretaries s
          LEFT JOIN clinics c ON s.clinic_id = c.id
          WHERE s.id = ?
        `)
        .get(user.id);

      extraData = secretary || {};

      let savedPermissions = {};
      try {
        savedPermissions = secretary.permissions ? JSON.parse(secretary.permissions) : {};
      } catch (e) {
        savedPermissions = {};
      }

      permissions = {
        view_queue: true,
        check_in: true,
        view_appointments: true,
        edit_appointments: true,
        view_patients: true,
        view_slots: true,
        manage_slots: true,
        view_payments: true,
        confirm_payments: false,
        ...savedPermissions,
      };
    }

    res.json({
      success: true,
      message: 'تم تسجيل الدخول',
        token,
        refreshToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        role,
        type: role,
        status: user.status,
        age: user.age,
        gender: user.gender,
        governorate: user.governorate,
        ...extraData,
      },
      permissions,
    });
  } catch (err) {
    console.error('خطأ في التحقق:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 🆕 تسجيل ضيف — بدون OTP (فوري)
// ============================================================
router.post('/register/guest', guestRegisterLimiter, async (req, res) => {
  try {
    let { full_name, phone, age, gender, governorate } = req.body;

    // 1. التحقق من الحقول الإلزامية
    if (!full_name || !phone || !age || !gender || !governorate) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة (الاسم، الهاتف، العمر، الجنس، المحافظة)',
      });
    }

    // 2. تنظيف البيانات
    full_name = String(full_name).trim();
    phone = String(phone).trim().replace(/^(\+?967)/, '');
    age = Number(age);
    gender = String(gender).trim().toLowerCase();
    governorate = String(governorate).trim();

    // 3. التحقق من صحة البيانات
    const nameWords = full_name.split(/\s+/).filter(w => w.length > 0);
    if (nameWords.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'الاسم يجب أن يكون 3 كلمات على الأقل',
      });
    }

    if (!/^[0-9]{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف يجب أن يكون 9 أرقام',
      });
    }
    if (!/^(70|71|73|77|78)/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف يجب أن يبدأ بـ 70، 71، 73، 77، أو 78',
      });
    }

    if (isNaN(age) || age < 1 || age > 120) {
      return res.status(400).json({
        success: false,
        message: 'العمر يجب أن يكون بين 1 و 120',
      });
    }

    if (!['male', 'female'].includes(gender)) {
      return res.status(400).json({
        success: false,
        message: 'الجنس يجب أن يكون male أو female',
      });
    }

    if (governorate.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'المحافظة مطلوبة',
      });
    }

    // 4. هل الرقم موجود مسبقاً؟
    let patient = db.prepare('SELECT * FROM patients WHERE phone = ?').get(phone);

    if (patient) {
      // الرقم موجود → تحديث + إرجاع توكن
      console.log(`♻️  [Guest] رقم موجود — تسجيل دخول: ${phone}`);

      db.prepare(`
        UPDATE patients 
        SET full_name = ?, age = ?, gender = ?, governorate = ?, phone_verified = 1
        WHERE id = ?
      `).run(full_name, age, gender, governorate, patient.id);

      patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patient.id);

      if (patient.is_blocked) {
        return res.status(403).json({
          success: false,
          message: 'حسابك محظور',
        });
      }

      const session = issueUserSession(patient, 'patient');
      const token = session.token;
      const refreshToken = session.refreshToken;

      return res.status(200).json({
        success: true,
        message: 'تم تسجيل الدخول',
        token,
        user: {
          id: patient.id,
          full_name: patient.full_name,
          phone: patient.phone,
          email: patient.email,
          age: patient.age,
          gender: patient.gender,
          governorate: patient.governorate,
        balance: patient.balance || 0.0,
          role: 'patient',
          type: 'patient',
          status: patient.status,
        },
        permissions: { all: true },
      });
    }

    // 5. رقم جديد → إنشاء حساب بحالة pending لاعتماد الإدارة
    console.log(`🆕 [Guest] تسجيل طلب مريض جديد: ${phone}`);

    const result = db.prepare(`
      INSERT INTO patients (full_name, phone, age, gender, governorate, status, phone_verified)
      VALUES (?, ?, ?, ?, ?, 'pending', 1)
    `).run(full_name, phone, age, gender, governorate);

    patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid);

    try {
      const rrRes = db.prepare(`
        INSERT INTO registration_requests (type, user_id, data, status)
        VALUES ('patient', ?, ?, 'pending')
      `).run(patient.id, JSON.stringify({
        full_name, phone, age, gender, governorate,
        auto_registered: true,
        method: 'guest',
      }));

      notifyAdmins(
        'طلب اعتماد مريض جديد 👤',
        `سجل المريض ${full_name} (${phone}) كزائر وهو بانتظار الاعتماد.`,
        'patient_registration_request',
        { request_id: rrRes.lastInsertRowid, patient_id: patient.id, type: 'patient' }
      );
    } catch (e) {
      console.warn('⚠️ لم يتم تسجيل registration_request:', e.message);
    }

    return res.status(201).json({
      success: true,
      message: 'تم تسجيل بياناتك بنجاح. حسابك قيد المراجعة والاعتماد من قبل إدارة المنصة.',
      user_status: 'pending',
      user: {
        id: patient.id,
        full_name: patient.full_name,
        phone: patient.phone,
        email: patient.email,
        age: patient.age,
        gender: patient.gender,
        governorate: patient.governorate,
        role: 'patient',
        type: 'patient',
        status: 'pending',
      },
    });

  } catch (err) {
    console.error('❌ خطأ في register/guest:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'حدث خطأ في الخادم',
    });
  }
});

// ==================== تسجيل طبيب جديد ====================
router.post('/register/doctor', otpLimiter, async (req, res) => {
  try {
    const {
      full_name, specialty, clinic_name, governorate, address, phone,
      email, password, consultation_fee, slot_duration, bio, experience_years,
    } = req.body;

    if (!full_name || !specialty || !phone) {
      return res.status(400).json({
        success: false,
        message: 'الاسم والتخصص والهاتف مطلوبة',
      });
    }

    // ✅ فحص تكرار phone في جدول doctors
    const docPhoneCheck = checkPhoneExists('doctors', phone);
    if (docPhoneCheck.exists) {
      return res.status(400).json({ success: false, message: buildDuplicateMessage('phone', docPhoneCheck.ownerType) });
    }

    const passwordHash = password ? bcrypt.hashSync(password, 10) : null;

    const result = db
      .prepare(`
        INSERT INTO doctors
        (full_name, specialty, clinic_name, governorate, address, phone, email,
         password_hash, consultation_fee, slot_duration, bio, experience_years, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `)
      .run(
        full_name, specialty, clinic_name || null, governorate || null,
        address || null, phone, email || null, passwordHash,
        Number(consultation_fee) || 0, Number(slot_duration) || 20,
        bio || null, Number(experience_years) || 0
      );

    const rrResult = db.prepare(`
      INSERT INTO registration_requests (type, user_id, data)
      VALUES ('doctor', ?, ?)
    `).run(result.lastInsertRowid, JSON.stringify({ full_name, specialty, phone, email: email || null }));

    // 🔔 إشعار الإدارة بطلب اعتماد طبيب جديد
    notifyAdmins(
      'طلب اعتماد طبيب جديد 🩺',
      `قام د. ${full_name} (${specialty}) بإنشاء حساب جديد وهو بانتظار المراجعة والاعتماد.`,
      'doctor_registration_request',
      { request_id: rrResult.lastInsertRowid, doctor_id: result.lastInsertRowid, type: 'doctor' }
    );

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    db.prepare('DELETE FROM otp_codes WHERE phone = ? AND is_used = 0').run(phone);
    db.prepare(`
      INSERT INTO otp_codes (phone, code, user_type, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(phone, code, 'doctor', expiresAt.toISOString());

    console.log(`📱 OTP للطبيب الجديد: ${phone} → ${code}`);

    const message = `🔐 كود التحقق الخاص بك:

*${code}*

⏰ صالح لمدة 5 دقائق فقط.

منصة الحجز الطبي`;

    const sendResult = await sendWhatsAppMessage(phone, message);

    res.status(201).json({
      success: true,
      message: 'تم التسجيل. تم إرسال كود التحقق عبر واتساب.',
      ...(process.env.NODE_ENV === 'development' && { code }),
      whatsapp: sendResult.success,
    });
  } catch (err) {
    console.error('خطأ في تسجيل الطبيب:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تسجيل مريض جديد ====================
router.post('/register/patient', otpLimiter, async (req, res) => {
  try {
    const { full_name, phone, age, gender, governorate, blood_group, password } = req.body;

    if (!full_name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'الاسم ورقم الهاتف وكلمة المرور مطلوبة',
      });
    }

    const cleanName = String(full_name).trim();
    if (cleanName.length > 60) {
      return res.status(400).json({
        success: false,
        message: 'الاسم لا يتجاوز 60 حرفاً',
      });
    }

    const nameWords = cleanName.split(/\s+/).filter(Boolean);
    if (nameWords.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'يجب أن يكون الاسم ثلاثياً أو رباعياً على الأقل',
      });
    }

    const cleanPhone = String(phone).trim();
    if (!/^(77|78|71|73|70)\d{7}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف يجب أن يبدأ بـ 77 أو 78 أو 71 أو 73 أو 70 ويتكون من 9 أرقام فقط',
      });
    }

    const cleanPassword = String(password);
    if (cleanPassword.length < 6 || cleanPassword.length > 8) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تكون بين 6 إلى 8 خانات',
      });
    }

    // فحص تكرار الهاتف
    const patPhoneCheck = checkPhoneExists('patients', cleanPhone);
    if (patPhoneCheck.exists) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف مسجل مسبقاً. يرجى تسجيل الدخول مباشرة.',
      });
    }

    const passwordHash = bcrypt.hashSync(cleanPassword, 10);

    const result = db
      .prepare(`
        INSERT INTO patients
        (full_name, phone, age, gender, governorate, blood_group, password_hash, status, phone_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 1)
      `)
      .run(
        cleanName, cleanPhone,
        age ? Number(age) : null,
        gender || null, governorate || null, blood_group || null,
        passwordHash
      );

    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid);

    try {
      const rrRes = db.prepare(`
        INSERT INTO registration_requests (type, user_id, data, status)
        VALUES ('patient', ?, ?, 'pending')
      `).run(patient.id, JSON.stringify({
        full_name: cleanName,
        phone: cleanPhone,
        age: age ? Number(age) : null,
        gender: gender || null,
        governorate: governorate || null,
        blood_group: blood_group || null,
      }));

      notifyAdmins(
        'طلب اعتماد مريض جديد 👤',
        `سجل المريض ${cleanName} (${cleanPhone}) حساباً جديداً وهو بانتظار الاعتماد.`,
        'patient_registration_request',
        { request_id: rrRes.lastInsertRowid, patient_id: patient.id, type: 'patient' }
      );
    } catch (e) {}

    console.log(`⏳ [تسجيل مريض جديد]: ${cleanName} (${cleanPhone}) - بانتظار اعتماد الإدارة`);

    res.status(201).json({
      success: true,
      message: 'تم تسجيل حسابك بنجاح. حسابك قيد المراجعة والاعتماد من قبل إدارة المنصة.',
      user_status: 'pending',
      user: {
        id: patient.id,
        full_name: patient.full_name,
        phone: patient.phone,
        age: patient.age,
        gender: patient.gender,
        governorate: patient.governorate,
        blood_group: patient.blood_group,
        role: 'patient',
        type: 'patient',
        status: 'pending'
      }
    });
  } catch (err) {
    console.error('خطأ في تسجيل المريض:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== المستخدم الحالي ====================
router.get('/me', authenticate, (req, res) => {
  try {
    if (req.user.type === 'admin') {
      const admin = db
        .prepare('SELECT id, username, full_name, role, created_at, avatar_url FROM admins WHERE id = ?')
        .get(req.user.id);
      if (!admin) {
        return res.status(404).json({ success: false, message: 'لم يتم العثور على بيانات المستخدم' });
      }
      const adminData = { ...admin, type: 'admin', role: admin.role || 'admin', permissions: { all: true } };
      return res.json({
        success: true,
        data: adminData,
        user: adminData,
      });
    }

    if (req.user.type === 'doctor') {
      const doctor = db
        .prepare(`
          SELECT d.id, d.full_name, d.specialty, d.clinic_name, d.governorate,
                 d.phone, d.avatar, d.avatar_url, d.status, d.must_complete_profile, d.must_change_password,
                 c.id as clinic_id, c.name as clinic_full_name
          FROM doctors d
          LEFT JOIN clinics c ON d.clinic_name = c.name
          WHERE d.id = ?
        `)
        .get(req.user.id);

      if (!doctor) {
        return res.status(404).json({ success: false, message: 'لم يتم العثور على بيانات المستخدم' });
      }

      const doctorData = {
        ...doctor,
        role: 'doctor',
        type: 'doctor',
        permissions: {
          view_queue: true,
          receive_patient: true,
          view_appointments: true,
          view_patients: true,
          view_slots: true,
          video_calls: true,
          medical_records: true,
        },
      };

      return res.json({
        success: true,
        data: doctorData,
        user: doctorData,
      });
    }

    if (req.user.type === 'secretary') {
      const secretary = db
        .prepare(`
          SELECT s.id, s.full_name, s.email, s.phone, s.clinic_id, s.permissions,
                 s.avatar, s.avatar_url, s.status, s.must_complete_profile, s.must_change_password,
                 c.name as clinic_name, c.name as clinic_full_name, c.governorate as clinic_governorate
          FROM secretaries s
          LEFT JOIN clinics c ON s.clinic_id = c.id
          WHERE s.id = ?
        `)
        .get(req.user.id);

      if (!secretary) {
        return res.status(404).json({ success: false, message: 'لم يتم العثور على بيانات المستخدم' });
      }

      let permissions = {};
      try {
        permissions = secretary.permissions ? JSON.parse(secretary.permissions) : {};
      } catch (e) {
        permissions = {};
      }

      const defaultPermissions = {
        view_queue: true,
        check_in: true,
        view_appointments: true,
        edit_appointments: true,
        view_patients: true,
        view_slots: true,
        manage_slots: true,
        view_payments: true,
        confirm_payments: false,
      };

      const secData = {
        ...secretary,
        role: 'secretary',
        type: 'secretary',
        permissions: { ...defaultPermissions, ...permissions },
      };

      return res.json({
        success: true,
        data: secData,
        user: secData,
      });
    }

    if (req.user.type === 'patient') {
      const patient = db
        .prepare('SELECT id, full_name, phone, email, google_id, picture, avatar_url, age, gender, governorate, blood_group, status FROM patients WHERE id = ?')
        .get(req.user.id);

      if (!patient) {
        return res.status(404).json({ success: false, message: 'لم يتم العثور على بيانات المستخدم' });
      }

      const patData = { ...patient, type: 'patient', role: 'patient', permissions: { all: true } };
      return res.json({
        success: true,
        data: patData,
        user: patData,
      });
    }

    res.status(400).json({ success: false, message: 'نوع المستخدم غير معروف' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ═══════════════════════════════════════════
// 🆕 POST /auth/login/password
//    تسجيل دخول الطبيب/السكرتيرة بكلمة مرور
// ═══════════════════════════════════════════
router.post('/login/password', async (req, res) => {
  try {
    const { login, email, phone, password, role } = req.body;

    // ✅ الحقل الموحّد — يقبل login أو email أو phone
    const identifier = login || email || phone;

    // 1. التحقق من المدخلات
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'الهاتف/البريد وكلمة المرور مطلوبان'
      });
    }

    if (!role || !['doctor', 'secretary', 'patient'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الدور بشكل صحيح'
      });
    }

    if (role === 'patient') {
      const cleanLogin = identifier.trim();
      const patient = db.prepare('SELECT * FROM patients WHERE phone = ? OR email = ?').get(cleanLogin, cleanLogin);
      if (!patient) {
        return res.status(401).json({ success: false, message: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
      }
      if (!patient.password_hash) {
        return res.status(400).json({ success: false, message: 'لم يتم تعيين كلمة مرور لهذا الحساب' });
      }
      const isValid = bcrypt.compareSync(password, patient.password_hash);
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'رقم الهاتف أو كلمة المرور غير صحيحة' });
      }

      // التحقق من الحظر
      if (patient.is_blocked === 1 || patient.status === 'blocked') {
        return res.status(403).json({ success: false, message: 'حسابك محظور من قبل إدارة المنصة' });
      }

      // التحقق من حالة المراجعة والاعتماد
      if (patient.status === 'pending') {
        return res.status(403).json({
          success: false,
          message: 'حسابك قيد المراجعة والاعتماد من قبل إدارة المنصة',
          user_status: 'pending',
          user: {
            id: patient.id,
            full_name: patient.full_name,
            phone: patient.phone,
            role: 'patient',
            status: 'pending'
          }
        });
      }

      if (patient.status === 'rejected') {
        let rejectReason = '';
        try {
          const lastReq = db.prepare(`
            SELECT notes FROM registration_requests
            WHERE user_id = ? AND type = 'patient' AND status = 'rejected'
            ORDER BY reviewed_at DESC, id DESC LIMIT 1
          `).get(patient.id);
          if (lastReq && lastReq.notes) {
            rejectReason = lastReq.notes.trim();
          }
        } catch (_) {}

        return res.status(403).json({
          success: false,
          message: rejectReason ? `تم رفض حسابك من قبل الإدارة. السبب: ${rejectReason}` : 'تم رفض الحساب من قبل الإدارة. يرجى مراجعة بياناتك.',
          user_status: 'rejected',
          rejection_reason: rejectReason || null,
          can_retry: true
        });
      }

      if (patient.status !== 'approved') {
        return res.status(403).json({
          success: false,
          message: 'حسابك غير معتمد حالياً. يرجى التواصل مع إدارة المنصة.',
          user_status: patient.status
        });
      }

      const token = generatePatientToken(patient);
      return res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      refreshToken,
      refreshToken,
        user: {
          id: patient.id,
          full_name: patient.full_name,
          phone: patient.phone,
          age: patient.age,
          gender: patient.gender,
          governorate: patient.governorate,
          blood_group: patient.blood_group,
          role: 'patient',
          type: 'patient',
          status: 'approved'
        }
      });
    }

    // 2. البحث في الجدول الصحيح (phone أو email)
    const lookup = getStaffByLogin(identifier, role);
    let user = lookup.user;

    // 3. إذا لم يوجد
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'الهاتف/البريد أو كلمة المرور غير صحيحة'
      });
    }

    // 5. التحقق من كلمة المرور
    if (!user.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'لم تُعيَّن كلمة مرور لهذا الحساب. سجّل دخول Google أولاً.',
        needs_setup: true
      });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'الهاتف/البريد أو كلمة المرور غير صحيحة'
      });
    }

    // 6. التحقق من الحالة
    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'حسابك قيد المراجعة والاعتماد من قبل إدارة المنصة',
        user_status: 'pending',
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role
        }
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
        message: `تم رفض حسابك من قبل الإدارة. ${reasonMsg}`,
        user_status: 'rejected',
        can_retry: true,
        rejection_reason: rejectReason || null
      });
    }

    if (user.is_active === 0 || user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'تم تعطيل أو حظر حسابك من قبل إدارة المنصة.',
        user_status: 'blocked'
      });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'حسابك غير معتمد حالياً من قبل إدارة المنصة.',
        user_status: user.status
      });
    }

    // 7. إصدار JWT
    const session = issueUserSession(user, role);
    const token = session.token;
    const refreshToken = session.refreshToken;

    // 8. جلب الصلاحيات
    let permissions = {};
    let extraData = {};

    if (role === 'doctor') {
      permissions = {
        view_queue: true,
        receive_patient: true,
        view_appointments: true,
        view_patients: true,
        view_slots: true,
        medical_records: true,
        view_own_schedule: true
      };

      const doctor = db.prepare(`
        SELECT d.id, d.full_name, d.specialty, d.clinic_name, d.avatar,
               d.consultation_fee, d.slot_duration,
               c.id as clinic_id, c.name as clinic_full_name,
               c.governorate as clinic_governorate
        FROM doctors d
        LEFT JOIN clinics c ON d.clinic_name = c.name
        WHERE d.id = ?
      `).get(user.id);
      extraData = doctor || {};
    } else {
      let savedPermissions = {};
      try {
        savedPermissions = user.permissions ? JSON.parse(user.permissions) : {};
      } catch (e) {}

      permissions = {
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

      const secretary = db.prepare(`
        SELECT s.id, s.full_name, s.phone, s.clinic_id,
               c.name as clinic_name, c.governorate as clinic_governorate
        FROM secretaries s
        LEFT JOIN clinics c ON s.clinic_id = c.id
        WHERE s.id = ?
      `).get(user.id);
      extraData = secretary || {};
    }

    // 9. الاستجابة
    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role,
        type: role,
        status: user.status,
        is_active: user.is_active,
        must_change_password: user.must_change_password === 1,
        ...extraData
      },
      permissions
    });

  } catch (err) {
    console.error('❌ خطأ في login/password:', err);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
});

// ═══════════════════════════════════════════
// 🆕 POST /auth/set-password
//    تعيين/تغيير كلمة المرور
// ═══════════════════════════════════════════
router.post('/set-password', authenticate, async (req, res) => {
  try {
    const { new_password, current_password } = req.body;

    if (!new_password || new_password.length < 6 || new_password.length > 8) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الجديدة يجب أن تكون بين 6 و 8 خانات'
      });
    }

    const role = req.user.type;
    let table = null;

    if (role === 'doctor') table = 'doctors';
    else if (role === 'secretary') table = 'secretaries';
    else {
      return res.status(403).json({
        success: false,
        message: 'هذا المسار للطبيب والسكرتيرة فقط'
      });
    }

    const user = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // التحقق من كلمة المرور الحالية (إذا لزم)
    if (user.password_hash && !user.must_change_password) {
      if (!current_password) {
        return res.status(400).json({
          success: false,
          message: 'كلمة المرور الحالية مطلوبة'
        });
      }

      const isValid = bcrypt.compareSync(current_password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'كلمة المرور الحالية غير صحيحة'
        });
      }
    }

    const newHash = bcrypt.hashSync(new_password, 12);

    db.prepare(`
      UPDATE ${table}
      SET password_hash = ?,
          must_change_password = 0,
          password_changed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newHash, req.user.id);

    res.json({
      success: true,
      message: 'تم تعيين كلمة المرور بنجاح'
    });

  } catch (err) {
    console.error('❌ خطأ في set-password:', err);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
});
// ==================== تسجيل الخروج ====================
router.post('/logout', authenticate, (req, res) => {
  res.json({ success: true, message: 'تم تسجيل الخروج' });
});

// ==================== تغيير كلمة المرور ====================
router.post('/change-password', authenticate, (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الحالية والجديدة مطلوبتان',
      });
    }

    if (new_password.length < 6 || new_password.length > 8) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الجديدة يجب أن تكون بين 6 و 8 خانات',
      });
    }

    let table = '';
    if (req.user.type === 'admin') table = 'admins';
    else if (req.user.type === 'doctor') table = 'doctors';
    else if (req.user.type === 'patient') table = 'patients';
    else if (req.user.type === 'secretary') table = 'secretaries';

    const user = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.user.id);

    if (!user.password_hash) {
      return res.status(400).json({ success: false, message: 'لا توجد كلمة مرور' });
    }

    const isValid = bcrypt.compareSync(current_password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة',
      });
    }

    const newHash = bcrypt.hashSync(new_password, 10);
    db.prepare(`UPDATE ${table} SET password_hash = ? WHERE id = ?`).run(
      newHash,
      req.user.id
    );

    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== قائمة المدراء ====================
router.get('/admins', authenticate, authorize('admin'), (req, res) => {
  try {
    const admins = db
      .prepare('SELECT id, username, full_name, role, is_active, created_at FROM admins ORDER BY created_at DESC')
      .all();
    res.json({ success: true, data: admins });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إضافة مدير ====================
router.post('/admins', authenticate, authorize('admin'), (req, res) => {
  try {
    const { username, password, full_name, role } = req.body;

    if (!username || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'كلمة المرور 6 أحرف على الأقل' });
    }

    const existing = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ success: false, message: 'اسم المستخدم مسجل مسبقاً' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO admins (username, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `).run(username, passwordHash, full_name, role || 'admin');

    const admin = db
      .prepare('SELECT id, username, full_name, role, is_active, created_at FROM admins WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json({ success: true, message: 'تم إضافة المدير', data: admin });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تعديل مدير ====================
router.put('/admins/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const { full_name, role, is_active } = req.body;
    const adminId = Number(req.params.id);

    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'المدير غير موجود' });
    }

    if (adminId === req.user.id && is_active === 0) {
      return res.status(400).json({ success: false, message: 'لا يمكنك تعطيل حسابك' });
    }

    db.prepare(`
      UPDATE admins SET full_name = ?, role = ?, is_active = ? WHERE id = ?
    `).run(
      full_name || admin.full_name,
      role || admin.role,
      is_active !== undefined ? (is_active ? 1 : 0) : admin.is_active,
      adminId
    );

    res.json({ success: true, message: 'تم التعديل بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== حذف مدير ====================
router.delete('/admins/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const adminId = Number(req.params.id);

    if (adminId === req.user.id) {
      return res.status(400).json({ success: false, message: 'لا يمكنك حذف حسابك' });
    }

    const count = db.prepare('SELECT COUNT(*) as count FROM admins').get();
    if (count.count <= 1) {
      return res.status(400).json({ success: false, message: 'لا يمكن حذف آخر مدير' });
    }

    db.prepare('DELETE FROM admins WHERE id = ?').run(adminId);
    res.json({ success: true, message: 'تم حذف المدير' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// 🆕 Google Sign-In — تسجيل الدخول عبر Google
// ============================================================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID || '399127188969-459at9sedg9ech13b45m3cm2ok6oh2ra.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);


router.post('/google-direct-login', async (req, res) => {
  try {
    const { email, name, picture, google_id } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    let patient = db.prepare('SELECT * FROM patients WHERE LOWER(email) = ?').get(cleanEmail);

    if (!patient && google_id) {
      patient = db.prepare('SELECT * FROM patients WHERE google_id = ?').get(google_id);
    }

    if (!patient) {
      const tempPhone = 'google_' + (google_id || Math.abs(cleanEmail.hashCode ? cleanEmail.hashCode() : Date.now()));
      const displayName = name || 'مريض طبيبك';
      const insertRes = db.prepare(`
        INSERT INTO patients (full_name, phone, email, google_id, picture, status, phone_verified, balance)
        VALUES (?, ?, ?, ?, ?, 'approved', 1, 0.0)
      `).run(displayName, tempPhone, cleanEmail, google_id || null, picture || null);

      patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(insertRes.lastInsertRowid);
      console.log('🆕 [Google Direct] تم إنشاء حساب مريض جديد:', cleanEmail);
    } else {
      if (google_id && !patient.google_id) {
        db.prepare('UPDATE patients SET google_id = ? WHERE id = ?').run(google_id, patient.id);
      }
      if (picture && !patient.picture) {
        db.prepare('UPDATE patients SET picture = ? WHERE id = ?').run(picture, patient.id);
      }
    }

    if (patient.is_blocked) {
      return res.status(403).json({ success: false, message: 'حسابك محظور من قبل إدارة المنصة' });
    }

    const session = issueUserSession(patient, 'patient');
    const token = session.token;
    const refreshToken = session.refreshToken;

    console.log('✅ [Google Direct] تسجيل دخول وإصدار توكن رسمي صالح:', cleanEmail);

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        id: patient.id,
        full_name: patient.full_name,
        phone: patient.phone,
        email: patient.email,
        google_id: patient.google_id,
        picture: patient.picture,
        role: 'patient',
        type: 'patient',
        status: patient.status,
        age: patient.age,
        gender: patient.gender,
        governorate: patient.governorate,
        balance: patient.balance || 0.0
      },
      permissions: { all: true }
    });
  } catch (err) {
    console.error('❌ خطأ في google-direct-login:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/google-login', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'idToken مطلوب',
      });
    }

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
    } catch (verifyErr) {
      console.error('❌ فشل التحقق من Google token:', verifyErr.message);
      return res.status(401).json({
        success: false,
        message: 'رمز Google غير صالح',
      });
    }

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || 'مريض جديد';
    const picture = payload.picture || null;

    console.log(`🔵 [Google] محاولة تسجيل دخول: ${email} (${googleId})`);

    let patient = db
      .prepare('SELECT * FROM patients WHERE google_id = ?')
      .get(googleId);

    if (!patient && email) {
      patient = db
        .prepare('SELECT * FROM patients WHERE email = ?')
        .get(email);

      if (patient) {
        db.prepare('UPDATE patients SET google_id = ?, picture = ? WHERE id = ?')
          .run(googleId, picture || null, patient.id);
        console.log(`🔗 [Google] ربط google_id بحساب موجود: ${email}`);
      }
    }

    if (!patient) {
      const tempPhone = `google_${googleId}`;

      const result = db
        .prepare(`
          INSERT INTO patients (full_name, phone, email, google_id, picture, status, phone_verified)
          VALUES (?, ?, ?, ?, ?, 'approved', 1)
        `)
        .run(name, tempPhone, email || null, googleId, picture || null);

      patient = db
        .prepare('SELECT * FROM patients WHERE id = ?')
        .get(result.lastInsertRowid);

      console.log(`🆕 [Google] إنشاء مريض جديد: ${email} (tempPhone: ${tempPhone})`);

      try {
        db.prepare(`
          INSERT INTO registration_requests (type, user_id, data, status)
          VALUES ('patient', ?, ?, 'approved')
        `).run(patient.id, JSON.stringify({
          email,
          google_id: googleId,
          auto_registered: true,
          method: 'google'
        }));
      } catch (e) {}
    }

    if (patient.is_blocked) {
      return res.status(403).json({
        success: false,
        message: 'حسابك محظور',
      });
    }

    const session = issueUserSession(patient, 'patient');
    const token = session.token;
    const refreshToken = session.refreshToken;

    console.log(`✅ [Google] تسجيل دخول ناجح: ${email}`);

    res.json({
      success: true,
      message: 'تم تسجيل الدخول عبر Google',
      token,
      refreshToken,
      user: {
        id: patient.id,
        full_name: patient.full_name,
        phone: patient.phone,
        email: patient.email,
        google_id: patient.google_id,
        picture: patient.picture || picture,
        role: 'patient',
        type: 'patient',
        status: patient.status,
        age: patient.age,
        gender: patient.gender,
        governorate: patient.governorate,
      },
      permissions: { all: true },
    });
  } catch (err) {
    console.error('❌ خطأ في google-login:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== طلب استعادة الحساب ====================
router.post('/recovery-request', otpLimiter, async (req, res) => {
  try {
    const { full_name, phone } = req.body;

    // 1. التحقق من الحقول
    if (!full_name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'الاسم الكامل ورقم الهاتف مطلوبان',
      });
    }

    // 2. تنظيف البيانات
    const cleanName = String(full_name).trim();
    const cleanPhone = String(phone).trim().replace(/^(\+?967)/, '');

    // 3. التحقق من الاسم (3 كلمات على الأقل)
    const nameWords = cleanName.split(/\s+/).filter((w) => w.length > 0);
    if (nameWords.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'الاسم يجب أن يكون 3 كلمات على الأقل',
      });
    }

    // 4. التحقق من رقم الهاتف
    if (!/^[0-9]{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف يجب أن يكون 9 أرقام',
      });
    }
    if (!/^(70|71|73|77|78)/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف يجب أن يبدأ بـ 70، 71، 73، 77، أو 78',
      });
    }

    // 5. ابحث عن المستخدم في كل الجداول
    let user = null;
    let userType = null;

    const doctor = db
      .prepare('SELECT * FROM doctors WHERE phone = ? AND is_deleted = 0')
      .get(cleanPhone);
    if (doctor) {
      user = doctor;
      userType = 'doctor';
    }

    if (!user) {
      const secretary = db
        .prepare('SELECT * FROM secretaries WHERE phone = ?')
        .get(cleanPhone);
      if (secretary) {
        user = secretary;
        userType = 'secretary';
      }
    }

    if (!user) {
      const patient = db
        .prepare('SELECT * FROM patients WHERE phone = ?')
        .get(cleanPhone);
      if (patient) {
        user = patient;
        userType = 'patient';
      }
    }

    // 6. إذا لم يوجد المستخدم
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'رقم الهاتف غير مسجل. تأكد من الرقم أو تواصل مع الدعم.',
      });
    }

    // 7. مقارنة الاسم (تحقق تقريبي — كل كلمة موجودة في الاسم المخزّن)
    const storedName = String(user.full_name || '').trim().toLowerCase();
    const providedName = cleanName.toLowerCase();
    const providedWords = providedName.split(/\s+/).filter((w) => w.length > 0);
    const matchedWords = providedWords.filter((w) => storedName.includes(w));

    // نطلب تطابق 50% على الأقل من الكلمات
    const matchRatio = matchedWords.length / providedWords.length;
    if (matchRatio < 0.5) {
      return res.status(400).json({
        success: false,
        message: 'البيانات غير متطابقة مع السجلات. تأكد من الاسم ورقم الهاتف.',
      });
    }

    // 8. هل يوجد طلب سابق قيد المراجعة لنفس المستخدم؟
    const existing = db
      .prepare(`
        SELECT * FROM registration_requests
        WHERE type = ? AND user_id = ? AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
      `)
      .get('password_reset', user.id);

    if (existing) {
      return res.json({
        success: true,
        message: 'لديك طلب قيد المراجعة. سيتم التواصل معك قريبًا.',
      });
    }

    // 9. أنشئ طلب جديد
    const requestData = JSON.stringify({
      full_name: cleanName,
      phone: cleanPhone,
      user_type: userType,
      matched_words: matchedWords.length,
      total_words: providedWords.length,
      match_ratio: matchRatio,
      requested_at: new Date().toISOString(),
    });

    const result = db
      .prepare(`
        INSERT INTO registration_requests (type, user_id, data, status)
        VALUES (?, ?, ?, 'pending')
      `)
      .run('password_reset', user.id, requestData);

    console.log(`📩 [Recovery] طلب استعادة حساب:`);
    console.log(`   النوع: ${userType}`);
    console.log(`   المستخدم: ${user.full_name} (${user.id})`);
    console.log(`   الهاتف: ${cleanPhone}`);
    console.log(`   الطلب: #${result.lastInsertRowid}`);

    // 10. استجابة نجاح
    return res.status(201).json({
      success: true,
      message: 'تم استلام طلبك. سيتم مراجعته من قبل الإدارة والتواصل معك قريبًا.',
      request_id: result.lastInsertRowid,
    });

  } catch (err) {
    console.error('❌ خطأ في recovery-request:', err);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم. حاول مرة أخرى لاحقًا.',
    });
  }
});
// ==================== إعادة تعيين كلمة المرور ====================
router.post('/reset-password', otpLimiter, async (req, res) => {
  try {
    const { phone, new_password } = req.body;

    // 1. التحقق من المدخلات
    if (!phone || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف وكلمة المرور الجديدة مطلوبان',
      });
    }

    const cleanPhone = String(phone).trim().replace(/^(\+?967)/, '');

    if (!/^[0-9]{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف يجب أن يكون 9 أرقام',
      });
    }

    // 2. التحقق من قوة كلمة المرور
    if (new_password.length < 6 || new_password.length > 8) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تكون بين 6 و 8 خانات',
      });
    }

    // 3. البحث عن طلب استعادة معتمد لهذا الرقم
    const recoveryRequest = db.prepare(`
      SELECT * FROM registration_requests
      WHERE type = 'password_reset'
        AND status = 'approved'
        AND json_extract(data, '$.phone') = ?
      ORDER BY reviewed_at DESC
      LIMIT 1
    `).get(cleanPhone);

    if (!recoveryRequest) {
      return res.status(404).json({
        success: false,
        message: 'لا يوجد طلب استعادة معتمد لهذا الرقم. تواصل مع الدعم.',
      });
    }

    // 4. ابحث عن المستخدم
    let user = null;
    let table = null;

    const patient = db.prepare('SELECT * FROM patients WHERE phone = ?').get(cleanPhone);
    if (patient) { user = patient; table = 'patients'; }

    if (!user) {
      const doctor = db.prepare('SELECT * FROM doctors WHERE phone = ? AND is_deleted = 0').get(cleanPhone);
      if (doctor) { user = doctor; table = 'doctors'; }
    }

    if (!user) {
      const secretary = db.prepare('SELECT * FROM secretaries WHERE phone = ?').get(cleanPhone);
      if (secretary) { user = secretary; table = 'secretaries'; }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
      });
    }

    // 5. تحديث كلمة المرور
    const bcrypt = (await import('bcryptjs')).default;
    const newHash = bcrypt.hashSync(new_password, 12);

    db.prepare(`
      UPDATE ${table}
      SET password_hash = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newHash, user.id);

    // 6. تحديث حالة طلب الاستعادة إلى completed
    db.prepare(`
      UPDATE registration_requests
      SET status = 'completed',
          notes = COALESCE(notes, '') || ' | تم تعيين كلمة مرور جديدة في ' || datetime('now')
      WHERE id = ?
    `).run(recoveryRequest.id);

    console.log(`🔐 [ResetPassword] تم تعيين كلمة مرور جديدة للمستخدم ${user.full_name} (${table}#${user.id})`);

    return res.json({
      success: true,
      message: 'تم تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.',
    });

  } catch (err) {
    console.error('❌ خطأ في reset-password:', err);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم. حاول مرة أخرى لاحقًا.',
    });
  }
});
// ═══════════════════════════════════════════
// 🆕 حذف الحساب (متطلبات Google Play Store)
// ═══════════════════════════════════════════
router.post('/delete-account', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role || req.user.type;

    if (userRole === 'doctor') {
      db.prepare("UPDATE doctors SET is_deleted = 1, is_active = 0, status = 'deleted' WHERE id = ?").run(userId);
    } else if (userRole === 'secretary') {
      db.prepare("UPDATE secretaries SET is_active = 0, status = 'deleted' WHERE id = ?").run(userId);
    } else {
      db.prepare("UPDATE patients SET is_active = 0 WHERE id = ?").run(userId);
    }

    res.json({
      success: true,
      message: 'تم حذف حسابك وبياناتك بنجاح وفقاً لطلبك'
    });
  } catch (err) {
    console.error('Error deleting account:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ═══════════════════════════════════════════
// 🆕 إضافة / تحديث البريد الإلكتروني
// ═══════════════════════════════════════════
router.post('/update-email', authenticate, (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال بريد إلكتروني صحيح' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userId = req.user.id;
    const userRole = req.user.role || req.user.type;

    if (userRole === 'secretary') {
      const existing = db.prepare('SELECT id FROM secretaries WHERE email = ? AND id != ?').get(cleanEmail, userId);
      if (existing) {
        return res.status(400).json({ success: false, message: 'هذا البريد الإلكتروني مسجل بحساب آخر' });
      }
      db.prepare('UPDATE secretaries SET email = ? WHERE id = ?').run(cleanEmail, userId);
      const updatedSec = db.prepare(`
        SELECT s.id, s.full_name, s.email, s.phone, s.clinic_id, s.permissions,
               s.avatar, s.avatar_url, s.status, s.must_complete_profile, s.must_change_password,
               c.name as clinic_name, c.name as clinic_full_name, c.governorate as clinic_governorate
        FROM secretaries s
        LEFT JOIN clinics c ON s.clinic_id = c.id
        WHERE s.id = ?
      `).get(userId);
      return res.json({
        success: true,
        message: 'تم حفظ البريد الإلكتروني بنجاح ✅',
        data: { ...updatedSec, role: 'secretary', type: 'secretary' },
        user: { ...updatedSec, role: 'secretary', type: 'secretary' }
      });
    } else if (userRole === 'doctor') {
      const existing = db.prepare('SELECT id FROM doctors WHERE email = ? AND id != ?').get(cleanEmail, userId);
      if (existing) {
        return res.status(400).json({ success: false, message: 'هذا البريد الإلكتروني مسجل بحساب آخر' });
      }
      db.prepare('UPDATE doctors SET email = ? WHERE id = ?').run(cleanEmail, userId);
      const updatedDoc = db.prepare(`
        SELECT d.id, d.full_name, d.email, d.specialty, d.clinic_name, d.governorate,
               d.phone, d.avatar, d.avatar_url, d.status, d.must_complete_profile, d.must_change_password,
               c.id as clinic_id, c.name as clinic_full_name
        FROM doctors d
        LEFT JOIN clinics c ON d.clinic_name = c.name
        WHERE d.id = ?
      `).get(userId);
      return res.json({
        success: true,
        message: 'تم حفظ البريد الإلكتروني بنجاح ✅',
        data: { ...updatedDoc, role: 'doctor', type: 'doctor' },
        user: { ...updatedDoc, role: 'doctor', type: 'doctor' }
      });
    } else {
      db.prepare('UPDATE patients SET email = ? WHERE id = ?').run(cleanEmail, userId);
      const updatedPat = db.prepare('SELECT * FROM patients WHERE id = ?').get(userId);
      return res.json({
        success: true,
        message: 'تم حفظ البريد الإلكتروني بنجاح ✅',
        data: updatedPat,
        user: updatedPat
      });
    }
  } catch (err) {
    console.error('Error updating email:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});


// ═══════════════════════════════════════════
// 🔄 REFRESH TOKEN ROTATION (RTR) ENDPOINT
// ═══════════════════════════════════════════
router.post('/refresh-token', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token مطلوب' });
    }

    const record = db.prepare(`
      SELECT * FROM refresh_tokens WHERE token = ?
    `).get(refreshToken);

    if (!record) {
      return res.status(401).json({ success: false, message: 'جلسة الدخول غير صالحة' });
    }

    // 🚨 Reuse detection (OWASP): If an already-revoked token is used, someone may have compromised it!
    if (record.revoked === 1) {
      db.prepare(`
        UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND user_type = ?
      `).run(record.user_id, record.user_type);
      return res.status(403).json({
        success: false,
        message: 'تم رصد محاولة استخدام رمز أمان قديم. تم إلغاء كافة الجلسات لحماية حسابك.'
      });
    }

    // Check expiration
    if (new Date(record.expires_at) < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'انتهت صلاحية جلسة الدخول. يرجى إعادة تسجيل الدخول.'
      });
    }

    // Fetch user to confirm account is still active
    let userTable = 'patients';
    if (record.user_type === 'doctor') userTable = 'doctors';
    else if (record.user_type === 'secretary') userTable = 'secretaries';
    else if (record.user_type === 'admin') userTable = 'admins';

    const user = db.prepare(`SELECT * FROM ${userTable} WHERE id = ?`).get(record.user_id);
    if (!user || user.is_active === 0 || user.is_blocked === 1) {
      return res.status(403).json({ success: false, message: 'الحساب غير نشط أو محظور' });
    }

    // Generate new Access Token + new Refresh Token (Rotation)
    const payload = {
      id: user.id,
      phone: user.phone || null,
      email: user.email || null,
      username: user.username || null,
      role: record.user_type,
      type: record.user_type
    };
    const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const rotateTx = db.transaction(() => {
      db.prepare(`
        UPDATE refresh_tokens
        SET revoked = 1, replaced_by_token = ?
        WHERE id = ?
      `).run(newRefreshToken, record.id);

      db.prepare(`
        INSERT INTO refresh_tokens (user_id, user_type, token, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(user.id, record.user_type, newRefreshToken, newExpiresAt);
    });
    rotateTx();

    res.json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 1800
    });
  } catch (err) {
    console.error('❌ Error refreshing token:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🚪 LOGOUT & REVOKE REFRESH TOKEN
// ═══════════════════════════════════════════
router.post('/logout', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      db.prepare(`UPDATE refresh_tokens SET revoked = 1 WHERE token = ?`).run(refreshToken);
    }
    res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

