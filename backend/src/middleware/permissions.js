import db from '../config/database.js';

// ═══════════════════════════════════════════
// الصلاحيات الافتراضية لكل نوع مستخدم
// ═══════════════════════════════════════════

export const DEFAULT_SECRETARY_PERMISSIONS = {
  // موجودة سابقاً
  view_queue: true,
  check_in: true,
  view_appointments: true,
  edit_appointments: true,
  view_patients: true,
  view_slots: true,
  manage_slots: true,
  view_payments: true,
  confirm_payments: false,
  manage_doctors: true,
  approve_doctors: true,

  // 🆕 الجديدة
  manage_schedules: true,     // إدارة القوالب الأسبوعية
  manage_periods: true,       // إدارة الفترات (stop/resume/max-bookings)
  delegate_doctors: true,     // إرسال طلبات تفويض
  receive_delegations: true,  // استقبال طلبات تفويض
};

// ═══════════════════════════════════════════
// قراءة صلاحيات مستخدم من DB
// ═══════════════════════════════════════════

export function getSecretaryPermissions(secretaryId) {
  try {
    const row = db.prepare('SELECT permissions FROM secretaries WHERE id = ?').get(secretaryId);
    if (!row) return {};

    let saved = {};
    try {
      saved = row.permissions ? JSON.parse(row.permissions) : {};
    } catch (e) {
      saved = {};
    }

    // دمج الافتراضية مع المحفوظة (المحفوظة لها الأولوية)
    return { ...DEFAULT_SECRETARY_PERMISSIONS, ...saved };
  } catch (err) {
    console.error('❌ getSecretaryPermissions:', err.message);
    return {};
  }
}

export const DEFAULT_DOCTOR_PERMISSIONS = {
  view_queue: true,
  receive_patient: true,
  view_appointments: true,
  view_patients: true,
  view_slots: true,
  medical_records: true,
  view_own_schedule: true,
  manage_schedule: true,
  prescriptions: true,
  chat_patients: true,
  video_consultations: true,
};

export function getDoctorPermissions(doctorId) {
  try {
    const row = db.prepare('SELECT permissions FROM doctors WHERE id = ?').get(doctorId);
    if (!row) return {};

    let saved = {};
    try {
      saved = row.permissions ? JSON.parse(row.permissions) : {};
    } catch (e) {
      saved = {};
    }

    return { ...DEFAULT_DOCTOR_PERMISSIONS, ...saved };
  } catch (err) {
    console.error('❌ getDoctorPermissions:', err.message);
    return {};
  }
}

// ═══════════════════════════════════════════
// فحص صلاحية محددة لمستخدم
// ═══════════════════════════════════════════

export function hasPermission(userType, userId, permission) {
  // Admin — كل الصلاحيات
  if (userType === 'admin') return true;

  // Doctor — من DB مع افتراضيات
  if (userType === 'doctor') {
    const perms = getDoctorPermissions(userId);
    return perms[permission] === true;
  }

  // Secretary — من DB
  if (userType === 'secretary') {
    const perms = getSecretaryPermissions(userId);
    return perms[permission] === true;
  }

  return false;
}

// ═══════════════════════════════════════════
// Middleware — يتطلب صلاحية محددة
// ═══════════════════════════════════════════

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'يجب تسجيل الدخول'
      });
    }

    const userType = req.user.type || req.user.role;
    const userId = req.user.id;

    if (hasPermission(userType, userId, permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `لا تملك صلاحية: ${permission}`,
      required_permission: permission
    });
  };
}

// ═══════════════════════════════════════════
// فحص هل السكرتيرة تدير طبيباً معيناً
// (عبر secretary_doctors أو التفويض النشط)
// ═══════════════════════════════════════════

export function canManageDoctor(secretaryId, doctorId) {
  try {
    // 1. فحص هل السكرتيرة والطبيب في نفس العيادة
    const sec = db.prepare('SELECT clinic_id FROM secretaries WHERE id = ?').get(secretaryId);
    if (sec && sec.clinic_id) {
      const inSameClinic = db.prepare(`
        SELECT 1 FROM doctors d
        LEFT JOIN doctor_clinics dc ON d.id = dc.doctor_id
        WHERE d.id = ? AND (dc.clinic_id = ? OR d.clinic_id = ? OR d.clinic_name = (SELECT name FROM clinics WHERE id = ?))
      `).get(doctorId, sec.clinic_id, sec.clinic_id, sec.clinic_id);
      if (inSameClinic) return true;
    }

    // 2. فحص الربط المباشر
    const directLink = db.prepare(
      'SELECT 1 FROM secretary_doctors WHERE secretary_id = ? AND doctor_id = ?'
    ).get(secretaryId, doctorId);

    if (directLink) return true;

    // 3. فحص التفويض النشط (اليوم داخل المدة)
    const today = new Date().toISOString().split('T')[0];
    const activeDelegation = db.prepare(`
      SELECT 1 FROM secretary_delegations
      WHERE to_secretary_id = ?
        AND doctor_id = ?
        AND status = 'accepted'
        AND valid_from <= ?
        AND valid_until >= ?
      LIMIT 1
    `).get(secretaryId, doctorId, today, today);

    if (activeDelegation) return true;

    // 4. الأدمن يدير كل شيء (لكن هذا يُفحص في المستوى الأعلى)
    return false;
  } catch (err) {
    console.error('❌ canManageDoctor:', err.message);
    return false;
  }
}

// ═══════════════════════════════════════════
// جلب قائمة أطباء السكرتيرة (مباشر + مفوّض + نفس العيادة)
// ═══════════════════════════════════════════

export function getManageableDoctorIds(secretaryId) {
  try {
    const sec = db.prepare('SELECT clinic_id FROM secretaries WHERE id = ?').get(secretaryId);
    let clinicDocIds = [];
    if (sec && sec.clinic_id) {
      const docs = db.prepare(`
        SELECT DISTINCT d.id FROM doctors d
        LEFT JOIN doctor_clinics dc ON d.id = dc.doctor_id
        WHERE d.is_deleted = 0 AND (dc.clinic_id = ? OR d.clinic_id = ? OR d.clinic_name = (SELECT name FROM clinics WHERE id = ?))
      `).all(sec.clinic_id, sec.clinic_id, sec.clinic_id);
      clinicDocIds = docs.map(d => d.id);
    }

    const today = new Date().toISOString().split('T')[0];

    const rows = db.prepare(`
      SELECT DISTINCT doctor_id FROM (
        SELECT doctor_id FROM secretary_doctors WHERE secretary_id = ?
        UNION
        SELECT doctor_id FROM secretary_delegations
        WHERE to_secretary_id = ?
          AND status = 'accepted'
          AND valid_from <= ?
          AND valid_until >= ?
      )
    `).all(secretaryId, secretaryId, today, today);

    const allIds = new Set([...clinicDocIds, ...rows.map(r => r.doctor_id)]);
    return Array.from(allIds);
  } catch (err) {
    console.error('❌ getManageableDoctorIds:', err.message);
    return [];
  }
}
