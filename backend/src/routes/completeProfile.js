import express from 'express';
import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import { checkPhoneExists, buildDuplicateMessage } from '../utils/validation.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createNotification, notifyAdmins } from './notifications.js';

const router = express.Router();

// ═══════════════════════════════════════════
// Helper: جلب إعداد
// ═══════════════════════════════════════════
function getSetting(key, defaultValue = null) {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

// ═══════════════════════════════════════════
// Helper: التحقق من رابط الخريطة
// ═══════════════════════════════════════════
function isValidMapsUrl(url) {
  if (!url) return true; // اختياري
  return /^https?:\/\/(www\.)?(google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl)\/.+/.test(url);
}

// ═══════════════════════════════════════════
// POST /doctors/complete-profile
//    إكمال ملف الطبيب الجديد
// ═══════════════════════════════════════════
router.post('/doctors/complete-profile', authenticate, async (req, res) => {
  try {
    const uType = req.user.type || req.user.role;
    if (uType !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'هذا المسار للأطباء فقط'
      });
    }

    const {
      specialty,
      phone,
      clinic_id,        // ← جديد
      governorate,
      address,
      bio,
      experience_years,
      consultation_fee,
      password          // ← كلمة المرور (اختياري)
    } = req.body;

    // التحقق من الإلزامي
    if (!specialty || !specialty.trim()) {
      return res.status(400).json({
        success: false,
        message: 'التخصص مطلوب'
      });
    }

    if (!phone || !/^7[0-9]{8}$/.test(phone.replace(/^(\+?967)/, ''))) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف غير صحيح (9 أرقام تبدأ بـ 7)'
      });
    }

    // التحقق من العيادة (اختياري — إذا لم تُوجد عيادات)
    let clinicName = null;
    if (clinic_id) {
      const clinic = db.prepare('SELECT id, name FROM clinics WHERE id = ? AND is_active = 1').get(clinic_id);
      if (!clinic) {
        return res.status(400).json({
          success: false,
          message: 'العيادة غير موجودة أو غير مفعّلة'
        });
      }
      clinicName = clinic.name;
    }

    // التحقق من سعر الاستشارة
    const minFee = Number(getSetting('min_booking_fee', '0'));
    const maxFee = Number(getSetting('max_booking_fee', '100000'));
    const fee = Number(consultation_fee) || 0;

    if (fee < minFee || fee > maxFee) {
      return res.status(400).json({
        success: false,
        message: `سعر الاستشارة يجب أن يكون بين ${minFee} و ${maxFee}`
      });
    }

    // التحقق من عدم التكرار
    const cleanPhone = phone.replace(/^(\+?967)/, '');
