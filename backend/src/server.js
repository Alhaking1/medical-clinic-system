import helmet from 'helmet';
import compression from 'compression';
import * as Sentry from '@sentry/node';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { errorHandler, notFound } from './middleware/errorHandler.js';
import { initDatabase, seedAdmin, seedDefaultData } from './config/schema.js';
import db from './config/database.js';
import { authenticate, authorize } from './middleware/auth.js';
import { requestLogger } from './middleware/auditLog.js';
import { inputValidationMiddleware } from './middleware/inputValidation.js';
import { startBackupSchedule } from './utils/backup.js';

// Routes
import authRoutes from './routes/auth.js';
import recoveryRoutes from './routes/recovery.js';
import doctorRoutes from './routes/doctors.js';
import secretaryRoutes from './routes/secretaries.js';
import patientRoutes from './routes/patients.js';
import slotRoutes from './routes/slots.js';
import appointmentRoutes from './routes/appointments.js';
import paymentRoutes from './routes/payments.js';
import clearRoutes from './routes/clear.js';
import clinicRoutes from './routes/clinics.js';
import adminRoutes from './routes/admin.js';
import otpRoutes from './routes/otp.js';
import offerRoutes from './routes/offers.js';
import periodRoutes from './routes/periods.js';
import queueRoutes from './routes/queue.js';
import checkInRoutes from './routes/checkIn.js';
import medicalRecordsRoutes from './routes/medicalRecords.js';
import prescriptionsRoutes from './routes/prescriptions.js';
import timeRoutes from './routes/time.js';
import googleAuthRoutes from './routes/googleAuth.js';
import completeProfileRoutes from './routes/completeProfile.js';
import notificationRoutes from './routes/notifications.js';
import chatRoutes from './routes/chat.js';
import userRoutes from './routes/users.js';
import familyRoutes from './routes/family.js';
import assistantRoutes from './routes/assistant.js';
import rateLimit from 'express-rate-limit';

dotenv.config();

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
  console.log('✅ Sentry error tracking initialized');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// ═══════════════════════════════════════════
// Trust Proxy (مهم لـ Railway)
// ═══════════════════════════════════════════
app.set('trust proxy', 1);

// ═══════════════════════════════════════════
// Helmet — رؤوس الأمان المتطورة
// ═══════════════════════════════════════════
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  contentSecurityPolicy: false, // Disables CSP for flexible mobile & admin REST API consumption
}));

// Additional Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  next();
});

// ═══════════════════════════════════════════
// Rate Limiters — Inline
// ═══════════════════════════════════════════

// عام — 100 طلب / 15 دقيقة
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'عدد الطلبات كبير — حاول بعد قليل'
  }
});

// OTP — 5 محاولات / ساعة
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'تجاوزت الحد الأقصى لطلبات الكود — حاول بعد ساعة'
  }
});

// حجز — 10 محاولات / دقيقة
const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'محاولات كثيرة — انتظر دقيقة'
  }
});

// register/guest — 3 حسابات / يوم
const guestRegisterLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'لا يمكن إنشاء أكثر من 3 حسابات يومياً'
  }
});

// Admin Login — 10 محاولات / ساعة
const adminLoginLimiter = rateLimit({
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
// Middleware
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// CORS — قائمة Origins معتمدة
// ═══════════════════════════════════════════
const allowedOrigins = [
  'http://localhost:5173',       // Admin Panel (dev)
  'http://localhost:5174',       // Admin Panel (dev alt)
  'http://localhost:3000',       // Admin Panel (dev alt)
  'https://medical-booking-backend-production.up.railway.app',  // Backend URL
  // أضف نطاق الأدمن الإنتاجي هنا لاحقاً
  // 'https://admin.your-domain.com',
];

app.use(cors({
  origin: function (origin, callback) {
    // ✅ السماح للتطبيقات المحمولة (لا origin)
    if (!origin) return callback(null, true);

    // ✅ السماح في development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // ✅ السماح من قائمة معتمدة
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // ❌ رفض
    console.warn(`⚠️ CORS rejected: ${origin}`);
    return callback(new Error('CORS غير مسموح'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 🛡️ فحص وفلترة المدخلات الشاملة (Anti-XSS, Lengths, Phone, Names, Passwords)
app.use(inputValidationMiddleware);

// 🆕 Request Logger
app.use(requestLogger);

// 🆕 General Rate Limiter
app.use('/api/', generalLimiter);

// ═══════════════════════════════════════════════════════════════════
// 🛡️ FIX 3: STRICT PATH TRAVERSAL GUARD FOR STATIC UPLOADS
// ═══════════════════════════════════════════════════════════════════
const uploadsDir = path.resolve(__dirname, '../uploads');

// Global path traversal guard across all routes
app.use((req, res, next) => {
  const rawUrl = req.originalUrl || req.url || '';
  if (rawUrl.includes('..') || req.path.includes('..')) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN_TRAVERSAL',
      message: 'Access Denied: Path traversal detected'
    });
  }
  next();
});

// Dedicated secure static uploads handler
app.use('/uploads', (req, res, next) => {
  const safeSubPath = decodeURIComponent(req.path);
  const targetFullPath = path.resolve(uploadsDir, '.' + safeSubPath);

  if (!targetFullPath.startsWith(uploadsDir)) {
    return res.status(403).json({
      success: false,
      code: 'PATH_TRAVERSAL_DETECTED',
      message: 'Access Denied: Target path escapes uploads directory'
    });
  }
  next();
}, express.static(uploadsDir, { dotfiles: 'deny', fallthrough: false }));

// ═══════════════════════════════════════════
// Routes
// ═══════════════════════════════════════════
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏥 مرحباً بك في API منصة الحجز الطبي',
    version: '1.0.0',
  });
});


app.get('/api/v1/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({
      success: true,
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    });
  } catch (dbErr) {
    res.status(503).json({
      success: false,
      status: 'ERROR',
      message: 'قاعدة البيانات غير متاحة',
      error: dbErr.message,
    });
  }
});

