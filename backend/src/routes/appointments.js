import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import express from 'express';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { generateBookingCode } from '../utils/helpers.js';
import rateLimit from 'express-rate-limit'; 
import { createNotification } from './notifications.js';
import { notifyQueueProgress } from './queue.js';
const router = express.Router();
// ═══════════════════════════════════════════
// Rate Limiter (Inline)
// ═══════════════════════════════════════════
const bookingLimiter = rateLimit({
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
// Helper: توقيت اليمن (UTC+3)
// ═══════════════════════════════════════════
function getYemenDateString() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Aden', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function getYemenMinutes() {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Aden', hour12: false, hour: '2-digit', minute: '2-digit' });
  const parts = formatter.format(new Date()).split(':');
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

// ═══════════════════════════════════════════
// Helper: تحويل "HH:mm" إلى دقائق
// ═══════════════════════════════════════════
function toMinutes(time) {
  if (!time) return 0;
  const clean = String(time)
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .trim();
  const parts = clean.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

// ═══════════════════════════════════════════
// Helper: توحيد صيغة التاريخ → YYYY-MM-DD
// ═══════════════════════════════════════════
function normalizeDate(d) {
  if (!d) return '';
  return String(d).split('T')[0].split(' ')[0];
}

// ═══════════════════════════════════════════
// Helper: فحص تعارض الحجز
// القواعد:
// 1. لا يمكن حجز أكثر من موعدين في نفس اليوم
// 2. يجب أن يكون الحجزان في عيادتين مختلفتين وفترتين مختلفتين
// 3. لا يمكن حجز نفس الطبيب مرتين في نفس اليوم
// 4. لا يمكن حجز مواعيد متداخلة زمنياً في نفس اليوم
// 5. يجب فاصل 30 دقيقة على الأقل بين أي موعدين
// ═══════════════════════════════════════════
function checkBookingConflicts(userId, doctorId, periodInfo) {
  const targetDate = normalizeDate(periodInfo.date);

  console.log(`🔍 [Conflict] user=${userId}, date='${periodInfo.date}' → '${targetDate}', doctor=${doctorId}`);

  if (!targetDate) {
    console.log('⚠️ [Conflict] no date — skipping');
    return { conflict: false };
  }

  const targetDoctor = db.prepare('SELECT id, full_name, clinic_id, clinic_name FROM doctors WHERE id = ?').get(doctorId);

  const existing = db.prepare(`
    SELECT a.id, a.booking_code, a.doctor_id, a.status,
           d.full_name as doctor_name,
           d.clinic_id as doctor_clinic_id,
           d.clinic_name as doctor_clinic_name,
           per.id as period_id,
           per.start_time as period_start_time,
           per.end_time as period_end_time,
             per.max_bookings as period_max_bookings,
             per.booked_count as period_booked_count,
           per.date as period_date
    FROM appointments a
    JOIN doctor_periods per ON a.period_id = per.id
    JOIN doctors d ON a.doctor_id = d.id
    WHERE a.user_id = ?
      AND DATE(per.date) = DATE(?)
      AND a.status NOT IN ('cancelled', 'no_show')
  `).all(userId, targetDate);

  console.log(`🔍 [Conflict] found ${existing.length} bookings on ${targetDate}`);
  existing.forEach(a => {
    console.log(`   → ${a.doctor_name} (${a.doctor_clinic_name}) | ${a.period_start_time}-${a.period_end_time} | ${a.status}`);
  });

  // القاعدة 1: حد أقصى موعدان في اليوم
  if (existing.length >= 2) {
    console.log(`⚠️ [Conflict] MAX 2/day reached: ${existing.length}`);
    return {
      conflict: true,
      message: 'لا يمكنك حجز أكثر من موعدين في اليوم الواحد. ألغِ أحد الحجوزات أولاً.'
    };
  }

  // القاعدة 2: الحجزان يجب أن يكونا في عيادتين مختلفتين
  if (targetDoctor && existing.length > 0) {
    const sameClinic = existing.find(a =>
      (targetDoctor.clinic_id && a.doctor_clinic_id && targetDoctor.clinic_id === a.doctor_clinic_id) ||
      (targetDoctor.clinic_name && a.doctor_clinic_name && targetDoctor.clinic_name.trim() === a.doctor_clinic_name.trim())
    );
    if (sameClinic) {
      console.log(`⚠️ [Conflict] Same clinic: ${targetDoctor.clinic_name}`);
      return {
        conflict: true,
        message: `لا يمكن حجز موعدين في نفس العيادة (${targetDoctor.clinic_name || 'العيادة'}) في نفس اليوم. يُشترط أن يكون الحجز الثاني في عيادة مختلفة وفترة مختلفة.`
      };
    }
  }

  // القاعدة 3: لا يمكن الحجز في نفس الفترة
  const samePeriod = existing.find(a => a.period_id === periodInfo.id);
  if (samePeriod) {
    console.log(`⚠️ [Conflict] Same period: ${periodInfo.id}`);
    return {
      conflict: true,
      message: 'لا يمكن حجز نفس الفترة الزمنية مرتين.'
    };
  }

  // القاعدة 4: نفس الطبيب في نفس اليوم
  const sameDoctor = existing.find(a => a.doctor_id === doctorId);
  if (sameDoctor) {
    console.log(`⚠️ [Conflict] Same doctor: ${sameDoctor.doctor_name}`);
    return {
      conflict: true,
      message: `لديك حجز نشط مع د. ${sameDoctor.doctor_name} في نفس اليوم. ألغِه أولاً أو اختر يوماً آخر.`
    };
  }

  // القاعدة 5: تعارض زمني + فاصل 30 دقيقة على الأقل
  const MIN_GAP = 30;
  const newStart = toMinutes(periodInfo.start_time);
  const newEnd = toMinutes(periodInfo.end_time);

  console.log(`🔍 [Conflict] NEW: ${periodInfo.start_time}-${periodInfo.end_time} (${newStart}-${newEnd})`);

  for (const a of existing) {
    const exStart = toMinutes(a.period_start_time);
    const exEnd = toMinutes(a.period_end_time);

    console.log(`🔍 [Conflict] EXISTING: ${a.period_start_time}-${a.period_end_time} (${exStart}-${exEnd})`);

    // فحص التداخل المباشر
    const hasOverlap = newStart < exEnd && exStart < newEnd;
    if (hasOverlap) {
      console.log(`⚠️ [Conflict] OVERLAP with ${a.doctor_name}`);
      return {
        conflict: true,
        message: `يوجد تداخل زمني مع حجزك في عيادة (${a.doctor_clinic_name || ''}) عند د. ${a.doctor_name} (${a.period_start_time} - ${a.period_end_time}).`
      };
    }

    // فحص الفاصل 30 دقيقة
    let gap = 0;
    if (newEnd <= exStart) {
      gap = exStart - newEnd;
    } else if (exEnd <= newStart) {
      gap = newStart - exEnd;
    }

    console.log(`🔍 [Conflict] Gap: ${gap} minutes`);

    if (gap < MIN_GAP) {
      console.log(`⚠️ [Conflict] Gap < ${MIN_GAP}: ${gap}`);
      return {
        conflict: true,
        message: `يجب أن يكون الفاصل الزمني بين الموعدين 30 دقيقة على الأقل لتتمكن من الوصول للعيادة الأخرى. حجزك الآخر في (${a.doctor_clinic_name || ''}) ينتهي/يبدأ في (${a.period_start_time} - ${a.period_end_time}).`
      };
    }
  }

  console.log(`✅ [Conflict] No conflict — booking allowed`);
  return { conflict: false };
}

// ═══════════════════════════════════════════
// Helper: إكمال المواعيد المنتهية تلقائياً وإشعار المريض بالتقييم
// ═══════════════════════════════════════════
export function autoCompleteExpiredAppointments() {
  try {
    const todayYemen = getYemenDateString();
    const nowMinutesYemen = getYemenMinutes();

    const activeAppts = db.prepare(`
      SELECT a.id, a.user_id, a.doctor_id, a.booking_code, a.status,
             d.full_name as doctor_name,
             per.date as period_date, per.start_time as period_start_time, per.end_time as period_end_time,
             s.date as slot_date, s.start_time as slot_time, s.end_time as slot_end_time
      FROM appointments a
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN doctor_periods per ON a.period_id = per.id
      LEFT JOIN slots s ON a.slot_id = s.id
      WHERE a.status IN ('confirmed', 'pending')
    `).all();

    const toComplete = [];

    for (const appt of activeAppts) {
      const apptDate = normalizeDate(appt.period_date || appt.slot_date);
      if (!apptDate) continue;

      let isExpired = false;
      if (apptDate < todayYemen) {
        isExpired = true;
      } else if (apptDate === todayYemen) {
        const rawEnd = appt.period_end_time || appt.slot_end_time;
        const rawStart = appt.period_start_time || appt.slot_time;
        const endMin = toMinutes(rawEnd) || (toMinutes(rawStart) + 60);
        if (endMin > 0 && endMin <= nowMinutesYemen) {
          isExpired = true;
        }
      }

      if (isExpired) {
        toComplete.push(appt);
      }
    }

    if (toComplete.length > 0) {
      console.log(`⏳ [AutoComplete/AutoCancel] معالجة ${toComplete.length} موعد منتهي الصلاحية...`);
      const completeStmt = db.prepare("UPDATE appointments SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?");
      const noShowCancelStmt = db.prepare("UPDATE appointments SET status = 'no_show', attendance_status = 'no_show', updated_at = CURRENT_TIMESTAMP WHERE id = ?");

      for (const appt of toComplete) {
        const isUnverifiedNoShow = (!appt.location_verified_at || appt.location_verified_at === null) &&
                                   (appt.attendance_status === 'pending' || !appt.attendance_status);

        if (isUnverifiedNoShow) {
          noShowCancelStmt.run(appt.id);
          try {
            createNotification(
              appt.user_id,
              'patient',
              'إلغاء الحجز لعدم الحضور ⚠️',
              'تم إلغاء حجزك بسبب عدم الحضور في الوقت المحدد. يرجى الحجز في موعد آخر.',
              'appointment_cancelled_noshow',
              { appointment_id: appt.id, booking_code: appt.booking_code }
            );
          } catch (_) {}
          continue;
        }

        completeStmt.run(appt.id);

        try {
          createNotification(
            appt.user_id,
            'patient',
            'اكتمل موعدك الطبي 🌟',
            `نرجو أن تكون زيارتك للدكتور ${appt.doctor_name || 'الطبيب'} موفقة. يمكنك الآن تقييم تجربتك الطبية لمساعدتنا في تحسين الخدمة (أو تجاهل هذا الإشعار).`,
            'appointment_completed',
            { appointment_id: appt.id, doctor_id: appt.doctor_id }
          );
        } catch (notifErr) {
          console.warn('⚠️ خطأ في إرسال إشعار إكمال الموعد:', notifErr.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ خطأ في autoCompleteExpiredAppointments:', err.message);
  }
}

// تشغيل الفحص الدوري كل دقيقة في الخلفية
setInterval(autoCompleteExpiredAppointments, 60 * 1000);

// ==================== قائمة الحجوزات (للأدمن) ====================
router.get('/', authenticate, (req, res) => {
  try {
    autoCompleteExpiredAppointments();
    const { status, search } = req.query;

    let query = `
      SELECT a.*,
             COALESCE(a.patient_name, p.full_name) as patient_name,
               COALESCE(a.patient_relationship, 'صاحب الحساب') as patient_relationship,
               COALESCE(a.patient_age, p.age) as patient_age,
               COALESCE(a.patient_gender, p.gender) as patient_gender,
               p.full_name as account_holder_name,
             p.phone as patient_phone,
             p.email as patient_email,
             p.picture as patient_picture,
             d.full_name as doctor_name,
             d.specialty as doctor_specialty,
             d.clinic_name as clinic_name,
             c.address as clinic_address,
             c.governorate as clinic_governorate,
             c.google_maps_url as clinic_google_maps_url,
             d.consultation_fee as doctor_fee,
             s.date as slot_date,
             s.start_time as slot_time,
             s.end_time as slot_end_time,
             per.date as period_date,
             per.start_time as period_start_time,
             per.end_time as period_end_time
      FROM appointments a
      LEFT JOIN patients p ON a.user_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN clinics c ON d.clinic_name = c.name
      LEFT JOIN slots s ON a.slot_id = s.id
      LEFT JOIN doctor_periods per ON a.period_id = per.id
      WHERE 1=1
    `;
    const params = [];

    // ═══════════════════════════════════════════
    // 🔒 فلترة حسب الدور (منع تسرب البيانات)
    // ═══════════════════════════════════════════
    const userRole = req.user.role || req.user.type;
    if (userRole === 'doctor') {
      // الطبيب يرى حجوزاته فقط
      query += ' AND a.doctor_id = ?';
      params.push(req.user.id);
    } else if (userRole === 'secretary') {
      // السكرتيرة ترى حجوزات أطباء عيادتها أو الأطباء المربوطين بها
      const secretary = db.prepare(
        'SELECT id, clinic_id FROM secretaries WHERE id = ?'
      ).get(req.user.id);

      if (secretary) {
        if (secretary.clinic_id) {
          query += ` AND (
            a.doctor_id IN (
              SELECT d2.id FROM doctors d2
              LEFT JOIN doctor_clinics dc ON d2.id = dc.doctor_id
              LEFT JOIN secretary_doctors sd ON d2.id = sd.doctor_id
              WHERE dc.clinic_id = ?
                 OR d2.clinic_id = ?
                 OR sd.secretary_id = ?
                 OR d2.clinic_name = (SELECT name FROM clinics WHERE id = ?)
            )
            OR a.doctor_id IN (
              SELECT doctor_id FROM secretary_doctors WHERE secretary_id = ?
            )
          )`;
          params.push(
            secretary.clinic_id,
            secretary.clinic_id,
            req.user.id,
            secretary.clinic_id,
            req.user.id
          );
        } else {
          // سكرتيرة بدون clinic_id صريح: ترى أطباءها المسندين إليها عبر secretary_doctors
          query += ` AND a.doctor_id IN (
            SELECT doctor_id FROM secretary_doctors WHERE secretary_id = ?
          )`;
          params.push(req.user.id);
        }
      } else {
        query += ' AND 1=0';
      }
    }
    // أدمن: لا فلترة (يرى الكل)

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (p.full_name LIKE ? OR a.booking_code LIKE ? OR p.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY a.created_at DESC';

    const appointments = db.prepare(query).all(...params);
    res.json({ success: true, data: appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== حجوزات المريض الحالي ====================
router.get('/my', authenticate, (req, res) => {
  try {
    autoCompleteExpiredAppointments();
    if (req.user.type !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'هذا المسار للمرضى فقط',
      });
    }

    const appointments = db
      .prepare(`
        SELECT a.*,
               d.full_name as doctor_name,
               d.specialty as doctor_specialty,
               d.avatar as doctor_avatar,
               d.consultation_fee as doctor_fee,
               d.clinic_name as clinic_name,
               c.address as clinic_address,
               c.governorate as clinic_governorate,
               c.google_maps_url as clinic_google_maps_url,
               s.date as slot_date,
               s.start_time as slot_time,
               s.end_time as slot_end_time,
               per.date as period_date,
               per.start_time as period_start_time,
               per.end_time as period_end_time,
               (SELECT COUNT(*) FROM appointment_reviews WHERE appointment_id = a.id) as is_reviewed,
               (SELECT id FROM appointment_reviews WHERE appointment_id = a.id) as review_id
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN clinics c ON d.clinic_name = c.name
        LEFT JOIN slots s ON a.slot_id = s.id
        LEFT JOIN doctor_periods per ON a.period_id = per.id
        WHERE a.user_id = ?
        ORDER BY a.created_at DESC
      `)
      .all(req.user.id);

    res.json({ success: true, data: appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== حجز واحد ====================
router.get('/:id', authenticate, (req, res) => {
  try {
    const appointment = db
      .prepare(`
        SELECT a.*,
               COALESCE(a.patient_name, p.full_name) as patient_name,
               COALESCE(a.patient_relationship, 'صاحب الحساب') as patient_relationship,
               COALESCE(a.patient_age, p.age) as patient_age,
               COALESCE(a.patient_gender, p.gender) as patient_gender,
               p.full_name as account_holder_name,
               p.phone as patient_phone,
               p.email as patient_email,
               p.picture as patient_picture,
               d.full_name as doctor_name,
               d.specialty as doctor_specialty,
               d.clinic_name as clinic_name,
               c.address as clinic_address,
               c.governorate as clinic_governorate,
               c.google_maps_url as clinic_google_maps_url,
               d.consultation_fee as doctor_fee,
               s.date as slot_date,
               s.start_time as slot_time,
               s.end_time as slot_end_time,
               per.date as period_date,
               per.start_time as period_start_time,
               per.end_time as period_end_time
        FROM appointments a
        LEFT JOIN patients p ON a.user_id = p.id
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN clinics c ON d.clinic_name = c.name
        LEFT JOIN slots s ON a.slot_id = s.id
        LEFT JOIN doctor_periods per ON a.period_id = per.id
        WHERE a.id = ?
      `)
      .get(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    // 🛡️ IDOR Protection: Patient can only view their own booking; Doctor can only view bookings for their clinic/doctor_id
    const userRole = req.user.role || req.user.type;
    const userId = req.user.id;
    if (userRole === 'patient' && appointment.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بعرض هذا الحجز' });
    }
    if (userRole === 'doctor' && appointment.doctor_id !== userId) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بعرض حجز لطبيب آخر' });
    }

    res.json({ success: true, data: appointment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إنشاء حجز جديد ====================

// ═══════════════════════════════════════════════════════════════════
// 🔒 FIX 1: ATOMIC BOOKING TRANSACTION (ACID Compliant + Concurrency Safe)
// ═══════════════════════════════════════════════════════════════════
const executeBookingTransaction = db.transaction((data) => {
  // 1. إذا كان الدفع عبر المحفظة: التحقق والخصم الذري الصارم
  if (data.payment_method === 'wallet') {
    const walletUpdate = db.prepare(`
      UPDATE patients
      SET balance = balance - ?
      WHERE id = ? AND balance >= ?
    `).run(data.appointmentFee, data.userId, data.appointmentFee);

    if (walletUpdate.changes === 0) {
      throw new Error('INSUFFICIENT_FUNDS');
    }
  }

  // 2. فحص وتحديث الفترة أو السلوت ذرياً لمنع التسابق والحجز الزائد
  if (data.period_id) {
    const periodUpdate = db.prepare(`
      UPDATE doctor_periods
      SET booked_count = booked_count + 1
      WHERE id = ?
        AND booked_count < max_bookings
        AND is_cancelled = 0
        AND (is_stopped = 0 OR is_stopped IS NULL)
    `).run(data.period_id);

    if (periodUpdate.changes === 0) {
      throw new Error('SLOT_FULL');
    }
  } else if (data.slot_id) {
    const slotUpdate = db.prepare(`
      UPDATE slots
      SET is_booked = 1
      WHERE id = ? AND is_booked = 0 AND is_closed = 0
    `).run(data.slot_id);

    if (slotUpdate.changes === 0) {
      throw new Error('SLOT_BOOKED');
    }
  }

  // 3. إدراج الحجز
  const insertAppointment = db.prepare(`
    INSERT INTO appointments
    (booking_code, user_id, doctor_id, slot_id, period_id, status, payment_method, payment_status, reason, fee, queue_number, is_golden, transaction_id, attendance_status, sequential_booking_number, family_member_id, patient_name, patient_relationship, patient_age, patient_gender)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
  `).run(
    data.bookingCode,
    data.userId,
    data.doctorId,
    data.slot_id || null,
    data.period_id || null,
    data.payment_method || 'cash',
    data.payStatus,
    data.reason || null,
    data.appointmentFee,
    data.assignedQueueNumber,
    data.isGolden,
    data.transactionId ? String(data.transactionId).trim() : null,
    data.sequentialNumber,
    data.familyMemberId || null,
    data.patientName || null,
    data.patientRelationship || 'صاحب الحساب',
    data.patientAge || null,
    data.patientGender || null
  );

  const appointmentId = insertAppointment.lastInsertRowid;

  // 4. تسجيل المدفوعات والمعاملات المالية
  if (data.payment_method === 'online') {
    db.prepare(`
      INSERT INTO payments (appointment_id, amount, method, status, transaction_id)
      VALUES (?, ?, 'online', 'pending', ?)
    `).run(appointmentId, data.appointmentFee, data.transactionId ? String(data.transactionId).trim() : null);
  } else if (data.payment_method === 'wallet') {
    db.prepare(`
      INSERT INTO wallet_transactions (patient_id, amount, type, description, appointment_id, created_by)
      VALUES (?, ?, 'payment', ?, ?, 'patient')
    `).run(data.userId, -data.appointmentFee, `دفع رسوم الحجز #${data.bookingCode}`, appointmentId);

    db.prepare(`
      INSERT INTO payments (appointment_id, amount, method, status)
      VALUES (?, ?, 'wallet', 'completed')
    `).run(appointmentId, data.appointmentFee);
  }

  return appointmentId;
});

router.post('/', authenticate, bookingLimiter, (req, res) => {
  try {
    if (req.user.type !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'هذا الإجراء للمرضى فقط',
      });
    }

    // 🔒 إلزام إكمال الملف الشخصي قبل الحجز (الاسم ثلاثي/رباعي، الهاتف، العمر، المحافظة)
    const currentPatient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.user.id);
    const pWords = (currentPatient?.full_name || '').trim().split(/\s+/).filter(Boolean);
    if (!currentPatient || pWords.length < 3 || !currentPatient.phone || !currentPatient.age || !currentPatient.governorate) {
      return res.status(400).json({
        success: false,
        needs_profile_completion: true,
        message: 'يرجى إكمال بيانات ملفك الشخصي (الاسم الثلاثي، العمر، المحافظة) قبل حجز الموعد'
      });
    }

    if (currentPatient.status === 'pending') {
      return res.status(403).json({
        success: false,
        pending_review: true,
        message: 'ملفك الشخصي قيد المراجعة والاعتماد حالياً من قبل إدارة المنصة. يمكنك الحجز فور اعتماد الحساب.'
      });
    }

    const { period_id, slot_id, doctor_id, reason, payment_method, family_member_id } = req.body;

    let familyMember = null;
    if (family_member_id) {
      familyMember = db.prepare('SELECT * FROM family_members WHERE id = ? AND user_id = ?').get(family_member_id, req.user.id);
      if (!familyMember) {
        return res.status(404).json({
          success: false,
          message: 'فرد العائلة المحدد غير موجود'
        });
      }
    }

    if (!period_id && !slot_id) {
      return res.status(400).json({
        success: false,
        message: 'period_id أو slot_id مطلوب',
      });
    }

    if (!doctor_id) {
      return res.status(400).json({
        success: false,
        message: 'doctor_id مطلوب',
      });
    }

    const doctor = db
      .prepare('SELECT * FROM doctors WHERE id = ? AND is_deleted = 0 AND is_active = 1')
      .get(doctor_id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'الطبيب غير موجود',
      });
    }

    let periodInfo = null;
    let slotInfo = null;

    if (period_id) {
      periodInfo = db
        .prepare('SELECT * FROM doctor_periods WHERE id = ? AND doctor_id = ?')
        .get(period_id, doctor_id);

      if (!periodInfo) {
        return res.status(404).json({
          success: false,
          message: 'الفترة غير موجودة',
        });
      }

      if (periodInfo.is_cancelled === 1) {
        return res.status(400).json({
          success: false,
          message: 'هذه الفترة ملغاة',
        });
      }

      if (periodInfo.booked_count >= periodInfo.max_bookings) {
        return res.status(409).json({
          success: false,
          code: 'SLOT_FULL',
          message: 'الفترة مكتملة — اختر فترة أخرى',
        });
      }

      // فحص: منع الحجز لتاريخ سابق أو وقت منقضٍ اليوم
      const yemenToday = getYemenDateString();
      const yemenMinutes = getYemenMinutes();
      const targetDate = normalizeDate(periodInfo.date);

      if (targetDate < yemenToday) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن حجز موعد لتاريخ سابق. يرجى اختيار تاريخ قادم.',
        });
      }

      if (targetDate === yemenToday && toMinutes(periodInfo.end_time) <= yemenMinutes) {
        return res.status(400).json({
          success: false,
          message: 'عذراً، انتهى وقت هذه الفترة اليوم. يرجى اختيار موعد قادم.',
        });
      }

      // فحص 1: حجز مكرر لنفس الفترة
      const existingSamePeriod = db
        .prepare(`
          SELECT * FROM appointments
          WHERE user_id = ? AND period_id = ? 
            AND status NOT IN ('cancelled', 'no_show')
        `)
        .get(req.user.id, period_id);

      if (existingSamePeriod) {
        console.log(`⚠️ [Booking] Duplicate period: user=${req.user.id}, period=${period_id}`);
        return res.status(400).json({
          success: false,
          message: 'لديك حجز مكرر لنفس الفترة. لا يمكن الحجز مرتين في نفس الموعد.',
        });
      }

      // فحص 2: عدد حجوزات اليوم (دفاع مزدوج)
      const todayCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM appointments a
        JOIN doctor_periods per ON a.period_id = per.id
        WHERE a.user_id = ?
          AND DATE(per.date) = DATE(?)
          AND a.status NOT IN ('cancelled', 'no_show')
      `).get(req.user.id, normalizeDate(periodInfo.date));

      console.log(`🔍 [Booking] Today count for user=${req.user.id}: ${todayCount.count}`);

      if (todayCount.count >= 2) {
        console.log(`⚠️ [Booking] MAX 2/day reached: ${todayCount.count}`);
        return res.status(400).json({
          success: false,
          message: 'لا يمكنك حجز أكثر من موعدين في اليوم الواحد. ألغِ أحد الحجوزات أولاً.',
        });
      }

      // فحص 3: تعارضات زمنية + نفس الطبيب
      const conflictCheck = checkBookingConflicts(req.user.id, doctor_id, periodInfo);
      if (conflictCheck.conflict) {
        return res.status(409).json({
          success: false,
          message: conflictCheck.message,
        });
      }

    } else {
      slotInfo = db
        .prepare('SELECT * FROM slots WHERE id = ? AND doctor_id = ?')
        .get(slot_id, doctor_id);

      if (!slotInfo) {
        return res.status(404).json({
          success: false,
          message: 'الموعد غير موجود',
        });
      }

      if (slotInfo.is_booked === 1) {
        return res.status(400).json({
          success: false,
          message: 'الموعد محجوز بالفعل',
        });
      }

      if (slotInfo.is_closed === 1) {
        return res.status(400).json({
          success: false,
          message: 'الموعد مغلق',
        });
      }

      // فحص: منع الحجز لتاريخ سابق أو وقت منقضٍ اليوم
      const yemenToday = getYemenDateString();
      const yemenMinutes = getYemenMinutes();
      const targetDate = normalizeDate(slotInfo.date);

      if (targetDate < yemenToday) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن حجز موعد لتاريخ سابق. يرجى اختيار تاريخ قادم.',
        });
      }

      if (targetDate === yemenToday && toMinutes(slotInfo.start_time) <= yemenMinutes) {
        return res.status(400).json({
          success: false,
          message: 'عذراً، انتهى وقت هذا الموعد اليوم. يرجى اختيار موعد قادم.',
        });
      }
    }

    const { transaction_id } = req.body;
    const bookingCode = generateBookingCode();
    let originalFee = doctor.consultation_fee || 0;
    let appointmentFee = originalFee;
    let appliedDiscountPercent = 0;
    let activeOfferTitle = null;

    // 🏷️ فحص العروض الطبية النشطة للطبيب أو العيادة بالكامل وتطبيق نسبة الخصم تلقائياً
    try {
      const activeOffer = db.prepare(`
        SELECT id, title, discount_percent
        FROM offers
        WHERE (doctor_id = ? OR (doctor_id IS NULL AND (clinic_id = ? OR clinic_id = (SELECT clinic_id FROM doctors WHERE id = ?))))
          AND is_active = 1
          AND (status IS NULL OR status = 'approved')
          AND (end_date IS NULL OR end_date >= datetime('now'))
        ORDER BY (CASE WHEN doctor_id = ? THEN 1 ELSE 0 END) DESC, discount_percent DESC, created_at DESC
        LIMIT 1
      `).get(doctor_id, doctor.clinic_id || -1, doctor_id, doctor_id);

      if (activeOffer && activeOffer.discount_percent > 0) {
        appliedDiscountPercent = activeOffer.discount_percent;
        activeOfferTitle = activeOffer.title;
        appointmentFee = Math.max(0, Math.round(originalFee * (1 - appliedDiscountPercent / 100)));
      }
    } catch (offerErr) {
      console.warn('⚠️ خطأ في فحص خصم العرض الطبي:', offerErr.message);
    }

    // 💰 خصم 5% للدفع بالتحويل المسبق أو المحفظة مع أولوية المقعد الذهبي
    if (payment_method === 'online' || payment_method === 'wallet') {
      appointmentFee = Math.max(0, Math.round(appointmentFee * 0.95));
    }

    // 🔒 فحص رصيد المحفظة إذا كانت طريقة الدفع هي المحفظة
    if (payment_method === 'wallet') {
      const patientUser = db.prepare('SELECT balance FROM patients WHERE id = ?').get(req.user.id);
      const currentBal = patientUser?.balance || 0;
      if (currentBal < appointmentFee) {
        return res.status(400).json({
          success: false,
          insufficient_balance: true,
          current_balance: currentBal,
          required_fee: appointmentFee,
          message: `عذراً، رصيدك في المحفظة (${currentBal.toLocaleString()} ر.ي) أقل من سعر الحجز (${appointmentFee.toLocaleString()} ر.ي). يرجى شحن محفظتك أو اختيار طريقة دفع أخرى.`
        });
      }
    }

    // ⚡ حساب رقم الدور ونوع الحجز (حجز ذهبي ذو أولوية أم حجز عادي)
    let goldenSeatsCount = 3;
    try {
      const setting = db.prepare("SELECT value FROM system_settings WHERE key = 'golden_seats_count'").get();
      if (setting && setting.value) goldenSeatsCount = parseInt(setting.value, 10) || 3;
    } catch (e) {}

    let assignedQueueNumber = 1;
    let isGolden = 0;

    if (period_id) {
      const existingInPeriod = db.prepare(`
        SELECT queue_number, is_golden, payment_status, payment_method
        FROM appointments
        WHERE period_id = ? AND status NOT IN ('cancelled', 'no_show')
      `).all(period_id);

      const takenNumbers = new Set(existingInPeriod.map(a => a.queue_number));

      // إذا تم اختيار الدفع الإلكتروني أو المحفظة: محاولة منحه مقعد ذهبي أولي
      const isOnlineWithTx = payment_method === 'online' && transaction_id && String(transaction_id).trim().length > 0;
      const isWalletPay = payment_method === 'wallet';

      if (isOnlineWithTx || isWalletPay) {
        // فحص رصيد المحفظة إذا كانت طريقة الدفع هي المحفظة
        if (isWalletPay) {
          const patientUser = db.prepare('SELECT balance FROM patients WHERE id = ?').get(req.user.id);
          const currentBal = patientUser?.balance || 0;
          if (currentBal < appointmentFee) {
            return res.status(400).json({
              success: false,
              message: `رصيد محفظتك غير كافٍ (${currentBal} ر.ي). تكلفة الحجز: ${appointmentFee} ر.ي.`
            });
          }
        }

        // البحث عن أول مقعد ذهبي متاح (من 1 إلى goldenSeatsCount)
        for (let i = 1; i <= goldenSeatsCount; i++) {
          if (!takenNumbers.has(i)) {
            assignedQueueNumber = i;
            isGolden = 1;
            break;
          }
        }
        // في حال اكتمال المقاعد الذهبية، يحصل على أول رقم متسلسل متاح بعدها
        if (!isGolden) {
          let num = goldenSeatsCount + 1;
          while (takenNumbers.has(num)) num++;
          assignedQueueNumber = num;
          isGolden = 0;
        }
      } else {
        // حجز عادي (نقداً عند الحضور): يبدأ الترتيب من بعد المقاعد الذهبية إن وُجدت مساحة
        const maxCap = periodInfo.max_bookings || 20;
        let num = (goldenSeatsCount < maxCap) ? goldenSeatsCount + 1 : 1;
        while (takenNumbers.has(num) && num <= maxCap) num++;
        // إذا اكتملت المقاعد العادية وما زالت هناك مقاعد شاغرة ضمن السعة
        if (num > maxCap) {
          for (let i = 1; i <= maxCap; i++) {
            if (!takenNumbers.has(i)) {
              num = i;
              break;
            }
          }
        }
        assignedQueueNumber = num;
        isGolden = 0;
      }

      const maxAllowed = periodInfo.max_bookings || 20;
      if (assignedQueueNumber > maxAllowed) {
        return res.status(400).json({
          success: false,
          message: 'عذراً، اكتملت جميع المقاعد المتاحة لهذه الفترة اليوم.'
        });
      }
    }

    let payStatus = 'unpaid';
    if (payment_method === 'online' && transaction_id) {
      payStatus = 'pending_review';
    } else if (payment_method === 'wallet') {
      payStatus = 'paid';
    }

    // 🔢 حساب الرقم التسلسلي للحجز في نفس العيادة خلال العام الحالي (Sequential Booking Number)
    let sequentialNumber = 1;
    try {
      const targetClinicId = targetDoctor.clinic_id;
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01 00:00:00`;
      const yearEnd = `${currentYear}-12-31 23:59:59`;

      let countRow;
      if (targetClinicId) {
        countRow = db.prepare(`
          SELECT COUNT(*) as cnt
          FROM appointments a
          JOIN doctors d ON a.doctor_id = d.id
          WHERE (d.clinic_id = ? OR d.clinic_name = ?)
            AND a.created_at BETWEEN ? AND ?
        `).get(targetClinicId, targetDoctor.clinic_name || '', yearStart, yearEnd);
      } else {
        countRow = db.prepare(`
          SELECT COUNT(*) as cnt
          FROM appointments a
          JOIN doctors d ON a.doctor_id = d.id
          WHERE d.clinic_name = ?
            AND a.created_at BETWEEN ? AND ?
        `).get(targetDoctor.clinic_name || '', yearStart, yearEnd);
      }

      sequentialNumber = (countRow?.cnt || 0) + 1;
    } catch (seqErr) {
      console.warn('⚠️ خطأ في حساب الرقم التسلسلي للحجز:', seqErr.message);
      sequentialNumber = 1;
    }

    let appointmentId;
    try {
      appointmentId = executeBookingTransaction({
        userId: req.user.id,
        doctorId: doctor_id,
        period_id: period_id || null,
        slot_id: slot_id || null,
        payment_method: payment_method || 'cash',
        payStatus,
        reason: reason || null,
        appointmentFee,
        assignedQueueNumber,
        isGolden,
        transactionId: transaction_id,
        sequentialNumber,
        bookingCode,
        familyMemberId: familyMember ? familyMember.id : null,
        patientName: familyMember ? familyMember.name : currentPatient.full_name,
        patientRelationship: familyMember ? familyMember.relationship : 'صاحب الحساب',
        patientAge: familyMember ? (familyMember.age || null) : (currentPatient.age || null),
        patientGender: familyMember ? familyMember.gender : (currentPatient.gender || 'male')
      });
    } catch (txErr) {
      if (txErr.message === 'SLOT_FULL' || txErr.message === 'SLOT_BOOKED') {
        return res.status(409).json({
          success: false,
          code: 'SLOT_FULL',
          message: 'عذراً، هذا الموعد أو الفترة محجوزة بالكامل. يرجى اختيار موعد آخر.'
        });
      }
      if (txErr.message === 'INSUFFICIENT_FUNDS') {
        return res.status(400).json({
          success: false,
          code: 'INSUFFICIENT_FUNDS',
          insufficient_balance: true,
          message: 'رصيد المحفظة غير كافٍ لإتمام الحجز. يرجى شحن رصيدك أو اختيار طريقة دفع أخرى.'
        });
      }
      console.error('❌ [Booking Transaction Error]:', txErr);
      return res.status(500).json({
        success: false,
        message: 'فشل إتمام الحجز، وتم التراجع عن كافة العمليات بأمان.'
      });
    }


    console.log(`✅ [Booking] Created #${bookingCode} for user=${req.user.id}, period=${period_id}`);

    const appointment = db
      .prepare(`
        SELECT a.*,
               COALESCE(a.patient_name, p.full_name) as patient_name,
               COALESCE(a.patient_relationship, 'صاحب الحساب') as patient_relationship,
               COALESCE(a.patient_age, p.age) as patient_age,
               COALESCE(a.patient_gender, p.gender) as patient_gender,
               p.full_name as account_holder_name,
               p.phone as patient_phone,
               d.full_name as doctor_name,
               d.specialty as doctor_specialty,
               d.clinic_id as doctor_clinic_id,
               d.clinic_name as clinic_name,
               c.id as clinic_id,
               c.name as resolved_clinic_name,
               c.address as clinic_address,
               c.governorate as clinic_governorate,
               c.google_maps_url as clinic_google_maps_url,
               s.date as slot_date,
               s.start_time as slot_time,
               s.end_time as slot_end_time,
               per.date as period_date,
               per.start_time as period_start_time,
               per.end_time as period_end_time
        FROM appointments a
        LEFT JOIN patients p ON a.user_id = p.id
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN clinics c ON (d.clinic_id = c.id OR d.clinic_name = c.name)
      LEFT JOIN doctor_periods per ON a.period_id = per.id
      LEFT JOIN slots s ON a.slot_id = s.id
        LEFT JOIN slots s ON a.slot_id = s.id
        LEFT JOIN doctor_periods per ON a.period_id = per.id
        WHERE a.id = ?
      `)
      .get(appointmentId);

    try {
      const patientDisplayName = appointment?.patient_name || req.user.full_name || 'مريض';
      const clinicDisplayName = appointment?.resolved_clinic_name || appointment?.clinic_name || 'العيادة';

      // إشعار المريض
      createNotification(
        req.user.id,
        'patient',
        `طلب حجز جديد #${bookingCode} ⏳`,
        `حجزك قيد المراجعة من قبل السكرتارية مع د. ${appointment?.doctor_name || 'الطبيب'} في ${clinicDisplayName}. الموعد: ${appointment?.period_date || appointment?.slot_date || ''} الساعة ${appointment?.period_start_time || appointment?.slot_time || ''}. رقم الدور: #${appointment?.queue_number || 1}.`,
        'appointment_reminder',
        { appointment_id: appointment?.id, booking_code: bookingCode }
      );

      // إشعار الطبيب
      if (appointment?.doctor_id) {
        createNotification(
          appointment.doctor_id,
          'doctor',
          `حجز جديد وارد #${bookingCode} 🩺`,
          `حجز جديد للمريض ${patientDisplayName} - رقم الدور #${appointment.queue_number || 1} في ${appointment.period_date || appointment.slot_date || ''}.`,
          'appointment',
          { appointment_id: appointment.id, booking_code: bookingCode }
        );
      }

      // إشعار سكرتارية العيادة
      try {
        const resolvedClinicId = appointment?.clinic_id || appointment?.doctor_clinic_id || null;
        const resolvedClinicName = clinicDisplayName;

        const secList = db.prepare(`
          SELECT DISTINCT s.id FROM secretaries s
          LEFT JOIN clinics c ON s.clinic_id = c.id
          LEFT JOIN secretary_doctors sd ON sd.secretary_id = s.id
          LEFT JOIN doctor_clinics dc ON dc.clinic_id = s.clinic_id
          WHERE s.is_active = 1
            AND (
              (? IS NOT NULL AND s.clinic_id = ?)
              OR (? IS NOT NULL AND c.name = ?)
              OR dc.doctor_id = ?
              OR sd.doctor_id = ?
              OR s.clinic_id IN (SELECT clinic_id FROM doctors WHERE id = ? AND clinic_id IS NOT NULL)
              OR s.clinic_id IN (SELECT clinic_id FROM doctor_clinics WHERE doctor_id = ?)
              OR s.clinic_id IN (SELECT id FROM clinics WHERE name = (SELECT clinic_name FROM doctors WHERE id = ?))
            )
        `).all(
          resolvedClinicId, resolvedClinicId,
          resolvedClinicName, resolvedClinicName,
          appointment.doctor_id,
          appointment.doctor_id,
          appointment.doctor_id,
          appointment.doctor_id,
          appointment.doctor_id
        );

        for (const sec of secList) {
          createNotification(
            sec.id,
            'secretary',
            `حجز جديد في العيادة #${bookingCode} 📋`,
            `حجز جديد للمريض ${patientDisplayName} مع د. ${appointment?.doctor_name || ''} - دور #${appointment?.queue_number || 1}.`,
            'appointment',
            { appointment_id: appointment.id, booking_code: bookingCode }
          );
        }
      } catch (secNotifErr) {
        console.error('⚠️ خطأ في إشعار السكرتيرة:', secNotifErr.message);
      }
    } catch (notifErr) {
      console.error('⚠️ خطأ في إنشاء إشعار الحجز:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحجز بنجاح',
      data: appointment,
    });
  } catch (err) {
    console.error('❌ خطأ في إنشاء الحجز:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== اعتماد الحجز (للأدمن) ====================
router.patch('/:id/confirm', authenticate, (req, res) => {
  try {
    const appointment = db
      .prepare('SELECT a.*, d.full_name as doctor_name, p.full_name as patient_name FROM appointments a LEFT JOIN doctors d ON a.doctor_id = d.id LEFT JOIN patients p ON a.user_id = p.id WHERE a.id = ?')
      .get(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    if (appointment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن اعتماد حجز ليس في حالة الانتظار',
      });
    }

    db.prepare('UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('confirmed', req.params.id);

    console.log(`✅ [Confirm] تم اعتماد الحجز #${appointment.booking_code}`);

    // إرسال إشعارات الاعتماد
    try {
      if (appointment.user_id) {
        createNotification(
          appointment.user_id,
          'patient',
          `تم اعتماد وتأكيد موعدك #${appointment.booking_code} ✅`,
          `تمت الموافقة واعتماد موعدك مع د. ${appointment.doctor_name || 'الطبيب'} بنجاح.`,
          'appointment_confirmed',
          { appointment_id: appointment.id, booking_code: appointment.booking_code }
        );
      }
      if (appointment.doctor_id) {
        createNotification(
          appointment.doctor_id,
          'doctor',
          `تأكيد حجز #${appointment.booking_code} ✅`,
          `تم اعتماد وتأكيد حجز المريض ${appointment.patient_name || 'مريض'} بنجاح.`,
          'appointment_confirmed',
          { appointment_id: appointment.id }
        );
      }
    } catch (_) {}

    res.json({ success: true, message: 'تم اعتماد الحجز' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تعليم الحجز كمدفوع (للأدمن) ====================
router.patch('/:id/pay', authenticate, (req, res) => {
  try {
    const appointment = db
      .prepare('SELECT a.*, d.full_name as doctor_name, p.full_name as patient_name FROM appointments a LEFT JOIN doctors d ON a.doctor_id = d.id LEFT JOIN patients p ON a.patient_id = p.id WHERE a.id = ?')
      .get(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تعليم حجز ملغي كمدفوع',
      });
    }

    db.prepare(`
      UPDATE appointments
      SET payment_status = 'paid', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id);

    console.log(`✅ [Admin] تم تحديث حالة دفع الحجز #${appointment.booking_code} إلى paid`);

    // إرسال إشعارات الدفع
    try {
      createNotification(
        appointment.patient_id,
        'patient',
        `تأكيد دفع الحجز #${appointment.booking_code} 💳`,
        `تم تأكيد دفع رسوم الكشف للحجز #${appointment.booking_code} بنجاح. شكراً لك!`,
        'payment_confirmed',
        { appointment_id: appointment.id }
      );
      if (appointment.doctor_id) {
        createNotification(
          appointment.doctor_id,
          'doctor',
          `تأكيد دفع حجز #${appointment.booking_code} 💳`,
          `تم تأكيد سداد رسوم كشف المريض ${appointment.patient_name || 'مريض'} للحجز #${appointment.booking_code}.`,
          'payment_confirmed',
          { appointment_id: appointment.id }
        );
      }
    } catch (_) {}

    console.log(`💰 [Admin] تم تعليم الحجز #${appointment.booking_code} كمدفوع`);

    res.json({ success: true, message: 'تم تعليم الحجز كمدفوع' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إكمال الحجز (للأدمن) ====================
router.patch('/:id/complete', authenticate, (req, res) => {
  try {
    const appointment = db
      .prepare('SELECT * FROM appointments WHERE id = ?')
      .get(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    if (['cancelled', 'completed'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إكمال هذا الحجز',
      });
    }

    db.prepare(`
      UPDATE appointments
      SET status = 'completed', payment_status = 'paid', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id);

    console.log(`✅ [Admin] تم إكمال الحجز #${appointment.booking_code}`);

    res.json({ success: true, message: 'تم إكمال الحجز' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تأجيل الموعد ====================
router.patch('/:id/reschedule', authenticate, (req, res) => {
  try {
    const { new_period_id } = req.body;

    if (!new_period_id) {
      return res.status(400).json({
        success: false,
        message: 'new_period_id مطلوب',
      });
    }

    const appointment = db
      .prepare('SELECT * FROM appointments WHERE id = ?')
      .get(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'الحجز غير موجود',
      });
    }

    if (req.user.type === 'patient' && appointment.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'لا يمكنك تأجيل حجز ليس لك',
      });
    }

    // يسمح بالتأجيل للحجوزات النشطة (confirmed, pending) وأيضاً للحجوزات التي تم تسجيل عدم حضورها (no_show)
    if (['cancelled', 'completed'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تأجيل حجز ملغي أو مكتمل مسبقاً',
      });
    }

    const newPeriod = db
      .prepare('SELECT * FROM doctor_periods WHERE id = ? AND doctor_id = ?')
      .get(new_period_id, appointment.doctor_id);

    if (!newPeriod) {
      return res.status(404).json({
        success: false,
        message: 'الفترة الجديدة غير موجودة',
      });
    }

    if (newPeriod.is_cancelled === 1) {
      return res.status(400).json({
        success: false,
        message: 'الفترة الجديدة ملغاة',
      });
    }

    if (newPeriod.booked_count >= newPeriod.max_bookings) {
      return res.status(400).json({
        success: false,
        message: 'الفترة الجديدة مكتملة',
      });
    }

    const conflict = db
      .prepare(`
        SELECT * FROM appointments
        WHERE user_id = ? AND period_id = ? AND id != ? 
          AND status NOT IN ('cancelled', 'no_show')
      `)
      .get(appointment.user_id, new_period_id, req.params.id);

    if (conflict) {
      return res.status(400).json({
        success: false,
        message: 'لديك حجز آخر في هذه الفترة',
      });
    }

    // احتساب المقعد في الفترة الجديدة: إذا كان الحجز الأصلي ذهبياً أو مدفوعاً يحتفظ بأولوية المقعد الذهبي
    let newQueueNumber = 1;
    let newIsGolden = appointment.is_golden || 0;
    const existingInNewPeriod = db.prepare(`
      SELECT queue_number FROM appointments
      WHERE period_id = ? AND status NOT IN ('cancelled', 'no_show')
    `).all(new_period_id);
    const takenInNew = new Set(existingInNewPeriod.map(a => a.queue_number));

    let goldenSeatsCount = 3;
    try {
      const setting = db.prepare("SELECT value FROM system_settings WHERE key = 'golden_seats_count'").get();
      if (setting && setting.value) goldenSeatsCount = parseInt(setting.value, 10) || 3;
    } catch (e) {}

    if (newIsGolden === 1 || appointment.payment_status === 'paid') {
      let foundSlot = false;
      for (let i = 1; i <= goldenSeatsCount; i++) {
        if (!takenInNew.has(i)) {
          newQueueNumber = i;
          newIsGolden = 1;
          foundSlot = true;
          break;
        }
      }
      if (!foundSlot) {
        let num = goldenSeatsCount + 1;
        while (takenInNew.has(num)) num++;
        newQueueNumber = num;
      }
    } else {
      let num = goldenSeatsCount + 1;
      while (takenInNew.has(num)) num++;
      newQueueNumber = num;
      newIsGolden = 0;
    }

    // الحفاظ على الحجز نفسه بكوده ومبلغه، وتحديث الفترة ورقم الدور وإعادة الحالة إلى confirmed أو pending
    const newStatus = appointment.payment_status === 'paid' ? 'confirmed' : 'pending';

    db.prepare(`
      UPDATE appointments
      SET period_id = ?, slot_id = NULL, status = ?, queue_number = ?, is_golden = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(new_period_id, newStatus, newQueueNumber, newIsGolden, req.params.id);

    if (appointment.period_id) {
      db.prepare('UPDATE doctor_periods SET booked_count = MAX(0, booked_count - 1) WHERE id = ?')
        .run(appointment.period_id);
    }

    if (appointment.slot_id && appointment.slot_id > 0) {
      db.prepare('UPDATE slots SET is_booked = 0 WHERE id = ?').run(appointment.slot_id);
    }

    db.prepare('UPDATE doctor_periods SET booked_count = booked_count + 1 WHERE id = ?')
      .run(new_period_id);


    const updated = db
      .prepare(`
        SELECT a.*,
               d.full_name as doctor_name,
               d.specialty as doctor_specialty,
               d.clinic_name as clinic_name,
               c.address as clinic_address,
               c.governorate as clinic_governorate,
               c.google_maps_url as clinic_google_maps_url,
               per.date as period_date,
               per.start_time as period_start_time,
               per.end_time as period_end_time
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN clinics c ON d.clinic_name = c.name
        LEFT JOIN doctor_periods per ON a.period_id = per.id
        WHERE a.id = ?
      `)
      .get(req.params.id);

    res.json({
      success: true,
      message: 'تم تأجيل الحجز بنجاح',
      data: updated,
    });
  } catch (err) {
    console.error('❌ خطأ في التأجيل:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إلغاء حجز ====================
router.patch('/:id/cancel', authenticate, (req, res) => {
  try {
    const appointment = db
      .prepare('SELECT * FROM appointments WHERE id = ?')
      .get(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    if (req.user.type === 'patient' && appointment.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'لا يمكنك إلغاء حجز ليس لك',
      });
    }

    if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إلغاء هذا الحجز',
      });
    }

    db.prepare('UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('cancelled', req.params.id);

    if (appointment.period_id) {
      db.prepare('UPDATE doctor_periods SET booked_count = MAX(0, booked_count - 1) WHERE id = ?')
        .run(appointment.period_id);
    }

    if (appointment.slot_id && appointment.slot_id > 0) {
      db.prepare('UPDATE slots SET is_booked = 0 WHERE id = ?').run(appointment.slot_id);
    }

    // 💰 إذا كان الحجز مدفوعاً مسبقاً (سواء عبر المحفظة أو تم تأكيد الدفع paid) يتم إرجاع المبلغ فوراً إلى رصيد محفظة المريض
    let refunded = false;
    let refundAmount = 0;
    if (appointment.payment_status === 'paid' && appointment.fee && appointment.fee > 0) {
      refundAmount = appointment.fee;
      db.prepare('UPDATE patients SET balance = COALESCE(balance, 0) + ? WHERE id = ?').run(refundAmount, appointment.user_id);
      db.prepare(`
        INSERT INTO wallet_transactions (patient_id, amount, type, description, appointment_id, created_by)
        VALUES (?, ?, 'refund', ?, ?, 'system')
      `).run(appointment.user_id, refundAmount, `استرجاع رسوم الحجز الملغي #${appointment.booking_code}`, appointment.id);
      db.prepare("UPDATE appointments SET payment_status = 'refunded' WHERE id = ?").run(appointment.id);
      refunded = true;

      try {
        createNotification(
          appointment.user_id,
          'patient',
          'استرجاع الرصيد إلى محفظتك 💰',
          `تم إلغاء حجزك #${appointment.booking_code} وإرجاع كامل المبلغ (${refundAmount} ر.ي) إلى رصيد محفظتك بنجاح.`,
          'wallet_refund',
          { appointment_id: appointment.id, refund_amount: refundAmount }
        );
      } catch (notifErr) {
        console.warn('تعذر إرسال إشعار الاسترجاع:', notifErr.message);
      }
    }

    res.json({
      success: true,
      message: refunded
        ? `تم إلغاء الحجز واسترجاع ${refundAmount} ر.ي إلى محفظتك بنجاح`
        : 'تم إلغاء الحجز بنجاح',
      refunded,
      refund_amount: refundAmount
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }

});

// ==================== تسجيل No-show ====================
router.patch('/:id/no-show', authenticate, (req, res) => {
  try {
    const appointment = db
      .prepare('SELECT * FROM appointments WHERE id = ?')
      .get(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    db.prepare('UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('no_show', req.params.id);

    db.prepare('UPDATE patients SET no_show_count = no_show_count + 1 WHERE id = ?')
      .run(appointment.user_id);

    // إشعار المريض بانتهاء الفترة وتسجيل عدم الحضور مع إمكانية تأجيل الحجز
    try {
      createNotification(
        appointment.user_id,
        'patient',
        'تنبيه: فاتك موعد الحجز الطبي ⏰',
        `لقد انتهت فترة موعدك الطبي للحجز #${appointment.booking_code} وتم تسجيل عدم حضورك. يمكنك الآن الدخول وتأجيل الحجز إلى موعد قادم مناسب لك دون فقدان حجزك.`,
        'appointment_no_show',
        { appointment_id: appointment.id, booking_code: appointment.booking_code, can_reschedule: true }
      );
    } catch (notifErr) {
      console.warn('تعذر إرسال إشعار عدم الحضور:', notifErr.message);
    }

    res.json({ success: true, message: 'تم تسجيل عدم الحضور وإشعار المريض' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }

});


// ==================== مراجعة وتأكيد الدفع (للأدمن وترقية الحجز الذهبي) ====================
router.patch('/:id/confirm-payment', authenticate, (req, res) => {
  try {
    const role = req.user.role || req.user.type;
    if (role !== 'admin' && role !== 'secretary') {
      return res.status(403).json({ success: false, message: 'صلاحية الأدمن أو السكرتيرة مطلوبة' });
    }

    const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    let goldenSeatsCount = 3;
    try {
      const setting = db.prepare("SELECT value FROM system_settings WHERE key = 'golden_seats_count'").get();
      if (setting && setting.value) goldenSeatsCount = parseInt(setting.value, 10) || 3;
    } catch (e) {}

    let upgradedQueueNumber = appointment.queue_number;
    let upgradedIsGolden = appointment.is_golden;

    // إذا لم يكن حجزاً ذهبياً، نفحص هل متاح مقعد ذهبي (1 إلى goldenSeatsCount) في نفس الفترة لترقيته
    if (appointment.period_id && appointment.is_golden !== 1) {
      const existingInPeriod = db.prepare(`
        SELECT queue_number FROM appointments
        WHERE period_id = ? AND id != ? AND status NOT IN ('cancelled', 'no_show')
      `).all(appointment.period_id, appointment.id);

      const taken = new Set(existingInPeriod.map(a => a.queue_number));
      for (let i = 1; i <= goldenSeatsCount; i++) {
        if (!taken.has(i)) {
          upgradedQueueNumber = i;
          upgradedIsGolden = 1;
          break;
        }
      }
    }

    db.prepare(`
      UPDATE appointments
      SET payment_status = 'paid', queue_number = ?, is_golden = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(upgradedQueueNumber, upgradedIsGolden, appointment.id);

    // تحديث جدول payments
    db.prepare("UPDATE payments SET status = 'confirmed', confirmed_by = ?, confirmed_at = CURRENT_TIMESTAMP WHERE appointment_id = ?")
      .run(req.user.id, appointment.id);

    // إشعار للمريض
    try {
      const goldenNotice = upgradedIsGolden === 1 ? ` وتم ترقية حجزك للمقعد الذهبي ذو الأولوية رقم #${upgradedQueueNumber} 👑` : ` دورك: #${upgradedQueueNumber}`;
      createNotification(
        appointment.user_id,
        'patient',
        `تأكيد دفع الحجز #${appointment.booking_code} ✅`,
        `تم مراجعة وتأكيد استلام الحوالة بنجاح!${goldenNotice}. شكراً لتعاونكم.`,
        'payment_confirmed',
        { appointment_id: appointment.id, booking_code: appointment.booking_code, queue_number: upgradedQueueNumber }
      );
    } catch (ne) {}

    res.json({
      success: true,
      message: upgradedIsGolden === 1 ? `تم تأكيد الدفع وترقية الحجز للمقعد الذهبي رقم #${upgradedQueueNumber} 👑` : 'تم تأكيد الدفع بنجاح',
      queue_number: upgradedQueueNumber,
      is_golden: upgradedIsGolden,
      payment_status: 'paid'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== رفض حوالة الدفع (للأدمن) ====================
router.patch('/:id/reject-payment', authenticate, (req, res) => {
  try {
    const role = req.user.role || req.user.type;
    if (role !== 'admin' && role !== 'secretary') {
      return res.status(403).json({ success: false, message: 'صلاحية الأدمن أو السكرتيرة مطلوبة' });
    }

    const { reason } = req.body;
    const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    // تعديل الحالة إلى مرفوض/غير مدفوع
    db.prepare(`
      UPDATE appointments
      SET payment_status = 'rejected', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(appointment.id);

    db.prepare("UPDATE payments SET status = 'failed' WHERE appointment_id = ?").run(appointment.id);

    try {
      createNotification(
        appointment.user_id,
        'patient',
        `تنبيه حول دفعة الحجز #${appointment.booking_code} ⚠️`,
        `تعذر التحقق من رقم الحوالة لحجزك: ${reason || 'بيانات الحوالة غير صحيحة'}. يرجى التحقق وإعادة الإرسال أو السداد نقداً في العيادة.`,
        'payment_rejected',
        { appointment_id: appointment.id, booking_code: appointment.booking_code }
      );
    } catch (ne) {}

    res.json({ success: true, message: 'تم رفض الدفعة وإشعار المريض' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== تقييم الموعد بعد انتهاء الفترة (للمريض) ====================
router.post('/:id/review', authenticate, (req, res) => {
  try {
    const userType = req.user.type || req.user.role;
    if (userType !== 'patient') {
      return res.status(403).json({ success: false, message: 'التقييم متاح للمرضى فقط' });
    }

    const apptId = Number(req.params.id);
    const appt = db.prepare(`
      SELECT a.*, per.date as period_date, per.end_time as period_end_time,
             d.clinic_id,
             (SELECT id FROM secretaries WHERE clinic_id = d.clinic_id AND is_active = 1 LIMIT 1) as secretary_id
      FROM appointments a
      LEFT JOIN doctor_periods per ON a.period_id = per.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      WHERE a.id = ? AND a.user_id = ?
    `).get(apptId, req.user.id);

    if (!appt) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    // 🛡️ التحقق الصارم من الحضور الفعلي للعيادة (Post-Visit Verified Reviews)
    const isAttended = appt.attendance_status === 'attended' || appt.status === 'completed' || appt.location_verified_at != null;
    if (!isAttended) {
      return res.status(403).json({
        success: false,
        code: 'ATTENDANCE_REQUIRED',
        message: '⚠️ التقييم متاح فقط للمرضى بعد تأكيد حضورهم الفعلي للعيادة أو إتمام الكشف الطبي، لضمان مصداقية التقييمات بنسبة 100% ومنع الآراء المزيفة.'
      });
    }

    // فحص هل قُيم مسبقاً
    const existing = db.prepare('SELECT id FROM appointment_reviews WHERE appointment_id = ?').get(apptId);
    if (existing) {
      return res.status(400).json({ success: false, message: 'تم تقييم هذا الموعد مسبقاً.' });
    }

    // التأكد من وجود عمود is_verified_visit
    try {
      const cols = db.prepare('PRAGMA table_info(appointment_reviews)').all().map(c => c.name);
      if (!cols.includes('is_verified_visit')) {
        db.exec('ALTER TABLE appointment_reviews ADD COLUMN is_verified_visit INTEGER DEFAULT 1');
      }
    } catch (_) {}

    const {
      rating_hospital = 5,
      rating_doctor = 5,
      rating_secretary = 5,
      rating_service = 5,
      comment
    } = req.body;

    db.prepare(`
      INSERT INTO appointment_reviews
        (appointment_id, user_id, doctor_id, clinic_id, secretary_id,
         rating_hospital, rating_doctor, rating_secretary, rating_service, comment, is_verified_visit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      apptId,
      req.user.id,
      appt.doctor_id,
      appt.clinic_id || null,
      appt.secretary_id || null,
      Math.min(5, Math.max(1, Number(rating_hospital) || 5)),
      Math.min(5, Math.max(1, Number(rating_doctor) || 5)),
      Math.min(5, Math.max(1, Number(rating_secretary) || 5)),
      Math.min(5, Math.max(1, Number(rating_service) || 5)),
      comment ? String(comment).trim() : null
    );

    // تحديث متوسط تقييم الطبيب في جدول doctors
    const avgDoc = db.prepare('SELECT AVG(rating_doctor) as avg_rating FROM appointment_reviews WHERE doctor_id = ?').get(appt.doctor_id);
    if (avgDoc && avgDoc.avg_rating) {
      db.prepare('UPDATE doctors SET rating = ROUND(?, 1) WHERE id = ?').run(avgDoc.avg_rating, appt.doctor_id);
    }

    res.json({
      success: true,
      message: 'شكراً لك! تم استلام تقييمك للمستشفى والطبيب والسكرتيرة ومستوى الخدمة بنجاح ⭐'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// جلب تقييم موعد معين
router.get('/:id/review', authenticate, (req, res) => {
  try {
    const review = db.prepare('SELECT * FROM appointment_reviews WHERE appointment_id = ?').get(req.params.id);
    res.json({ success: true, data: review || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// جلب كل التقييمات للوحة الأدمن
router.get('/reviews/all', authenticate, (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT r.*,
             COALESCE(a.patient_name, p.full_name) as patient_name,
               COALESCE(a.patient_relationship, 'صاحب الحساب') as patient_relationship,
               COALESCE(a.patient_age, p.age) as patient_age,
               COALESCE(a.patient_gender, p.gender) as patient_gender,
               p.full_name as account_holder_name,
             p.phone as patient_phone,
             d.full_name as doctor_name,
             d.specialty as doctor_specialty,
             c.name as clinic_name,
             a.booking_code
      FROM appointment_reviews r
      LEFT JOIN patients p ON r.user_id = p.id
      LEFT JOIN doctors d ON r.doctor_id = d.id
      LEFT JOIN clinics c ON r.clinic_id = c.id
      LEFT JOIN appointments a ON r.appointment_id = a.id
      ORDER BY r.created_at DESC
      LIMIT 100
    `).all();

    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// إعدادات عدد المقاعد الذهبية
router.get('/settings/golden-seats', authenticate, (req, res) => {
  try {
    let count = 3;
    const setting = db.prepare("SELECT value FROM system_settings WHERE key = 'golden_seats_count'").get();
    if (setting && setting.value) count = parseInt(setting.value, 10) || 3;
    res.json({ success: true, golden_seats_count: count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/settings/golden-seats', authenticate, (req, res) => {
  try {
    const role = req.user.role || req.user.type;
    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'صلاحية الأدمن مطلوبة' });
    }
    const count = parseInt(req.body.golden_seats_count, 10);
    if (isNaN(count) || count < 0 || count > 15) {
      return res.status(400).json({ success: false, message: 'عدد المقاعد الذهبية يجب أن يكون بين 0 و 15' });
    }
    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('golden_seats_count', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(String(count));

    res.json({ success: true, message: `تم تحديد عدد المقاعد الذهبية إلى ${count} مقاعد`, golden_seats_count: count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ==================== REQ 9: تصدير حجوزات اليوم إلى Excel أو PDF ====================
// GET /api/v1/appointments/export?format=excel|pdf&date=YYYY-MM-DD
router.get('/export', authenticate, async (req, res) => {
  try {
    const role = req.user.role || req.user.type;
    if (!['secretary', 'doctor', 'admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'صلاحية غير كافية لتصدير الحجوزات' });
    }

    const { format = 'excel', date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    let query = `
      SELECT 
        a.id,
        a.booking_code,
        a.sequential_booking_number,
        a.queue_number,
        a.status,
        a.attendance_status,
        a.payment_status,
        a.payment_method,
        a.fee,
        COALESCE(a.patient_name, p.full_name) as patient_name,
               COALESCE(a.patient_relationship, 'صاحب الحساب') as patient_relationship,
               COALESCE(a.patient_age, p.age) as patient_age,
               COALESCE(a.patient_gender, p.gender) as patient_gender,
               p.full_name as account_holder_name,
        p.phone as patient_phone,
        d.full_name as doctor_name,
        COALESCE(c.name, d.clinic_name) as clinic_name,
        COALESCE(per.date, s.date) as appt_date,
        COALESCE(per.start_time, s.start_time) as appt_time
      FROM appointments a
      LEFT JOIN patients p ON a.user_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN clinics c ON (d.clinic_id = c.id OR d.clinic_name = c.name)
      LEFT JOIN doctor_periods per ON a.period_id = per.id
      LEFT JOIN slots s ON a.slot_id = s.id
      LEFT JOIN doctor_periods per ON a.period_id = per.id
      LEFT JOIN slots s ON a.slot_id = s.id
      WHERE (DATE(per.date) = DATE(?) OR DATE(s.date) = DATE(?) OR (per.date IS NULL AND s.date IS NULL AND DATE(a.created_at) = DATE(?)))
    `;
    const params = [targetDate, targetDate, targetDate];

    if (role === 'doctor') {
      query += ' AND a.doctor_id = ?';
      params.push(req.user.id);
    } else if (role === 'secretary') {
      const sec = db.prepare('SELECT clinic_id FROM secretaries WHERE id = ?').get(req.user.id);
      if (sec && sec.clinic_id) {
        query += ' AND (d.clinic_id = ? OR c.id = ?)';
        params.push(sec.clinic_id, sec.clinic_id);
      }
    }

    query += ' ORDER BY a.queue_number ASC, a.created_at ASC';
    const appointments = db.prepare(query).all(...params);

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`حجوزات ${targetDate}`);
      worksheet.views = [{ rtl: true }];

      worksheet.columns = [
        { header: 'الرقم التسلسلي', key: 'seq', width: 14 },
        { header: 'رقم الدور', key: 'queue', width: 12 },
        { header: 'كود الحجز', key: 'code', width: 18 },
        { header: 'اسم المريض', key: 'patient', width: 25 },
        { header: 'رقم الهاتف', key: 'phone', width: 16 },
        { header: 'الوقت', key: 'time', width: 14 },
        { header: 'الطبيب المعالج', key: 'doctor', width: 22 },
        { header: 'العيادة / المنشأة', key: 'clinic', width: 22 },
        { header: 'حالة الحجز', key: 'status', width: 15 },
        { header: 'حضور المريض', key: 'attendance', width: 15 },
        { header: 'حالة السداد', key: 'payment', width: 15 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00796B' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      const statusMap = { pending: 'قيد الانتظار', confirmed: 'مؤكد', completed: 'مكتمل', cancelled: 'ملغي', no_show: 'لم يحضر' };
      const attendMap = { pending: 'لم يسجل', arrived: 'حضر للعيادة', no_show: 'لم يحضر' };

      appointments.forEach((a, i) => {
        const row = worksheet.addRow({
          seq: a.sequential_booking_number || (i + 1),
          queue: a.queue_number ? `#${a.queue_number}` : '—',
          code: a.booking_code,
          patient: a.patient_name || '—',
          phone: a.patient_phone || '—',
          time: a.appt_time || '—',
          doctor: a.doctor_name || '—',
          clinic: a.clinic_name || '—',
          status: statusMap[a.status] || a.status,
          attendance: attendMap[a.attendance_status] || a.attendance_status || '—',
          payment: a.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع'
        });
        row.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="appointments-${targetDate}.xlsx"`);
      await workbook.xlsx.write(res);
      return res.end();
    } else if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="appointments-${targetDate}.pdf"`);
      doc.pipe(res);

      doc.fontSize(18).text(`Medical Appointments Schedule - ${targetDate}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Total Bookings: ${appointments.length}`, { align: 'center' });
      doc.moveDown(1.5);

      appointments.forEach((a, index) => {
        const line = `[${a.sequential_booking_number || index + 1}] Queue #${a.queue_number || 1} | Code: ${a.booking_code} | Patient: ${a.patient_name || 'Patient'} (${a.patient_phone || '-'}) | Dr. ${a.doctor_name || '-'} | Time: ${a.appt_time || '-'} | Status: ${a.status} | Attendance: ${a.attendance_status || 'pending'}`;
        doc.fontSize(9).text(line);
        doc.moveDown(0.5);
      });

      doc.end();
    } else {
      res.status(400).json({ success: false, message: "صيغة غير مدعومة. الخيارات: 'excel' أو 'pdf'" });
    }
  } catch (err) {
    console.error('❌ خطأ في تصدير الحجوزات:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== REQ 4: التحقق من موقع المريض الجغرافي (GPS Geofencing) ====================
// POST /api/v1/appointments/:id/verify-location
router.post('/:id/verify-location', authenticate, (req, res) => {
  try {
    const appointmentId = Number(req.params.id);
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined || isNaN(Number(lat)) || isNaN(Number(lng))) {
      return res.status(400).json({ success: false, message: 'إحداثيات الموقع (lat, lng) مطلوبة وغير صالحة' });
    }

    const patientLat = Number(lat);
    const patientLng = Number(lng);

    const appointment = db.prepare(`
      SELECT 
        a.*,
        COALESCE(a.patient_name, p.full_name) as patient_name,
               COALESCE(a.patient_relationship, 'صاحب الحساب') as patient_relationship,
               COALESCE(a.patient_age, p.age) as patient_age,
               COALESCE(a.patient_gender, p.gender) as patient_gender,
               p.full_name as account_holder_name,
        d.id as doctor_id,
        d.full_name as doctor_name,
        d.clinic_id as doctor_clinic_id,
        d.clinic_name as doctor_clinic_name,
        COALESCE(c.id, d.clinic_id) as clinic_id,
        COALESCE(c.name, d.clinic_name) as clinic_name,
        c.latitude as clinic_lat,
        c.longitude as clinic_lng,
        per.date as period_date,
        per.start_time as period_start_time,
        per.end_time as period_end_time,
        s.date as slot_date,
        s.start_time as slot_time,
        s.end_time as slot_end_time
      FROM appointments a
      LEFT JOIN patients p ON a.user_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN clinics c ON (d.clinic_id = c.id OR d.clinic_name = c.name)
      LEFT JOIN doctor_periods per ON a.period_id = per.id
      LEFT JOIN slots s ON a.slot_id = s.id
      WHERE a.id = ?
    `).get(appointmentId);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    const role = req.user.role || req.user.type;
    if (role === 'patient' && appointment.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'لا يمكنك التحقق من موقع حجز لمريض آخر' });
    }
    // تحقق صارم: يتم تأكيد الحضور فقط خلال مدة الفترة المحددة للحجز
    const todayYemen = getYemenDateString();
    const nowMinutesYemen = getYemenMinutes();
    const apptDate = normalizeDate(appointment.period_date || appointment.slot_date);
    const rawStart = appointment.period_start_time || appointment.slot_time;
    const rawEnd = appointment.period_end_time || appointment.slot_end_time;

    if (apptDate) {
      if (apptDate !== todayYemen) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن تأكيد الحضور إلا في نفس يوم الموعد (' + apptDate + ').'
        });
      }
      if (rawStart && rawEnd) {
        const startMin = toMinutes(rawStart) - 15; // سماح 15 دقيقة قبل بداية الفترة
        const endMin = toMinutes(rawEnd);
        if (nowMinutesYemen < startMin || nowMinutesYemen > endMin) {
          return res.status(400).json({
            success: false,
            message: 'يمكنك تأكيد الحضور فقط خلال مدة فترة الحجز المحددة (' + rawStart + ' - ' + rawEnd + ').'
          });
        }
      }
    }

    const clinicLat = appointment.clinic_lat || 15.3694;
    const clinicLng = appointment.clinic_lng || 44.1910;

    function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
      const R = 6371e3;
      const toRad = deg => (deg * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c);
    }

    const distanceMeters = calculateDistanceMeters(patientLat, patientLng, clinicLat, clinicLng);

    const MAX_GEOFENCE_METERS = 100;
    if (distanceMeters > MAX_GEOFENCE_METERS) {
      return res.status(400).json({
        success: false,
        verified: false,
        distance_meters: distanceMeters,
        max_allowed_meters: MAX_GEOFENCE_METERS,
        message: `أنت بعيد عن موقع العيادة بحوالي ${distanceMeters} متراً. يجب أن تكون ضمن نطاق ${MAX_GEOFENCE_METERS} متراً لتأكيد حضورك.`
      });
    }

    db.prepare(`
      UPDATE appointments
      SET 
        patient_latitude = ?,
        patient_longitude = ?,
        location_verified_at = CURRENT_TIMESTAMP,
        attendance_status = 'arrived',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(patientLat, patientLng, appointmentId);

    console.log(`📍 [Geofencing] حجز #${appointment.booking_code}: تم توثيق موقع المريض بنجاح على بعد ${distanceMeters}م`);

    const notifTitle = 'وصول المريض للعيادة (تم التحقق من الموقع) 📍';
    const notifBody = `المريض ${appointment.patient_name || 'مريض'} (حجز #${appointment.booking_code}) متواجد الآن بالعيادة على بعد ${distanceMeters}م.`;

    if (appointment.doctor_id) {
      try {
        createNotification(
          appointment.doctor_id,
          'doctor',
          notifTitle,
          notifBody,
          'patient_arrived_geofence',
          { appointment_id: appointmentId, booking_code: appointment.booking_code, distance_meters: distanceMeters }
        );
      } catch (_) {}
    }

    try {
      const secList = db.prepare(`
        SELECT DISTINCT s.id FROM secretaries s
        WHERE s.is_active = 1
          AND (s.clinic_id = ? OR s.id IN (SELECT secretary_id FROM secretary_doctors WHERE doctor_id = ?))
      `).all(appointment.clinic_id, appointment.doctor_id);

      secList.forEach(sec => {
        createNotification(
          sec.id,
          'secretary',
          notifTitle,
          notifBody,
          'patient_arrived_geofence',
          { appointment_id: appointmentId, booking_code: appointment.booking_code, distance_meters: distanceMeters }
        );
      });
    } catch (_) {}

    res.json({
      success: true,
      verified: true,
      distance_meters: distanceMeters,
      attendance_status: 'arrived',
      message: 'تم تأكيد وصولك إلى العيادة بنجاح وإشعار الطبيب والسكرتارية 📍'
    });
  } catch (err) {
    console.error('❌ خطأ في التحقق من الموقع الجغرافي:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== REQ 1: تسجيل حالة الحضور (للسكرتيرة / الطبيب / الأدمن) ====================
// PATCH /api/v1/appointments/:id/attendance
router.patch('/:id/attendance', authenticate, (req, res) => {
  try {
    const role = req.user.role || req.user.type;
    if (!['secretary', 'doctor', 'admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتسجيل حضور المريض' });
    }

    const { status } = req.body;
    if (!['arrived', 'no_show', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "حالة الحضور غير صحيحة. القيم المسموحة: 'arrived' أو 'no_show' أو 'pending'"
      });
    }

    const appointment = db.prepare(`
      SELECT a.*, d.full_name as doctor_name, p.full_name as patient_name
      FROM appointments a
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN patients p ON a.user_id = p.id
      WHERE a.id = ? OR a.booking_code = ?
    `).get(req.params.id, req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    if (role === 'doctor' && appointment.doctor_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'لا يمكنك تعديل حضور حجز لطبيب آخر' });
    }

    db.prepare(`
      UPDATE appointments
      SET attendance_status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, appointment.id);

    console.log(`✅ [Attendance] حجز #${appointment.booking_code} حالة الحضور أصبحت: ${status} بواسطة ${role}:${req.user.id}`);

    if (status === 'arrived' && role === 'secretary' && appointment.doctor_id) {
      try {
        createNotification(
          appointment.doctor_id,
          'doctor',
          'وصول المريض للعيادة 🏥',
          `المريض ${appointment.patient_name || 'مريض'} (حجز #${appointment.booking_code} دور #${appointment.queue_number || 1}) وصل الآن إلى صالة الانتظار.`,
          'appointment',
          { appointment_id: appointment.id, booking_code: appointment.booking_code, attendance_status: 'arrived' }
        );
      } catch (_) {}
    }

    res.json({
      success: true,
      message: status === 'arrived' ? 'تم تسجيل حضور المريض بنجاح' : 'تم تسجيل عدم حضور المريض',
      data: {
        id: Number(req.params.id),
        attendance_status: status
      }
    });
  } catch (err) {
    console.error('❌ خطأ في تحديث حالة الحضور:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ═══════════════════════════════════════════
// POST /api/v1/appointments/:id/call — نداء المريض وإشعار الطابور
// ═══════════════════════════════════════════
router.post('/:id/call', authenticate, (req, res) => {
  try {
    const role = req.user.role || req.user.type;
    if (!['doctor', 'secretary', 'admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بنداء المريض' });
    }

    const appt = db.prepare(`
      SELECT a.*, d.full_name as doctor_name, p.full_name as patient_name
      FROM appointments a
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN patients p ON a.user_id = p.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!appt) {
      return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    }

    db.prepare(`
      UPDATE appointments
      SET status = 'in_progress', attendance_status = 'arrived', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(appt.id);

    notifyQueueProgress(appt.doctor_id, appt.queue_number || 1, appt.id);

    res.json({
      success: true,
      message: `تم نداء المريض ${appt.patient_name || ''} (دور #${appt.queue_number || 1}) وإشعار المرضى القادمين بنجاح 🔔`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;