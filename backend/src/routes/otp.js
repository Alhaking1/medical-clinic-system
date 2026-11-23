import crypto from 'crypto';
import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { otpLimiter, verifyOtpLimiter } from '../middleware/rateLimiters.js';
import db from '../config/database.js';

const router = express.Router();

// ==================== توليد كود OTP ====================
function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

// ==================== إرسال عبر Green-API ====================
async function sendWhatsApp(phone, message) {
  try {
    const apiUrl = process.env.GREEN_API_URL;
    const instance = process.env.GREEN_API_INSTANCE;
    const token = process.env.GREEN_API_TOKEN;

    if (!apiUrl || !instance || !token) {
      console.warn('⚠️ Green-API غير مُعدّ. سيتم طباعة الكود فقط.');
      return { success: false, reason: 'not_configured' };
    }

    // تنسيق الرقم (967XXXXXXXXX)
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '967' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('967')) {
      formattedPhone = '967' + formattedPhone;
    }

    const url = `${apiUrl}/waInstance${instance}/sendMessage/${token}`;

    const body = {
      chatId: `${formattedPhone}@c.us`,
      message: message,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ فشل إرسال واتساب:', data);
      return { success: false, reason: 'api_error', data };
    }

    console.log('✅ تم إرسال واتساب إلى:', formattedPhone);
    return { success: true, data };
  } catch (err) {
    console.error('❌ خطأ في إرسال واتساب:', err.message);
    return { success: false, reason: 'exception', error: err.message };
  }
}

// ==================== إرسال OTP ====================
router.post('/send', otpLimiter, async (req, res) => {
  try {
    const { phone, user_type = 'patient' } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'رقم الهاتف مطلوب' });
    }

    // توليد الكود
    const code = generateOTP();

    // تاريخ الانتهاء: 5 دقائق
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // حذف الأكواد القديمة
    db.prepare('DELETE FROM otp_codes WHERE phone = ? AND is_used = 0').run(phone);

    // حفظ الكود
    db.prepare(`
      INSERT INTO otp_codes (phone, code, user_type, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(phone, code, user_type, expiresAt.toISOString());

    // طباعة في Console
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║  🔐 كود OTP جديد                       ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  📱 الهاتف: ${phone}`);
    console.log(`║  🔑 الكود: ${code}`);
    console.log(`║  ⏰ ينتهي: بعد 5 دقائق`);
    console.log('╚════════════════════════════════════════╝');
    console.log('');

    // إرسال عبر واتساب
    const message = `🔐 كود التحقق الخاص بك:

*${code}*

⏰ صالح لمدة 5 دقائق فقط.
لا تشاركه مع أي شخص.

منصة الحجز الطبي`;

    const sendResult = await sendWhatsApp(phone, message);

    res.json({
      success: true,
      message: sendResult.success
        ? 'تم إرسال الكود عبر واتساب'
        : 'تم إنشاء الكود (تعذّر الإرسال)',
      ...(process.env.NODE_ENV === 'development' && { code }),
      whatsapp: sendResult.success,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== التحقق من OTP ====================
router.post('/verify', verifyOtpLimiter, (req, res) => {
  try {
    const { phone, code } = req.body;

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

    res.json({
      success: true,
      message: 'تم التحقق بنجاح',
      user_type: otp.user_type,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== اختبار الإرسال ====================
router.post('/test', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'رقم الهاتف مطلوب' });
    }

    const result = await sendWhatsApp(phone, '🧪 رسالة اختبار من منصة الحجز الطبي');

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تنظيف الأكواد القديمة ====================
router.delete('/clean', authenticate, authorize('admin'), (req, res) => {
  try {
    const result = db.prepare(`
      DELETE FROM otp_codes
      WHERE expires_at < datetime('now') OR is_used = 1
    `).run();

    res.json({
      success: true,
      message: `تم حذف ${result.changes} كود`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;