// ✅ فحص تكرار phone في جدول doctors
    const phoneCheck = checkPhoneExists('doctors', cleanPhone, req.user.id);
    if (phoneCheck.exists) {
      return res.status(400).json({
        success: false,
        message: buildDuplicateMessage('phone', phoneCheck.ownerType)
      });
    }

    // ✅ تحضير password_hash (إن أُرسل)
    let passwordHash = null;
    if (password && String(password).trim().length >= 6) {
      passwordHash = bcrypt.hashSync(String(password), 12);
    }
    const existing = db.prepare(
      'SELECT id FROM doctors WHERE phone = ? AND id != ?'
    ).get(cleanPhone, req.user.id);

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف مستخدم من قبل طبيب آخر'
      });
    }

    const existingDoc = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.user.id);
    const finalFee = (existingDoc && existingDoc.consultation_fee !== null && Number(existingDoc.consultation_fee) > 0)
      ? Number(existingDoc.consultation_fee)
      : fee;
    const finalStatus = (existingDoc && existingDoc.status === 'approved') ? 'approved' : 'pending';

    const targetClinicId = clinic_id ? Number(clinic_id) : (existingDoc ? existingDoc.clinic_id : null);

    // تحديث
    db.prepare(`
      UPDATE doctors
      SET full_name = COALESCE(?, full_name),
          specialty = ?,
          phone = ?,
          clinic_id = ?,
          clinic_name = ?,
          governorate = ?,
          address = ?,
          bio = ?,
          experience_years = ?,
          consultation_fee = ?,
          password_hash = COALESCE(?, password_hash),
          must_complete_profile = 0,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      req.body.full_name || null,
      specialty.trim(),
      cleanPhone,
      targetClinicId,
      clinicName || (existingDoc ? existingDoc.clinic_name : null),
      governorate || null,
      address || null,
      bio || null,
      Number(experience_years) || 0,
      finalFee,
      passwordHash,
      finalStatus,
      req.user.id
    );

    // ═══════════════════════════════════════════
    // ربط الطبيب بالعيادة (إذا اختار)
    // ═══════════════════════════════════════════
    if (targetClinicId) {
      try {
        db.prepare('INSERT OR IGNORE INTO doctor_clinics (doctor_id, clinic_id) VALUES (?, ?)')
          .run(req.user.id, targetClinicId);
        console.log("✅ [doctor_clinics] ربط الطبيب " + req.user.id + " بالعيادة " + targetClinicId);
      } catch (e) {
        console.error('⚠️ فشل ربط الطبيب بالعيادة:', e.message);
      }
    }

    // تسجيل أو تحديث طلب التسجيل دون إنشاء طلبات مكررة
    try {
      const currentDoc = db.prepare('SELECT status FROM doctors WHERE id = ?').get(req.user.id);
      const isAlreadyApproved = currentDoc && currentDoc.status === 'approved';

      const existingRR = db.prepare(
        "SELECT id FROM registration_requests WHERE type = 'doctor' AND user_id = ?"
      ).get(req.user.id);

      const rrData = JSON.stringify({
        full_name: req.body.full_name,
        specialty,
        clinic_name: clinicName,
        clinic_id: targetClinicId,
        method: 'complete_profile'
      });

      if (existingRR) {
        db.prepare(`
          UPDATE registration_requests
          SET data = ?,
              status = CASE WHEN ? = 1 THEN 'approved' ELSE status END
          WHERE id = ?
        `).run(rrData, isAlreadyApproved ? 1 : 0, existingRR.id);
      } else if (!isAlreadyApproved) {
        const rrRes = db.prepare(`
          INSERT INTO registration_requests (type, user_id, data, status)
          VALUES ('doctor', ?, ?, 'pending')
        `).run(req.user.id, rrData);

        // 🔔 إشعار الإدارة بطلب اعتماد طبيب جديد
        notifyAdmins(
          'طلب اعتماد طبيب جديد 🩺',
          `قام د. ${req.body.full_name || 'طبيب جديد'} (${specialty || 'طبيب'}) بإكمال بياناته وهو بانتظار الاعتماد.`,
          'doctor_registration_request',
          { request_id: rrRes.lastInsertRowid, doctor_id: req.user.id, type: 'doctor' }
        );
      }

      // 🔔 إشعار سكرتيرة العيادة إذا انضم لعيادة
      if (targetClinicId && !isAlreadyApproved) {
        try {
          const secretaries = db.prepare('SELECT id FROM secretaries WHERE clinic_id = ? AND is_active = 1').all(targetClinicId);
          for (const sec of secretaries) {
            createNotification(
              sec.id,
              'secretary',
              'طلب انضمام طبيب للعيادة 🩺',
              `طلب د. ${req.body.full_name || ''} (${specialty || ''}) الانضمام إلى العيادة وبانتظار اعتمادكم.`,
              'doctor_clinic_request',
              { doctor_id: req.user.id, clinic_id: targetClinicId }
            );
          }
        } catch (_) {}
      }
    } catch (e) {}

    const updatedUser = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.user.id);
    const userData = {
      id: updatedUser ? updatedUser.id : req.user.id,
      full_name: updatedUser ? updatedUser.full_name : req.body.full_name,
      phone: updatedUser ? updatedUser.phone : cleanPhone,
      specialty: updatedUser ? updatedUser.specialty : specialty,
      clinic_id: updatedUser ? updatedUser.clinic_id : targetClinicId,
      clinic_name: updatedUser ? updatedUser.clinic_name : clinicName,
      role: 'doctor',
      type: 'doctor',
      status: updatedUser ? updatedUser.status : finalStatus,
      must_complete_profile: 0,
      consultation_fee: updatedUser ? updatedUser.consultation_fee : finalFee
    };

    res.json({
      success: true,
      message: (updatedUser && updatedUser.status === 'approved') ? 'تم إكمال وتحديث بياناتك بنجاح 🩺' : 'تم إكمال بياناتك بنجاح. حسابك قيد المراجعة والاعتماد ⏳',
      status: userData.status,
      data: userData,
      user: userData
    });

  } catch (err) {
    console.error('❌ خطأ في complete-profile (doctor):', err);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
});

// ═══════════════════════════════════════════
// POST /secretaries/complete-profile
//    إكمال ملف السكرتيرة + إنشاء/الانضمام لعيادة
// ═══════════════════════════════════════════
router.post('/secretaries/complete-profile', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'secretary') {
      return res.status(403).json({
        success: false,
        message: 'هذا المسار للسكرتيرات فقط'
      });
    }

    const {
      phone,
      clinic_mode,       // 'create' أو 'join'
      clinic_name,       // للإنشاء
      clinic_id,         // للانضمام
      governorate,
      address,
      google_maps_url,
      notes,
      password          // ← كلمة المرور (اختياري)
    } = req.body;

    // التحقق من الإلزامي
    const cleanPhone = phone ? phone.replace(/^(\+?967)/, '') : '';
    if (!phone || !/^7[0-9]{8}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف غير صحيح'
      });
    }

    let mode = clinic_mode;
    if (!mode) {
      if (clinic_id) mode = 'join';
      else if (clinic_name) mode = 'create';
    }

    if (!mode || !['create', 'join'].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد: إنشاء عيادة جديدة أو الانضمام لعيادة'
      });
    }

    let finalClinicId = null;

    // ✅ فحص تكرار phone في جدول secretaries
    const secPhoneCheck = checkPhoneExists('secretaries', phone.replace(/^(\+?967)/, ''), req.user.id);
    if (secPhoneCheck.exists) {
      return res.status(400).json({
        success: false,
        message: buildDuplicateMessage('phone', secPhoneCheck.ownerType)
      });
    }

    // ✅ تحضير password_hash
    let secPasswordHash = null;
    if (password && String(password).trim().length >= 6) {
      secPasswordHash = bcrypt.hashSync(String(password), 12);
    }
    // ═══════════════════════════════════════════
    // إنشاء عيادة جديدة
    // ═══════════════════════════════════════════
    if (mode === 'create') {
      const currentSec = db.prepare('SELECT clinic_id FROM secretaries WHERE id = ?').get(req.user.id);
      if (currentSec && currentSec.clinic_id) {
        return res.status(400).json({
          success: false,
          message: 'أنتِ مسجلة بالفعل في عيادة حالية، لا يمكن إنشاء عيادة جديدة إلا عبر إدارة المنصة (الأدمن)'
        });
      }

      if (!clinic_name || !clinic_name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'اسم العيادة مطلوب'
        });
      }

      if (!governorate) {
        return res.status(400).json({
          success: false,
          message: 'المحافظة مطلوبة'
        });
      }

      if (google_maps_url && !isValidMapsUrl(google_maps_url)) {
        return res.status(400).json({
          success: false,
          message: 'رابط خريطة جوجل غير صحيح'
        });
      }

      // هل الاسم موجود؟
      const existingClinic = db.prepare(
        'SELECT id FROM clinics WHERE name = ?'
      ).get(clinic_name.trim());

      if (existingClinic) {
        return res.status(400).json({
          success: false,
          message: 'اسم العيادة موجود مسبقاً. جرّب الانضمام إليها.'
        });
      }

      const result = db.prepare(`
        INSERT INTO clinics (name, governorate, address, phone, notes, google_maps_url, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `).run(
        clinic_name.trim(),
        governorate,
        address || null,
        phone.replace(/^(\+?967)/, ''),
        notes || null,
        google_maps_url || null
      );

      finalClinicId = result.lastInsertRowid;
    }

    // ═══════════════════════════════════════════
    // الانضمام لعيادة موجودة
    // ═══════════════════════════════════════════
    else {
      if (!clinic_id) {
        return res.status(400).json({
          success: false,
          message: 'يجب اختيار العيادة'
        });
      }

      const clinic = db.prepare('SELECT id, is_active FROM clinics WHERE id = ?')
        .get(clinic_id);

      if (!clinic) {
        return res.status(404).json({
          success: false,
          message: 'العيادة غير موجودة'
        });
      }

      finalClinicId = clinic_id;
    }

    const existingSec = db.prepare('SELECT * FROM secretaries WHERE id = ?').get(req.user.id);
    if (existingSec && existingSec.clinic_id) {
      // 🔒 لا يمكن للسكرتيرة تغيير عيادتها إلا من قبل الأدمن
      finalClinicId = existingSec.clinic_id;

      // فحص بيانات العيادة الحالية:
      // يمكنها تعديل بروفايل العيادة مرة واحدة فقط، وبعد حفظ واستكمال كل المعلومات لا يمكنها تعديلها، فقط يمكنها إضافة المعلومات الناقصة
      const existingClinic = db.prepare('SELECT * FROM clinics WHERE id = ?').get(finalClinicId);
      if (existingClinic) {
        const updateClinicParts = [];
        const updateClinicParams = [];

        if (!existingClinic.governorate && governorate) {
          updateClinicParts.push('governorate = ?');
          updateClinicParams.push(governorate);
        }
        if (!existingClinic.address && address) {
          updateClinicParts.push('address = ?');
          updateClinicParams.push(address);
        }
        if (!existingClinic.google_maps_url && google_maps_url) {
          updateClinicParts.push('google_maps_url = ?');
          updateClinicParams.push(google_maps_url);
        }
        if (!existingClinic.notes && notes) {
          updateClinicParts.push('notes = ?');
          updateClinicParams.push(notes);
        }

        if (updateClinicParts.length > 0) {
          updateClinicParams.push(finalClinicId);
          db.prepare(`UPDATE clinics SET ${updateClinicParts.join(', ')} WHERE id = ?`).run(...updateClinicParams);
          console.log(`✅ [Clinic] تم إكمال الحقول الناقصة فقط للعيادة ${finalClinicId}`);
        }
      }
    }
    const finalSecStatus = (existingSec && existingSec.status === 'approved') ? 'approved' : 'pending';

    // تحديث السكرتيرة (الحقول المكتملة لا تُستبدل إلا إذا كانت ناقصة)
    db.prepare(`
      UPDATE secretaries
      SET full_name = COALESCE(?, full_name),
          phone = ?,
          clinic_id = ?,
          governorate = COALESCE(governorate, ?),
          address = COALESCE(address, ?),
          notes = COALESCE(notes, ?),
          password_hash = COALESCE(?, password_hash),
          must_change_password = 0,
          must_complete_profile = 0,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      req.body.full_name || null,
      phone.replace(/^(\+?967)/, ''),
      finalClinicId,
      governorate || null,
      address || null,
      notes || null,
      secPasswordHash,
      finalSecStatus,
      req.user.id
    );

    // ═══════════════════════════════════════════
    // 🆕 تسجيل طلب التسجيل (RR)
    // ═══════════════════════════════════════════
    try {
      // فحص وجود سجل سابق
      const existingRR = db.prepare(
        "SELECT id FROM registration_requests WHERE type = 'secretary' AND user_id = ?"
      ).get(req.user.id);

      const rrData = JSON.stringify({
        full_name: req.user.full_name || null,
        phone: phone.replace(/^(\+?967)/, ''),
        clinic_id: finalClinicId,
        method: 'complete_profile'
      });

      const currentSec = db.prepare('SELECT status FROM secretaries WHERE id = ?').get(req.user.id);
      const isAlreadyApproved = currentSec && currentSec.status === 'approved';

      if (existingRR) {
        // تحديث السجل الموجود مع الحفاظ على التوثيق إن كان موثقاً
        db.prepare(`
          UPDATE registration_requests
          SET status = CASE WHEN ? = 1 THEN 'approved' ELSE status END,
              data = ?
          WHERE id = ?
        `).run(isAlreadyApproved ? 1 : 0, rrData, existingRR.id);
        console.log(`✅ [RR] تحديث سجل السكرتيرة ${req.user.id} (RR.id=${existingRR.id})`);
      } else if (!isAlreadyApproved) {
        // إنشاء سجل جديد فقط إذا لم تكن السكرتيرة معتمدة مسبقاً
        const result = db.prepare(`
          INSERT INTO registration_requests (type, user_id, data, status)
          VALUES ('secretary', ?, ?, 'pending')
        `).run(req.user.id, rrData);
        console.log(`✅ [RR] إنشاء سجل للسكرتيرة ${req.user.id} (RR.id=${result.lastInsertRowid})`);

        // 🔔 إشعار الإدارة بطلب اعتماد سكرتيرة جديدة
        notifyAdmins(
          'طلب اعتماد سكرتيرة جديدة 📋',
          `قامت السكرتيرة ${req.user.full_name || req.body.full_name || 'جديدة'} بإكمال بياناتها وهي بانتظار الاعتماد.`,
          'secretary_registration_request',
          { request_id: result.lastInsertRowid, secretary_id: req.user.id, type: 'secretary' }
        );
      }
    } catch (rrErr) {
      console.error('❌ فشل إنشاء registration_request للسكرتيرة:', rrErr.message);
      // لا نوقف الطلب — الحفظ الأساسي نجح
    }

    const updatedSec = db.prepare('SELECT * FROM secretaries WHERE id = ?').get(req.user.id);
    const secData = {
      id: updatedSec ? updatedSec.id : req.user.id,
      full_name: updatedSec ? updatedSec.full_name : req.body.full_name,
      phone: updatedSec ? updatedSec.phone : cleanPhone,
      clinic_id: updatedSec ? updatedSec.clinic_id : finalClinicId,
      role: 'secretary',
      type: 'secretary',
      status: updatedSec ? updatedSec.status : 'pending',
      must_complete_profile: 0
    };

    res.json({
      success: true,
      message: (updatedSec && updatedSec.status === 'approved') ? 'تم إكمال وتحديث بياناتك بنجاح' : 'تم إكمال بياناتك بنجاح. حسابك قيد المراجعة والاعتماد ⏳',
      status: secData.status,
      clinic_id: finalClinicId,
      data: secData,
      user: secData
    });

  } catch (err) {
    console.error('❌ خطأ في complete-profile (secretary):', err);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم'
    });
  }
});

