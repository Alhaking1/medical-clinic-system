import express from 'express';
import db from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { requirePermission, canManageDoctor, getManageableDoctorIds } from '../middleware/permissions.js';

const router = express.Router();

// ==================== Helpers ====================

/**
 * توقيت اليمن (UTC+3)
 */
function getYemenDateString() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Aden', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function getYemenMinutes() {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Aden', hour12: false, hour: '2-digit', minute: '2-digit' });
  const parts = formatter.format(new Date()).split(':');
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

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

/**
 * يحوّل التاريخ لصيغة yyyy-MM-dd
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * يُنشئ فترات من القالب الأسبوعي لعدد معيّن من الأيام
 * @param {number} doctorId
 * @param {number} daysAhead - عدد الأيام للأمام (افتراضي 90 = 3 شهور)
 * @returns {{created: number, skipped: number}}
 */
function generatePeriodsFromSchedule(doctorId, daysAhead = 90) {
  const schedules = db
    .prepare('SELECT * FROM doctor_schedules WHERE doctor_id = ? AND is_active = 1')
    .all(doctorId);

  if (schedules.length === 0) {
    return { created: 0, skipped: 0, message: 'لا يوجد قالب أسبوعي' };
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO doctor_periods
    (doctor_id, date, start_time, end_time, max_bookings)
    VALUES (?, ?, ?, ?, ?)
  `);

  let created = 0;
  let skipped = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < daysAhead; i++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + i);
    const dateStr = formatDate(currentDate);
    const dayOfWeek = currentDate.getDay();

    const daySchedules = schedules.filter(s => s.day_of_week === dayOfWeek);

    for (const schedule of daySchedules) {
      try {
        const result = insert.run(
          doctorId,
          dateStr,
          schedule.start_time,
          schedule.end_time,
          schedule.max_bookings
        );
        if (result.changes > 0) {
          created++;
        } else {
          skipped++;
        }
      } catch (e) {
        skipped++;
      }
    }
  }

  return { created, skipped };
}

// ============================================================
// 🆕 Routes
// ============================================================

// ==================== قائمة الفترات المتاحة للمريض ====================
// ✅ للعامة (لا يحتاج تسجيل دخول)
function getPeriodsForPatient(doctorId, queryParams, res) {
  try {
    const { date, from } = queryParams;
    const docId = Number(doctorId);

    if (!docId) {
      return res.status(400).json({ success: false, message: 'doctorId مطلوب' });
    }

    const today = getYemenDateString();
    const currentMinutes = getYemenMinutes();

    // إذا طُلب تاريخ سابق بالكامل
    if (date && date < today) {
      return res.json({ success: true, data: [] });
    }

    let query = `
      SELECT * FROM doctor_periods
      WHERE doctor_id = ?
        AND is_cancelled = 0
        AND is_stopped = 0
        AND date >= ?
    `;
    const params = [docId, today];

    // فلترة بتاريخ محدد
    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }

    // فلترة من تاريخ (للتأجيل)
    if (from) {
      params[1] = from > today ? from : today;
    }

    query += ' ORDER BY date, start_time';

    const periods = db.prepare(query).all(...params);

    // إضافة حقل slots_available وفلترة الفترات المنتهية فوراً
    const enriched = periods.map(p => {
      const endM = toMinutes(p.end_time) || (toMinutes(p.start_time) + 60);
      const isPast = (p.date < today) || (p.date === today && endM <= currentMinutes);
      return {
        ...p,
        slots_available: isPast ? 0 : Math.max(0, p.max_bookings - p.booked_count),
        is_full: p.booked_count >= p.max_bookings || isPast,
        is_expired: isPast,
      };
    }).filter(p => !p.is_expired);

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('Error in getPeriodsForPatient:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

router.get('/', (req, res) => {
  const doctorId = req.query.doctor_id || req.query.doctorId;
  if (!doctorId) {
    return res.status(400).json({ success: false, message: 'doctor_id مطلوب' });
  }
  return getPeriodsForPatient(doctorId, req.query, res);
});

router.get('/doctor/:doctorId', (req, res) => {
  return getPeriodsForPatient(req.params.doctorId, req.query, res);
});

// ==================== كل الفترات (للأدمن/السكرتيرة) ====================
router.get('/admin/doctor/:doctorId', authenticate, (req, res) => {
  try {
    const { date, from, to, include_past } = req.query;
    const doctorId = Number(req.params.doctorId);
    const today = getYemenDateString();
    const currentMinutes = getYemenMinutes();

    let query = 'SELECT * FROM doctor_periods WHERE doctor_id = ?';
    const params = [doctorId];

    // الفترات المنتهية تختفي فوراً ما لم يُطلب صراحة السجل السابق
    if (include_past !== 'true' && !date && !from) {
      query += ' AND date >= ?';
      params.push(today);
    }

    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }

    if (from) {
      query += ' AND date >= ?';
      params.push(from);
    }

    if (to) {
      query += ' AND date <= ?';
      params.push(to);
    }

    query += ' ORDER BY date, start_time';

    const periods = db.prepare(query).all(...params);

    // فلترة الفترات المنتهية بحيث تختفي فور انتهاء وقتها
    const filtered = include_past === 'true' ? periods : periods.filter(p => {
      if (p.date < today) return false;
      if (p.date === today) {
        const endM = toMinutes(p.end_time) || (toMinutes(p.start_time) + 60);
        return endM > currentMinutes;
      }
      return true;
    });

    res.json({ success: true, data: filtered });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إضافة فترة عمل محددة مباشرة ====================
router.post('/', authenticate, authorize('admin', 'doctor', 'secretary'), (req, res) => {
  try {
    const { doctor_id, date, start_time, end_time, max_bookings, notes } = req.body;
    if (!doctor_id || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'doctor_id ووقت البداية ووقت النهاية مطلوبة' });
    }

    const role = req.user.role || req.user.type;
    if (role === 'secretary') {
      if (!canManageDoctor(req.user.id, Number(doctor_id))) {
        return res.status(403).json({ success: false, message: 'لا تملك صلاحية إدارة هذا الطبيب' });
      }
    }

    const todayYemen = getYemenDateString();
    const currentMinutes = getYemenMinutes();
    const targetDate = date || todayYemen;

    if (targetDate < todayYemen) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إضافة فترة عمل لتاريخ سابق. يرجى اختيار تاريخ اليوم أو تاريخ قادم.',
      });
    }

    const startMin = toMinutes(start_time);
    const endMin = toMinutes(end_time);

    if (startMin >= endMin) {
      return res.status(400).json({
        success: false,
        message: 'وقت بداية الفترة يجب أن يكون قبل وقت نهايتها.',
      });
    }

    if (targetDate === todayYemen && endMin <= currentMinutes) {
      return res.status(400).json({
        success: false,
        message: 'عذراً، انتهى وقت هذه الفترة اليوم. يرجى اختيار أوقات قادمة.',
      });
    }

    // 🕒 التحقق من عدم تداخل الفترات للطبيب في نفس اليوم، وأن بداية الفترة الثانية تكون وقت أو بعد انتهاء الفترة السابقة
    const existingDoctorPeriods = db.prepare(`
      SELECT id, start_time, end_time FROM doctor_periods
      WHERE doctor_id = ? AND date = ? AND is_cancelled = 0
    `).all(Number(doctor_id), targetDate);

    for (const ep of existingDoctorPeriods) {
      const epStart = toMinutes(ep.start_time);
      const epEnd = toMinutes(ep.end_time);

      // فحص التداخل: إذا كانت الفترة الجديدة تبدأ قبل انتهاء فترة سابقة، أو تنتهي بعد بداية فترة أخرى متداخلة
      if (startMin < epEnd && endMin > epStart) {
        return res.status(400).json({
          success: false,
          message: `يوجد تعارض زمني مع فترة سابقة للطبيب (${ep.start_time} - ${ep.end_time}). يجب أن تكون بداية الفترة (${start_time}) عند أو بعد انتهاء الفترة السابقة (${ep.end_time}).`
        });
      }
    }


    const result = db.prepare(`
      INSERT INTO doctor_periods (doctor_id, date, start_time, end_time, max_bookings, notes, is_cancelled, is_stopped)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0)
    `).run(Number(doctor_id), targetDate, start_time, end_time, Number(max_bookings) || 10, notes || null);

    res.status(201).json({
      success: true,
      message: 'تمت إضافة الفترة بنجاح',
      data: {
        id: result.lastInsertRowid,
        doctor_id: Number(doctor_id),
        date: targetDate,
        start_time,
        end_time,
        max_bookings: Number(max_bookings) || 10
      }
    });
  } catch (err) {
    console.error('Error adding direct period:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إضافة قالب أسبوعي ====================
router.post('/schedule', authenticate, authorize('admin', 'doctor', 'secretary'), (req, res) => {
  try {
    const { doctor_id, day_of_week, start_time, end_time, max_bookings } = req.body;

    if (!doctor_id || day_of_week === undefined || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة',
      });
    }

    if (day_of_week < 0 || day_of_week > 6) {
      return res.status(400).json({
        success: false,
        message: 'day_of_week يجب أن يكون بين 0 و 6',
      });
    }

    if (start_time >= end_time) {
      return res.status(400).json({
        success: false,
        message: 'وقت البداية يجب أن يكون قبل وقت النهاية',
      });
    }

    // التحقق من عدم تداخل القوالب لنفس اليوم
    const startM = toMinutes(start_time);
    const endM = toMinutes(end_time);
    const daySchedules = db
      .prepare('SELECT * FROM doctor_schedules WHERE doctor_id = ? AND day_of_week = ?')
      .all(doctor_id, day_of_week);

    for (const s of daySchedules) {
      const sStart = toMinutes(s.start_time);
      const sEnd = toMinutes(s.end_time);
      if (startM < sEnd && endM > sStart) {
        return res.status(400).json({
          success: false,
          message: `يوجد تعارض مع فترة سابقة (${s.start_time} - ${s.end_time}). يجب أن تبدأ الفترة عند أو بعد انتهاء الفترة السابقة.`,
        });
      }
    }


    const result = db
      .prepare(`
        INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, max_bookings)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(doctor_id, day_of_week, start_time, end_time, max_bookings || 10);

    // ✅ توليد فترات تلقائياً
    const genResult = generatePeriodsFromSchedule(doctor_id, 90);

    res.status(201).json({
      success: true,
      message: 'تم إضافة القالب وتوليد الفترات',
      data: {
        schedule_id: result.lastInsertRowid,
        periods_created: genResult.created,
        periods_skipped: genResult.skipped,
      },
    });
  } catch (err) {
    console.error('Error in POST /periods/schedule:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== حفظ قالب أسبوعي مجمّع لكل أيام الأسبوع ====================
router.post('/schedule/batch', authenticate, authorize('admin', 'doctor', 'secretary'), (req, res) => {
  try {
    const { doctor_id, schedules, replace_all = true } = req.body;

    if (!doctor_id || !Array.isArray(schedules)) {
      return res.status(400).json({ success: false, message: 'doctor_id وقائمة schedules مطلوبة' });
    }

    if (req.user.type === 'secretary' && !canManageDoctor(req.user.id, doctor_id)) {
      return res.status(403).json({ success: false, message: 'لا تملك صلاحية إدارة هذا الطبيب' });
    }

    if (req.user.type === 'doctor' && req.user.id !== Number(doctor_id)) {
      return res.status(403).json({ success: false, message: 'غير مصرح بتعديل جدول طبيب آخر' });
    }

    const tx = db.transaction(() => {
      if (replace_all) {
        db.prepare('DELETE FROM doctor_schedules WHERE doctor_id = ?').run(doctor_id);
      }

      const insert = db.prepare(`
        INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, max_bookings, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `);

      for (const item of schedules) {
        if (item.day_of_week !== undefined && item.start_time && item.end_time) {
          insert.run(
            doctor_id,
            Number(item.day_of_week),
            item.start_time,
            item.end_time,
            Number(item.max_bookings) || 10
          );
        }
      }
    });

    tx();

    // ✅ توليد الفترات تلقائياً لـ 90 يوماً
    const genResult = generatePeriodsFromSchedule(doctor_id, 90);

    const savedSchedules = db.prepare(`
      SELECT * FROM doctor_schedules WHERE doctor_id = ? AND is_active = 1 ORDER BY day_of_week, start_time
    `).all(doctor_id);

    res.status(200).json({
      success: true,
      message: 'تم حفظ القالب الأسبوعي وتوليد الفترات بنجاح ✅',
      data: {
        doctor_id,
        schedules: savedSchedules,
        periods_created: genResult.created,
        periods_skipped: genResult.skipped
      }
    });
  } catch (err) {
    console.error('Error in POST /periods/schedule/batch:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== عرض القالب الأسبوعي ====================
router.get('/schedule/doctor/:doctorId', authenticate, (req, res) => {
  try {
    const schedules = db
      .prepare(`
        SELECT * FROM doctor_schedules
        WHERE doctor_id = ? AND is_active = 1
        ORDER BY day_of_week, start_time
      `)
      .all(req.params.doctorId);

    res.json({ success: true, data: schedules });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== حذف قالب ====================
router.delete('/schedule/:id', authenticate, authorize('admin', 'doctor', 'secretary'), (req, res) => {
  try {
    const schedule = db
      .prepare('SELECT * FROM doctor_schedules WHERE id = ?')
      .get(req.params.id);

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'القالب غير موجود' });
    }

    db.prepare('DELETE FROM doctor_schedules WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: 'تم حذف القالب' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== توليد فترات (يدوي) ====================
router.post('/generate', authenticate, authorize('admin', 'doctor', 'secretary'), (req, res) => {
  try {
    const { doctor_id, days } = req.body;

    if (!doctor_id) {
      return res.status(400).json({ success: false, message: 'doctor_id مطلوب' });
    }

    const daysAhead = Number(days) || 90;
    const result = generatePeriodsFromSchedule(doctor_id, daysAhead);

    res.json({
      success: true,
      message: `تم توليد ${result.created} فترة`,
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إعادة توليد (بعد تعديل القالب) ====================
router.post('/regenerate', authenticate, authorize('admin', 'doctor', 'secretary'), (req, res) => {
  try {
    const { doctor_id, days } = req.body;

    if (!doctor_id) {
      return res.status(400).json({ success: false, message: 'doctor_id مطلوب' });
    }

    const daysAhead = Number(days) || 90;

    // ⚠️ لا نحذف الفترات المحجوزة — فقط الفارغة المستقبلية
    const today = formatDate(new Date());
    db.prepare(`
      DELETE FROM doctor_periods
      WHERE doctor_id = ?
        AND date >= ?
        AND booked_count = 0
    `).run(doctor_id, today);

    const result = generatePeriodsFromSchedule(doctor_id, daysAhead);

    res.json({
      success: true,
      message: `تم إعادة توليد ${result.created} فترة`,
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إلغاء فترة (الدكتور مريض) ====================
router.patch('/:id/cancel', authenticate, authorize('admin', 'doctor', 'secretary'), (req, res) => {
  try {
    const { notes } = req.body;

    const period = db
      .prepare('SELECT * FROM doctor_periods WHERE id = ?')
      .get(req.params.id);

    if (!period) {
      return res.status(404).json({ success: false, message: 'الفترة غير موجودة' });
    }

    db.prepare(`
      UPDATE doctor_periods
      SET is_cancelled = 1, notes = ?
      WHERE id = ?
    `).run(notes || 'تم الإلغاء', req.params.id);

    res.json({ success: true, message: 'تم إلغاء الفترة' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== إعادة تفعيل فترة ====================
router.patch('/:id/uncancel', authenticate, authorize('admin', 'doctor', 'secretary'), (req, res) => {
  try {
    const period = db
      .prepare('SELECT * FROM doctor_periods WHERE id = ?')
      .get(req.params.id);

    if (!period) {
      return res.status(404).json({ success: false, message: 'الفترة غير موجودة' });
    }

    db.prepare(`
      UPDATE doctor_periods
      SET is_cancelled = 0, notes = NULL
      WHERE id = ?
    `).run(req.params.id);

    res.json({ success: true, message: 'تم إعادة تفعيل الفترة' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== حذف فترة ====================
router.delete('/:id', authenticate, authorize('admin', 'doctor', 'secretary'), (req, res) => {
  try {
    const period = db
      .prepare('SELECT * FROM doctor_periods WHERE id = ?')
      .get(req.params.id);

    if (!period) {
      return res.status(404).json({ success: false, message: 'الفترة غير موجودة' });
    }

    if (period.booked_count > 0) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حذف فترة فيها حجوزات',
      });
    }

    db.prepare('DELETE FROM doctor_periods WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: 'تم حذف الفترة' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ═══════════════════════════════════════════
// 🆕 إيقاف فترة (stop)
// ═══════════════════════════════════════════
router.patch('/:id/stop', authenticate, authorize('admin', 'doctor', 'secretary'), (req, res) => {
  try {
    const { notes } = req.body;
    const periodId = Number(req.params.id);

    const period = db.prepare('SELECT * FROM doctor_periods WHERE id = ?').get(periodId);

    if (!period) {
      return res.status(404).json({ success: false, message: 'الفترة غير موجودة' });
    }

    if (req.user.type === 'secretary') {
      if (!canManageDoctor(req.user.id, period.doctor_id)) {
        return res.status(403).json({
          success: false,
          message: 'لا تملك صلاحية إدارة هذا الطبيب'
        });
      }
    }

    if (period.is_stopped === 1) {
      return res.status(400).json({ success: false, message: 'الفترة متوقفة مسبقاً' });
    }

    db.prepare('UPDATE doctor_periods SET is_stopped = 1, notes = COALESCE(?, notes) WHERE id = ?')
      .run(notes || 'تم إيقاف استقبال الحجوزات', periodId);

    res.json({ success: true, message: 'تم إيقاف الفترة مؤقتاً' });
  } catch (err) {
    console.error('stop period:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 استئناف فترة (resume)
// ═══════════════════════════════════════════
router.patch('/:id/resume', authenticate, authorize('admin', 'doctor', 'secretary'), (req, res) => {
  try {
    const periodId = Number(req.params.id);

    const period = db.prepare('SELECT * FROM doctor_periods WHERE id = ?').get(periodId);

    if (!period) {
      return res.status(404).json({ success: false, message: 'الفترة غير موجودة' });
    }

    if (req.user.type === 'secretary') {
      if (!canManageDoctor(req.user.id, period.doctor_id)) {
        return res.status(403).json({
          success: false,
          message: 'لا تملك صلاحية إدارة هذا الطبيب'
        });
      }
    }

    if (period.is_stopped !== 1) {
      return res.status(400).json({ success: false, message: 'الفترة ليست متوقفة' });
    }

    db.prepare('UPDATE doctor_periods SET is_stopped = 0 WHERE id = ?').run(periodId);

    res.json({ success: true, message: 'تم استئناف الفترة' });
  } catch (err) {
    console.error('resume period:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 🆕 تعديل الحد الأقصى للحجوزات (max-bookings)
// ═══════════════════════════════════════════
router.patch('/:id/max-bookings', authenticate, authorize('admin', 'doctor', 'secretary'), (req, res) => {
  try {
    const periodId = Number(req.params.id);
    const { max_bookings } = req.body;

    if (max_bookings === undefined || max_bookings === null) {
      return res.status(400).json({ success: false, message: 'max_bookings مطلوب' });
    }

    const newMax = Number(max_bookings);

    if (isNaN(newMax) || newMax < 0 || newMax > 1000) {
      return res.status(400).json({ success: false, message: 'max_bookings يجب أن يكون بين 0 و 1000' });
    }

    const period = db.prepare('SELECT * FROM doctor_periods WHERE id = ?').get(periodId);

    if (!period) {
      return res.status(404).json({ success: false, message: 'الفترة غير موجودة' });
    }

    if (req.user.type === 'secretary') {
      if (!canManageDoctor(req.user.id, period.doctor_id)) {
        return res.status(403).json({
          success: false,
          message: 'لا تملك صلاحية إدارة هذا الطبيب'
        });
      }
    }

    const actualBookings = db.prepare(`
      SELECT COUNT(*) as count FROM appointments 
      WHERE period_id = ? AND status NOT IN ('cancelled', 'no_show')
    `).get(periodId);
    const booked = Math.max(period.booked_count || 0, actualBookings?.count || 0);

    if (newMax < booked) {
      return res.status(400).json({
        success: false,
        message: `لا يمكن تقليل السعة إلى ${newMax} — يوجد ${booked} مريض قاموا بالحجز بالفعل في هذه الفترة`
      });
    }

    db.prepare('UPDATE doctor_periods SET max_bookings = ? WHERE id = ?').run(newMax, periodId);

    res.json({
      success: true,
      message: 'تم تحديث الحد الأقصى إلى ' + newMax,
      data: {
        period_id: periodId,
        max_bookings: newMax,
        booked_count: period.booked_count,
        slots_available: newMax - period.booked_count
      }
    });
  } catch (err) {
    console.error('max-bookings:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;