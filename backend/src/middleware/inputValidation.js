/**
 * 🛡️ inputValidation.js
 * ميدلوير التحقق الشامل وفلترة المدخلات للأمان:
 * 1. حماية ضد الأكواد البرمجية الخبيثة (Anti-XSS & Code Injection)
 * 2. التحقق من أرقام الهواتف (9 أرقام فقط)
 * 3. التحقق من أسماء الأشخاص (أحرف عربية فقط، أقصى حد 25 حرفاً، بدون رموز أو أرقام أو إنجليزي)
 * 4. التحقق من كلمات المرور (أقصى حد 8 أحرف أو أرقام)
 * 5. حدود أطوال الحقول النصية لمنع هجمات الفيضان
 */

// نمط الأحرف العربية ومسافة فقط (يستثني الأرقام والرموز والأحرف اللاتينية)
const ARABIC_LETTERS_ONLY_REGEX = /^[\u0621-\u064A\u066E-\u06D3\u0671-\u06D5\s]+$/;

// الأنماط الخبيثة للأكواد والسكريبتات
const DANGEROUS_CODE_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|<[^>]+>|javascript:|data:text\/html|alert\(|eval\(|onerror\s*=|onload\s*=|onclick\s*=/gi;

/**
 * دالة لتنظيف النص بعمق من أي وسوم HTML أو أكواد خبيثة
 */
export function sanitizeString(val) {
  if (typeof val !== 'string') return val;
  let clean = val
    .replace(/\0/g, '') // إزالة null bytes
    .replace(DANGEROUS_CODE_REGEX, '') // إزالة السكريبتات والوسوم
    .replace(/[<>`]/g, '') // إزالة الأقواس الحادة والباكتيك
    .trim();
  return clean;
}

/**
 * دالة تفحص الكائن وتنقيه تعاودياً (Recursively)
 */
function deepSanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      obj[key] = sanitizeString(val);
    } else if (typeof val === 'object' && val !== null) {
      deepSanitize(val);
    }
  }
  return obj;
}

/**
 * الميدلوير الرئيسي المطبق على كل الطلبات
 */
export function inputValidationMiddleware(req, res, next) {
  // 1. تنظيف عميق لكل المدخلات من الأكواد الخبيثة
  if (req.body && typeof req.body === 'object') {
    deepSanitize(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    deepSanitize(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    deepSanitize(req.params);
  }

  // إذا لم يكن هناك body (مثل طلبات GET) استمر
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }

  const isAdminLogin = req.body?.username !== undefined || req.originalUrl.includes('/admin/login') || req.originalUrl.includes('/setup-admin');
  const isPublicOrStaffAuth = !isAdminLogin;

  // 2. التحقق من حقول أرقام الهواتف
  const phoneKeys = ['phone', 'phone_number', 'phoneNumber', 'patient_phone', 'patientPhone', 'doctor_phone', 'secretary_phone'];
  for (const key of phoneKeys) {
    if (req.body[key] !== undefined && req.body[key] !== null && String(req.body[key]).trim() !== '') {
      let rawPhone = String(req.body[key]).trim().replace(/^(\+?967)/, '').replace(/[\s-]/g, '');
      
      // فحص أن الهاتف 9 أرقام فقط وبدون أي أحرف أو رموز
      if (!/^[0-9]{9}$/.test(rawPhone)) {
        return res.status(400).json({
          success: false,
          message: 'رقم الهاتف يجب أن يتكون من 9 أرقام فقط بدون أحرف أو رموز'
        });
      }
      req.body[key] = rawPhone;
    }
  }

  // 3. التحقق من أسماء الأشخاص (أحرف عربية أو لاتينية، أقصى حد 60 حرفاً)
  // لا يطبق على username (الأدمن) أو أسماء العيادات clinic_name
  const personNameKeys = ['full_name', 'fullName', 'patient_name', 'patientName'];
  const VALID_NAME_REGEX = /^[\p{L}\s'-]+$/u;
  for (const key of personNameKeys) {
    if (req.body[key] !== undefined && req.body[key] !== null && String(req.body[key]).trim() !== '') {
      const name = String(req.body[key]).trim();

      // التحقق من الطول (بين 2 و 60 حرفاً)
      if (name.length < 2 || name.length > 60) {
        return res.status(400).json({
          success: false,
          message: 'الاسم يجب ألا يتجاوز 60 حرفاً ولا يقل عن حرفين'
        });
      }

      // التحقق من أنه أحرف ومسافات فقط بدون رموز برمجية خبيثة أو أرقام
      if (!VALID_NAME_REGEX.test(name)) {
        return res.status(400).json({
          success: false,
          message: 'الاسم يجب أن يحتوي على أحرف ومسافات فقط بدون أرقام أو رموز خاصة'
        });
      }
      req.body[key] = name;
    }
  }

  // 4. التحقق من كلمات المرور (أقصى حد 8 خانات للتطبيقات)
  if (isPublicOrStaffAuth) {
    const passwordKeys = ['password', 'new_password', 'newPassword', 'current_password', 'currentPassword', 'old_password', 'oldPassword', 'confirm_password', 'confirmPassword'];
    for (const key of passwordKeys) {
      if (req.body[key] !== undefined && req.body[key] !== null && String(req.body[key]).trim() !== '') {
        const pass = String(req.body[key]);
        if (pass.length > 8) {
          return res.status(400).json({
            success: false,
            message: 'كلمة المرور يجب ألا تزيد عن 8 أحرف أو أرقام'
          });
        }
      }
    }
  }

  // 5. حدود للأطوال العامة للحقول الإضافية
  if (req.body.bio && String(req.body.bio).length > 200) {
    req.body.bio = String(req.body.bio).substring(0, 200);
  }
  if (req.body.clinic_name && String(req.body.clinic_name).length > 50) {
    req.body.clinic_name = String(req.body.clinic_name).substring(0, 50);
  }
  if (req.body.specialty && String(req.body.specialty).length > 50) {
    req.body.specialty = String(req.body.specialty).substring(0, 50);
  }
  if (req.body.address && String(req.body.address).length > 100) {
    req.body.address = String(req.body.address).substring(0, 100);
  }
  if (req.body.notes && String(req.body.notes).length > 200) {
    req.body.notes = String(req.body.notes).substring(0, 200);
  }

  next();
}