// ═══════════════════════════════════════════
// GET /clinics/list-for-join
//    قائمة العيادات للانضمام
// ═══════════════════════════════════════════
router.get('/clinics/list-for-join', (req, res) => {
  try {
    const clinics = db.prepare(`
      SELECT id, name, governorate, address, google_maps_url, is_active
      FROM clinics
      ORDER BY name
    `).all();

    res.json({
      success: true,
      data: clinics
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ═══════════════════════════════════════════
// POST /clinics/create
//    إنشاء عيادة جديدة عند إكمال الملف
// ═══════════════════════════════════════════
router.post('/clinics/create', (req, res) => {
  try {
    const { name, governorate, address, phone, google_maps_url } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'اسم العيادة مطلوب' });
    }
    const cleanName = name.trim();
    const existing = db.prepare('SELECT id, name, governorate, address, google_maps_url FROM clinics WHERE name = ?').get(cleanName);
    if (existing) {
      return res.json({ success: true, message: 'العيادة موجودة مسبقاً', data: existing });
    }
    const result = db.prepare(`
      INSERT INTO clinics (name, governorate, address, phone, google_maps_url, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(cleanName, governorate || 'صنعاء', address || null, phone || null, google_maps_url || null);

    const clinic = db.prepare('SELECT id, name, governorate, address, google_maps_url FROM clinics WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, message: 'تم إنشاء العيادة بنجاح', data: clinic });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