// ═══════════════════════════════════════════
// Routes with Specific Rate Limiters
// ═══════════════════════════════════════════

// Stricter Auth Rate Limiter (10 requests / 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'محاولات دخول كثيرة — يرجى الانتظار 15 دقيقة' }
});

// Compression (gzip/deflate for payloads > 1KB)
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/admin/login', authLimiter);
app.use('/api/v1/otp/send', otpLimiter);

// Auth endpoints — OtpLimiter + GuestRegisterLimiter + AdminLoginLimiter
// ⚠️ هذه الـ Limiters سنطبقها داخل routes/auth.js
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/recovery', recoveryRoutes);

// Appointments — BookingLimiter
// ⚠️ سنطبقها داخل routes/appointments.js
app.use('/api/v1/appointments', appointmentRoutes);

// باقي Routes
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/secretaries', secretaryRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/slots', slotRoutes);
app.use('/api/v1/periods', periodRoutes);
app.use('/api/v1/queue', queueRoutes);
app.use('/api/v1/check-in', checkInRoutes);
app.use('/api/v1/medical-records', medicalRecordsRoutes);
app.use('/api/v1/prescriptions', prescriptionsRoutes);
app.use('/api/v1/time', timeRoutes);
app.use('/api/v1/google-auth', googleAuthRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/admin', clearRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/clinics', clinicRoutes);
app.use('/api/v1/registrations', adminRoutes);
app.use('/api/v1/otp', otpRoutes);
app.use('/api/v1/offers', offerRoutes);
app.use('/api/v1/complete', completeProfileRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/family', familyRoutes);
app.use('/api/v1/assistant', assistantRoutes);

// ═══════════════════════════════════════════
// معالجة الأخطاء
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// 🆕 CLINICS DIRECT — تجاوز clinicRoutes
// ═══════════════════════════════════════════
app.get('/api/v1/clinics-direct', (req, res) => {
  try {
    const clinics = db.prepare('SELECT * FROM clinics ORDER BY name').all();
    res.json({ success: true, data: clinics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/v1/clinics-direct', authenticate, authorize('admin'), (req, res) => {
  try {
    const { name, governorate, address, phone, notes, google_maps_url, commission_rate } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    
    const existing = db.prepare('SELECT * FROM clinics WHERE name = ?').get(name);
    if (existing) return res.status(400).json({ success: false, message: 'duplicate' });

    const commRate = commission_rate !== undefined && commission_rate !== null && commission_rate !== ''
      ? parseFloat(commission_rate)
      : null;
    
    const result = db.prepare(`
      INSERT INTO clinics (name, governorate, address, phone, notes, google_maps_url, commission_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, governorate || null, address || null, phone || null, notes || null, google_maps_url || null, commRate);
    
    const clinic = db.prepare('SELECT * FROM clinics WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, message: 'created', data: clinic });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/v1/clinics-direct/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const clinicId = Number(req.params.id);
    const clinic = db.prepare('SELECT * FROM clinics WHERE id = ?').get(clinicId);
    if (!clinic) return res.status(404).json({ success: false, message: 'العيادة غير موجودة' });

    const { name, governorate, address, phone, notes, is_active, google_maps_url, commission_rate } = req.body;

    const commRate = commission_rate !== undefined
      ? (commission_rate === null || commission_rate === '' ? null : parseFloat(commission_rate))
      : clinic.commission_rate;

    db.prepare(`
      UPDATE clinics
      SET name = ?, governorate = ?, address = ?, phone = ?, notes = ?, is_active = ?, google_maps_url = ?, commission_rate = ?
      WHERE id = ?
    `).run(
      name !== undefined ? name : clinic.name,
      governorate !== undefined ? governorate : clinic.governorate,
      address !== undefined ? address : clinic.address,
      phone !== undefined ? phone : clinic.phone,
      notes !== undefined ? notes : clinic.notes,
      is_active !== undefined ? (is_active ? 1 : 0) : clinic.is_active,
      google_maps_url !== undefined ? google_maps_url : clinic.google_maps_url,
      commRate,
      clinicId
    );

    res.json({ success: true, message: 'تم التعديل' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/v1/clinics-direct/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const result = db.prepare('DELETE FROM clinics WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ success: false, message: 'العيادة غير موجودة' });
    res.json({ success: true, message: 'تم حذف العيادة' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/v1/clinics-direct/:id', (req, res) => {
  try {
    const clinic = db.prepare('SELECT * FROM clinics WHERE id = ?').get(req.params.id);
    if (!clinic) return res.status(404).json({ success: false, message: 'العيادة غير موجودة' });

    const doctors = db.prepare(`
      SELECT DISTINCT d.id, d.full_name, d.specialty, d.consultation_fee, d.is_active
      FROM doctors d
      LEFT JOIN doctor_clinics dc ON d.id = dc.doctor_id
      WHERE (d.clinic_name = ? OR dc.clinic_id = ?) AND d.is_deleted = 0 AND d.is_active = 1 AND d.status = 'approved'
    `).all(clinic.name, clinic.id);

    const secretaries = db.prepare(`
      SELECT id, full_name, phone, is_active FROM secretaries WHERE clinic_id = ?
    `).all(clinic.id);

    res.json({ success: true, data: { ...clinic, doctors, secretaries } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// ═══════════════════════════════════════════
// Public Pages & Privacy Policy (Google Play)
// ═══════════════════════════════════════════
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(publicDir, 'privacy.html'));
});
app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(publicDir, 'privacy.html'));
});

// ═══════════════════════════════════════════
// Admin Panel Web Hosting (لوحة الأدمن الحية)
// ═══════════════════════════════════════════
const adminDistPath = path.join(publicDir, 'admin');
app.use('/admin', express.static(adminDistPath));
app.get(['/admin', '/admin/*'], (req, res) => {
  const indexPath = path.join(adminDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Admin Panel build not found');
  }
});


// ═══════════════════════════════════════════
// 🆕 صفحة سياسة الخصوصية (متطلبات Google Play)
// ═══════════════════════════════════════════
const renderPrivacyPolicy = (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>سياسة الخصوصية - تطبيق طبيبك والعيادة الطبية</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.8; color: #1e293b; background: #f8fafc; padding: 24px; max-width: 860px; margin: auto; }
    .card { background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    h1 { color: #0d9488; margin-bottom: 8px; }
    h2 { color: #0f766e; margin-top: 28px; border-bottom: 2px solid #ccfbf1; padding-bottom: 6px; }
    .badge { display: inline-block; background: #ccfbf1; color: #0f766e; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 13px; margin-bottom: 16px; }
    ul { padding-right: 20px; }
    li { margin-bottom: 8px; }
    .highlight { background: #fef3c7; padding: 12px 16px; border-radius: 10px; border-right: 4px solid #f59e0b; margin: 16px 0; }
    .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 13px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Google Play Data Safety & Privacy Policy</span>
    <h1>سياسة الخصوصية وحماية البيانات</h1>
    <p>تاريخ آخر تحديث: أكتوبر 2026</p>
    <p>أهلاً بك في تطبيق <strong>طبيبك (Medical Clinic App)</strong> وتطبيق <strong>كادر العيادة (Medical Clinic Staff App)</strong>. نحن نلتزم التزاماً كاملاً بحماية خصوصيتك وبياناتك الشخصية والطبية وفقاً لأعلى معايير الأمان وسياسات متجر Google Play.</p>

    <h2>1. المعلومات التي نجمعها</h2>
    <ul>
      <li><strong>بيانات الحساب:</strong> الاسم الرباعي، رقم الهاتف، والبريد الإلكتروني (عند تسجيل الدخول عبر Google أو الهاتف).</li>
      <li><strong>بيانات الكادر الطبي:</strong> التخصص الطبي، رقم الترخيص (إن وجد)، سنوات الخبرة، والعيادة أو المركز التابع له.</li>
      <li><strong>بيانات المواعيد والطابور:</strong> تاريخ الموعد، رقم الدور، حالة الحضور أو الكشف.</li>
      <li><strong>بيانات العيادات:</strong> اسم العيادة، المحافظة، العنوان، ورابط الموقع على خرائط Google لتسهيل وصول المرضى.</li>
    </ul>

    <h2>2. كيف نستخدم معلوماتك</h2>
    <ul>
      <li>تنظيم مواعيد الكشف وحجز الأدوار في العيادات الطبية.</li>
      <li>تسهيل إدارة الطابور الحي للأطباء والسكرتارية وتنبيه المرضى بدورهم.</li>
      <li>التحقق من هوية الأطباء والمستخدمين لمنع الحسابات الوهمية.</li>
      <li>لا نقوم إطلاقاً ببيع أو تأجير بياناتك لأي أطراف ثالثة لأغراض تسويقية أو إعلانية.</li>
    </ul>

    <h2>3. خصوصية البيانات الصحية</h2>
    <p>جميع المعلومات الطبية وسجلات الحجوزات مشفرة ومحمية، ولا يمكن الاطلاع عليها إلا من قبل الطبيب المعالج وكادر العيادة المصرح له فقط وفقاً لأخلاقيات المهن الطبية.</p>

    <h2>4. سياسة حذف الحساب والبيانات (Account Deletion)</h2>
    <div class="highlight">
      <strong>حقك في حذف حسابك وبياناتك بالكامل:</strong><br>
      يمكنك في أي وقت طلب حذف حسابك نهائياً وجميع البيانات المرتبطة به من خلال:
      <ul>
        <li>داخل التطبيق مباشرة: الانتقال إلى <em>الملف الشخصي > حذف الحساب والبيانات</em>.</li>
        <li>أو عبر التواصل معنا مباشرة عبر البريد الإلكتروني: <code>support@tabeebak.app</code> وسيتم حذف كافة بياناتك فوراً خلال 24 ساعة.</li>
      </ul>
    </div>

    <h2>5. أمان وحماية البيانات</h2>
    <p>نستخدم بروتوكولات التشفير القياسية (HTTPS / TLS 1.3) وتشفير كلمات المرور عبر مكتبات التشفير القوية (Bcrypt)، مع حماية السيرفرات بقواعد جدار حماية صارمة لمنع أي وصول غير مصرح به.</p>

    <h2>6. التواصل معنا</h2>
    <p>إذا كان لديك أي استفسار أو طلب بخصوص سياسة الخصوصية وحماية البيانات، يمكنك مراسلتنا على:<br>
    البريد الإلكتروني: <strong>support@tabeebak.app</strong><br>
    الجمهورية اليمنية - صنعاء</p>

    <div class="footer">
      جميع الحقوق محفوظة &copy; 2026 تطبيق طبيبك لإدارة العيادات الطبية
    </div>
  </div>
</body>
</html>`);
};

app.get('/privacy', renderPrivacyPolicy);
app.get('/privacy-policy', renderPrivacyPolicy);
app.get('/api/v1/privacy', renderPrivacyPolicy);

app.use(notFound);
app.use(errorHandler);

// ═══════════════════════════════════════════
// تهيئة قاعدة البيانات
// ═══════════════════════════════════════════
initDatabase();
seedAdmin();
seedDefaultData();

// 🆕 Backup Schedule
startBackupSchedule();

// تشغيل الخادم
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║  🏥 منصة الحجز الطبي - Backend API      ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  🚀 http://localhost:${PORT}              ║`);
  console.log('║                                        ║');
  console.log('║  🔒 Helmet + Rate Limiting + Graceful  ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
});

// Graceful Shutdown
function handleShutdown(signal) {
  console.log(`\n🛑 [SHUTDOWN] استلام إشارة ${signal} — إغلاق الخادم بأمان...`);
  server.close(() => {
    console.log('✅ [SHUTDOWN] تم إغلاق اتصالات HTTP.');
    try {
      db.close();
      console.log('✅ [SHUTDOWN] تم إغلاق قاعدة بيانات SQLite.');
    } catch (e) {
      console.error('⚠️ [SHUTDOWN] خطأ في إغلاق قاعدة البيانات:', e.message);
    }
    process.exit(0);
  });

  // مهلة إجبارية بعد 10 ثوانٍ
  setTimeout(() => {
    console.error('⚠️ [SHUTDOWN] تجاوز المهلة المحددة، إغلاق إجباري.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
