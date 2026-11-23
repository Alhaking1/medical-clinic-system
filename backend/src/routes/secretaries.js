import express from 'express';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { canManageDoctor, getManageableDoctorIds, DEFAULT_SECRETARY_PERMISSIONS, getSecretaryPermissions } from '../middleware/permissions.js';
import { createNotification } from './notifications.js';
import { calculateClinicWorkingStatus } from './clinics.js';

const router = express.Router();

// ==================== قائمة السكرتيرات ====================
router.get('/', authenticate, authorize('admin'), (req, res) => {
  try {
    const secretaries = db
      .prepare(`
        SELECT s.id, s.full_name, s.phone, s.clinic_id, s.permissions,
               s.is_active, s.created_at,
               c.name as clinic_name
        FROM secretaries s
        LEFT JOIN clinics c ON s.clinic_id = c.id
        ORDER BY s.created_at DESC
      `)
      .all();

    const result = secretaries.map((sec) => {
      let doctors = [];
      if (sec.clinic_id) {
        doctors = db
          .prepare(`
            SELECT DISTINCT d.id, d.full_name, d.specialty
            FROM doctors d
            LEFT JOIN doctor_clinics dc ON d.id = dc.doctor_id
            WHERE (dc.clinic_id = ? OR d.clinic_name = (SELECT name FROM clinics WHERE id = ?))
            AND d.is_deleted = 0
            AND d.status = 'approved'
          `)
          .all(sec.clinic_id, sec.clinic_id);
      }

      return {
        ...sec,
        doctors,
        doctor_ids: doctors.map((d) => d.id),
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== سكرتيرة واحدة ====================

router.get('/list/pending', authenticate, authorize('admin'), (req, res) => {
  try {
    const secretaries = db.prepare(`
      SELECT s.id, s.full_name, s.phone, s.email, s.clinic_id,
             s.avatar, s.governorate, s.address, s.must_complete_profile,
             s.status, s.created_at,
             c.name as clinic_name
      FROM secretaries s
      LEFT JOIN clinics c ON s.clinic_id = c.id
      WHERE s.status = 'pending'
      ORDER BY s.created_at DESC
    `).all();

    res.json({
      success: true,
      data: secretaries,
      meta: { count: secretaries.length }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 التحكم بكامل صلاحيات جميع السكرتيرات دفعة واحدة (Admin فقط)
// ═══════════════════════════════════════════
router.get('/bulk/permissions', authenticate, authorize('admin'), (req, res) => {
  try {
    const totalSecretaries = db.prepare('SELECT COUNT(*) as c FROM secretaries').get().c;
    res.json({
      success: true,
      data: {
        permissions: DEFAULT_SECRETARY_PERMISSIONS,
        total_secretaries: totalSecretaries,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const updateAllSecretaryPermissions = (req, res) => {
  try {
    const { permissions } = req.body;
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ success: false, message: 'بيانات الصلاحيات غير صحيحة' });
    }

    const permsJson = JSON.stringify(permissions);
    const result = db.prepare(`
      UPDATE secretaries
      SET permissions = ?
    `).run(permsJson);

    res.json({
      success: true,
      message: `تم تحديث وتعميم كامل صلاحيات جميع السكرتيرات بنجاح (${result.changes} سكرتيرة)`,
      count: result.changes,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

router.patch('/bulk/permissions', authenticate, authorize('admin'), updateAllSecretaryPermissions);
router.put('/bulk/permissions', authenticate, authorize('admin'), updateAllSecretaryPermissions);

router.get('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const secretary = db
      .prepare(`
        SELECT s.id, s.full_name, s.phone, s.clinic_id, s.permissions,
               s.is_active, s.created_at,
               c.name as clinic_name
        FROM secretaries s
        LEFT JOIN clinics c ON s.clinic_id = c.id
        WHERE s.id = ?
      `)
      .get(req.params.id);

    if (!secretary) {
      return res.status(404).json({ success: false, message: 'السكرتيرة غير موجودة' });
    }

    let doctors = [];
    if (secretary.clinic_id) {
      doctors = db
        .prepare(`
          SELECT DISTINCT d.id, d.full_name, d.specialty
          FROM doctors d
          LEFT JOIN doctor_clinics dc ON d.id = dc.doctor_id
          WHERE (dc.clinic_id = ? OR d.clinic_name = (SELECT name FROM clinics WHERE id = ?))
          AND d.is_deleted = 0
          AND d.status = 'approved'
        `)
        .all(secretary.clinic_id, secretary.clinic_id);
    }

    res.json({
      success: true,
      data: {
        ...secretary,
        doctors,
        doctor_ids: doctors.map((d) => d.id),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إضافة سكرتيرة ====================
router.post('/', authenticate, authorize('admin'), (req, res) => {
  try {
    const { full_name, phone, clinic_id, permissions } = req.body;

    if (!full_name || !phone) {
      return res.status(400).json({ success: false, message: 'الاسم والهاتف مطلوبان' });
    }

    const existing = db.prepare('SELECT * FROM secretaries WHERE phone = ?').get(phone);

    if (existing) {
      return res.status(400).json({ success: false, message: 'رقم الهاتف مسجل مسبقاً' });
    }

    const permissionsJson = permissions
      ? JSON.stringify(permissions)
      : JSON.stringify({
          view_queue: true,
          check_in: true,
          view_appointments: true,
          edit_appointments: true,
          view_patients: true,
          view_slots: true,
          manage_slots: true,
        });

    const result = db
      .prepare(`
        INSERT INTO secretaries (full_name, phone, clinic_id, permissions, status, is_active, phone_verified)
        VALUES (?, ?, ?, ?, 'approved', 1, 1)
      `)
      .run(full_name, phone, clinic_id || null, permissionsJson);

    res.status(201).json({
      success: true,
      message: 'تم إضافة السكرتيرة',
      data: { id: result.lastInsertRowid },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تعديل سكرتيرة ====================
router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    const { full_name, phone, clinic_id, permissions } = req.body;
    const secretaryId = Number(req.params.id);

    const secretary = db.prepare('SELECT * FROM secretaries WHERE id = ?').get(secretaryId);

    if (!secretary) {
      return res.status(404).json({ success: false, message: 'السكرتيرة غير موجودة' });
    }

    const permissionsJson = permissions
      ? JSON.stringify(permissions)
      : secretary.permissions;

    db.prepare(`
      UPDATE secretaries SET
        full_name = ?, phone = ?, clinic_id = ?, permissions = ?
      WHERE id = ?
    `).run(
      full_name || secretary.full_name,
      phone || secretary.phone,
      clinic_id !== undefined ? clinic_id : secretary.clinic_id,
      permissionsJson,
      secretaryId
    );

    res.json({ success: true, message: 'تم التعديل' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تفعيل/تعطيل ====================
router.patch('/:id/toggle', authenticate, authorize('admin'), (req, res) => {
  try {
    const secretary = db.prepare('SELECT * FROM secretaries WHERE id = ?').get(req.params.id);

    if (!secretary) {
      return res.status(404).json({ success: false, message: 'السكرتيرة غير موجودة' });
    }

    const newActive = secretary.is_active ? 0 : 1;
    const newStatus = newActive === 0 ? 'blocked' : (secretary.status === 'blocked' ? 'approved' : secretary.status);

    db.prepare('UPDATE secretaries SET is_active = ?, status = ? WHERE id = ?').run(newActive, newStatus, req.params.id);

    res.json({
      success: true,
      message: newActive ? 'تم تفعيل حساب السكرتيرة بنجاح' : 'تم تعطيل/حظر حساب السكرتيرة بنجاح وقطع جلستها',
      is_active: newActive,
      status: newStatus,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== نقل السكرتيرة لعيادة أخرى ====================
router.patch('/:id/move-clinic', authenticate, authorize('admin'), (req, res) => {
  try {
    const { clinic_id } = req.body;
    const secretaryId = Number(req.params.id);

    if (clinic_id === undefined) {
      return res.status(400).json({ success: false, message: 'clinic_id مطلوب' });
    }

    const secretary = db.prepare('SELECT * FROM secretaries WHERE id = ?').get(secretaryId);
    if (!secretary) {
      return res.status(404).json({ success: false, message: 'السكرتيرة غير موجودة' });
    }

    db.prepare('UPDATE secretaries SET clinic_id = ? WHERE id = ?').run(
      clinic_id || null,
      secretaryId
    );

    res.json({ success: true, message: 'تم نقل السكرتيرة' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== حذف ====================
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  try {
    db.prepare('DELETE FROM secretaries WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'تم حذف السكرتيرة' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 السكرتيرات المعلّقات
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
// 🆕 موافقة على سكرتيرة
// ═══════════════════════════════════════════
router.patch('/:id/approve', authenticate, authorize('admin'), (req, res) => {
  try {
    const secretaryId = Number(req.params.id);
    
    const secretary = db.prepare('SELECT * FROM secretaries WHERE id = ?').get(secretaryId);
    
    if (!secretary) {
      return res.status(404).json({ success: false, message: 'السكرتيرة غير موجودة' });
    }

    if (secretary.status === 'approved') {
      return res.status(400).json({ success: false, message: 'السكرتيرة معتمدة مسبقاً' });
    }

    db.prepare(`
      UPDATE secretaries
      SET status = 'approved', is_active = 1
      WHERE id = ?
    `).run(secretaryId);

    // إذا كانت السكرتيرة أنشأت عيادة → فعّلها
    if (secretary.clinic_id) {
      db.prepare('UPDATE clinics SET is_active = 1 WHERE id = ?').run(secretary.clinic_id);
    }

    // تحديث طلب التسجيل (إن وُجد)
    try {
      db.prepare(`
        UPDATE registration_requests
        SET status = 'approved',
            reviewed_by = ?,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE type = 'secretary' AND user_id = ? AND status = 'pending'
      `).run(req.user.id, secretaryId);
    } catch (e) {}

    res.json({ success: true, message: 'تمت الموافقة على السكرتيرة' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 رفض سكرتيرة
// ═══════════════════════════════════════════
router.patch('/:id/reject', authenticate, authorize('admin'), (req, res) => {
  try {
    const secretaryId = Number(req.params.id);
    const { reason } = req.body;
    
    const secretary = db.prepare('SELECT * FROM secretaries WHERE id = ?').get(secretaryId);
    
    if (!secretary) {
      return res.status(404).json({ success: false, message: 'السكرتيرة غير موجودة' });
    }

    db.prepare(`
      UPDATE secretaries
      SET status = 'rejected', is_active = 0
      WHERE id = ?
    `).run(secretaryId);

    // إذا كانت أنشأت عيادة → عطّلها
    if (secretary.clinic_id) {
      db.prepare('UPDATE clinics SET is_active = 0 WHERE id = ?').run(secretary.clinic_id);
    }

    try {
      db.prepare(`
        UPDATE registration_requests
        SET status = 'rejected',
            reviewed_by = ?,
            reviewed_at = CURRENT_TIMESTAMP,
            notes = ?
        WHERE type = 'secretary' AND user_id = ? AND status = 'pending'
      `).run(req.user.id, reason || null, secretaryId);
    } catch (e) {}

    res.json({ success: true, message: 'تم رفض السكرتيرة' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ═══════════════════════════════════════════
// GET /me/doctors
//    عرض أطباء السكرتيرة الحالية
// ═══════════════════════════════════════════
router.get('/me/doctors', authenticate, async (req, res) => {
  try {
    const userRole = req.user.role || req.user.type;
    if (userRole !== 'secretary') {
      return res.status(403).json({
        success: false,
        message: 'هذا المسار للسكرتيرات فقط'
      });
    }

    const secretary = db.prepare('SELECT id, clinic_id FROM secretaries WHERE id = ?')
      .get(req.user.id);

    if (!secretary) {
      return res.status(404).json({ success: false, message: 'السكرتيرة غير موجودة' });
    }

    // كل أطباء العيادة
    const allDoctors = db.prepare(`
      SELECT DISTINCT
        d.id, d.full_name, d.specialty, d.phone, d.avatar,
        d.status,
        CASE WHEN sd.id IS NOT NULL THEN 1 ELSE 0 END as is_linked
      FROM doctors d
      LEFT JOIN doctor_clinics dc ON dc.doctor_id = d.id
      LEFT JOIN secretary_doctors sd ON sd.doctor_id = d.id AND sd.secretary_id = ?
      WHERE d.is_deleted = 0
        AND d.status = 'approved'
        AND (
          sd.secretary_id = ?
          OR (? IS NOT NULL AND (
            dc.clinic_id = ?
            OR d.clinic_id = ?
            OR d.clinic_name = (SELECT name FROM clinics WHERE id = ?)
          ))
          OR d.clinic_name IN (SELECT c.name FROM clinics c JOIN secretaries s ON s.clinic_id = c.id WHERE s.id = ?)
        )
      ORDER BY d.full_name
    `).all(
      req.user.id,
      req.user.id,
      secretary.clinic_id,
      secretary.clinic_id,
      secretary.clinic_id,
      secretary.clinic_id,
      req.user.id
    );

    const linkedDoctors = allDoctors.filter(d => d.is_linked === 1);

    res.json({
      success: true,
      data: allDoctors,
      doctors: allDoctors,
      meta: {
        all: allDoctors,
        linked: linkedDoctors,
        clinic_id: secretary.clinic_id
      }
    });
  } catch (err) {
    console.error('❌ خطأ في /me/doctors:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// POST /me/doctors
//    ربط السكرتيرة بأطباء (bulk)
// ═══════════════════════════════════════════
router.post('/me/doctors', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'secretary') {
      return res.status(403).json({
        success: false,
        message: 'هذا المسار للسكرتيرات فقط'
      });
    }

    const { doctor_ids } = req.body;

    if (!Array.isArray(doctor_ids)) {
      return res.status(400).json({
        success: false,
        message: 'doctor_ids يجب أن يكون مصفوفة'
      });
    }

    // حذف الروابط القديمة
    db.prepare('DELETE FROM secretary_doctors WHERE secretary_id = ?').run(req.user.id);

    // إضافة الروابط الجديدة
    const insert = db.prepare('INSERT INTO secretary_doctors (secretary_id, doctor_id) VALUES (?, ?)');
    const transaction = db.transaction((ids) => {
      for (const doctorId of ids) {
        try {
          insert.run(req.user.id, doctorId);
        } catch (e) {
          console.warn(`⚠️ فشل ربط الطبيب ${doctorId}:`, e.message);
        }
      }
    });

    transaction(doctor_ids);

    console.log(`✅ [secretary_doctors] السكرتيرة ${req.user.id} مرتبطة بـ ${doctor_ids.length} طبيب`);

    res.json({
      success: true,
      message: `تم ربط ${doctor_ids.length} طبيب`,
      data: { doctor_ids }
    });
  } catch (err) {
    console.error('❌ خطأ في POST /me/doctors:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// DELETE /me/doctors/:doctorId
//    إزالة ربط طبيب واحد
// ═══════════════════════════════════════════
router.delete('/me/doctors/:doctorId', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'secretary') {
      return res.status(403).json({
        success: false,
        message: 'هذا المسار للسكرتيرات فقط'
      });
    }

    const doctorId = Number(req.params.doctorId);

    const result = db.prepare(
      'DELETE FROM secretary_doctors WHERE secretary_id = ? AND doctor_id = ?'
    ).run(req.user.id, doctorId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'الربط غير موجود' });
    }

    console.log(`✅ [secretary_doctors] حذف ربط السكرتيرة ${req.user.id} بالطبيب ${doctorId}`);

    res.json({ success: true, message: 'تم إزالة الربط' });
  } catch (err) {
    console.error('❌ خطأ في DELETE /me/doctors:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});



// ═══════════════════════════════════════════
// 🆕 GET /me/pending-doctors
//    الأطباء قيد المراجعة في عيادة السكرتيرة
// ═══════════════════════════════════════════
router.get('/me/pending-doctors', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'secretary') {
      return res.status(403).json({
        success: false,
        message: 'هذا المسار للسكرتيرات فقط'
      });
    }

    const secretary = db.prepare('SELECT id, clinic_id FROM secretaries WHERE id = ?')
      .get(req.user.id);

    if (!secretary) {
      return res.status(404).json({ success: false, message: 'السكرتيرة غير موجودة' });
    }

    if (!secretary.clinic_id) {
      return res.json({ success: true, data: [] });
    }

    const clinic = db.prepare('SELECT id, name FROM clinics WHERE id = ?')
      .get(secretary.clinic_id);

    if (!clinic) {
      return res.json({ success: true, data: [] });
    }

    // الأطباء pending المرتبطون بالعيادة (عبر doctor_clinics أو clinic_id أو clinic_name)
    const pendingDoctors = db.prepare(`
      SELECT DISTINCT
        d.id, d.full_name, d.specialty, d.phone, d.email, d.avatar,
        d.status, d.must_complete_profile, d.created_at,
        COALESCE(d.clinic_name, ?) as clinic_name
      FROM doctors d
      LEFT JOIN doctor_clinics dc ON d.id = dc.doctor_id
      WHERE d.is_deleted = 0
        AND d.status = 'pending'
        AND (dc.clinic_id = ? OR d.clinic_id = ? OR d.clinic_name = ?)
      ORDER BY d.created_at DESC
    `).all(clinic.name, secretary.clinic_id, secretary.clinic_id, clinic.name);

    res.json({
      success: true,
      data: pendingDoctors,
      clinic_id: secretary.clinic_id,
      clinic_name: clinic.name
    });
  } catch (err) {
    console.error('❌ خطأ في /me/pending-doctors:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 PATCH /me/doctors/:doctorId/approve
//    اعتماد طبيب من السكرتيرة
// ═══════════════════════════════════════════
router.patch('/me/doctors/:doctorId/approve', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'secretary') {
      return res.status(403).json({
        success: false,
        message: 'هذا المسار للسكرتيرات فقط'
      });
    }

    const doctorId = Number(req.params.doctorId);

    const secretary = db.prepare('SELECT id, clinic_id, status FROM secretaries WHERE id = ?')
      .get(req.user.id);

    if (!secretary) {
      return res.status(404).json({ success: false, message: 'السكرتيرة غير موجودة' });
    }

    if (secretary.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'يجب اعتماد حسابك أولاً'
      });
    }

    const perms = getSecretaryPermissions(req.user.id);
    if (perms.approve_doctors === false) {
      return res.status(403).json({
        success: false,
        message: 'لا تملكِ صلاحية اعتماد حسابات الأطباء. يمكن تفعيل هذه الصلاحية عبر إدارة المنصة.'
      });
    }

    if (!secretary.clinic_id) {
      return res.status(400).json({
        success: false,
        message: 'يجب أن تكون مرتبطاً بعيادة'
      });
    }

    const clinic = db.prepare('SELECT id, name FROM clinics WHERE id = ?')
      .get(secretary.clinic_id);

    if (!clinic) {
      return res.status(404).json({ success: false, message: 'العيادة غير موجودة' });
    }

    // التحقق أن الطبيب في نفس العيادة + pending
    const doctor = db.prepare(`
      SELECT d.* FROM doctors d
      LEFT JOIN doctor_clinics dc ON d.id = dc.doctor_id
      WHERE d.id = ?
        AND d.is_deleted = 0
        AND d.status = 'pending'
        AND (dc.clinic_id = ? OR d.clinic_id = ? OR d.clinic_name = ?)
    `).get(doctorId, secretary.clinic_id, secretary.clinic_id, clinic.name);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'الطبيب غير موجود أو ليس في عيادتك أو ليس قيد المراجعة'
      });
    }

    // اعتماد الطبيب
    db.prepare(`
      UPDATE doctors SET
        status = 'approved',
        approved_at = CURRENT_TIMESTAMP,
        approved_by = ?,
        is_active = 1
      WHERE id = ?
    `).run(req.user.id, doctorId);

    // ربط الطبيب بالعيادة (إذا لم يكن مرتبطاً)
    try {
      db.prepare('INSERT OR IGNORE INTO doctor_clinics (doctor_id, clinic_id) VALUES (?, ?)')
        .run(doctorId, secretary.clinic_id);
    } catch (e) {
      console.warn('⚠️ فشل ربط الطبيب بالعيادة:', e.message);
    }

    // تحديث RR
    try {
      db.prepare(`
        UPDATE registration_requests SET
          status = 'approved',
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP
        WHERE type = 'doctor' AND user_id = ? AND status = 'pending'
      `).run(req.user.id, doctorId);
    } catch (e) {
      console.warn('⚠️ فشل تحديث RR:', e.message);
    }

    console.log(`✅ [secretary] السكرتيرة ${req.user.id} اعتمدت الطبيب ${doctorId}`);

    try {
      createNotification(
        doctorId,
        'doctor',
        'تم اعتماد حسابك الطبي في العيادة 🎉',
        `تمت الموافقة على انضمامك واعتماد حسابك في ${clinic.name} من قبل سكرتيرة العيادة. يمكنك الآن استقبال الحجوزات وتنظيم طابور الانتظار.`
      );
    } catch (_) {}

    res.json({ success: true, message: 'تم اعتماد الطبيب وتفعيله في العيادة بنجاح ✅' });
  } catch (err) {
    console.error('❌ خطأ في approve doctor:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 PATCH /me/doctors/:doctorId/reject
//    رفض طبيب من السكرتيرة
// ═══════════════════════════════════════════
router.patch('/me/doctors/:doctorId/reject', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'secretary') {
      return res.status(403).json({
        success: false,
        message: 'هذا المسار للسكرتيرات فقط'
      });
    }

    const doctorId = Number(req.params.doctorId);
    const { reason } = req.body;

    const secretary = db.prepare('SELECT id, clinic_id, status FROM secretaries WHERE id = ?')
      .get(req.user.id);

    if (!secretary || secretary.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح'
      });
    }

    const perms = getSecretaryPermissions(req.user.id);
    if (perms.approve_doctors === false) {
      return res.status(403).json({
        success: false,
        message: 'لا تملكِ صلاحية رفض حسابات الأطباء. يمكن تفعيل هذه الصلاحية عبر إدارة المنصة.'
      });
    }

    if (!secretary.clinic_id) {
      return res.status(400).json({
        success: false,
        message: 'يجب أن تكون مرتبطاً بعيادة'
      });
    }

    const clinic = db.prepare('SELECT id, name FROM clinics WHERE id = ?')
      .get(secretary.clinic_id);

    const doctor = db.prepare(`
      SELECT d.* FROM doctors d
      LEFT JOIN doctor_clinics dc ON d.id = dc.doctor_id
      WHERE d.id = ?
        AND d.is_deleted = 0
        AND d.status = 'pending'
        AND (dc.clinic_id = ? OR d.clinic_id = ? OR d.clinic_name = ?)
    `).get(doctorId, secretary.clinic_id, secretary.clinic_id, clinic?.name);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'الطبيب غير موجود أو ليس في عيادتك'
      });
    }

    // رفض الطبيب
    db.prepare(`
      UPDATE doctors SET
        status = 'rejected',
        is_active = 0
      WHERE id = ?
    `).run(doctorId);

    // تحديث RR
    try {
      db.prepare(`
        UPDATE registration_requests SET
          status = 'rejected',
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          notes = ?
        WHERE type = 'doctor' AND user_id = ? AND status = 'pending'
      `).run(req.user.id, reason || null, doctorId);
    } catch (e) {}

    console.log(`✅ [secretary] السكرتيرة ${req.user.id} رفضت الطبيب ${doctorId}`);

    res.json({ success: true, message: 'تم رفض الطبيب' });
  } catch (err) {
    console.error('❌ خطأ في reject doctor:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ═══════════════════════════════════════════
// 🆕 POST /me/delegations
//    إرسال طلب تفويض لسكرتيرة أخرى
// ═══════════════════════════════════════════
router.post('/me/delegations', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'secretary') {
      return res.status(403).json({
        success: false,
        message: 'هذا المسار للسكرتيرات فقط'
      });
    }

    const {
      to_secretary_id,
      doctor_id,
      valid_from,
      valid_until,
      max_bookings,
      message
    } = req.body;

    // 1) التحقق من المدخلات
    if (!to_secretary_id || !doctor_id || !valid_from || !valid_until) {
      return res.status(400).json({
        success: false,
        message: 'to_secretary_id, doctor_id, valid_from, valid_until مطلوبة'
      });
    }

    if (to_secretary_id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكنك تفويض نفسك'
      });
    }

    // 2) التحقق من صحة التواريخ
    const fromDate = new Date(valid_from);
    const untilDate = new Date(valid_until);

    if (isNaN(fromDate.getTime()) || isNaN(untilDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'صيغة التاريخ غير صحيحة (يجب YYYY-MM-DD)'
      });
    }

    if (untilDate < fromDate) {
      return res.status(400).json({
        success: false,
        message: 'valid_until يجب أن يكون بعد valid_from'
      });
    }

    // 3) التحقق من السكرتيرة المُفوَّضة
    const toSecretary = db.prepare(
      'SELECT id, full_name, clinic_id, status FROM secretaries WHERE id = ?'
    ).get(to_secretary_id);

    if (!toSecretary) {
      return res.status(404).json({
        success: false,
        message: 'السكرتيرة المفوَّضة غير موجودة'
      });
    }

    if (toSecretary.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'السكرتيرة المفوَّضة غير معتمدة'
      });
    }

    // 4) التحقق من أن المُفوِّضة تدير الطبيب فعلاً
    if (!canManageDoctor(req.user.id, doctor_id)) {
      return res.status(403).json({
        success: false,
        message: 'لا تملك صلاحية إدارة هذا الطبيب'
      });
    }

    // 5) التحقق من صلاحية delegate_doctors
    const sec = db.prepare('SELECT permissions FROM secretaries WHERE id = ?').get(req.user.id);
    let perms = {};
    try { perms = sec?.permissions ? JSON.parse(sec.permissions) : {}; } catch (e) {}
    const merged = { ...DEFAULT_SECRETARY_PERMISSIONS, ...perms };
    if (merged.delegate_doctors !== true) {
      return res.status(403).json({
        success: false,
        message: 'لا تملك صلاحية التفويض'
      });
    }

    // 6) التحقق من عدم وجود تفويض مكرر نشط
    const existing = db.prepare(`
      SELECT id FROM secretary_delegations
      WHERE from_secretary_id = ?
        AND to_secretary_id = ?
        AND doctor_id = ?
        AND status IN ('pending', 'accepted')
    `).get(req.user.id, to_secretary_id, doctor_id);

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'يوجد تفويض نشط مسبقاً لهذا الطبيب'
      });
    }

    // 7) إنشاء التفويض
    const result = db.prepare(`
      INSERT INTO secretary_delegations
      (from_secretary_id, to_secretary_id, doctor_id, valid_from, valid_until, max_bookings, message, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      req.user.id,
      to_secretary_id,
      doctor_id,
      valid_from,
      valid_until,
      max_bookings || null,
      message || null
    );

    // 8) إشعار للسكرتيرة المُفوَّضة
    try {
      const doctor = db.prepare('SELECT full_name FROM doctors WHERE id = ?').get(doctor_id);
      const fromSec = db.prepare('SELECT full_name FROM secretaries WHERE id = ?').get(req.user.id);

      db.prepare(`
        INSERT INTO notifications (user_id, user_type, title, body, type, data)
        VALUES (?, 'secretary', ?, ?, 'delegation_request', ?)
      `).run(
        to_secretary_id,
        'طلب تفويض جديد',
        `${fromSec.full_name} تطلب تفويضك لإدارة مواعيد د. ${doctor.full_name}`,
        JSON.stringify({ delegation_id: result.lastInsertRowid, doctor_id })
      );
    } catch (notifErr) {
      console.warn('⚠️ فشل إرسال إشعار:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'تم إرسال طلب التفويض',
      data: { delegation_id: result.lastInsertRowid }
    });

  } catch (err) {
    console.error('❌ POST /me/delegations:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 GET /me/delegations
//    قائمة التفويضات (صادرة + واردة)
// ═══════════════════════════════════════════
router.get('/me/delegations', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'secretary') {
      return res.status(403).json({
        success: false,
        message: 'هذا المسار للسكرتيرات فقط'
      });
    }

    const { status, direction } = req.query;

    let whereOut = 'WHERE d.from_secretary_id = ?';
    let whereIn = 'WHERE d.to_secretary_id = ?';
    const paramsOut = [req.user.id];
    const paramsIn = [req.user.id];

    if (status) {
      whereOut += ' AND d.status = ?';
      whereIn += ' AND d.status = ?';
      paramsOut.push(status);
      paramsIn.push(status);
    }

    const baseSelect = `
      SELECT
        d.*,
        doc.full_name AS doctor_name,
        doc.specialty AS doctor_specialty,
        fs.full_name AS from_secretary_name,
        ts.full_name AS to_secretary_name
      FROM secretary_delegations d
      LEFT JOIN doctors doc ON d.doctor_id = doc.id
      LEFT JOIN secretaries fs ON d.from_secretary_id = fs.id
      LEFT JOIN secretaries ts ON d.to_secretary_id = ts.id
    `;

    let outgoing = [];
    let incoming = [];

    if (!direction || direction === 'outgoing' || direction === 'all') {
      outgoing = db.prepare(`${baseSelect} ${whereOut} ORDER BY d.created_at DESC`)
        .all(...paramsOut);
    }

    if (!direction || direction === 'incoming' || direction === 'all') {
      incoming = db.prepare(`${baseSelect} ${whereIn} ORDER BY d.created_at DESC`)
        .all(...paramsIn);
    }

    res.json({
      success: true,
      data: {
        outgoing,
        incoming,
        pending_count: incoming.filter(d => d.status === 'pending').length
      }
    });

  } catch (err) {
    console.error('❌ GET /me/delegations:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 PATCH /me/delegations/:id/accept
//    قبول طلب تفويض
// ═══════════════════════════════════════════
router.patch('/me/delegations/:id/accept', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'secretary') {
      return res.status(403).json({ success: false, message: 'هذا المسار للسكرتيرات فقط' });
    }

    const delegationId = Number(req.params.id);
    const { response_message } = req.body;

    const delegation = db.prepare('SELECT * FROM secretary_delegations WHERE id = ?').get(delegationId);

    if (!delegation) {
      return res.status(404).json({ success: false, message: 'التفويض غير موجود' });
    }

    if (delegation.to_secretary_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'هذا التفويض ليس لك' });
    }

    if (delegation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `لا يمكن القبول — الحالة الحالية: ${delegation.status}`
      });
    }

    db.prepare(`
      UPDATE secretary_delegations
      SET status = 'accepted',
          responded_at = CURRENT_TIMESTAMP,
          response_message = ?
      WHERE id = ?
    `).run(response_message || null, delegationId);

    // إشعار للمُفوِّضة
    try {
      const toSec = db.prepare('SELECT full_name FROM secretaries WHERE id = ?').get(req.user.id);
      const doctor = db.prepare('SELECT full_name FROM doctors WHERE id = ?').get(delegation.doctor_id);

      db.prepare(`
        INSERT INTO notifications (user_id, user_type, title, body, type, data)
        VALUES (?, 'secretary', ?, ?, 'delegation_accepted', ?)
      `).run(
        delegation.from_secretary_id,
        'تم قبول التفويض',
        `${toSec.full_name} قبلت إدارة مواعيد د. ${doctor.full_name}`,
        JSON.stringify({ delegation_id: delegationId })
      );
    } catch (notifErr) {
      console.warn('⚠️ فشل إشعار القبول:', notifErr.message);
    }

    res.json({ success: true, message: 'تم قبول التفويض' });

  } catch (err) {
    console.error('❌ accept delegation:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 PATCH /me/delegations/:id/reject
//    رفض طلب تفويض
// ═══════════════════════════════════════════
router.patch('/me/delegations/:id/reject', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'secretary') {
      return res.status(403).json({ success: false, message: 'هذا المسار للسكرتيرات فقط' });
    }

    const delegationId = Number(req.params.id);
    const { response_message } = req.body;

    const delegation = db.prepare('SELECT * FROM secretary_delegations WHERE id = ?').get(delegationId);

    if (!delegation) {
      return res.status(404).json({ success: false, message: 'التفويض غير موجود' });
    }

    if (delegation.to_secretary_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'هذا التفويض ليس لك' });
    }

    if (delegation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `لا يمكن الرفض — الحالة: ${delegation.status}`
      });
    }

    db.prepare(`
      UPDATE secretary_delegations
      SET status = 'rejected',
          responded_at = CURRENT_TIMESTAMP,
          response_message = ?
      WHERE id = ?
    `).run(response_message || null, delegationId);

    // إشعار
    try {
      const toSec = db.prepare('SELECT full_name FROM secretaries WHERE id = ?').get(req.user.id);
      db.prepare(`
        INSERT INTO notifications (user_id, user_type, title, body, type, data)
        VALUES (?, 'secretary', ?, ?, 'delegation_rejected', ?)
      `).run(
        delegation.from_secretary_id,
        'تم رفض التفويض',
        `${toSec.full_name} رفضت طلب التفويض`,
        JSON.stringify({ delegation_id: delegationId })
      );
    } catch (e) {}

    res.json({ success: true, message: 'تم رفض التفويض' });

  } catch (err) {
    console.error('❌ reject delegation:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 DELETE /me/delegations/:id
//    إلغاء تفويض (من المُفوِّضة)
// ═══════════════════════════════════════════
router.delete('/me/delegations/:id', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'secretary') {
      return res.status(403).json({ success: false, message: 'هذا المسار للسكرتيرات فقط' });
    }

    const delegationId = Number(req.params.id);

    const delegation = db.prepare('SELECT * FROM secretary_delegations WHERE id = ?').get(delegationId);

    if (!delegation) {
      return res.status(404).json({ success: false, message: 'التفويض غير موجود' });
    }

    if (delegation.from_secretary_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'يمكنك إلغاء تفويضاتك فقط' });
    }

    if (delegation.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'التفويض ملغى مسبقاً' });
    }

    db.prepare(`
      UPDATE secretary_delegations
      SET status = 'cancelled',
          responded_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(delegationId);

    // إشعار للمُفوَّضة (إن كانت معتمدة)
    if (delegation.status === 'accepted') {
      try {
        db.prepare(`
          INSERT INTO notifications (user_id, user_type, title, body, type, data)
          VALUES (?, 'secretary', ?, ?, 'delegation_cancelled', ?)
        `).run(
          delegation.to_secretary_id,
          'تم إلغاء تفويض',
          'تم إلغاء تفويض كان ممنوحاً لك',
          JSON.stringify({ delegation_id: delegationId })
        );
      } catch (e) {}
    }

    res.json({ success: true, message: 'تم إلغاء التفويض' });

  } catch (err) {
    console.error('❌ cancel delegation:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ═══════════════════════════════════════════
// 🆕 GET /me/colleagues
//    سكرتيرات نفس العيادة (للاستخدام في التفويض)
// ═══════════════════════════════════════════
router.get('/me/colleagues', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'secretary') {
      return res.status(403).json({
        success: false,
        message: 'هذا المسار للسكرتيرات فقط'
      });
    }

    const me = db.prepare('SELECT id, clinic_id FROM secretaries WHERE id = ?')
      .get(req.user.id);

    if (!me || !me.clinic_id) {
      return res.json({ success: true, data: [] });
    }

    const colleagues = db.prepare(`
      SELECT id, full_name, phone, email, avatar, status
      FROM secretaries
      WHERE clinic_id = ?
        AND id != ?
        AND status = 'approved'
      ORDER BY full_name
    `).all(me.clinic_id, req.user.id);

    res.json({
      success: true,
      data: colleagues,
      clinic_id: me.clinic_id
    });
  } catch (err) {
    console.error('❌ /me/colleagues:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 GET /me/clinic-schedule
//    عرض قالب ومواعيد دوام عيادة السكرتيرة
// ═══════════════════════════════════════════
router.get('/me/clinic-schedule', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'secretary') {
      return res.status(403).json({ success: false, message: 'هذا المسار للسكرتيرات فقط' });
    }
    const sec = db.prepare('SELECT id, clinic_id FROM secretaries WHERE id = ?').get(req.user.id);
    if (!sec || !sec.clinic_id) {
      return res.status(404).json({ success: false, message: 'لم يتم ربطك بأي عيادة بعد' });
    }
    const clinic = db.prepare('SELECT * FROM clinics WHERE id = ?').get(sec.clinic_id);
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

// ═══════════════════════════════════════════
// 🆕 PUT /me/clinic-schedule
//    تحديث قالب ومواعيد دوام عيادة السكرتيرة
// ═══════════════════════════════════════════
router.put('/me/clinic-schedule', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'secretary') {
      return res.status(403).json({ success: false, message: 'هذا المسار للسكرتيرات فقط' });
    }
    const sec = db.prepare('SELECT id, clinic_id FROM secretaries WHERE id = ?').get(req.user.id);
    if (!sec || !sec.clinic_id) {
      return res.status(404).json({ success: false, message: 'لم يتم ربطك بأي عيادة بعد' });
    }
    const clinic = db.prepare('SELECT * FROM clinics WHERE id = ?').get(sec.clinic_id);
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'العيادة غير موجودة' });
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

    const normalizeDigits = (str) => {
      if (!str) return null;
      return str.toString()
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    };

    const cleanOpen = normalizeDigits(open_time);
    const cleanClose = normalizeDigits(close_time);

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
      clinic.id
    );

    const updated = db.prepare('SELECT * FROM clinics WHERE id = ?').get(clinic.id);
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

// ═══════════════════════════════════════════
// 🆕 POST /me/clinic/contact-numbers
//    إضافة رقم تواصل إضافي للعيادة (يظهر للإدارة فقط)
// ═══════════════════════════════════════════
router.post('/me/clinic/contact-numbers', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'secretary') {
      return res.status(403).json({ success: false, message: 'للسكرتيرات فقط' });
    }
    const { phone, notes } = req.body;
    const cleanPhone = String(phone || '').trim().replace(/^(\+?967)/, '');
    if (!/^7[0-9]{8}$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'رقم الهاتف غير صحيح (9 أرقام تبدأ بـ 7)' });
    }

    const sec = db.prepare('SELECT id, full_name, clinic_id FROM secretaries WHERE id = ?').get(req.user.id);
    if (!sec || !sec.clinic_id) {
      return res.status(400).json({ success: false, message: 'السكرتيرة غير مرتبطة بعيادة' });
    }

    // تأكد من وجود جدول clinic_contact_numbers
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

    const ins = db.prepare(`
      INSERT INTO clinic_contact_numbers (clinic_id, phone, notes, added_by_secretary_id)
      VALUES (?, ?, ?, ?)
    `).run(sec.clinic_id, cleanPhone, notes || null, sec.id);

    // إشعار للإدارة
    try {
      const clinic = db.prepare('SELECT name FROM clinics WHERE id = ?').get(sec.clinic_id);
      createNotification(
        'admin',
        1,
        'رقم تواصل جديد للعيادة 📞',
        `أضافت السكرتيرة ${sec.full_name} رقم هاتف إضافي (${cleanPhone}) لعيادة ${clinic?.name || ''} للمراجعة.`,
        'clinic_contact_number',
        ins.lastInsertRowid
      );
    } catch (_) {}

    res.json({
      success: true,
      message: 'تم إضافة رقم التواصل الإضافي بنجاح، وسيظهر لإدارة المنصة ✅',
      data: { id: ins.lastInsertRowid, phone: cleanPhone }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 GET /me/clinic/contact-numbers
// ═══════════════════════════════════════════
router.get('/me/clinic/contact-numbers', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'secretary') {
      return res.status(403).json({ success: false, message: 'للسكرتيرات فقط' });
    }
    const sec = db.prepare('SELECT clinic_id FROM secretaries WHERE id = ?').get(req.user.id);
    if (!sec || !sec.clinic_id) {
      return res.json({ success: true, data: [] });
    }
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

    const numbers = db.prepare(`
      SELECT * FROM clinic_contact_numbers WHERE clinic_id = ? ORDER BY created_at DESC
    `).all(sec.clinic_id);

    res.json({ success: true, data: numbers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 GET /me/financial-stats
// إحصائيات الحجوزات والعائد المالي للعيادة ولكل طبيب بعد خصم عمولة الإدارة
// ═══════════════════════════════════════════
router.get('/me/financial-stats', authenticate, async (req, res) => {
  try {
    const userRole = req.user.role || req.user.type;
    if (userRole !== 'secretary') {
      return res.status(403).json({ success: false, message: 'للسكرتيرات فقط' });
    }

    const sec = db.prepare('SELECT id, clinic_id FROM secretaries WHERE id = ?').get(req.user.id);
    if (!sec || !sec.clinic_id) {
      return res.status(404).json({ success: false, message: 'لم يتم ربط السكرتيرة بأي عيادة' });
    }

    const clinic = db.prepare('SELECT id, name, commission_rate FROM clinics WHERE id = ?').get(sec.clinic_id);
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'العيادة غير موجودة' });
    }

    // جلب نسبة عمولة المنصة العامة في حال لم تُحدد نسبة خاصة بالعيادة
    let globalCommissionRate = 10;
    try {
      const setting = db.prepare("SELECT value FROM settings WHERE key = 'platform_commission_rate'").get();
      if (setting && setting.value) {
        globalCommissionRate = parseFloat(setting.value) || 10;
      }
    } catch (_) {}

    const effectiveCommissionRate = (clinic.commission_rate !== null && clinic.commission_rate !== undefined)
      ? parseFloat(clinic.commission_rate)
      : globalCommissionRate;

    // أطباء العيادة
    const doctors = db.prepare(`
      SELECT DISTINCT d.id, d.full_name, d.specialty, d.consultation_fee
      FROM doctors d
      LEFT JOIN doctor_clinics dc ON dc.doctor_id = d.id
      WHERE d.is_deleted = 0
        AND d.status = 'approved'
        AND (
          dc.clinic_id = ?
          OR d.clinic_id = ?
          OR d.clinic_name = ?
        )
      ORDER BY d.full_name
    `).all(sec.clinic_id, sec.clinic_id, clinic.name);

    const doctorIds = doctors.map(d => d.id);

    const range = req.query.range || 'all'; // all, today, week, month
    let dateFilterClause = '';
    const dateParams = [];

    if (range === 'today') {
      dateFilterClause = " AND date(a.created_at) = date('now') ";
    } else if (range === 'week') {
      dateFilterClause = " AND date(a.created_at) >= date('now', '-7 days') ";
    } else if (range === 'month') {
      dateFilterClause = " AND date(a.created_at) >= date('now', '-30 days') ";
    }

    // جلب الحجوزات التابعة لأطباء هذه العيادة (فقط الحجوزات غير الملغاة)
    let appointments = [];
    if (doctorIds.length > 0) {
      const placeholders = doctorIds.map(() => '?').join(',');
      appointments = db.prepare(`
        SELECT a.id, a.doctor_id, a.status, a.fee, a.created_at,
               d.full_name as doctor_name, d.consultation_fee as default_doctor_fee
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.doctor_id IN (${placeholders})
          AND a.status NOT IN ('cancelled')
          ${dateFilterClause}
      `).all(...doctorIds);
    }

    let totalAppointments = appointments.length;
    let totalGrossRevenue = 0;

    // تجميع الحجوزات لكل طبيب
    const doctorStatsMap = {};
    doctors.forEach(doc => {
      const grossFee = parseFloat(doc.consultation_fee) || 0;
      const adminCommissionPerBooking = (grossFee * effectiveCommissionRate) / 100;
      const netFeePerBooking = Math.max(0, grossFee - adminCommissionPerBooking);

      doctorStatsMap[doc.id] = {
        doctor_id: doc.id,
        doctor_name: doc.full_name,
        specialty: doc.specialty,
        consultation_fee: grossFee,
        net_fee_per_booking: Math.round(netFeePerBooking * 100) / 100,
        appointments_count: 0,
        gross_revenue: 0,
        admin_commission: 0,
        net_revenue: 0
      };
    });

    appointments.forEach(appt => {
      const docStat = doctorStatsMap[appt.doctor_id];
      const fee = (appt.fee !== null && appt.fee !== undefined && appt.fee !== '')
        ? parseFloat(appt.fee)
        : (docStat ? docStat.consultation_fee : 0);

      totalGrossRevenue += fee;

      if (docStat) {
        docStat.appointments_count += 1;
        docStat.gross_revenue += fee;
        const comm = (fee * effectiveCommissionRate) / 100;
        docStat.admin_commission += comm;
        docStat.net_revenue += (fee - comm);
      }
    });

    const totalAdminCommission = (totalGrossRevenue * effectiveCommissionRate) / 100;
    const totalNetRevenue = Math.max(0, totalGrossRevenue - totalAdminCommission);

    res.json({
      success: true,
      data: {
        clinic_id: clinic.id,
        clinic_name: clinic.name,
        commission_rate: effectiveCommissionRate,
        total_appointments: totalAppointments,
        total_gross_revenue: Math.round(totalGrossRevenue * 100) / 100,
        total_admin_commission: Math.round(totalAdminCommission * 100) / 100,
        total_net_revenue: Math.round(totalNetRevenue * 100) / 100,
        doctors: Object.values(doctorStatsMap)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
