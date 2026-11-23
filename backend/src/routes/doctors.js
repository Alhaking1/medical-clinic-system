import express from 'express';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import { DEFAULT_DOCTOR_PERMISSIONS } from '../middleware/permissions.js';
import { calculateClinicWorkingStatus } from './clinics.js';
import { uploadImageMiddleware, sanitizeAndSaveImage } from '../utils/imageUpload.js';

const router = express.Router();

// ==================== قائمة الأطباء ====================
router.get('/', (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const { search, specialty, governorate, include_hidden, clinic } = req.query;

    let query = `
      SELECT 
        id, full_name, specialty, clinic_name, governorate, address, phone, email, avatar, bio,
        experience_years, consultation_fee, slot_duration, is_active, status, rating,
        google_maps_url, clinic_id, permissions,
        COALESCE(allow_direct_chat, 0) as allow_direct_chat,
        (SELECT s.id FROM secretaries s WHERE (s.clinic_id = doctors.clinic_id OR s.clinic_id = (SELECT c.id FROM clinics c WHERE c.name = doctors.clinic_name LIMIT 1)) AND s.is_active = 1 AND s.status = 'approved' LIMIT 1) as secretary_id,
        (SELECT 'سكرتيرة عيادة ' || COALESCE(doctors.clinic_name, 'العيادة') FROM secretaries s WHERE (s.clinic_id = doctors.clinic_id OR s.clinic_id = (SELECT c.id FROM clinics c WHERE c.name = doctors.clinic_name LIMIT 1)) AND s.is_active = 1 AND s.status = 'approved' LIMIT 1) as secretary_name,
        COALESCE((
          SELECT SUM(max_bookings - booked_count)
          FROM doctor_periods dp
          WHERE dp.doctor_id = doctors.id 
            AND dp.is_cancelled = 0 
            AND dp.is_stopped = 0 
            AND dp.date >= date('now')
        ), 10) as available_seats
      FROM doctors
      WHERE is_deleted = 0
    `;

    const isIncludeHidden = include_hidden === '1' || include_hidden === 'true' || include_hidden === true;
    if (!isIncludeHidden) {
      query += " AND is_active = 1 AND status = 'approved'";
    }

    const params = [];

    if (search) {
      query += ' AND (full_name LIKE ? OR specialty LIKE ? )';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (specialty) {
      query += ' AND specialty = ?';
      params.push(specialty);
    }

    if (governorate) {
      query += ' AND governorate = ?';
      params.push(governorate);
    }

    if (clinic) {
      query += ' AND (clinic_name = ? OR clinic_id = (SELECT id FROM clinics WHERE name = ? LIMIT 1))';
      params.push(clinic, clinic);
    }

    query += ' ORDER BY rating DESC, created_at DESC';

    const doctors = db.prepare(query).all(...params);

    const clinicsById = {};
    const clinicsByName = {};
    try {
      const allClinics = db.prepare('SELECT id, name, is_24_hours, schedule_type, open_time, close_time, weekly_schedule FROM clinics').all();
      for (const c of allClinics) {
        clinicsById[c.id] = c;
        if (c.name) clinicsByName[c.name.trim().toLowerCase()] = c;
      }
    } catch (e) {}

    const enhancedDoctors = doctors.map(doc => {
      const clinicObj = (doc.clinic_id && clinicsById[doc.clinic_id]) || 
                        (doc.clinic_name && clinicsByName[doc.clinic_name.trim().toLowerCase()]);
      const statusInfo = clinicObj ? calculateClinicWorkingStatus(clinicObj) : null;

      let activeOffer = null;
      try {
        activeOffer = db.prepare(`
          SELECT id, title, discount_percent, original_price, discounted_price, end_date
          FROM offers
          WHERE (doctor_id = ? OR (doctor_id IS NULL AND (clinic_id = ? OR clinic_id = (SELECT clinic_id FROM doctors WHERE id = ?))))
            AND is_active = 1
            AND (status IS NULL OR status = 'approved')
            AND (end_date IS NULL OR end_date >= datetime('now'))
          ORDER BY (CASE WHEN doctor_id = ? THEN 1 ELSE 0 END) DESC, discount_percent DESC, created_at DESC
          LIMIT 1
        `).get(doc.id, doc.clinic_id || -1, doc.id, doc.id);
      } catch (e) {}

      const offerDiscount = activeOffer ? activeOffer.discount_percent : 0;
      let discountedFee = doc.consultation_fee;
      if (offerDiscount > 0 && doc.consultation_fee) {
        discountedFee = Math.max(0, Math.round(doc.consultation_fee * (1 - offerDiscount / 100)));
      }

      return {
        ...doc,
        clinic_is_open: statusInfo ? statusInfo.is_open : true,
        clinic_status_label: statusInfo ? statusInfo.status_label : 'مفتوح الآن 🟢',
        clinic_working_hours: statusInfo ? statusInfo.working_hours_display : 'من 08:00 ص إلى 10:00 م',
        has_active_offer: !!activeOffer,
        active_offer_id: activeOffer?.id || null,
        offer_title: activeOffer?.title || null,
        offer_discount_percent: offerDiscount,
        discounted_fee: discountedFee
      };
    });

    res.json({ success: true, data: enhancedDoctors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== مرضى الطبيب ====================
router.get('/:id/patients', authenticate, authorize('doctor', 'admin'), (req, res) => {
  try {
    const doctorId = Number(req.params.id);

    // الطبيب يرى مرضاه فقط
    if (req.user.type === 'doctor' && req.user.id !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول لمرضى طبيب آخر'
      });
    }

    const doctor = db.prepare(
      'SELECT id, full_name FROM doctors WHERE id = ? AND is_deleted = 0'
    ).get(doctorId);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'الطبيب غير موجود'
      });
    }

    const { search } = req.query;

    let query = `
      SELECT
        p.id,
        p.full_name,
        p.phone,
        p.email,
        p.age,
        p.gender,
        p.governorate,
        p.picture,
        p.is_blocked,
        p.no_show_count,
        COUNT(a.id) as total_visits,
        SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed_visits,
        SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_visits,
        SUM(CASE WHEN a.status = 'no_show' THEN 1 ELSE 0 END) as no_show_visits,
        MAX(a.created_at) as last_visit_date
      FROM patients p
      INNER JOIN appointments a ON a.user_id = p.id
      WHERE a.doctor_id = ?
    `;
    const params = [doctorId];

    if (search) {
      query += ' AND (p.full_name LIKE ? OR p.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += `
      GROUP BY p.id
      ORDER BY last_visit_date DESC
    `;

    const patients = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: patients,
      meta: { count: patients.length, doctor_id: doctorId }
    });
  } catch (err) {
    console.error('خطأ في جلب مرضى الطبيب:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إحصائيات اليوم ====================
router.get('/:id/stats/today', authenticate, authorize('doctor', 'admin'), (req, res) => {
  try {
    const doctorId = Number(req.params.id);

    if (req.user.type === 'doctor' && req.user.id !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // إحصائيات الحجوزات
    const appointmentStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN a.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN a.status = 'no_show' THEN 1 ELSE 0 END) as no_show,
        SUM(CASE WHEN a.payment_status = 'paid' THEN COALESCE(a.fee, 0) ELSE 0 END) as total_revenue
      FROM appointments a
      LEFT JOIN doctor_periods per ON a.period_id = per.id
      WHERE a.doctor_id = ?
        AND DATE(per.date) = DATE(?)
    `).get(doctorId, today);

    // إحصائيات الطابور
    const queueStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done
      FROM queue
      WHERE doctor_id = ?
        AND DATE(checked_in_at) = DATE(?)
    `).get(doctorId, today);

    // مرضى جدد اليوم
    const newPatients = db.prepare(`
      SELECT COUNT(DISTINCT a.user_id) as count
      FROM appointments a
      LEFT JOIN doctor_periods per ON a.period_id = per.id
      WHERE a.doctor_id = ?
        AND DATE(per.date) = DATE(?)
        AND NOT EXISTS (
          SELECT 1 FROM appointments a2
          LEFT JOIN doctor_periods per2 ON a2.period_id = per2.id
          WHERE a2.user_id = a.user_id
            AND a2.doctor_id = a.doctor_id
            AND DATE(per2.date) < DATE(?)
        )
    `).get(doctorId, today, today);

    res.json({
      success: true,
      data: {
        date: today,
        doctor_id: doctorId,
        appointments: appointmentStats || {},
        queue: queueStats || {},
        new_patients_today: newPatients?.count || 0
      }
    });
  } catch (err) {
    console.error('خطأ في إحصائيات الطبيب:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// ═══════════════════════════════════════════
// 🆕 التحكم بكامل صلاحيات جميع الأطباء دفعة واحدة (Admin فقط)
// ═══════════════════════════════════════════
router.get('/bulk/permissions', authenticate, authorize('admin'), (req, res) => {
  try {
    const totalDoctors = db.prepare('SELECT COUNT(*) as c FROM doctors WHERE is_deleted = 0').get().c;
    res.json({
      success: true,
      data: {
        permissions: DEFAULT_DOCTOR_PERMISSIONS,
        total_doctors: totalDoctors,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const updateAllDoctorPermissions = (req, res) => {
  try {
    const { permissions } = req.body;
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ success: false, message: 'بيانات الصلاحيات غير صحيحة' });
    }

    const permsJson = JSON.stringify(permissions);
    const result = db.prepare(`
      UPDATE doctors
      SET permissions = ?, updated_at = CURRENT_TIMESTAMP
      WHERE is_deleted = 0
    `).run(permsJson);

    res.json({
      success: true,
      message: `تم تحديث وتعميم كامل صلاحيات جميع الأطباء بنجاح (${result.changes} طبيب)`,
      count: result.changes,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

router.patch('/bulk/permissions', authenticate, authorize('admin'), updateAllDoctorPermissions);
router.put('/bulk/permissions', authenticate, authorize('admin'), updateAllDoctorPermissions);

// ==================== تفاصيل طبيب ====================
router.get('/:id', (req, res) => {
  try {
    const doctor = db
      .prepare('SELECT * FROM doctors WHERE id = ? AND is_deleted = 0')
      .get(req.params.id);

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'الطبيب غير موجود' });
    }

    const stats = db
      .prepare(`
        SELECT
          COUNT(*) as total_appointments,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show
        FROM appointments
        WHERE doctor_id = ?
      `)
      .get(req.params.id);

    const clinics = db
      .prepare(`
        SELECT c.id, c.name, c.governorate
        FROM doctor_clinics dc
        JOIN clinics c ON dc.clinic_id = c.id
        WHERE dc.doctor_id = ?
      `)
      .all(req.params.id);

    let clinicGoogleMapsUrl = null;
    let clinicAddress = null;
    if (doctor.clinic_name) {
      const clinic = db
        .prepare('SELECT address, google_maps_url FROM clinics WHERE name = ?')
        .get(doctor.clinic_name);
      if (clinic) {
        clinicGoogleMapsUrl = clinic.google_maps_url;
        clinicAddress = clinic.address;
      }
    }
    let secretary = null;
    try {
      secretary = db.prepare(`
        SELECT id, full_name, phone FROM secretaries 
        WHERE (clinic_id = ? OR clinic_id = (SELECT id FROM clinics WHERE name = ? LIMIT 1))
          AND is_active = 1 AND status = 'approved'
        ORDER BY id ASC LIMIT 1
      `).get(doctor.clinic_id, doctor.clinic_name);
    } catch (e) {}

    let clinicObj = null;
    try {
      if (doctor.clinic_id) {
        clinicObj = db.prepare('SELECT * FROM clinics WHERE id = ?').get(doctor.clinic_id);
      } else if (doctor.clinic_name) {
        clinicObj = db.prepare('SELECT * FROM clinics WHERE name = ?').get(doctor.clinic_name);
      }
    } catch (e) {}

    const clinicStatus = clinicObj ? calculateClinicWorkingStatus(clinicObj) : null;
    let activeOffer = null;
    try {
      activeOffer = db.prepare(`
        SELECT id, title, discount_percent, original_price, discounted_price, end_date
        FROM offers
        WHERE (doctor_id = ? OR (doctor_id IS NULL AND (clinic_id = ? OR clinic_id = (SELECT clinic_id FROM doctors WHERE id = ?))))
          AND is_active = 1
          AND (status IS NULL OR status = 'approved')
          AND (end_date IS NULL OR end_date >= datetime('now'))
        ORDER BY (CASE WHEN doctor_id = ? THEN 1 ELSE 0 END) DESC, discount_percent DESC, created_at DESC
        LIMIT 1
      `).get(doctor.id, doctor.clinic_id || -1, doctor.id, doctor.id);
    } catch (e) {}

    const offerDiscount = activeOffer ? activeOffer.discount_percent : 0;
    let discountedFee = doctor.consultation_fee;
    if (offerDiscount > 0 && doctor.consultation_fee) {
      discountedFee = Math.max(0, Math.round(doctor.consultation_fee * (1 - offerDiscount / 100)));
    }

    res.json({
      success: true,
      data: {
        ...doctor,
        allow_direct_chat: doctor.allow_direct_chat || 0,
        secretary_id: secretary?.id || null,
        secretary_name: secretary ? `سكرتيرة عيادة ${doctor.clinic_name || 'العيادة'}` : null,
        clinic_google_maps_url: clinicGoogleMapsUrl,
        clinic_address: clinicAddress,
        clinic_is_open: clinicStatus ? clinicStatus.is_open : true,
        clinic_status_label: clinicStatus ? clinicStatus.status_label : 'مفتوح الآن 🟢',
        clinic_working_hours: clinicStatus ? clinicStatus.working_hours_display : 'من 08:00 ص إلى 10:00 م',
        has_active_offer: !!activeOffer,
        active_offer_id: activeOffer?.id || null,
        offer_title: activeOffer?.title || null,
        offer_discount_percent: offerDiscount,
        discounted_fee: discountedFee,
        stats,
        clinics,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== عيادات طبيب ====================
router.get('/:id/clinics', (req, res) => {
  try {
    const clinics = db
      .prepare(`
        SELECT c.id, c.name, c.governorate
        FROM doctor_clinics dc
        JOIN clinics c ON dc.clinic_id = c.id
        WHERE dc.doctor_id = ?
      `)
      .all(req.params.id);

    res.json({ success: true, data: clinics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تعيين عيادات للطبيب (Admin فقط) ====================
router.post('/:id/clinics', authenticate, authorize('admin'), (req, res) => {
  try {
    const { clinic_ids } = req.body;

    db.prepare('DELETE FROM doctor_clinics WHERE doctor_id = ?').run(req.params.id);

    if (Array.isArray(clinic_ids)) {
      const insert = db.prepare('INSERT INTO doctor_clinics (doctor_id, clinic_id) VALUES (?, ?)');
      clinic_ids.forEach((clinicId) => {
        insert.run(req.params.id, clinicId);
      });
    }

    res.json({ success: true, message: 'تم تحديث العيادات' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إضافة طبيب (Admin فقط) ====================
router.post('/', authenticate, authorize('admin'), (req, res) => {
  try {
    const {
      full_name,
      specialty,
      clinic_name,
      governorate,
      address,
      phone,
      email,
      avatar,
      bio,
      experience_years,
      consultation_fee,
      slot_duration,
      status,
    } = req.body;

    if (!full_name || !specialty) {
      return res.status(400).json({
        success: false,
        message: 'الاسم والتخصص مطلوبان',
      });
    }

    const result = db
      .prepare(`
        INSERT INTO doctors
        (full_name, specialty, clinic_name, governorate, address, phone, email,
         avatar, bio, experience_years, consultation_fee, slot_duration, status, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `)
      .run(
        full_name,
        specialty,
        clinic_name || null,
        governorate || null,
        address || null,
        phone || null,
        email || null,
        avatar || null,
        bio || null,
        Number(experience_years) || 0,
        Number(consultation_fee) || 0,
        Number(slot_duration) || 20,
        status || 'approved'
      );

    res.status(201).json({
      success: true,
      message: 'تم إضافة الطبيب',
      data: { id: result.lastInsertRowid },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تعديل طبيب (Admin، أو الطبيب نفسه، أو سكرتيرة عيادته) ====================
router.put('/:id', authenticate, (req, res) => {
  try {
    const doctorId = Number(req.params.id);

    const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'الطبيب غير موجود' });
    }

    const isAdmin = req.user.type === 'admin' || req.user.role === 'admin';
    const isSelfDoctor = (req.user.type === 'doctor' || req.user.role === 'doctor') && req.user.id === doctorId;
    let isClinicSecretary = false;

    if (req.user.type === 'secretary' || req.user.role === 'secretary') {
      const sec = db.prepare('SELECT clinic_id FROM secretaries WHERE id = ?').get(req.user.id);
      if (sec && sec.clinic_id) {
        const linked = db.prepare(`
          SELECT d.id FROM doctors d
          LEFT JOIN doctor_clinics dc ON d.id = dc.doctor_id
          WHERE d.id = ? AND (dc.clinic_id = ? OR d.clinic_name = (SELECT name FROM clinics WHERE id = ?))
        `).get(doctorId, sec.clinic_id, sec.clinic_id);
        if (linked) isClinicSecretary = true;
      }
    }

    if (!isAdmin && !isSelfDoctor && !isClinicSecretary) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل بيانات هذا الطبيب' });
    }

    const {
      full_name,
      specialty,
      clinic_name,
      governorate,
      address,
      phone,
      email,
      avatar,
      bio,
      experience_years,
      consultation_fee,
      slot_duration,
      is_active,
      status,
    } = req.body;

    // 🔒 التحقق الصارم من سعر الكشف:
    // يسمح بتحديده لمرة واحدة فقط سواء من قبل الطبيب أو السكرتيرة، وبعدها يقفل تماماً ولا يعدله إلا الأدمن
    let finalFee = doctor.consultation_fee;
    if (consultation_fee !== undefined) {
      const incomingFee = Math.abs(Number(consultation_fee) || 0);
      const hasExistingFee = doctor.consultation_fee !== null && Number(doctor.consultation_fee) > 0;

      if (!isAdmin && hasExistingFee && incomingFee !== Number(doctor.consultation_fee)) {
        return res.status(403).json({
          success: false,
          message: 'تم تحديد سعر الكشف مسبقاً (قفل 🔒) ولا يمكن تغييره إلا من قبل الإدارة (الأدمن)'
        });
      }
      finalFee = incomingFee;
    }

    db.prepare(`
      UPDATE doctors SET
        full_name = ?,
        specialty = ?,
        clinic_name = ?,
        governorate = ?,
        address = ?,
        phone = ?,
        email = ?,
        avatar = ?,
        bio = ?,
        experience_years = ?,
        consultation_fee = ?,
        slot_duration = ?,
        is_active = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      full_name || doctor.full_name,
      specialty || doctor.specialty,
      clinic_name !== undefined ? clinic_name : doctor.clinic_name,
      governorate !== undefined ? governorate : doctor.governorate,
      address !== undefined ? address : doctor.address,
      phone !== undefined ? phone : doctor.phone,
      email !== undefined ? email : doctor.email,
      avatar !== undefined ? avatar : doctor.avatar,
      bio !== undefined ? bio : doctor.bio,
      experience_years !== undefined ? Number(experience_years) : doctor.experience_years,
      finalFee !== undefined ? Number(finalFee) : doctor.consultation_fee,
      slot_duration !== undefined ? Number(slot_duration) : doctor.slot_duration,
      isAdmin && is_active !== undefined ? (is_active ? 1 : 0) : doctor.is_active,
      isAdmin && status ? status : doctor.status,
      doctorId
    );

    const updated = db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId);

    res.json({
      success: true,
      message: 'تم تعديل بيانات الطبيب بنجاح',
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إخفاء/إظهار طبيب (Admin فقط) ====================
router.patch('/:id/toggle', authenticate, authorize('admin'), (req, res) => {
  try {
    const doctorId = Number(req.params.id);

    const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'الطبيب غير موجود' });
    }

    const newActive = doctor.is_active ? 0 : 1;
    const newStatus = newActive === 0 ? 'blocked' : (doctor.status === 'blocked' ? 'approved' : doctor.status);

    db.prepare('UPDATE doctors SET is_active = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      newActive,
      newStatus,
      doctorId
    );

    res.json({
      success: true,
      message: newActive ? 'تم تفعيل حساب الطبيب بنجاح' : 'تم تعطيل/حظر حساب الطبيب بنجاح وقطع جلسته',
      is_active: newActive,
      status: newStatus,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تفعيل/تعطيل مراسلة الطبيب مباشرة ====================
router.patch('/me/direct-chat', authenticate, (req, res) => {
  try {
    if (req.user.type !== 'doctor') {
      return res.status(403).json({ success: false, message: 'للأطباء فقط' });
    }
    const { allow_direct_chat } = req.body;
    const value = (allow_direct_chat === 1 || allow_direct_chat === true || allow_direct_chat === '1') ? 1 : 0;
    db.prepare('UPDATE doctors SET allow_direct_chat = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(value, req.user.id);
    res.json({
      success: true,
      message: value === 1 ? 'تم تفعيل استقبال رسائل المرضى المباشرة ✅' : 'تم تعطيل مراسلة الطبيب وتحويل المرضى لسكرتيرة العيادة 👩‍💼',
      allow_direct_chat: value
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id/direct-chat', authenticate, (req, res) => {
  try {
    const doctorId = Number(req.params.id);
    if (req.user.type !== 'admin' && (req.user.type !== 'doctor' || req.user.id !== doctorId)) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    const { allow_direct_chat } = req.body;
    const value = (allow_direct_chat === 1 || allow_direct_chat === true || allow_direct_chat === '1') ? 1 : 0;
    db.prepare('UPDATE doctors SET allow_direct_chat = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(value, doctorId);
    res.json({
      success: true,
      message: value === 1 ? 'تم السماح للمرضى بمراسلة الطبيب مباشرة' : 'تم تحويل مراسلات المرضى لسكرتيرة العيادة',
      allow_direct_chat: value
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== حذف طبيب ناعم (Admin فقط) ====================
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const doctorId = Number(req.params.id);

    const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'الطبيب غير موجود' });
    }

    db.prepare('UPDATE doctors SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      doctorId
    );

    res.json({ success: true, message: 'تم حذف الطبيب' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 الأطباء المعلّقون
//    للسكرتيرة: ترى فقط أطباء عيادتها
//    للأدمن: يرى الكل
// ═══════════════════════════════════════════
router.get('/list/pending', authenticate, authorize('admin', 'secretary'), (req, res) => {
  try {
    let whereClause = "d.status = 'pending' AND d.is_deleted = 0";
    const params = [];

    // السكرتيرة: فقط أطباء عيادتها
    if (req.user.type === 'secretary') {
      const secretary = db.prepare(
        'SELECT clinic_id FROM secretaries WHERE id = ?'
      ).get(req.user.id);

      if (!secretary || !secretary.clinic_id) {
        return res.json({
          success: true,
          data: [],
          meta: { count: 0 }
        });
      }

      whereClause += ` AND (d.clinic_name = (SELECT name FROM clinics WHERE id = ?))`;
      params.push(secretary.clinic_id);
    }

    const doctors = db.prepare(`
      SELECT d.id, d.full_name, d.specialty, d.clinic_name, d.avatar,
             d.phone, d.email, d.governorate, d.address, d.bio,
             d.experience_years, d.consultation_fee, d.must_complete_profile,
             d.status, d.created_at
      FROM doctors d
      WHERE ${whereClause}
      ORDER BY d.created_at DESC
    `).all(...params);

    res.json({
      success: true,
      data: doctors,
      meta: { count: doctors.length }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 موافقة على طبيب
//    السكرتيرة: فقط أطباء عيادتها
//    الأدمن: الكل
// ═══════════════════════════════════════════
router.patch('/:id/approve', authenticate, authorize('admin', 'secretary'), (req, res) => {
  try {
    const doctorId = Number(req.params.id);
    
    const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId);
    
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'الطبيب غير موجود' });
    }

    if (doctor.status === 'approved') {
      return res.status(400).json({ success: false, message: 'الطبيب معتمد مسبقاً' });
    }

    // السكرتيرة: التحقق من أنها نفس العيادة
    if (req.user.type === 'secretary') {
      const secretary = db.prepare(
        'SELECT clinic_id FROM secretaries WHERE id = ?'
      ).get(req.user.id);

      if (!secretary || !secretary.clinic_id) {
        return res.status(403).json({ success: false, message: 'ليس لديك عيادة' });
      }

      const clinic = db.prepare('SELECT name FROM clinics WHERE id = ?')
        .get(secretary.clinic_id);

      if (!clinic || doctor.clinic_name !== clinic.name) {
        return res.status(403).json({
          success: false,
          message: 'لا يمكنك الموافقة على طبيب من عيادة أخرى'
        });
      }
    }

    db.prepare(`
      UPDATE doctors
      SET status = 'approved',
          is_active = 1,
          approved_at = CURRENT_TIMESTAMP,
          approved_by = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user.id, doctorId);

    // 🔔 إشعار للطبيب
    createNotification(
      doctorId,
      'doctor',
      '🎉 تم اعتماد حسابك',
      'مرحباً! تمت الموافقة على حسابك. يمكنك الآن استخدام التطبيق.',
      'approved',
      { type: 'account_approved' }
    );

    // تحديث طلب التسجيل
    try {
      db.prepare(`
        UPDATE registration_requests
        SET status = 'approved',
            reviewed_by = ?,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE type = 'doctor' AND user_id = ? AND status = 'pending'
      `).run(req.user.id, doctorId);
    } catch (e) {}

    res.json({ success: true, message: 'تمت الموافقة على الطبيب' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 رفض طبيب
// ═══════════════════════════════════════════
router.patch('/:id/reject', authenticate, authorize('admin', 'secretary'), (req, res) => {
  try {
    const doctorId = Number(req.params.id);
    const { reason } = req.body;
    
    const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId);
    
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'الطبيب غير موجود' });
    }

    // السكرتيرة: التحقق من أنها نفس العيادة
    if (req.user.type === 'secretary') {
      const secretary = db.prepare(
        'SELECT clinic_id FROM secretaries WHERE id = ?'
      ).get(req.user.id);

      if (!secretary || !secretary.clinic_id) {
        return res.status(403).json({ success: false, message: 'ليس لديك عيادة' });
      }

      const clinic = db.prepare('SELECT name FROM clinics WHERE id = ?')
        .get(secretary.clinic_id);

      if (!clinic || doctor.clinic_name !== clinic.name) {
        return res.status(403).json({
          success: false,
          message: 'لا يمكنك رفض طبيب من عيادة أخرى'
        });
      }
    }

    db.prepare(`
      UPDATE doctors
      SET status = 'rejected',
          is_active = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(doctorId);

    try {
      db.prepare(`
        UPDATE registration_requests
        SET status = 'rejected',
            reviewed_by = ?,
            reviewed_at = CURRENT_TIMESTAMP,
            notes = ?
        WHERE type = 'doctor' AND user_id = ? AND status = 'pending'
      `).run(req.user.id, reason || null, doctorId);
    } catch (e) {}

    res.json({ success: true, message: 'تم رفض الطبيب' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 قراءة صلاحيات الطبيب
// ═══════════════════════════════════════════
router.get('/:id/permissions', authenticate, (req, res) => {
  try {
    const doctorId = Number(req.params.id);
    const doctor = db.prepare('SELECT id, full_name, permissions FROM doctors WHERE id = ? AND is_deleted = 0').get(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'الطبيب غير موجود' });
    }
    let perms = {};
    try {
      perms = doctor.permissions ? JSON.parse(doctor.permissions) : {};
    } catch (e) {
      perms = {};
    }
    const merged = { ...DEFAULT_DOCTOR_PERMISSIONS, ...perms };
    res.json({ success: true, data: { doctor, permissions: merged } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 تعديل صلاحيات الطبيب (Admin فقط)
// ═══════════════════════════════════════════
const updateDoctorPermissionsHandler = (req, res) => {
  try {
    const doctorId = Number(req.params.id);
    const { permissions } = req.body;
    const doctor = db.prepare('SELECT id FROM doctors WHERE id = ? AND is_deleted = 0').get(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'الطبيب غير موجود' });
    }

    const permsJson = typeof permissions === 'string' ? permissions : JSON.stringify(permissions || {});
    db.prepare('UPDATE doctors SET permissions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(permsJson, doctorId);

    res.json({ success: true, message: 'تم حفظ صلاحيات الطبيب بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══════════════════════════════════════════
// 🆕 عيادات الطبيب الحالية والتبديل بينها (Doctor Multi-Clinic)
// ═══════════════════════════════════════════
router.get('/me/clinics', authenticate, (req, res) => {
  try {
    const userRole = req.user.role || req.user.type;
    if (userRole !== 'doctor') {
      return res.status(403).json({ success: false, message: 'مخصص للأطباء فقط' });
    }

    const doc = db.prepare('SELECT id, clinic_id, clinic_name FROM doctors WHERE id = ?').get(req.user.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على الطبيب' });
    }

    const clinics = db.prepare(`
      SELECT DISTINCT c.id, c.name, c.governorate, c.address, c.phone, c.is_active,
             (CASE WHEN c.id = ? THEN 1 ELSE 0 END) as is_current
      FROM clinics c
      LEFT JOIN doctor_clinics dc ON dc.clinic_id = c.id AND dc.doctor_id = ?
      WHERE dc.doctor_id = ? OR c.id = ? OR c.name = ?
      ORDER BY is_current DESC, c.name ASC
    `).all(doc.clinic_id, doc.id, doc.id, doc.clinic_id, doc.clinic_name);

    res.json({
      success: true,
      current_clinic_id: doc.clinic_id,
      current_clinic_name: doc.clinic_name,
      data: clinics
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/me/switch-clinic', authenticate, (req, res) => {
  try {
    const userRole = req.user.role || req.user.type;
    if (userRole !== 'doctor') {
      return res.status(403).json({ success: false, message: 'مخصص للأطباء فقط' });
    }

    const { clinic_id } = req.body;
    if (!clinic_id) {
      return res.status(400).json({ success: false, message: 'معرف العيادة مطلوب' });
    }

    const targetClinic = db.prepare('SELECT id, name, governorate, address FROM clinics WHERE id = ?').get(clinic_id);
    if (!targetClinic) {
      return res.status(404).json({ success: false, message: 'العيادة غير موجودة' });
    }

    // ربط الطبيب بالعيادة في doctor_clinics إن لم يكن مرتبطاً
    db.prepare('INSERT OR IGNORE INTO doctor_clinics (doctor_id, clinic_id) VALUES (?, ?)').run(req.user.id, targetClinic.id);

    // تحديث العيادة النشطة في جدول doctors
    db.prepare(`
      UPDATE doctors
      SET clinic_id = ?,
          clinic_name = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(targetClinic.id, targetClinic.name, req.user.id);

    const updatedDoc = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.user.id);

    res.json({
      success: true,
      message: `تم التبديل إلى ${targetClinic.name} بنجاح 🏥`,
      data: {
        id: updatedDoc.id,
        full_name: updatedDoc.full_name,
        clinic_id: targetClinic.id,
        clinic_name: targetClinic.name,
        clinic_full_name: targetClinic.name,
        clinic_governorate: targetClinic.governorate,
        role: 'doctor',
        type: 'doctor',
        status: updatedDoc.status
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/me/join-clinic', authenticate, (req, res) => {
  try {
    const userRole = req.user.role || req.user.type;
    if (userRole !== 'doctor') {
      return res.status(403).json({ success: false, message: 'مخصص للأطباء فقط' });
    }

    const { clinic_id } = req.body;
    if (!clinic_id) {
      return res.status(400).json({ success: false, message: 'معرف العيادة مطلوب' });
    }

    // فحص الحد الأقصى للعيادات المسموحة للطبيب (من الإعدادات، افتراضياً 5)
    let maxClinics = 5;
    try {
      const s = db.prepare('SELECT value FROM settings WHERE key = ?').get('max_doctor_clinics');
      if (s && s.value) maxClinics = Number(s.value);
    } catch (_) {}

    const currentCount = db.prepare('SELECT COUNT(DISTINCT clinic_id) as count FROM doctor_clinics WHERE doctor_id = ?').get(req.user.id);
    if (currentCount && currentCount.count >= maxClinics) {
      return res.status(400).json({
        success: false,
        message: `لقد وصلت للحد الأقصى المسموح به من العيادات (${maxClinics} عيادات)`
      });
    }

    const clinic = db.prepare('SELECT id, name FROM clinics WHERE id = ?').get(clinic_id);
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'العيادة غير موجودة' });
    }

    db.prepare('INSERT OR IGNORE INTO doctor_clinics (doctor_id, clinic_id) VALUES (?, ?)').run(req.user.id, clinic.id);

    // إشعار سكرتيرة العيادة إن وجدت بطلب انضمام طبيب
    try {
      const secList = db.prepare('SELECT id FROM secretaries WHERE clinic_id = ? AND is_active = 1').all(clinic.id);
      const doc = db.prepare('SELECT full_name, specialty FROM doctors WHERE id = ?').get(req.user.id);
      for (const sec of secList) {
        createNotification(
          sec.id,
          'secretary',
          'انضمام طبيب جديد للعيادة 🩺',
          `انضم د. ${doc?.full_name || 'طبيب'} (${doc?.specialty || ''}) إلى طاقم ${clinic.name}.`,
          'info'
        );
      }
    } catch (_) {}

    res.json({
      success: true,
      message: `تمت إضافة ${clinic.name} إلى قائمة عياداتك بنجاح ✅`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== رفع وتحديث صورة الطبيب (Avatar) ====================
router.post('/me/avatar', authenticate, authorize('doctor'), uploadImageMiddleware.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'يرجى اختيار صورة للرفع' });
    }
    const imageUrl = await sanitizeAndSaveImage(req.file.buffer, 'avatars', { width: 512, height: 512, fit: 'cover' });
    db.prepare('UPDATE doctors SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(imageUrl, req.user.id);
    return res.json({ success: true, message: 'تم تحديث الصورة الشخصية بنجاح ✅', data: { avatar: imageUrl } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/avatar', authenticate, authorize('doctor', 'admin'), uploadImageMiddleware.single('image'), async (req, res) => {
  try {
    const doctorId = Number(req.params.id);
    if (req.user.role === 'doctor' && req.user.id !== doctorId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بتعديل صورة طبيب آخر' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'يرجى اختيار صورة للرفع' });
    }
    const imageUrl = await sanitizeAndSaveImage(req.file.buffer, 'avatars', { width: 512, height: 512, fit: 'cover' });
    db.prepare('UPDATE doctors SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(imageUrl, doctorId);
    return res.json({ success: true, message: 'تم تحديث الصورة بنجاح ✅', data: { avatar: imageUrl } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});


/**
 * ⭐ GET /api/v1/doctors/:id/reviews
 * جلب التقييمات المعتمدة لزيارات المرضى الفعلية للطبيب
 */
router.get('/:id/reviews', (req, res) => {
  try {
    const doctorId = Number(req.params.id);
    const reviews = db.prepare(`
      SELECT 
        r.id, r.rating_doctor, r.rating_hospital, r.rating_service, r.rating_secretary,
        r.comment, r.created_at, r.is_verified_visit,
        p.full_name as patient_name,
        p.governorate as patient_governorate
      FROM appointment_reviews r
      LEFT JOIN patients p ON r.user_id = p.id
      WHERE r.doctor_id = ?
      ORDER BY r.created_at DESC
      LIMIT 50
    `).all(doctorId);

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_reviews,
        ROUND(AVG(rating_doctor), 1) as avg_doctor_rating,
        ROUND(AVG(rating_hospital), 1) as avg_hospital_rating,
        ROUND(AVG(rating_service), 1) as avg_service_rating
      FROM appointment_reviews
      WHERE doctor_id = ?
    `).get(doctorId);

    res.json({
      success: true,
      data: reviews.map(r => ({
        ...r,
        patient_name: r.patient_name ? r.patient_name.split(' ')[0] + ' ***' : 'مريض موثق',
        verified_badge: 'زيارة فعلية موثقة ✅'
      })),
      stats: {
        total_reviews: stats?.total_reviews || 0,
        avg_rating: stats?.avg_doctor_rating || 5.0,
        avg_hospital_rating: stats?.avg_hospital_rating || 5.0,
        avg_service_rating: stats?.avg_service_rating || 5.0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;