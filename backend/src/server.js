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
  // إذا كان الطلب من متصفح إنترنت (يريد HTML)، نعرض بوابة الخادم التنفيذية الفاخرة
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>طبيبك | بوابة الخادم والـ API المركزية</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230D9488' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'/%3E%3Cpath d='M12 5v14'/%3E%3Cpath d='M5 12h14'/%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #070D18;
      --card-bg: rgba(15, 23, 42, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --emerald: #0D9488;
      --emerald-light: #14B8A6;
      --emerald-glow: rgba(13, 148, 136, 0.25);
      --text: #F8FAFC;
      --text-muted: #94A3B8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', system-ui, sans-serif; }
    body {
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow-x: hidden;
      selection-background-color: var(--emerald);
    }
    .bg-glow-1 {
      position: absolute;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(13, 148, 136, 0.15) 0%, transparent 70%);
      top: -150px;
      right: -100px;
      border-radius: 50%;
      pointer-events: none;
      filter: blur(40px);
    }
    .bg-glow-2 {
      position: absolute;
      width: 450px;
      height: 450px;
      background: radial-gradient(circle, rgba(20, 184, 166, 0.12) 0%, transparent 70%);
      bottom: 50px;
      left: -120px;
      border-radius: 50%;
      pointer-events: none;
      filter: blur(50px);
    }
    header {
      padding: 40px 24px 20px;
      text-align: center;
      position: relative;
      z-index: 10;
    }
    .brand-crest {
      width: 68px;
      height: 68px;
      border-radius: 20px;
      background: linear-gradient(135deg, #0D9488, #14B8A6);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 10px 25px var(--emerald-glow);
      margin-bottom: 16px;
    }
    .brand-crest svg { width: 36px; height: 36px; }
    h1 {
      font-size: 2.2rem;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #FFFFFF;
      margin-bottom: 6px;
    }
    .badge-sub {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(13, 148, 136, 0.15);
      border: 1px solid rgba(13, 148, 136, 0.3);
      color: #2DD4BF;
      padding: 4px 14px;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 700;
      margin-bottom: 14px;
    }
    .badge-sub span.pulse {
      width: 8px;
      height: 8px;
      background-color: #10B981;
      border-radius: 50%;
      box-shadow: 0 0 8px #10B981;
    }
    p.lead {
      color: var(--text-muted);
      font-size: 1.05rem;
      max-width: 640px;
      margin: 0 auto;
    }
    main {
      flex: 1;
      max-width: 1080px;
      margin: 30px auto;
      padding: 0 24px;
      position: relative;
      z-index: 10;
      width: 100%;
    }
    .grid-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 20px;
      backdrop-filter: blur(14px);
      transition: transform 0.2s, border-color 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      border-color: rgba(13, 148, 136, 0.4);
    }
    .stat-title {
      font-size: 0.85rem;
      color: var(--text-muted);
      font-weight: 600;
      margin-bottom: 6px;
    }
    .stat-value {
      font-size: 1.25rem;
      font-weight: 800;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .actions-banner {
      background: linear-gradient(135deg, rgba(13, 148, 136, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%);
      border: 1px solid rgba(13, 148, 136, 0.35);
      border-radius: 20px;
      padding: 32px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 32px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
    }
    .actions-text h2 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #FFFFFF;
      margin-bottom: 6px;
    }
    .actions-text p {
      color: var(--text-muted);
      font-size: 0.95rem;
    }
    .btn-group {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #0D9488, #14B8A6);
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.95rem;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 6px 18px var(--emerald-glow);
      transition: opacity 0.2s, transform 0.2s;
    }
    .btn-primary:hover {
      opacity: 0.95;
      transform: translateY(-2px);
    }
    .btn-secondary {
      background: rgba(30, 41, 59, 0.8);
      color: #E2E8F0;
      text-decoration: none;
      padding: 12px 20px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 0.95rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s;
    }
    .btn-secondary:hover {
      background: rgba(51, 65, 85, 0.8);
      color: white;
    }
    .section-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #FFFFFF;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .endpoints-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
      gap: 14px;
      margin-bottom: 32px;
    }
    .endpoint-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 16px 20px;
      backdrop-filter: blur(12px);
    }
    .endpoint-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .endpoint-path {
      font-family: monospace;
      font-size: 0.9rem;
      font-weight: 700;
      color: #38BDF8;
      direction: ltr;
    }
    .endpoint-method {
      font-size: 0.7rem;
      font-weight: 800;
      background: rgba(56, 189, 248, 0.15);
      color: #38BDF8;
      padding: 2px 8px;
      border-radius: 6px;
    }
    .endpoint-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    footer {
      text-align: center;
      padding: 28px 20px;
      color: #64748B;
      font-size: 0.85rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      position: relative;
      z-index: 10;
    }
  </style>
