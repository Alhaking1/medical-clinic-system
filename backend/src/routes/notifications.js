import express from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ═══════════════════════════════════════════
// Helper: إنشاء إشعار
// ═══════════════════════════════════════════
export function createNotification(userId, userType, title, body, type = 'info', data = null) {
  try {
    const result = db.prepare(`
      INSERT INTO notifications (user_id, user_type, title, body, type, data)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, userType, title, body || null, type, data ? JSON.stringify(data) : null);

    console.log(`🔔 إشعار جديد → ${userType}:${userId} — ${title}`);
    return result.lastInsertRowid;
  } catch (e) {
    console.error('⚠️ فشل إنشاء إشعار:', e.message);
    return null;
  }
}

// ═══════════════════════════════════════════
// Helper: إرسال إشعار لجميع مدراء النظام (Admins)
// ═══════════════════════════════════════════
export function notifyAdmins(title, body, type = 'admin_alert', data = null) {
  try {
    const admins = db.prepare("SELECT id FROM admins WHERE is_active = 1").all();
    for (const adm of admins) {
      createNotification(adm.id, 'admin', title, body, type, data);
    }
  } catch (err) {
    console.error('⚠️ فشل إرسال إشعار للأدمن:', err.message);
  }
}

// ═══════════════════════════════════════════
// GET /notifications — إشعارات المستخدم
// ═══════════════════════════════════════════
router.get('/', authenticate, (req, res) => {
  try {
    const { unread_only } = req.query;
    const uType = req.user.type || req.user.role;
    const uRole = req.user.role || req.user.type;

    let query = `
      SELECT * FROM notifications
      WHERE user_id = ? AND (user_type = ? OR user_type = ?)
    `;
    const params = [req.user.id, uType, uRole];

    if (unread_only === '1') {
      query += ' AND is_read = 0';
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    let notifications = db.prepare(query).all(...params);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND (user_type = ? OR user_type = ?) AND is_read = 0
    `).get(req.user.id, uType, uRole);

    res.json({
      success: true,
      data: notifications,
      meta: {
        count: notifications.length,
        unread: unreadCount ? unreadCount.count : 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// GET /notifications/count — عدد غير المقروء
// ═══════════════════════════════════════════
router.get('/count', authenticate, (req, res) => {
  try {
    const uType = req.user.type || req.user.role;
    const uRole = req.user.role || req.user.type;
    const unread = db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND (user_type = ? OR user_type = ?) AND is_read = 0
    `).get(req.user.id, uType, uRole);

    res.json({
      success: true,
      data: { unread: unread ? unread.count : 0 }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// PATCH /notifications/:id/read
// ═══════════════════════════════════════════
router.patch('/:id/read', authenticate, (req, res) => {
  try {
    const uType = req.user.type || req.user.role;
    const uRole = req.user.role || req.user.type;
    db.prepare(`
      UPDATE notifications SET is_read = 1
      WHERE id = ? AND user_id = ? AND (user_type = ? OR user_type = ?)
    `).run(req.params.id, req.user.id, uType, uRole);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// PATCH /notifications/read-all
// ═══════════════════════════════════════════
router.patch('/read-all', authenticate, (req, res) => {
  try {
    const uType = req.user.type || req.user.role;
    const uRole = req.user.role || req.user.type;
    db.prepare(`
      UPDATE notifications SET is_read = 1
      WHERE user_id = ? AND (user_type = ? OR user_type = ?)
    `).run(req.user.id, uType, uRole);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════
// 📢 POST /notifications/broadcast
// إرسال إشعار عام من لوحة الأدمن (المرضى، الأطباء، السكرتيرات، أو الجميع)
// ═══════════════════════════════════════════
router.post('/broadcast', authenticate, (req, res) => {
  try {
    const role = req.user.role || req.user.type;
    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'صلاحية الأدمن مطلوبة لإرسال الإشعارات' });
    }

    const { target_group, title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'عنوان الإشعار ونصه مطلوبان' });
    }

    const usersToSend = [];

    if (target_group === 'patients' || target_group === 'all') {
      const patients = db.prepare('SELECT id FROM patients WHERE (is_blocked = 0 OR is_blocked IS NULL)').all();
      patients.forEach(p => usersToSend.push({ id: p.id, type: 'patient' }));
    }

    if (target_group === 'doctors' || target_group === 'all') {
      const doctors = db.prepare("SELECT id FROM doctors WHERE (is_deleted = 0 OR is_deleted IS NULL)").all();
      doctors.forEach(d => usersToSend.push({ id: d.id, type: 'doctor' }));
    }

    if (target_group === 'secretaries' || target_group === 'all') {
      const secs = db.prepare("SELECT id FROM secretaries").all();
      secs.forEach(s => usersToSend.push({ id: s.id, type: 'secretary' }));
    }

    const insertStmt = db.prepare(`
      INSERT INTO notifications (user_id, user_type, title, body, type, data)
      VALUES (?, ?, ?, ?, 'broadcast', ?)
    `);

    const insertMany = db.transaction((list) => {
      let count = 0;
      for (const u of list) {
        insertStmt.run(u.id, u.type, title, message, JSON.stringify({ broadcast: true, sent_at: new Date().toISOString() }));
        count++;
      }
      return count;
    });

    const totalSent = insertMany(usersToSend);

    res.json({
      success: true,
      message: `تم إرسال الإشعار بنجاح إلى ${totalSent} مستخدم`,
      count: totalSent,
      target_group: target_group || 'all'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;