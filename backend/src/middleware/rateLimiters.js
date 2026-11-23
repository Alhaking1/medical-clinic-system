import rateLimit from 'express-rate-limit';

// ═══════════════════════════════════════════
// OTP — 5 محاولات / ساعة
// ═══════════════════════════════════════════
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'تجاوزت الحد الأقصى لطلبات الكود — حاول بعد ساعة'
  }
});

// ═══════════════════════════════════════════
// حجز — 10 محاولات / دقيقة
// ═══════════════════════════════════════════
export const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'محاولات كثيرة — انتظر دقيقة'
  }
});

// ═══════════════════════════════════════════
// register/guest — 3 حسابات / يوم
// ═══════════════════════════════════════════
export const guestRegisterLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'لا يمكن إنشاء أكثر من 3 حسابات يومياً'
  }
});

// ═══════════════════════════════════════════
// Admin Login — 10 محاولات / ساعة
// ═══════════════════════════════════════════
export const adminLoginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'محاولات دخول كثيرة — حاول بعد ساعة'
  }
});

// ═══════════════════════════════════════════
// OTP Verify — 10 محاولات / 15 دقيقة
// ═══════════════════════════════════════════
// ⚠️ مهم: يمنع brute-force على كود OTP (6 أرقام = 900,000 احتمال)
// keyGenerator: يعتمد على رقم الهاتف + IP لمنع التبديل
export const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const phone = (req.body && req.body.phone) ? String(req.body.phone) : 'unknown';
    return `_`;
  },
  message: {
    success: false,
    message: 'محاولات تحقق كثيرة — حاول بعد 15 دقيقة'
  }
});
