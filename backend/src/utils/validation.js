import db from '../config/database.js';

// ═══════════════════════════════════════════
// فحص تكرار phone داخل نفس الجدول
// ═══════════════════════════════════════════
export function checkPhoneExists(table, phone, excludeId = null) {
  try {
    if (!['doctors', 'secretaries', 'patients'].includes(table)) {
      throw new Error(`Invalid table: ${table}`);
    }

    const cleanPhone = String(phone).replace(/^(\+?967)/, '').trim();
    if (!cleanPhone) return { exists: false, ownerType: null };

    let query = `SELECT id FROM ${table} WHERE phone = ?`;
    const params = [cleanPhone];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const row = db.prepare(query).get(...params);

    if (row) {
      const ownerType = table === 'doctors' ? 'doctor'
        : table === 'secretaries' ? 'secretary'
        : 'patient';
      return { exists: true, ownerType, id: row.id };
    }

    return { exists: false, ownerType: null };
  } catch (err) {
    console.error('❌ checkPhoneExists:', err.message);
    return { exists: false, ownerType: null, error: err.message };
  }
}

// ═══════════════════════════════════════════
// فحص تكرار email داخل نفس الجدول
// ═══════════════════════════════════════════
export function checkEmailExists(table, email, excludeId = null) {
  try {
    if (!['doctors', 'secretaries', 'patients'].includes(table)) {
      throw new Error(`Invalid table: ${table}`);
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!cleanEmail) return { exists: false, ownerType: null };

    // patients.email قد لا يوجد في كل النسخ — نحمي الفحص
    let query = `SELECT id FROM ${table} WHERE LOWER(email) = ?`;
    const params = [cleanEmail];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const row = db.prepare(query).get(...params);

    if (row) {
      const ownerType = table === 'doctors' ? 'doctor'
        : table === 'secretaries' ? 'secretary'
        : 'patient';
      return { exists: true, ownerType, id: row.id };
    }

    return { exists: false, ownerType: null };
  } catch (err) {
    console.error('❌ checkEmailExists:', err.message);
    return { exists: false, ownerType: null, error: err.message };
  }
}

// ═══════════════════════════════════════════
// رسالة خطأ موحدة
// ═══════════════════════════════════════════
export function buildDuplicateMessage(type, ownerType) {
  const typeAr = type === 'phone' ? 'الرقم' : 'البريد الإلكتروني';
  const ownerAr = ownerType === 'doctor' ? 'طبيب'
    : ownerType === 'secretary' ? 'سكرتيرة'
    : 'مريض';
  return `${typeAr} مستخدم كـ ${ownerAr}`;
}

// ═══════════════════════════════════════════
// جلب موظف (طبيب/سكرتيرة) بـ phone أو email
// للاستخدام في login
// ═══════════════════════════════════════════
export function getStaffByLogin(login, role) {
  try {
    const table = role === 'doctor' ? 'doctors' : 'secretaries';
    const cleanLogin = String(login).trim();
    const cleanPhone = cleanLogin.replace(/^(\+?967)/, '');
    const cleanEmail = cleanLogin.toLowerCase();

    // جرّب email أولاً (إن كان يحتوي @)
    if (cleanLogin.includes('@')) {
      const byEmail = db.prepare(`
        SELECT * FROM ${table}
        WHERE LOWER(email) = ?
        ${table === 'doctors' ? 'AND is_deleted = 0' : ''}
      `).get(cleanEmail);

      if (byEmail) return { user: byEmail, method: 'email' };
    }

    // جرّب phone
    const byPhone = db.prepare(`
      SELECT * FROM ${table}
      WHERE phone = ?
      ${table === 'doctors' ? 'AND is_deleted = 0' : ''}
    `).get(cleanPhone);

    if (byPhone) return { user: byPhone, method: 'phone' };

    return { user: null, method: null };
  } catch (err) {
    console.error('❌ getStaffByLogin:', err.message);
    return { user: null, method: null, error: err.message };
  }
}