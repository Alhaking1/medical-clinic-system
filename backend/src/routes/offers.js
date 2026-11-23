import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import {
  sanitizeText,
  sanitizeNumber,
  sanitizeId,
  validateImageSignature,
  sanitizeAndReencodeImage,
  safeDeleteFile,
} from '../utils/sanitize.js';

const router = express.Router();

// ==================== إعدادات المجلدات ====================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OFFERS_UPLOAD_DIR = path.join(__dirname, '../../uploads/offers');
const TEMP_UPLOAD_DIR = path.join(__dirname, '../../uploads/temp');

// إنشاء المجلدات
try {
  if (!fs.existsSync(OFFERS_UPLOAD_DIR)) {
    fs.mkdirSync(OFFERS_UPLOAD_DIR, { recursive: true });
    console.log('✅ تم إنشاء مجلد uploads/offers');
  }
  if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
    fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
  }
} catch (e) {
  console.error('⚠️ خطأ في إنشاء المجلدات:', e.message);
}

// ==================== إعداد multer — تخزين مؤقت ====================
// ⚠️ نُخزّن مؤقتاً — ثم نُعالج بـ sharp — ثم نحفظ في OFFERS_UPLOAD_DIR
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `temp_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مسموح — فقط صور (JPG, PNG, WEBP, GIF)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,  // ✅ 5 MB (بدلاً من 10)
  },
});

// ==================== Helper: حساب end_date ====================
function calculateEndDate(duration_hours, duration_days, explicit_end_date) {
  if (explicit_end_date) return explicit_end_date;

  let msToAdd = 0;
  if (duration_hours && Number(duration_hours) > 0) {
    msToAdd = Number(duration_hours) * 60 * 60 * 1000;
  } else if (duration_days && Number(duration_days) > 0) {
    msToAdd = Number(duration_days) * 24 * 60 * 60 * 1000;
  }

  if (msToAdd === 0) return null;
  return new Date(Date.now() + msToAdd).toISOString();
}

// ==================== Helper: هل العرض منتهي ====================
function isExpired(end_date) {
  if (!end_date) return false;
  try {
    const end = new Date(end_date);
    return end.getTime() < Date.now();
  } catch (e) {
    return false;
  }
}

// ==================== Helper: جلب صور عرض ====================
function getOfferImages(offerId) {
  try {
    return db.prepare(`
      SELECT id, image_path, sort_order
      FROM offer_images
      WHERE offer_id = ?
      ORDER BY sort_order ASC, id ASC
    `).all(offerId);
  } catch (e) {
    return [];
  }
}

// ==================== Helper: حساب الوقت المتبقي ====================
function formatRemainingTime(endDateStr) {
  if (!endDateStr) return 'دائم';
  try {
    const now = Date.now();
    const end = new Date(endDateStr).getTime();
    const diffMs = end - now;
    if (diffMs <= 0) return 'منتهي';

    const diffSec = Math.floor(diffMs / 1000);
    const days = Math.floor(diffSec / 86400);
    const hours = Math.floor((diffSec % 86400) / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);

    if (days > 0) {
      return `متبقي ${days} يوم ${hours > 0 ? `و ${hours} س` : ''}`.trim();
    }
    if (hours > 0) {
      return `متبقي ${hours} ساعة ${minutes > 0 ? `و ${minutes} د` : ''}`.trim();
    }
    return `متبقي ${minutes} دقيقة`;
  } catch (e) {
    return null;
  }
}

// ==================== Helper: إضافة صور لعرض ====================
function enrichOfferWithImages(offer) {
  if (!offer) return offer;
  return {
    ...offer,
    is_expired: isExpired(offer.end_date) ? 1 : 0,
    remaining_time_display: formatRemainingTime(offer.end_date),
    images: getOfferImages(offer.id),
  };
}

// ==================== Helper: تنظيف بيانات العرض ====================
function sanitizeOfferBody(body) {
  return {
    title: sanitizeText(body.title, 200),
    description: sanitizeText(body.description, 2000),
    doctor_id: sanitizeId(body.doctor_id),
    clinic_id: sanitizeId(body.clinic_id || body.facility_id),
    facility_id: sanitizeId(body.facility_id || body.clinic_id),
    provider_name: sanitizeText(body.provider_name, 150),
    target_audience: sanitizeText(body.target_audience, 200),
    max_capacity: sanitizeNumber(body.max_capacity, 1, 100000),
    original_price: sanitizeNumber(body.original_price, 0, 999999999),
    discounted_price: sanitizeNumber(body.discounted_price, 0, 999999999),
    discount_percent: sanitizeNumber(body.discount_percent, 0, 100),
    start_date: sanitizeText(body.start_date, 50),
    end_date: sanitizeText(body.end_date, 50),
    duration_hours: sanitizeNumber(body.duration_hours, 1, 8760),    // حتى سنة
    duration_days: sanitizeNumber(body.duration_days, 1, 365),       // حتى سنة
  };
}

// ==================== قائمة العروض (للمريض) — النشطة فقط ====================
router.get('/', (req, res) => {
  try {
    const offers = db.prepare(`
      SELECT 
        o.*,
        d.full_name as doctor_name,
        d.specialty as doctor_specialty,
        d.avatar as doctor_avatar,
        c.name as clinic_name
      FROM offers o
      LEFT JOIN doctors d ON o.doctor_id = d.id
      LEFT JOIN clinics c ON o.clinic_id = c.id
      WHERE o.is_active = 1
        AND (o.status IS NULL OR o.status = 'approved')
        AND (o.end_date IS NULL OR o.end_date >= datetime('now'))
      ORDER BY o.created_at DESC
    `).all();

    const enriched = offers.map(enrichOfferWithImages);

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('خطأ في جلب العروض:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== كل العروض (للأدمن) ====================
router.get('/all', authenticate, (req, res) => {
  try {
    const { status } = req.query;

    let whereClause = '';
    if (status === 'pending') {
      whereClause = "WHERE o.status = 'pending'";
    } else if (status === 'approved') {
      whereClause = "WHERE (o.status IS NULL OR o.status = 'approved') AND o.is_active = 1";
    } else if (status === 'rejected') {
      whereClause = "WHERE o.status = 'rejected'";
    } else if (status === 'active') {
      whereClause = "WHERE o.is_active = 1 AND (o.status IS NULL OR o.status = 'approved') AND (o.end_date IS NULL OR o.end_date >= datetime('now'))";
    } else if (status === 'expired') {
      whereClause = "WHERE o.end_date IS NOT NULL AND o.end_date < datetime('now')";
    } else if (status === 'disabled') {
      whereClause = "WHERE o.is_active = 0";
    }

    const offers = db.prepare(`
      SELECT 
        o.*,
        d.full_name as doctor_name,
        d.specialty as doctor_specialty,
        d.avatar as doctor_avatar,
        c.name as clinic_name
      FROM offers o
      LEFT JOIN doctors d ON o.doctor_id = d.id
      LEFT JOIN clinics c ON o.clinic_id = c.id
      ${whereClause}
      ORDER BY o.created_at DESC
    `).all();

    const enriched = offers.map(enrichOfferWithImages);

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('خطأ في جلب كل العروض:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// ==================== عروض العيادة (للسكرتيرة والطبيب) ====================
router.get('/my', authenticate, (req, res) => {
  try {
    const role = req.user.role || req.user.type;
    let clinicId = null;

    if (role === 'secretary') {
      const sec = db.prepare('SELECT clinic_id FROM secretaries WHERE id = ?').get(req.user.id);
      clinicId = sec?.clinic_id;
    } else if (role === 'doctor') {
      const doc = db.prepare('SELECT clinic_id, clinic_name FROM doctors WHERE id = ?').get(req.user.id);
      clinicId = doc?.clinic_id;
      if (!clinicId && doc?.clinic_name) {
        const cl = db.prepare('SELECT id FROM clinics WHERE name = ?').get(doc.clinic_name);
        clinicId = cl?.id;
      }
    }

    let query = `
      SELECT 
        o.*,
        d.full_name as doctor_name,
        d.specialty as doctor_specialty,
        d.avatar as doctor_avatar,
        c.name as clinic_name
      FROM offers o
      LEFT JOIN doctors d ON o.doctor_id = d.id
      LEFT JOIN clinics c ON o.clinic_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (role === 'secretary') {
      if (clinicId) {
        query += ` AND (o.created_by = ? OR o.clinic_id = ? OR o.doctor_id IN (
          SELECT d2.id FROM doctors d2
          LEFT JOIN doctor_clinics dc ON d2.id = dc.doctor_id
          LEFT JOIN secretary_doctors sd ON d2.id = sd.doctor_id
          WHERE dc.clinic_id = ? OR d2.clinic_id = ? OR sd.secretary_id = ?
        ))`;
        params.push(req.user.id, clinicId, clinicId, clinicId, req.user.id);
      } else {
        query += ` AND (o.created_by = ? OR o.doctor_id IN (
          SELECT doctor_id FROM secretary_doctors WHERE secretary_id = ?
        ))`;
        params.push(req.user.id, req.user.id);
      }
    } else if (role === 'doctor') {
      query += ` AND (o.doctor_id = ? OR (o.clinic_id IS NOT NULL AND o.clinic_id = ?))`;
      params.push(req.user.id, clinicId || -1);
    }

    query += ` ORDER BY o.created_at DESC`;

    const offers = db.prepare(query).all(...params);
    const enriched = offers.map(enrichOfferWithImages);

    const now = Date.now();
    const current = enriched.filter(o => {
      if (o.status === 'rejected') return false;
      if (o.end_date) {
        const end = new Date(o.end_date).getTime();
        return end >= now;
      }
      return true;
    });

    const completed = enriched.filter(o => {
      if (o.end_date) {
        const end = new Date(o.end_date).getTime();
        return end < now;
      }
      return false;
    });

    res.json({
      success: true,
      data: enriched,
      current,
      completed,
    });
  } catch (err) {
    console.error('خطأ في جلب عروض العيادة:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== عرض واحد ====================
router.get('/:id', (req, res) => {
  try {
    const offer = db.prepare(`
      SELECT 
        o.*,
        d.full_name as doctor_name,
        d.specialty as doctor_specialty,
        d.avatar as doctor_avatar,
        d.consultation_fee as doctor_fee,
        c.name as clinic_name
      FROM offers o
      LEFT JOIN doctors d ON o.doctor_id = d.id
      LEFT JOIN clinics c ON o.clinic_id = c.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!offer) {
      return res.status(404).json({ success: false, message: 'العرض غير موجود' });
    }

    res.json({
      success: true,
      data: enrichOfferWithImages(offer),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إضافة عرض ====================
router.post('/', authenticate, (req, res) => {
  try {
    const role = req.user.role || req.user.type;
    if (role !== 'admin' && role !== 'secretary') {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بإضافة عروض' });
    }

    // 🛡️ sanitize
    const clean = sanitizeOfferBody(req.body);

    if (!clean.title) {
      return res.status(400).json({ success: false, message: 'العنوان مطلوب' });
    }

    let clinicId = clean.clinic_id;
    if (role === 'secretary') {
      const sec = db.prepare('SELECT clinic_id FROM secretaries WHERE id = ?').get(req.user.id);
      if (sec && sec.clinic_id) {
        clinicId = sec.clinic_id;
      }
    }

    if (clean.doctor_id) {
      const doc = db.prepare('SELECT id, clinic_id, clinic_name, consultation_fee FROM doctors WHERE id = ?').get(clean.doctor_id);
      if (doc) {
        if (!clean.original_price || clean.original_price === 0) {
          clean.original_price = doc.consultation_fee || 5000;
        }
        if (!clinicId && doc.clinic_id) {
          clinicId = doc.clinic_id;
        }
      }
    } else {
      // عرض عام لكامل العيادة
      if (!clean.original_price) {
        clean.original_price = 0;
      }
    }

    let percent = clean.discount_percent;
    if (!percent && clean.original_price && clean.discounted_price) {
      percent = Math.round(((clean.original_price - clean.discounted_price) / clean.original_price) * 100);
    } else if (percent && clean.original_price && (!clean.discounted_price || clean.discounted_price === 0)) {
      clean.discounted_price = Math.max(0, Math.round(clean.original_price * (1 - percent / 100)));
    }

    const calculatedEndDate = calculateEndDate(
      clean.duration_hours,
      clean.duration_days,
      clean.end_date
    );

    const isSecretary = role === 'secretary';
    const initialStatus = isSecretary ? 'pending' : 'approved';
    const initialActive = isSecretary ? 0 : 1;

    const facilityId = clean.facility_id || clinicId || null;
    let providerName = clean.provider_name;
    if (!providerName) {
      if (clean.doctor_id) {
        const d = db.prepare('SELECT full_name FROM doctors WHERE id = ?').get(clean.doctor_id);
        providerName = d?.full_name || 'طبيب';
      } else if (facilityId) {
        const c = db.prepare('SELECT name FROM clinics WHERE id = ?').get(facilityId);
        providerName = c?.name || 'المنشأة الطبية';
      } else {
        providerName = req.user.full_name || 'الإدارة';
      }
    }

    const result = db.prepare(`
      INSERT INTO offers 
      (title, description, doctor_id, clinic_id, facility_id, provider_name, target_audience, max_capacity, booked_count, original_price, 
       discounted_price, discount_percent, image_url, start_date, end_date, created_by,
       status, is_active, created_by_role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      clean.title,
      clean.description,
      clean.doctor_id || null,
      facilityId,
      facilityId,
      providerName,
      clean.target_audience || 'الجميع (كافة المرضى)',
      clean.max_capacity || 50,
      clean.original_price,
      clean.discounted_price,
      percent || null,
      null,
      clean.start_date || new Date().toISOString(),
      calculatedEndDate,
      req.user.id,
      initialStatus,
      initialActive,
      role
    );

    const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(result.lastInsertRowid);

    // إذا أضافت السكرتيرة عرضاً: إشعار للأدمن لمراجعته واعتماده
    if (isSecretary) {
      try {
        const admins = db.prepare('SELECT id FROM admins WHERE is_active = 1').all();
        for (const adm of admins) {
          createNotification(
            adm.id,
            'admin',
            'عرض طبي جديد بانتظار الموافقة 🏷️',
            `أضافت سكرتيرة عيادة عرضاً جديداً: "${clean.title}" وهو بانتظار مراجعتكم واعتماده.`,
            'offer_pending',
            { offer_id: offer.id }
          );
        }
      } catch (_) {}
    }

    res.status(201).json({
      success: true,
      message: isSecretary ? 'تم إرسال العرض بنجاح وهو بانتظار موافقة واعتماد إدارة المنصة ⏳' : 'تم إضافة ونشر العرض بنجاح ✅',
      data: enrichOfferWithImages(offer)
    });
  } catch (err) {
    console.error('خطأ في إضافة العرض:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تعديل عرض ====================
router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'العرض غير موجود' });
    }

    // 🛡️ sanitize
    const clean = sanitizeOfferBody(req.body);

    let percent = clean.discount_percent;
    const origPrice = clean.original_price !== null ? clean.original_price : existing.original_price;
    const discPrice = clean.discounted_price !== null ? clean.discounted_price : existing.discounted_price;

    if (!percent && origPrice && discPrice) {
      percent = Math.round(((origPrice - discPrice) / origPrice) * 100);
    }

    let newEndDate = existing.end_date;
    if (clean.duration_hours || clean.duration_days) {
      newEndDate = calculateEndDate(clean.duration_hours, clean.duration_days, null);
    } else if (clean.end_date !== null) {
      newEndDate = clean.end_date;
    }

    const isActive = req.body.is_active !== undefined
      ? (req.body.is_active ? 1 : 0)
      : existing.is_active;

    const facilityId = clean.facility_id !== null ? clean.facility_id : (clean.clinic_id !== null ? clean.clinic_id : existing.facility_id);
    const providerName = clean.provider_name || existing.provider_name;
    const targetAudience = clean.target_audience !== null ? clean.target_audience : existing.target_audience;
    const maxCapacity = clean.max_capacity !== null ? clean.max_capacity : existing.max_capacity;

    db.prepare(`
      UPDATE offers SET
        title = ?, description = ?, doctor_id = ?, clinic_id = ?, facility_id = ?,
        provider_name = ?, target_audience = ?, max_capacity = ?,
        original_price = ?, discounted_price = ?, discount_percent = ?,
        image_url = ?, start_date = ?, end_date = ?, is_active = ?
      WHERE id = ?
    `).run(
      clean.title || existing.title,
      clean.description !== null ? clean.description : existing.description,
      clean.doctor_id !== null ? clean.doctor_id : existing.doctor_id,
      facilityId,
      facilityId,
      providerName,
      targetAudience,
      maxCapacity,
      origPrice,
      discPrice,
      percent,
      existing.image_url,
      clean.start_date || existing.start_date,
      newEndDate,
      isActive,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: enrichOfferWithImages(updated) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تفعيل/تعطيل عرض ====================
router.patch('/:id/toggle', authenticate, authorize('admin'), (req, res) => {
  try {
    const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'العرض غير موجود' });
    }

    const newStatus = offer.is_active ? 0 : 1;
    db.prepare('UPDATE offers SET is_active = ? WHERE id = ?').run(newStatus, req.params.id);

    res.json({
      success: true,
      message: newStatus ? 'تم تفعيل العرض' : 'تم تعطيل العرض',
      data: { is_active: newStatus },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إعادة تفعيل عرض منتهي ====================
router.patch('/:id/reactivate', authenticate, authorize('admin'), (req, res) => {
  try {
    const duration_hours = sanitizeNumber(req.body.duration_hours, 1, 8760);
    const duration_days = sanitizeNumber(req.body.duration_days, 1, 365);
    const end_date = sanitizeText(req.body.end_date, 50);

    const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'العرض غير موجود' });
    }

    const newEndDate = calculateEndDate(duration_hours, duration_days, end_date);

    if (!newEndDate) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد المدة (ساعات أو أيام) أو تاريخ الانتهاء'
      });
    }

    db.prepare(`
      UPDATE offers 
      SET is_active = 1, end_date = ? 
      WHERE id = ?
    `).run(newEndDate, req.params.id);

    const updated = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
    res.json({
      success: true,
      message: 'تم إعادة تفعيل العرض',
      data: enrichOfferWithImages(updated),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== 🆕 رفع صور للعرض (متعدد + فحص أمني) ====================
router.post('/:id/images', authenticate, (req, res) => {
  try {
    const role = req.user.role || req.user.type;
    if (role !== 'admin' && role !== 'secretary') {
      return res.status(403).json({ success: false, message: 'غير مصرح لك برفع صور للعروض' });
    }

    const offerId = req.params.id;

    const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(offerId);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'العرض غير موجود' });
    }

    if (role === 'secretary') {
      const sec = db.prepare('SELECT clinic_id FROM secretaries WHERE id = ?').get(req.user.id);
      if (offer.clinic_id && sec?.clinic_id && offer.clinic_id !== sec.clinic_id) {
        return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل عروض عيادة أخرى' });
      }
    }

    upload.array('images', 3)(req, res, async (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ success: false, message: err.message });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'لم يتم رفع أي صورة' });
      }

      const existingCount = db.prepare('SELECT COUNT(*) as count FROM offer_images WHERE offer_id = ?').get(offerId)?.count || 0;
      if (existingCount + req.files.length > 3) {
        for (const file of req.files) safeDeleteFile(file.path);
        return res.status(400).json({
          success: false,
          message: 'الحد الأقصى للصور هو 3 صور فقط لكل عرض'
        });
      }

      const inserted = [];
      const failed = [];

      try {
        // احسب sort_order التالي
        const lastOrder = db.prepare(`
          SELECT MAX(sort_order) as max_order FROM offer_images WHERE offer_id = ?
        `).get(offerId);
        let nextOrder = (lastOrder?.max_order || 0) + 1;

        const insert = db.prepare(`
          INSERT INTO offer_images (offer_id, image_path, sort_order)
          VALUES (?, ?, ?)
        `);

        for (const file of req.files) {
          const tempPath = file.path;

          // 🛡️ 1. فحص magic bytes (التوقيع الحقيقي)
          const signature = validateImageSignature(tempPath);
          if (!signature) {
            safeDeleteFile(tempPath);
            failed.push({ name: file.originalname, reason: 'ملف غير صالح — ليس صورة حقيقية' });
            continue;
          }

          // 🛡️ 2. إعادة ترميز بـ sharp (يحذف أي شيء مخفي + يفحص الصحة)
          const finalName = `offer_${offerId}_${Date.now()}_${Math.round(Math.random() * 1e9)}.jpg`;
          const finalPath = path.join(OFFERS_UPLOAD_DIR, finalName);

          const reencodeResult = await sanitizeAndReencodeImage(tempPath, finalPath);

          // احذف المؤقت
          safeDeleteFile(tempPath);

          if (!reencodeResult.success) {
            // احذف الملف النهائي إذا أنشئ جزئياً
            safeDeleteFile(finalPath);
            failed.push({ name: file.originalname, reason: 'فشل في معالجة الصورة' });
            continue;
          }

          // 🛡️ 3. حفظ في قاعدة البيانات
          const relativePath = `/uploads/offers/${finalName}`;
          const result = insert.run(offerId, relativePath, nextOrder);

          inserted.push({
            id: result.lastInsertRowid,
            image_path: relativePath,
            sort_order: nextOrder,
          });
          nextOrder++;
        }

        res.status(201).json({
          success: true,
          message: `تم رفع ${inserted.length} صورة${failed.length > 0 ? ` (فشل ${failed.length})` : ''}`,
          data: inserted,
          failed,
        });
      } catch (dbErr) {
        console.error('DB error:', dbErr);
        res.status(500).json({ success: false, message: dbErr.message });
      }
    });
  } catch (err) {
    console.error('خطأ في رفع الصور:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== 🆕 حذف صورة ====================
router.delete('/images/:imageId', authenticate, authorize('admin'), (req, res) => {
  try {
    const image = db.prepare('SELECT * FROM offer_images WHERE id = ?').get(req.params.imageId);
    if (!image) {
      return res.status(404).json({ success: false, message: 'الصورة غير موجودة' });
    }

    // احذف الملف من القرص
    try {
      const filePath = path.join(__dirname, '../..', image.image_path);
      safeDeleteFile(filePath);
    } catch (fsErr) {
      console.error('خطأ في حذف الملف:', fsErr.message);
    }

    // احذف من قاعدة البيانات
    db.prepare('DELETE FROM offer_images WHERE id = ?').run(req.params.imageId);

    res.json({ success: true, message: 'تم حذف الصورة' });
  } catch (err) {
    console.error('خطأ في حذف الصورة:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== حذف عرض ====================
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const offerId = req.params.id;

    // احذف صور العرض من القرص
    try {
      const images = db.prepare('SELECT image_path FROM offer_images WHERE offer_id = ?').all(offerId);
      for (const img of images) {
        const filePath = path.join(__dirname, '../..', img.image_path);
        safeDeleteFile(filePath);
      }
    } catch (fsErr) {
      console.error('خطأ في حذف صور العرض:', fsErr.message);
    }

    // احذف العرض (offer_images تُحذف تلقائياً بسبب CASCADE)
    db.prepare('DELETE FROM offers WHERE id = ?').run(offerId);

    res.json({ success: true, message: 'تم حذف العرض وصوره' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== موافقة واعتماد عرض (للأدمن) ====================
router.patch('/:id/approve', authenticate, authorize('admin'), (req, res) => {
  try {
    const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'العرض غير موجود' });
    }

    db.prepare(`
      UPDATE offers
      SET status = 'approved', is_active = 1, rejection_reason = NULL
      WHERE id = ?
    `).run(offer.id);

    // إشعار للسكرتيرة أو منشئ العرض
    if (offer.created_by) {
      try {
        createNotification(
          offer.created_by,
          offer.created_by_role || 'secretary',
          'تمت الموافقة على عرضك الطبي ✅',
          `تمت مراجعة واعتماد العرض: "${offer.title}" ونشره بنجاح في تطبيق المرضى.`,
          'offer_approved',
          { offer_id: offer.id }
        );
      } catch (_) {}
    }

    // 📢 إشعار لجميع المرضى باعتماد العرض الطبي
    try {
      const activePatients = db.prepare('SELECT id FROM patients WHERE is_active = 1').all();
      const notifTitle = `عرض طبي جديد: ${offer.title} 🎁`;
      const notifBody = offer.discount_percent
        ? `خصم ${offer.discount_percent}% متاح الآن! احجز موعدك واستفد من العرض.`
        : `عرض جديد متاح الآن في التطبيق. اطلع على التفاصيل واحجز موعدك.`;

      for (const p of activePatients) {
        createNotification(
          p.id,
          'patient',
          notifTitle,
          notifBody,
          'new_offer',
          { offer_id: offer.id }
        );
      }
    } catch (patErr) {
      console.error('⚠️ خطأ في إشعار المرضى بالعرض الجديد:', patErr.message);
    }

    res.json({ success: true, message: 'تم اعتماد ونشر العرض بنجاح وإشعار المرضى ✅' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تكرار/تجديد عرض مكتمل (للسكرتيرة والأدمن) ====================
router.post('/:id/repeat', authenticate, (req, res) => {
  try {
    const role = req.user.role || req.user.type;
    if (role !== 'secretary' && role !== 'admin') {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتكرار العروض' });
    }

    const oldOffer = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
    if (!oldOffer) {
      return res.status(404).json({ success: false, message: 'العرض غير موجود' });
    }

    const { duration_days, discount_percent, title, description } = req.body;
    const days = Number(duration_days) || 7;
    const calculatedEndDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const newTitle = title ? sanitizeText(title, 200) : oldOffer.title;
    const newDesc = description !== undefined ? sanitizeText(description, 2000) : oldOffer.description;
    const newPercent = discount_percent !== undefined ? Number(discount_percent) : oldOffer.discount_percent;

    let origPrice = oldOffer.original_price;
    let discPrice = oldOffer.discounted_price;
    if (origPrice && newPercent) {
      discPrice = Math.max(0, Math.round(origPrice * (1 - newPercent / 100)));
    }

    const initialStatus = role === 'admin' ? 'approved' : 'pending';
    const initialActive = role === 'admin' ? 1 : 0;

    const result = db.prepare(`
      INSERT INTO offers 
      (title, description, doctor_id, clinic_id, original_price, 
       discounted_price, discount_percent, image_url, start_date, end_date, created_by,
       status, is_active, created_by_role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?)
    `).run(
      newTitle,
      newDesc,
      oldOffer.doctor_id,
      oldOffer.clinic_id,
      origPrice,
      discPrice,
      newPercent,
      oldOffer.image_url,
      calculatedEndDate,
      req.user.id,
      initialStatus,
      initialActive,
      role
    );

    const newOfferId = result.lastInsertRowid;

    // نسخ صور العرض السابق إن وجدت
    const oldImages = db.prepare('SELECT image_path, sort_order FROM offer_images WHERE offer_id = ?').all(oldOffer.id);
    for (const img of oldImages) {
      db.prepare(`
        INSERT INTO offer_images (offer_id, image_path, sort_order)
        VALUES (?, ?, ?)
      `).run(newOfferId, img.image_path, img.sort_order);
    }

    // إشعار للأدمن
    if (role === 'secretary') {
      try {
        const admins = db.prepare('SELECT id FROM admins WHERE is_active = 1').all();
        for (const adm of admins) {
          createNotification(
            adm.id,
            'admin',
            'تكرار عرض طبي بانتظار الاعتماد 🏷️',
            `أعادت السكرتيرة طرح العرض: "${newTitle}" لمدة ${days} أيام وهو بانتظار الموافقة.`,
            'offer_pending',
            { offer_id: newOfferId }
          );
        }
      } catch (_) {}
    }

    const newOffer = db.prepare('SELECT * FROM offers WHERE id = ?').get(newOfferId);
    res.status(201).json({
      success: true,
      message: role === 'secretary' ? 'تم تكرار العرض بنجاح وإرساله للإدارة للموافقة عليه ⏳' : 'تم تكرار العرض بنجاح ✅',
      data: enrichOfferWithImages(newOffer)
    });
  } catch (err) {
    console.error('خطأ في تكرار العرض:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== رفض عرض (للأدمن) ====================
router.patch('/:id/reject', authenticate, authorize('admin'), (req, res) => {
  try {
    const { reason } = req.body;
    const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'العرض غير موجود' });
    }

    db.prepare(`
      UPDATE offers
      SET status = 'rejected', is_active = 0, rejection_reason = ?
      WHERE id = ?
    `).run(reason || 'لم يستوفِ شروط النشر', offer.id);

    if (offer.created_by) {
      try {
        createNotification(
          offer.created_by,
          offer.created_by_role || 'secretary',
          'تنبيه حول العرض الطبي ⚠️',
          `تم رفض العرض "${offer.title}": ${reason || 'يرجى مراجعة إدارة المنصة'}.`,
          'offer_rejected',
          { offer_id: offer.id }
        );
      } catch (_) {}
    }

    res.json({ success: true, message: 'تم رفض العرض' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ==================== حجز عرض باقة طبية (للمريض) ====================
// POST /api/v1/offers/:id/book

// 🔒 دالة حجز العرض الطبي بالمعاملة الذرية الصارمة لمنع تجاوز السعة
const executeOfferBookingTx = db.transaction((offerId, patientId, notes, maxCap) => {
  // 1. زيادة العداد ذرياً بشرط عدم تجاوز السعة القصوى
  const updateCap = db.prepare(`
    UPDATE offers
    SET booked_count = booked_count + 1,
        status = CASE WHEN booked_count + 1 >= ? THEN 'completed' ELSE status END,
        is_active = CASE WHEN booked_count + 1 >= ? THEN 0 ELSE is_active END
    WHERE id = ? AND is_active = 1 AND booked_count < ?
  `).run(maxCap, maxCap, offerId, maxCap);

  if (updateCap.changes === 0) {
    throw new Error('OFFER_FULL');
  }

  // 2. إدراج الحجز
  const ins = db.prepare(`
    INSERT INTO offer_bookings (offer_id, patient_id, status, notes)
    VALUES (?, ?, 'confirmed', ?)
  `).run(offerId, patientId, notes || null);

  return ins.lastInsertRowid;
});

router.post('/:id/book', authenticate, (req, res) => {
  try {
    const role = req.user.role || req.user.type;
    if (role !== 'patient') {
      return res.status(403).json({ success: false, message: 'فقط المرضى يمكنهم حجز العروض والباقات الطبية' });
    }

    const offerId = Number(req.params.id);
    const patientId = req.user.id;
    const { notes } = req.body;

    const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(offerId);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'العرض غير موجود' });
    }

    if (offer.is_active === 0 || offer.status === 'completed' || offer.status === 'rejected') {
      return res.status(400).json({ success: false, message: 'عذراً، هذا العرض غير متاح حالياً أو مكتمل' });
    }

    // التحقق من انتهاء الصلاحية
    if (offer.end_date && new Date(offer.end_date).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'عذراً، لقد انتهت فترة هذا العرض الطبي' });
    }

    const currentBooked = Number(offer.booked_count || 0);
    const maxCap = Number(offer.max_capacity || 50);

    if (currentBooked >= maxCap) {
      db.prepare("UPDATE offers SET status = 'completed', is_active = 0 WHERE id = ?").run(offerId);
      return res.status(400).json({
        success: false,
        message: 'عذراً، اكتملت السعة القصوى المحددة لهذا العرض الطبي (مكتمل بالكامل).'
      });
    }

    // التحقق من الحجز المسبق لنفس المريض
    const alreadyBooked = db.prepare('SELECT id FROM offer_bookings WHERE offer_id = ? AND patient_id = ?').get(offerId, patientId);
    if (alreadyBooked) {
      return res.status(400).json({ success: false, message: 'لقد قمت بحجز هذا العرض الطبي مسبقاً' });
    }

    let bookingId;
    try {
      bookingId = executeOfferBookingTx(offerId, patientId, notes || null, maxCap);
    } catch (txErr) {
      if (txErr.message === 'OFFER_FULL') {
        return res.status(409).json({
          success: false,
          code: 'OFFER_FULL',
          message: 'عذراً، اكتملت سعة هذا العرض الطبي بالكامل.'
        });
      }
      throw txErr;
    }
    const newBookedCount = currentBooked + 1;

    console.log(`✅ [Offer Booking] عرض #${offerId} حجز جديد لمريض #${patientId} (${newBookedCount}/${maxCap})`);

    // إشعار المريض
    try {
      createNotification(
        patientId,
        'patient',
        'تأكيد حجز العرض الطبي بنجاح 🏷️',
        `تم تسجيل حجزك في العرض: "${offer.title}". السعر بعد الخصم: ${offer.discounted_price || 0} ر.ي.`,
        'offer_booking',
        { offer_id: offerId, booking_id: bookingId }
      );
    } catch (_) {}

    res.json({
      success: true,
      message: 'تم حجز العرض الطبي بنجاح 🎉',
      data: {
        booking_id: ins.lastInsertRowid,
        offer_id: offerId,
        booked_count: newBookedCount,
        max_capacity: maxCap,
        is_completed: newBookedCount >= maxCap
      }
    });
  } catch (err) {
    console.error('خطأ في حجز العرض:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