</head>
<body>
  <div class="bg-glow-1"></div>
  <div class="bg-glow-2"></div>

  <header>
    <div class="brand-crest">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        <path d="M12 5v14"/>
        <path d="M5 12h14"/>
      </svg>
    </div>
    <div class="badge-sub">
      <span class="pulse"></span>
      <span>الخادم المركزي والـ API نشط ومستقر</span>
    </div>
    <h1>منظومة طبيبك | Tabeebak Core Engine</h1>
    <p class="lead">البوابة البرمجية الموحدة لخدمات الحجز الطبي، إدارة العيادات، وسجلات المرضى في الجمهورية اليمنية</p>
  </header>

  <main>
    <div class="grid-stats">
      <div class="stat-card">
        <div class="stat-title">حالة النظام التشغيلي</div>
        <div class="stat-value">
          <span style="color: #34D399;">● متصل ويعمل بكفاءة</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-title">قاعدة البيانات المركزية</div>
        <div class="stat-value">SQLite (WAL High-Perf)</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">نطاق التغطية الزمني والجغرافي</div>
        <div class="stat-value">صنعاء / عدن (توقيت مكة)</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">إصدار المحرك الموحد</div>
        <div class="stat-value">v2.0.0 Pro Enterprise</div>
      </div>
    </div>

    <div class="actions-banner">
      <div class="actions-text">
        <h2>لوحة الإدارة والتحكم الذكية (Admin Panel)</h2>
        <p>إدارة الكادر الطبي، المنشآت، الحجوزات، المحفظة المالية، ومطابقة طلبات التسجيل المباشرة.</p>
      </div>
      <div class="btn-group">
        <a href="/admin" class="btn-primary">
          <svg style="width: 18px; height: 18px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 8 6 4-6 4Z"/></svg>
          فتح لوحة التحكم المباشرة
        </a>
        <a href="/api/v1/health" class="btn-secondary" target="_blank">
          <svg style="width: 18px; height: 18px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          فحص الصحة (Health Check)
        </a>
        <a href="/privacy" class="btn-secondary">
          <svg style="width: 18px; height: 18px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
          سياسة الخصوصية والأمان
        </a>
      </div>
    </div>

    <div class="section-title">
      <svg style="width: 20px; height: 20px; color: #14B8A6;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
      المسارات البرمجية الرئيسية لمنظومة الخدمات (Core API Endpoints)
    </div>

    <div class="endpoints-grid">
      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="endpoint-path">/api/v1/auth</span>
          <span class="endpoint-method">POST</span>
        </div>
        <p class="endpoint-desc">المصادقة الأمنية، التحقق بخطوتين عبر SMS/OTP، وتسجيل دخول الكادر والمرضى.</p>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="endpoint-path">/api/v1/doctors</span>
          <span class="endpoint-method">GET / POST</span>
        </div>
        <p class="endpoint-desc">دليل الأطباء والاستشاريين، التخصصات، الرسوم، والجدولة الزمنية للعيادات.</p>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="endpoint-path">/api/v1/clinics</span>
          <span class="endpoint-method">GET / POST</span>
        </div>
        <p class="endpoint-desc">دليل المستشفيات والمراكز التخصصية، العناوين، وأرقام الطوارئ في اليمن.</p>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="endpoint-path">/api/v1/appointments</span>
          <span class="endpoint-method">RESTful</span>
        </div>
        <p class="endpoint-desc">حجز المواعيد الفورية والمسبقة، نظام الطابور الذكي، وتأكيد الحضور (Check-In).</p>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="endpoint-path">/api/v1/medical-records</span>
          <span class="endpoint-method">RESTful</span>
        </div>
        <p class="endpoint-desc">السجل الطبي الموحد، الوصفات الإلكترونية (e-Prescriptions)، ونتائج التحاليل.</p>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="endpoint-path">/api/v1/assistant</span>
          <span class="endpoint-method">AI ENGINE</span>
        </div>
        <p class="endpoint-desc">المساعد الذكي (AI Triage) لتوجيه المريض وتحديد التخصص المناسب بدقة متناهية.</p>
      </div>
    </div>
  </main>

  <footer>
    منظومة طبيبك الذكية للرعاية الصحية والعيادات الطبية &copy; 2026. جميع الحقوق محفوظة. صُمم بأعلى معايير الأمان وتجربة المستخدم الفاخرة.
  </footer>
</body>
</html>`);
  }

  // الرد البرمجي القياسي لتطبيقات الهاتف والـ API
  res.json({
    success: true,
    message: '🏥 مرحباً بك في API منصة الحجز الطبي (منظومة طبيبك)',
    version: '2.0.0',
    status: 'ONLINE',
    documentation: '/admin',
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
