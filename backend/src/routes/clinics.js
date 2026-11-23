import express from 'express';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadImageMiddleware, sanitizeAndSaveImage } from '../utils/imageUpload.js';

const router = express.Router();

// ═══════════════════════════════════════════
// Helper: احتساب حالة فتح/إغلاق العيادة وساعات العمل
// ═══════════════════════════════════════════
export function calculateClinicWorkingStatus(clinic) {
  if (!clinic) return null;

  const is24h = clinic.is_24_hours === 1 || clinic.schedule_type === '24h';
  if (is24h) {
    return {
      is_24_hours: 1,
      schedule_type: '24h',
      is_open: true,
      status_label: 'مفتوح الآن 🟢',
      working_hours_display: 'دوام متواصل 24 ساعة',
      open_time: clinic.open_time || '00:00',
      close_time: clinic.close_time || '23:59',
      weekly_schedule: clinic.weekly_schedule || null
    };
  }

  // التوقيت الحالي لليمن (UTC+3)
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const yemenTime = new Date(utc + (3600000 * 3));
  const currentHours = String(yemenTime.getHours()).padStart(2, '0');
  const currentMinutes = String(yemenTime.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;

  const normalizeDigits = (str) => {
    if (!str) return '';
    return str.toString()
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
      .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  };

  const formatTime12h = (t) => {
    if (!t) return '';
    const clean = normalizeDigits(t);
    const [hStr, mStr] = clean.split(':');
    let h = parseInt(hStr, 10);
    if (isNaN(h)) return t;
    const m = mStr || '00';
    const ampm = h >= 12 ? 'م' : 'ص';
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  };

  const scheduleType = clinic.schedule_type || 'daily';

  if (scheduleType === 'weekly' && clinic.weekly_schedule) {
    let weekly = null;
    try {
      weekly = typeof clinic.weekly_schedule === 'string' ? JSON.parse(clinic.weekly_schedule) : clinic.weekly_schedule;
    } catch (e) {}

    if (weekly) {
      // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
      const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const dayKey = dayKeys[yemenTime.getDay()];
      const dayConfig = weekly[dayKey];

      if (dayConfig && dayConfig.closed) {
        return {
          is_24_hours: 0,
          schedule_type: 'weekly',
          is_open: false,
          status_label: 'مغلق اليوم (عطلة) 🔴',
          working_hours_display: 'اليوم عطلة رسمية',
          open_time: clinic.open_time || '08:00',
          close_time: clinic.close_time || '22:00',
          weekly_schedule: clinic.weekly_schedule
        };
      }

      const oTime = (dayConfig && dayConfig.open) || clinic.open_time || '08:00';
      const cTime = (dayConfig && dayConfig.close) || clinic.close_time || '22:00';

      const isOpen = (cTime >= oTime) 
        ? (currentTimeStr >= oTime && currentTimeStr <= cTime)
        : (currentTimeStr >= oTime || currentTimeStr <= cTime);

      const hoursText = `من ${formatTime12h(oTime)} إلى ${formatTime12h(cTime)}`;
      return {
        is_24_hours: 0,
        schedule_type: 'weekly',
        is_open: isOpen,
        status_label: isOpen ? 'مفتوح الآن 🟢' : 'مغلق حالياً 🔴',
        working_hours_display: hoursText,
        open_time: oTime,
        close_time: cTime,
        weekly_schedule: clinic.weekly_schedule
      };
    }
  }

  // القالب اليومي الافتراضي
  const oTime = clinic.open_time || '08:00';
  const cTime = clinic.close_time || '22:00';

  const isOpen = (cTime >= oTime) 
    ? (currentTimeStr >= oTime && currentTimeStr <= cTime)
    : (currentTimeStr >= oTime || currentTimeStr <= cTime);

  const hoursText = `من ${formatTime12h(oTime)} إلى ${formatTime12h(cTime)}`;
  return {
    is_24_hours: 0,
    schedule_type: 'daily',
    is_open: isOpen,
    status_label: isOpen ? 'مفتوح الآن 🟢' : 'مغلق حالياً 🔴',
    working_hours_display: hoursText,
    open_time: oTime,
    close_time: cTime,
    weekly_schedule: clinic.weekly_schedule || null
  };
}

// ==================== قائمة العيادات ====================
router.get('/', (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const clinics = db.prepare('SELECT * FROM clinics WHERE is_active = 1 ORDER BY name').all();

    const stmtDoctorCount = db.prepare(`
      SELECT COUNT(DISTINCT d.id) as count
      FROM doctors d
      LEFT JOIN doctor_clinics dc ON d.id = dc.doctor_id
      WHERE (dc.clinic_id = ? OR d.clinic_name = ?)
      AND d.is_deleted = 0
      AND d.status = 'approved'
      AND d.is_active = 1
    `);

    const stmtSecCount = db.prepare('SELECT COUNT(*) as count FROM secretaries WHERE clinic_id = ?');

    const result = clinics.map((clinic) => {
      const count = stmtDoctorCount.get(clinic.id, clinic.name);
      const secCount = stmtSecCount.get(clinic.id);
      const sched = calculateClinicWorkingStatus(clinic);

      return {
        ...clinic,
        doctors_count: count ? count.count : 0,
        secretaries_count: secCount ? secCount.count : 0,
        is_24_hours: sched.is_24_hours,
        schedule_type: sched.schedule_type,
        is_open: sched.is_open,
        status_label: sched.status_label,
        working_hours_display: sched.working_hours_display,
        open_time: sched.open_time,
        close_time: sched.close_time,
        weekly_schedule: sched.weekly_schedule,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== عيادة واحدة ====================

router.get('/list', (req, res) => {
  try {
    const clinics = db.prepare(`
      SELECT id, name, governorate, address
      FROM clinics
      WHERE is_active = 1
      ORDER BY name
    `).all();

    res.json({
      success: true,
      data: clinics,
      meta: { count: clinics.length }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/specialties', (req, res) => {
  try {
    const clinicId = Number(req.params.id);
    const clinic = db.prepare('SELECT id, name FROM clinics WHERE id = ?').get(clinicId);

    if (!clinic) {
      return res.status(404).json({ success: false, message: 'العيادة غير موجودة' });
    }

    const specialties = db.prepare(`
      SELECT DISTINCT d.specialty
      FROM doctors d
      LEFT JOIN doctor_clinics dc ON d.id = dc.doctor_id
      WHERE (dc.clinic_id = ? OR d.clinic_name = ?)
        AND d.is_deleted = 0
        AND d.status = 'approved'
        AND d.is_active = 1
        AND d.specialty IS NOT NULL
      ORDER BY d.specialty
    `).all(clinicId, clinic.name);

    res.json({
      success: true,
      data: specialties.map(s => s.specialty),
      clinic_name: clinic.name
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const clinic = db
      .prepare('SELECT * FROM clinics WHERE id = ?')
      .get(req.params.id);

    if (!clinic) {
      return res.status(404).json({ success: false, message: 'العيادة غير موجودة' });
    }

    const doctors = db
      .prepare(`
        SELECT DISTINCT d.id, d.full_name, d.specialty, d.consultation_fee, d.is_active
        FROM doctors d
        LEFT JOIN doctor_clinics dc ON d.id = dc.doctor_id
        WHERE (dc.clinic_id = ? OR d.clinic_name = ?)
        AND d.is_deleted = 0
        AND d.status = 'approved'
        AND d.is_active = 1
      `)
      .all(clinic.id, clinic.name);

    const secretaries = db
      .prepare('SELECT id, full_name, phone, is_active FROM secretaries WHERE clinic_id = ?')
      .all(clinic.id);

    let auxiliary_contact_numbers = [];
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS clinic_contact_numbers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          clinic_id INTEGER NOT NULL,
          phone TEXT NOT NULL,
          notes TEXT,
          added_by_secretary_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      auxiliary_contact_numbers = db.prepare(`
        SELECT ccn.*, s.full_name as added_by_secretary_name
        FROM clinic_contact_numbers ccn
        LEFT JOIN secretaries s ON ccn.added_by_secretary_id = s.id
        WHERE ccn.clinic_id = ?
        ORDER BY ccn.created_at DESC
      `).all(clinic.id);
    } catch (_) {}

    res.json({
      success: true,
      data: {
        ...clinic,
        ...sched,
        doctors,
        secretaries,
        auxiliary_contact_numbers,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== قالب وساعات عمل العيادة ====================
router.get('/:id/schedule', (req, res) => {
  try {
    const clinic = db.prepare('SELECT * FROM clinics WHERE id = ?').get(req.params.id);
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'العيادة غير موجودة' });
    }
    const sched = calculateClinicWorkingStatus(clinic);
    res.json({
      success: true,
      data: {
        clinic_id: clinic.id,
        clinic_name: clinic.name,
        ...sched
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/schedule', authenticate, (req, res) => {
  try {
    const clinicId = Number(req.params.id);
    const clinic = db.prepare('SELECT * FROM clinics WHERE id = ?').get(clinicId);
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'العيادة غير موجودة' });
    }

    const isAdmin = req.user.type === 'admin' || req.user.role === 'admin';
    let isClinicSecretary = false;

    if (req.user.type === 'secretary' || req.user.role === 'secretary') {
      const sec = db.prepare('SELECT clinic_id FROM secretaries WHERE id = ?').get(req.user.id);
      if (sec && Number(sec.clinic_id) === Number(clinicId)) {
        isClinicSecretary = true;
      }
    }

    if (!isAdmin && !isClinicSecretary) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل مواعيد هذه العيادة' });
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

    const cleanOpen = open_time ? normalizeDigits(open_time) : null;
    const cleanClose = close_time ? normalizeDigits(close_time) : null;

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

    const updated = db.prepare('SELECT * FROM clinics WHERE id = ?').get(clinicId);
    const sched = calculateClinicWorkingStatus(updated);

    res.json({
      success: true,
      message: 'تم حفظ وتطبيق قالب دوام العيادة بنجاح',
      data: {
        clinic_id: updated.id,
        clinic_name: updated.name,
        ...sched
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إضافة عيادة ====================
router.post('/', authenticate, authorize('admin'), (req, res) => {
  try {
    const { name, governorate, address, phone, notes, google_maps_url, commission_rate, facility_type } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'اسم المنشأة/العيادة مطلوب' });
    }

    const existing = db.prepare('SELECT * FROM clinics WHERE name = ?').get(name);

    if (existing) {
      return res.status(400).json({ success: false, message: 'اسم المنشأة/العيادة مسجل مسبقاً' });
    }

    const commRate = commission_rate !== undefined && commission_rate !== null && commission_rate !== ''
      ? parseFloat(commission_rate)
      : null;

    const validTypes = ['clinic', 'medical_center', 'pharmacy', 'hospital'];
    const targetType = validTypes.includes(facility_type) ? facility_type : 'clinic';

    const result = db
      .prepare(`
        INSERT INTO clinics (name, governorate, address, phone, notes, google_maps_url, commission_rate, facility_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        name,
        governorate || null,
        address || null,
        phone || null,
        notes || null,
        google_maps_url || null,
        commRate,
        targetType
      );

    const clinic = db.prepare('SELECT * FROM clinics WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ success: true, message: 'تم إضافة المنشأة بنجاح', data: clinic });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تعديل عيادة ====================
router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const { name, governorate, address, phone, notes, is_active, google_maps_url, image, commission_rate, facility_type } = req.body;
    const clinicId = Number(req.params.id);

    const clinic = db.prepare('SELECT * FROM clinics WHERE id = ?').get(clinicId);
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'المنشأة/العيادة غير موجودة' });
    }

    const oldName = clinic.name;
    const commRate = commission_rate !== undefined
      ? (commission_rate === null || commission_rate === '' ? null : parseFloat(commission_rate))
      : clinic.commission_rate;

    const validTypes = ['clinic', 'medical_center', 'pharmacy', 'hospital'];
    const targetType = facility_type !== undefined 
      ? (validTypes.includes(facility_type) ? facility_type : clinic.facility_type || 'clinic')
      : clinic.facility_type || 'clinic';

    db.prepare(`
      UPDATE clinics SET
        name = ?, governorate = ?, address = ?, phone = ?, notes = ?, is_active = ?, google_maps_url = ?, image = ?, commission_rate = ?, facility_type = ?
      WHERE id = ?
    `).run(
      name || clinic.name,
      governorate !== undefined ? governorate : clinic.governorate,
      address !== undefined ? address : clinic.address,
      phone !== undefined ? phone : clinic.phone,
      notes !== undefined ? notes : clinic.notes,
      is_active !== undefined ? (is_active ? 1 : 0) : clinic.is_active,
      google_maps_url !== undefined ? google_maps_url : clinic.google_maps_url,
      image !== undefined ? image : clinic.image,
      commRate,
      targetType,
      clinicId
    );

    if (name && name !== oldName) {
      db.prepare('UPDATE doctors SET clinic_name = ? WHERE clinic_name = ?').run(name, oldName);
    }

    res.json({ success: true, message: 'تم التعديل بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== رفع صورة العيادة ====================
router.post('/:id/image', authenticate, uploadImageMiddleware.single('image'), async (req, res) => {
  try {
    const clinicId = Number(req.params.id);
    const clinic = db.prepare('SELECT * FROM clinics WHERE id = ?').get(clinicId);
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'العيادة غير موجودة' });
    }

    const isAdmin = req.user.type === 'admin' || req.user.role === 'admin';
    let isClinicSecretary = false;
    if (req.user.type === 'secretary' || req.user.role === 'secretary') {
      const sec = db.prepare('SELECT clinic_id FROM secretaries WHERE id = ?').get(req.user.id);
      if (sec && Number(sec.clinic_id) === Number(clinicId)) {
        isClinicSecretary = true;
      }
    }

    if (!isAdmin && !isClinicSecretary) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك برفع صورة لهذه العيادة' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'يرجى اختيار صورة للرفع' });
    }

    const imageUrl = await sanitizeAndSaveImage(req.file.buffer, 'clinics', { width: 1024, height: 768, fit: 'inside' });
    db.prepare('UPDATE clinics SET image = ? WHERE id = ?').run(imageUrl, clinicId);

    return res.json({
      success: true,
      message: 'تم حفظ صورة العيادة بنجاح ✅',
      data: { image: imageUrl }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== حذف عيادة ====================
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const clinic = db.prepare('SELECT * FROM clinics WHERE id = ?').get(req.params.id);
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'العيادة غير موجودة' });
    }

    const count = db
      .prepare("SELECT COUNT(*) as count FROM doctors WHERE clinic_name = ? AND is_deleted = 0")
      .get(clinic.name);

    if (count.count > 0) {
      return res.status(400).json({
        success: false,
        message: `لا يمكن حذف العيادة. فيها ${count.count} طبيب`,
      });
    }

    db.prepare('DELETE FROM clinics WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: 'تم حذف العيادة' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});



// ═══════════════════════════════════════════
// 🆕 العيادات المعلّقة (غير نشطة)
// ═══════════════════════════════════════════
router.get('/list/pending', authenticate, authorize('admin'), (req, res) => {
  try {
    const clinics = db.prepare(`
      SELECT c.id, c.name, c.governorate, c.address, c.phone,
             c.notes, c.google_maps_url, c.is_active, c.created_at,
             (SELECT COUNT(*) FROM doctors WHERE clinic_name = c.name) as doctors_count
      FROM clinics c
      WHERE c.is_active = 0
      ORDER BY c.created_at DESC
    `).all();

    res.json({
      success: true,
      data: clinics,
      meta: { count: clinics.length }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 موافقة على عيادة
// ═══════════════════════════════════════════
router.patch('/:id/approve', authenticate, authorize('admin'), (req, res) => {
  try {
    const clinicId = Number(req.params.id);
    
    const clinic = db.prepare('SELECT * FROM clinics WHERE id = ?').get(clinicId);
    
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'العيادة غير موجودة' });
    }

    if (clinic.is_active === 1) {
      return res.status(400).json({ success: false, message: 'العيادة مفعّلة مسبقاً' });
    }

    db.prepare('UPDATE clinics SET is_active = 1 WHERE id = ?').run(clinicId);

    // تفعيل السكرتيرة المرتبطة
    try {
      db.prepare(`
        UPDATE secretaries
        SET status = 'approved', is_active = 1
        WHERE clinic_id = ? AND status = 'pending'
      `).run(clinicId);
    } catch (e) {}

    res.json({ success: true, message: 'تمت الموافقة على العيادة' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 رفض عيادة
// ═══════════════════════════════════════════
router.patch('/:id/reject', authenticate, authorize('admin'), (req, res) => {
  try {
    const clinicId = Number(req.params.id);
    const { reason } = req.body;
    
    const clinic = db.prepare('SELECT * FROM clinics WHERE id = ?').get(clinicId);
    
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'العيادة غير موجودة' });
    }

    db.prepare(`
      UPDATE clinics
      SET is_active = 0, notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(reason || null, clinicId);

    try {
      db.prepare(`
        UPDATE secretaries
        SET status = 'rejected', is_active = 0
        WHERE clinic_id = ? AND status = 'pending'
      `).run(clinicId);
    } catch (e) {}

    res.json({ success: true, message: 'تم رفض العيادة' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 رفع وتحديث شعار العيادة (Clinic Logo)
// ═══════════════════════════════════════════
router.post('/:id/logo', authenticate, authorize('secretary', 'doctor', 'admin'), uploadImageMiddleware.single('logo'), async (req, res) => {
  try {
    const clinicId = Number(req.params.id);
    const clinic = db.prepare('SELECT * FROM clinics WHERE id = ?').get(clinicId);
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'العيادة غير موجودة' });
    }

    // التحقق من الصلاحية (السكرتيرة أو الطبيب التابع للعيادة)
    const userRole = req.user.role || req.user.type;
    if (userRole === 'secretary') {
      const sec = db.prepare('SELECT clinic_id FROM secretaries WHERE id = ?').get(req.user.id);
      if (!sec || sec.clinic_id !== clinicId) {
        return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل شعار هذه العيادة' });
      }
    } else if (userRole === 'doctor') {
      const doc = db.prepare('SELECT clinic_id, clinic_name FROM doctors WHERE id = ?').get(req.user.id);
      if (!doc || (doc.clinic_id !== clinicId && doc.clinic_name !== clinic.name)) {
        return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل شعار هذه العيادة' });
      }
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'يرجى إرفاق صورة الشعار' });
    }

    const savedPath = await sanitizeAndSaveImage(req.file.buffer, 'clinic-logos');
    db.prepare('UPDATE clinics SET logo_url = ? WHERE id = ?').run(savedPath, clinicId);

    res.json({
      success: true,
      message: 'تم تحديث شعار العيادة بنجاح 🏥',
      data: { logo_url: savedPath }
    });
  } catch (err) {
    console.error('❌ خطأ في رفع شعار العيادة:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

// Force cache rebuild: 20261006193334
