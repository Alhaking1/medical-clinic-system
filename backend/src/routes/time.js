import express from 'express';

const router = express.Router();

// ═══════════════════════════════════════════
// المنطقة الزمنية الافتراضية (اليمن)
// ═══════════════════════════════════════════
const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || 'Asia/Aden';

// ═══════════════════════════════════════════
// Helper: تحويل التاريخ الميلادي إلى هجري
// ═══════════════════════════════════════════
function toHijri(date) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: DEFAULT_TIMEZONE
    });

    const parts = formatter.formatToParts(date);
    const hijri = {
      day: null,
      month: null,
      year: null
    };

    parts.forEach(part => {
      if (part.type === 'day') hijri.day = part.value;
      if (part.type === 'month') hijri.month = part.value;
      if (part.type === 'year') hijri.year = part.value.replace(/\D/g, '');
    });

    if (hijri.day && hijri.month && hijri.year) {
      return `${hijri.year}-${hijri.month}-${hijri.day}`;
    }
    return null;
  } catch (err) {
    console.warn('⚠️ Hijri conversion failed:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════
// Helper: الحصول على اسم اليوم بالعربية
// ═══════════════════════════════════════════
function getArabicDayOfWeek(date) {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  try {
    const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
      weekday: 'long',
      timeZone: DEFAULT_TIMEZONE
    });
    return formatter.format(date);
  } catch (err) {
    // Fallback
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE }));
    return days[localDate.getDay()];
  }
}

// ═══════════════════════════════════════════
// GET /api/v1/time — الوقت الحالي + معلومات
// ═══════════════════════════════════════════
router.get('/', (req, res) => {
  try {
    const now = new Date();
    const timezone = req.query.timezone || DEFAULT_TIMEZONE;

    // UTC
    const timestamp_utc = now.toISOString();
    const timestamp_unix = Math.floor(now.getTime() / 1000);

    // Local time (يمن)
    const localParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(now);

    const get = (type) => localParts.find(p => p.type === type)?.value || '00';

    const year = get('year');
    const month = get('month');
    const day = get('day');
    const hour = get('hour');
    const minute = get('minute');
    const second = get('second');

    const local_date = `${year}-${month}-${day}`;
    const local_time_only = `${hour}:${minute}:${second}`;
    const local_iso = `${local_date}T${local_time_only}`;

    // Hijri
    const hijri_date = toHijri(now);

    // Day of week
    const day_of_week = getArabicDayOfWeek(now);

    // Offset (يمن = +03:00 دائماً)
    const offsetMinutes = 180;
    const offsetStr = `+${String(Math.floor(offsetMinutes / 60)).padStart(2, '0')}:${String(offsetMinutes % 60).padStart(2, '0')}`;

    res.json({
      success: true,
      data: {
        // UTC
        timestamp_utc,
        timestamp_unix,

        // Local (Yemen)
        timezone,
        offset: offsetStr,
        local_iso,
        local_date,
        local_time_only,
        local_year: parseInt(year),
        local_month: parseInt(month),
        local_day: parseInt(day),
        local_hour: parseInt(hour),
        local_minute: parseInt(minute),
        local_second: parseInt(second),

        // Calendar
        hijri_date,
        day_of_week,

        // Server info
        server_uptime_seconds: Math.floor(process.uptime()),
        node_version: process.version
      }
    });
  } catch (err) {
    console.error('خطأ في /time:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ═══════════════════════════════════════════
// POST /api/v1/time/validate — التحقق من تاريخ
// ═══════════════════════════════════════════
router.post('/validate', (req, res) => {
  try {
    const { date, time } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'date مطلوب (YYYY-MM-DD)'
      });
    }

    // التحقق من الصيغة
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'صيغة التاريخ يجب أن تكون YYYY-MM-DD'
      });
    }

    // مقارنة مع اليوم (بتوقيت اليمن)
    const now = new Date();
    const todayLocal = new Intl.DateTimeFormat('en-CA', {
      timeZone: DEFAULT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);

    const targetDate = new Date(`${date}T00:00:00+03:00`);
    const today = new Date(`${todayLocal}T00:00:00+03:00`);

    const diffDays = Math.floor((targetDate - today) / (1000 * 60 * 60 * 24));

    const result = {
      date,
      time: time || null,
      today: todayLocal,
      diff_days: diffDays,
      is_past: diffDays < 0,
      is_today: diffDays === 0,
      is_tomorrow: diffDays === 1,
      is_future: diffDays > 0,
      is_within_90_days: diffDays >= 0 && diffDays <= 90,
      is_valid_booking_date: diffDays >= 0 && diffDays <= 90
    };

    // التحقق الإضافي للوقت
    if (time) {
      if (!/^\d{2}:\d{2}$/.test(time)) {
        return res.status(400).json({
          success: false,
          message: 'صيغة الوقت يجب أن تكون HH:mm'
        });
      }
      result.time_valid_format = true;
    }

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

export default router;
