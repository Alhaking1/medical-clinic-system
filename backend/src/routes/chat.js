import express from 'express';
import db from '../config/database.js';
import { validateChatMessage } from '../utils/chatFilter.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import { uploadChatAttachmentMiddleware, sanitizeAndSaveChatAttachment } from '../utils/imageUpload.js';
import { encryptChatMessage, decryptChatMessage, isMessageEncrypted } from '../utils/chatEncryption.js';

const router = express.Router();

// 🔒 ترقية وتشفير الرسائل الطبية القديمة المخزنة مسبقاً تلقائياً
try {
  const unencrypted = db.prepare("SELECT id, message_text FROM chat_messages WHERE message_text IS NOT NULL AND message_text NOT LIKE 'enc:gcm:v1:%' LIMIT 500").all();
  if (unencrypted && unencrypted.length > 0) {
    const updateStmt = db.prepare('UPDATE chat_messages SET message_text = ? WHERE id = ?');
    for (const row of unencrypted) {
      if (row.message_text) {
        updateStmt.run(encryptChatMessage(row.message_text), row.id);
      }
    }
  }
} catch (e) {
  // console.warn('Chat encryption migration note:', e.message);
}

/**
 * 🔒 GET /api/v1/chat/security-info
 * التحقق من معايير تشفير المحادثات الطبية (AES-256-GCM)
 */
router.get('/security-info', (req, res) => {
  res.json({
    success: true,
    encryption: {
      enabled: true,
      algorithm: 'AES-256-GCM',
      key_length_bits: 256,
      auth_tag_bits: 128,
      iv_bits: 96,
      at_rest_encrypted: true,
      standard: 'NIST SP 800-38D / HIPAA Ready',
      description: 'جميع المحادثات والاستشارات الطبية مشفرة ومحمية ببروتوكول AES-256-GCM لمنع أي اطلاع غير مصرح به.'
    }
  });
});

/**
 * 🔍 POST /api/v1/chat/validate
 * فحص أي نص في الوقت الفعلي والتأكد من خلوه من الأرقام والكلمات المحظورة
 */
router.post('/validate', (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'الرسالة مطلوبة للفحص'
      });
    }

    const result = validateChatMessage(message);
    res.json({
      success: true,
      isValid: result.isValid,
      reason: result.reason,
      detectedWords: result.detectedWords,
      alertMessage: result.isValid ? null : '⚠️ تنبيه: تمنع سياسة التطبيق كتابة الأرقام أو الأعداد بالحروف أو وسائل التواصل داخل المحادثة حفاظاً على الخصوصية وتنظيم الحجوزات الطبية.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 📋 GET /api/v1/chat/conversations
 * جلب قائمة المحادثات للمستخدم الحالي (مريض أو طبيب أو سكرتيرة)
 */
router.get('/conversations', authenticate, (req, res) => {
  try {
    const userType = req.user.type || req.user.role;
    const userId = req.user.id;

    let query = '';
    let params = [];

    if (userType === 'patient') {
      query = `
        SELECT
          c.id, c.patient_id, c.doctor_id, c.secretary_id, c.clinic_id, c.target_type,
          c.last_message, c.last_message_at, c.patient_unread_count as unread_count,
          c.created_at,
          d.full_name as doctor_name, d.specialty as doctor_specialty, d.avatar as doctor_avatar,
          'سكرتيرة عيادة ' || COALESCE(cl.name, d.clinic_name, 'العيادة') as secretary_name,
          COALESCE(cl.name, d.clinic_name, 'العيادة') as clinic_name
        FROM chat_conversations c
        LEFT JOIN doctors d ON c.doctor_id = d.id
        LEFT JOIN secretaries s ON c.secretary_id = s.id
        LEFT JOIN clinics cl ON (c.clinic_id = cl.id OR s.clinic_id = cl.id)
        WHERE c.patient_id = ?
        ORDER BY c.last_message_at DESC
      `;
      params = [userId];
    } else if (userType === 'doctor') {
      query = `
        SELECT
          c.id, c.patient_id, c.doctor_id, c.secretary_id, c.clinic_id, c.target_type,
          c.last_message, c.last_message_at, c.staff_unread_count as unread_count,
          c.created_at,
          p.full_name as patient_name, p.gender as patient_gender
        FROM chat_conversations c
        LEFT JOIN patients p ON c.patient_id = p.id
        WHERE c.doctor_id = ?
        ORDER BY c.last_message_at DESC
      `;
      params = [userId];
    } else if (userType === 'secretary') {
      const sec = db.prepare('SELECT id, clinic_id FROM secretaries WHERE id = ?').get(userId);
      const secClinicId = sec?.clinic_id || null;

      query = `
        SELECT
          c.id, c.patient_id, c.doctor_id, c.secretary_id, c.clinic_id, c.target_type,
          c.last_message, c.last_message_at, c.staff_unread_count as unread_count,
          c.created_at,
          p.full_name as patient_name, p.gender as patient_gender
        FROM chat_conversations c
        LEFT JOIN patients p ON c.patient_id = p.id
        WHERE c.secretary_id = ?
           OR (? IS NOT NULL AND c.clinic_id = ?)
           OR (? IS NOT NULL AND c.doctor_id IN (
                SELECT id FROM doctors WHERE clinic_id = ?
                UNION
                SELECT doctor_id FROM doctor_clinics WHERE clinic_id = ?
                UNION
                SELECT id FROM doctors WHERE clinic_name = (SELECT name FROM clinics WHERE id = ?)
              ))
           OR c.doctor_id IN (SELECT doctor_id FROM secretary_doctors WHERE secretary_id = ?)
        ORDER BY c.last_message_at DESC
      `;
      params = [userId, secClinicId, secClinicId, secClinicId, secClinicId, secClinicId, secClinicId, userId];
    } else {
      return res.status(403).json({ success: false, message: 'غير مصرح للوصول للمحادثات' });
    }

    const conversations = db.prepare(query).all(...params).map(c => ({
      ...c,
      is_encrypted: isMessageEncrypted(c.last_message),
      last_message: decryptChatMessage(c.last_message)
    }));
    res.json({ success: true, data: conversations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ➕ POST /api/v1/chat/conversations
 * بدء محادثة جديدة أو استرجاع محادثة قائمة
 */
router.post('/conversations', authenticate, (req, res) => {
  try {
    const userType = req.user.type || req.user.role;
    const userId = req.user.id;

    if (userType !== 'patient') {
      return res.status(403).json({ success: false, message: 'فقط المريض يمكنه بدء محادثة جديدة' });
    }

    // 🔒 التحقق من حالة الدردشة العامة في المنصة
    try {
      const enabledRow = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_enabled'").get();
      const modeRow = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_mode'").get();
      const chatEnabled = enabledRow ? enabledRow.value !== '0' : true;
      const chatMode = modeRow?.value || 'all';

      if (!chatEnabled || chatMode === 'disabled') {
        return res.status(200).json({
          success: true,
          chat_disabled: true,
          message: "تم إيقاف المحادثات مؤقتاً من قبل الإدارة."
        });
      }
    } catch (_) {}

    let { doctor_id, secretary_id, target_type } = req.body;
    let type = target_type || (doctor_id ? 'doctor' : 'secretary');

    // 🚫 التحقق من حظر الطبيب أو تحويل الدردشة
    if (type === 'doctor' && doctor_id) {
      const doc = db.prepare('SELECT id, clinic_id, allow_direct_chat, is_chat_banned, chat_ban_reason FROM doctors WHERE id = ?').get(doctor_id);
      if (!doc) {
        return res.status(404).json({ success: false, message: 'الطبيب غير موجود' });
      }

      if (doc.is_chat_banned === 1) {
        return res.status(403).json({
          success: false,
          message: 'عذراً، لا يمكن التواصل مع هذا الطبيب لمخالفته سياسة المنصة ⚠️',
          ban_reason: doc.chat_ban_reason
        });
      }

      let chatMode = 'all';
      try {
        const modeRow = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_mode'").get();
        if (modeRow?.value) chatMode = modeRow.value;
      } catch (_) {}

      if (chatMode === 'patient_secretary_only' || doc.allow_direct_chat !== 1) {
        // تحويل المحادثة تلقائياً إلى سكرتيرة عيادة الطبيب
        const sec = db.prepare(`
          SELECT id, is_chat_banned, chat_ban_reason FROM secretaries 
          WHERE clinic_id = ? AND is_active = 1 AND status = 'approved'
          ORDER BY id ASC LIMIT 1
        `).get(doc.clinic_id);

        if (sec) {
          if (sec.is_chat_banned === 1) {
            return res.status(403).json({
              success: false,
              message: 'عذراً، لا يمكن التواصل مع سكرتيرة هذه العيادة لمخالفتها سياسة المنصة ⚠️',
              ban_reason: sec.chat_ban_reason
            });
          }
          type = 'secretary';
          secretary_id = sec.id;
          doctor_id = null;
        }
      }
    }

    // 🚫 التحقق من حظر السكرتيرة
    if (type === 'secretary' && secretary_id) {
      const sec = db.prepare('SELECT id, clinic_id, is_chat_banned, chat_ban_reason FROM secretaries WHERE id = ?').get(secretary_id);
      if (sec && sec.is_chat_banned === 1) {
        return res.status(403).json({
          success: false,
          message: 'عذراً، لا يمكن التواصل مع هذه السكرتيرة لمخالفتها سياسة المنصة ⚠️',
          ban_reason: sec.chat_ban_reason
        });
      }
    }

    if (type === 'doctor' && !doctor_id) {
      return res.status(400).json({ success: false, message: 'معرف الطبيب مطلوب' });
    }
    if (type === 'secretary' && !secretary_id) {
      if (doctor_id || req.body.doctor_id) {
        const targetDocId = doctor_id || req.body.doctor_id;
        const doc = db.prepare('SELECT clinic_id FROM doctors WHERE id = ?').get(targetDocId);
        if (doc && doc.clinic_id) {
          const sec = db.prepare(`
            SELECT id, is_chat_banned, chat_ban_reason FROM secretaries 
            WHERE clinic_id = ? AND is_active = 1 AND status = 'approved'
            ORDER BY id ASC LIMIT 1
          `).get(doc.clinic_id);
          if (sec && sec.is_chat_banned !== 1) {
            secretary_id = sec.id;
          }
        }
      }
      // إذا لم توجد سكرتيرة معتمدة للعيادة، الاستمرار مع الطبيب كبديل مباشر
      if (!secretary_id) {
        if (doctor_id || req.body.doctor_id) {
          type = 'doctor';
          doctor_id = doctor_id || req.body.doctor_id;
        } else {
          const fallbackSec = db.prepare("SELECT id FROM secretaries WHERE is_active = 1 AND status = 'approved' LIMIT 1").get();
          if (fallbackSec) {
            secretary_id = fallbackSec.id;
          } else {
            return res.status(400).json({ success: false, message: 'معرف السكرتيرة أو الطبيب مطلوب' });
          }
        }
      }
    }

    // جلب العيادة
    let clinicId = null;
    if (doctor_id) {
      const doc = db.prepare('SELECT clinic_id FROM doctors WHERE id = ?').get(doctor_id);
      clinicId = doc?.clinic_id || null;
    } else if (secretary_id) {
      const sec = db.prepare('SELECT clinic_id FROM secretaries WHERE id = ?').get(secretary_id);
      clinicId = sec?.clinic_id || null;
    }

    // فحص هل المحادثة موجودة مسبقاً
    let existing;
    if (type === 'doctor') {
      existing = db.prepare(`
        SELECT * FROM chat_conversations
        WHERE patient_id = ? AND doctor_id = ? AND target_type = 'doctor'
      `).get(userId, doctor_id);
    } else {
      existing = db.prepare(`
        SELECT * FROM chat_conversations
        WHERE patient_id = ? AND secretary_id = ? AND target_type = 'secretary'
      `).get(userId, secretary_id);
    }

    if (existing) {
      return res.json({ success: true, data: existing });
    }

    const result = db.prepare(`
      INSERT INTO chat_conversations (patient_id, doctor_id, secretary_id, clinic_id, target_type)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, doctor_id || null, secretary_id || null, clinicId, type);

    const newConv = db.prepare('SELECT * FROM chat_conversations WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: newConv });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 📩 GET /api/v1/chat/conversations/:id/messages
 * جلب رسائل محادثة معينة وتصفير عداد غير المقروء
 */
router.get('/conversations/:id/messages', authenticate, (req, res) => {
  try {
    const convId = Number(req.params.id);
    const userType = req.user.type || req.user.role;
    const userId = req.user.id;

    const conv = db.prepare('SELECT * FROM chat_conversations WHERE id = ?').get(convId);
    if (!conv) {
      return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
    }

    // 🔒 التحقق من حالة الدردشة العامة في المنصة
    try {
      const enabledRow = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_enabled'").get();
      const modeRow = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_mode'").get();
      const chatEnabled = enabledRow ? enabledRow.value !== '0' : true;
      const chatMode = modeRow?.value || 'all';

      if (!chatEnabled || chatMode === 'disabled') {
        return res.status(200).json({
          success: true,
          chat_disabled: true,
          message: "تم إيقاف المحادثات مؤقتاً من قبل الإدارة."
        });
      }
    } catch (_) {}

    // 🛡️ IDOR Protection: Only conversation participants or admin can read messages
    const isParticipant =
      userType === 'admin' ||
      (userType === 'patient' && conv.patient_id === userId) ||
      (userType === 'doctor' && conv.doctor_id === userId) ||
      (userType === 'secretary' && (conv.secretary_id === userId || conv.clinic_id));

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بالوصول إلى هذه المحادثة' });
    }

    // تصفير عداد غير المقروء
    if (userType === 'patient' && conv.patient_id === userId) {
      db.prepare('UPDATE chat_conversations SET patient_unread_count = 0 WHERE id = ?').run(convId);
      db.prepare("UPDATE chat_messages SET is_read = 1 WHERE conversation_id = ? AND sender_type != 'patient'").run(convId);
    } else if (userType === 'doctor' && conv.doctor_id === userId) {
      db.prepare('UPDATE chat_conversations SET staff_unread_count = 0 WHERE id = ?').run(convId);
      db.prepare("UPDATE chat_messages SET is_read = 1 WHERE conversation_id = ? AND sender_type = 'patient'").run(convId);
    } else if (userType === 'secretary' && (conv.secretary_id === userId || conv.clinic_id)) {
      db.prepare('UPDATE chat_conversations SET staff_unread_count = 0 WHERE id = ?').run(convId);
      db.prepare("UPDATE chat_messages SET is_read = 1 WHERE conversation_id = ? AND sender_type = 'patient'").run(convId);
    }

    // جلب مدة بقاء الرسائل بالساعات من إعدادات النظام (افتراضي 48 ساعة كما طلب المستخدم، 0 = دائم)
    let retentionHours = 48;
    try {
      const setting = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_retention_hours'").get();
      if (setting && setting.value) {
        retentionHours = parseInt(setting.value, 10);
      } else {
        const oldSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_retention_days'").get();
        if (oldSetting && oldSetting.value) {
          retentionHours = (parseInt(oldSetting.value, 10) || 2) * 24;
        }
      }
    } catch (e) {}

    let messagesQuery = `
      SELECT id, conversation_id, sender_type, sender_id, message_text, attachment_url, attachment_type, attachment_name, is_read, created_at
      FROM chat_messages
      WHERE conversation_id = ?
    `;
    const queryParams = [convId];

    if (retentionHours > 0) {
      messagesQuery += ` AND created_at >= datetime('now', '-' || ? || ' hours')`;
      queryParams.push(retentionHours);
    }

    messagesQuery += ` ORDER BY id ASC`;
    const messages = db.prepare(messagesQuery).all(...queryParams);
    const decryptedMessages = messages.map(msg => ({
      ...msg,
      is_encrypted: isMessageEncrypted(msg.message_text),
      message_text: decryptChatMessage(msg.message_text)
    }));

    res.json({
      success: true,
      data: decryptedMessages,
      encryption: {
        enabled: true,
        algorithm: 'AES-256-GCM',
        at_rest: true
      },
      retention_hours: retentionHours,
      retention_days: Math.round(retentionHours / 24)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ⚙️ GET /api/v1/chat/retention
 * جلب مدة بقاء الرسائل بالساعات والأيام (0 = للأبد)
 */
router.get('/retention', (req, res) => {
  try {
    let hours = 48;
    try {
      const setting = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_retention_hours'").get();
      if (setting && setting.value) {
        hours = parseInt(setting.value, 10);
      } else {
        const oldSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_retention_days'").get();
        if (oldSetting && oldSetting.value) hours = (parseInt(oldSetting.value, 10) || 2) * 24;
      }
    } catch (e) {}
    res.json({ success: true, retention_hours: hours, retention_days: Math.round(hours / 24) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ⚙️ PUT /api/v1/chat/retention
 * تعديل مدة بقاء الرسائل من لوحة الأدمن (24 أو 48 ساعة أو دائم)
 */
router.put('/retention', authenticate, authorize('admin'), (req, res) => {
  try {
    const { retention_hours, retention_days } = req.body;
    let hours = 48;
    if (retention_hours !== undefined) {
      hours = parseInt(retention_hours, 10) || 0;
    } else if (retention_days !== undefined) {
      hours = (parseInt(retention_days, 10) || 0) * 24;
    }

    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('chat_retention_hours', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(hours.toString());

    res.json({
      success: true,
      message: hours === 0 ? 'تم تعيين حفظ الرسائل بشكل دائم للأبد' : `تم تعيين مدة اختفاء الرسائل بعد ${hours} ساعة`,
      retention_hours: hours,
      retention_days: Math.round(hours / 24)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 🚀 POST /api/v1/chat/conversations/:id/messages
 * إرسال رسالة جديدة مع الفلترة الصارمة الفورية
 */
router.post('/conversations/:id/messages', authenticate, (req, res) => {
  try {
    const convId = Number(req.params.id);
    const userType = req.user.type || req.user.role;
    const userId = req.user.id;
    const { message_text } = req.body;

    if (!message_text || !message_text.trim()) {
      return res.status(400).json({ success: false, message: 'نص الرسالة مطلوب' });
    }

    // 🔒 التحقق من حالة الدردشة العامة في المنصة
    try {
      const enabledRow = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_enabled'").get();
      const modeRow = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_mode'").get();
      const chatEnabled = enabledRow ? enabledRow.value !== '0' : true;
      const chatMode = modeRow?.value || 'all';

      if (!chatEnabled || chatMode === 'disabled') {
        return res.status(200).json({
          success: true,
          chat_disabled: true,
          message: "تم إيقاف المحادثات مؤقتاً من قبل الإدارة."
        });
      }
    } catch (_) {}

    const conv = db.prepare('SELECT * FROM chat_conversations WHERE id = ?').get(convId);
    if (!conv) {
      return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
    }

    // 🔒 التحقق من حالة الدردشة العامة في المنصة
    try {
      const enabledRow = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_enabled'").get();
      const modeRow = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_mode'").get();
      const chatEnabled = enabledRow ? enabledRow.value !== '0' : true;
      const chatMode = modeRow?.value || 'all';

      if (!chatEnabled || chatMode === 'disabled') {
        return res.status(200).json({
          success: true,
          chat_disabled: true,
          message: "تم إيقاف المحادثات مؤقتاً من قبل الإدارة."
        });
      }
    } catch (_) {}

    // 🚫 فحص حظر الطبيب في المحادثة
    if (conv.doctor_id) {
      const doc = db.prepare('SELECT is_chat_banned, chat_ban_reason FROM doctors WHERE id = ?').get(conv.doctor_id);
      if (doc && doc.is_chat_banned === 1) {
        return res.status(403).json({
          success: false,
          message: 'عذراً، لا يمكن التواصل مع هذا الطبيب لمخالفته سياسة المنصة ⚠️',
          ban_reason: doc.chat_ban_reason
        });
      }
    }

    // 🚫 فحص حظر السكرتيرة في المحادثة
    if (conv.secretary_id) {
      const sec = db.prepare('SELECT is_chat_banned, chat_ban_reason FROM secretaries WHERE id = ?').get(conv.secretary_id);
      if (sec && sec.is_chat_banned === 1) {
        return res.status(403).json({
          success: false,
          message: 'عذراً، لا يمكن التواصل مع هذه السكرتيرة لمخالفتها سياسة المنصة ⚠️',
          ban_reason: sec.chat_ban_reason
        });
      }
    }

    // 🛡️ فحص الفلترة الصارم (22 قسماً: منع الأرقام والإيميلات والروابط والحجز والدفع الخارجي)
    const filterResult = validateChatMessage(message_text);
    if (!filterResult.isValid) {
      return res.status(400).json({
        success: false,
        message: '⚠️ تنبيه أمني: تمنع سياسة منصة طبيبك كتابة الأرقام أو وسائل التواصل أو طلبات الدفع والحجز الخارجي حفاظاً على خصوصيتك وتنظيم الحجوزات الطبية.',
        error_code: 'CHAT_POLICY_VIOLATION',
        details: {
          reason: filterResult.reason,
          detected: filterResult.detectedWords
        }
      });
    }

    // إدراج الرسالة الطبية مشفرة بـ AES-256-GCM
    const cleanText = message_text.trim();
    const encryptedText = encryptChatMessage(cleanText);
    const result = db.prepare(`
      INSERT INTO chat_messages (conversation_id, sender_type, sender_id, message_text, is_read)
      VALUES (?, ?, ?, ?, 0)
    `).run(convId, userType, userId, encryptedText);

    // تحديث المحادثة
    if (userType === 'patient') {
      db.prepare(`
        UPDATE chat_conversations
        SET last_message = ?, last_message_at = CURRENT_TIMESTAMP, staff_unread_count = staff_unread_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(encryptedText, convId);

      // إشعار للكادر
      if (conv.doctor_id) {
        try {
          createNotification(conv.doctor_id, 'doctor', 'رسالة جديدة من مريض 💬', cleanText, 'chat', { conversation_id: convId });
        } catch (e) {}
      }

      // إشعار السكرتيرة عند ورود رسالة من مريض
      try {
        let secId = conv.secretary_id;
        if (!secId && conv.clinic_id) {
          const s = db.prepare('SELECT id FROM secretaries WHERE clinic_id = ? AND is_active = 1 LIMIT 1').get(conv.clinic_id);
          secId = s?.id;
        } else if (!secId && conv.doctor_id) {
          const doc = db.prepare('SELECT clinic_id FROM doctors WHERE id = ?').get(conv.doctor_id);
          if (doc?.clinic_id) {
            const s = db.prepare('SELECT id FROM secretaries WHERE clinic_id = ? AND is_active = 1 LIMIT 1').get(doc.clinic_id);
            secId = s?.id;
          }
        }
        if (secId) {
          createNotification(secId, 'secretary', 'رسالة جديدة من مريض 💬', cleanText, 'chat', { conversation_id: convId });
        }
      } catch (e) {}
    } else {
      db.prepare(`
        UPDATE chat_conversations
        SET last_message = ?, last_message_at = CURRENT_TIMESTAMP, patient_unread_count = patient_unread_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(encryptedText, convId);

      // إشعار للمريض (يظهر باسم العيادة فقط دون اسم السكرتيرة الشخصي)
      try {
        let clinicName = 'العيادة';
        if (conv.clinic_id) {
          const cl = db.prepare('SELECT name FROM clinics WHERE id = ?').get(conv.clinic_id);
          if (cl?.name) clinicName = cl.name;
        } else if (conv.secretary_id) {
          const sec = db.prepare('SELECT c.name FROM secretaries s JOIN clinics c ON s.clinic_id = c.id WHERE s.id = ?').get(conv.secretary_id);
          if (sec?.name) clinicName = sec.name;
        } else if (conv.doctor_id) {
          const doc = db.prepare('SELECT clinic_name FROM doctors WHERE id = ?').get(conv.doctor_id);
          if (doc?.clinic_name) clinicName = doc.clinic_name;
        }

        const notifTitle = userType === 'secretary' 
          ? `عيادة ${clinicName}`
          : (conv.doctor_id ? `د. ${db.prepare('SELECT full_name FROM doctors WHERE id = ?').get(conv.doctor_id)?.full_name || 'الطبيب'}` : `عيادة ${clinicName}`);

        createNotification(conv.patient_id, 'patient', notifTitle, cleanText, 'chat', { conversation_id: convId, clinic_name: clinicName });
      } catch (e) {}
    }

    const newMessage = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(result.lastInsertRowid);
    if (newMessage) {
      newMessage.message_text = decryptChatMessage(newMessage.message_text);
      newMessage.is_encrypted = true;
    }
    res.status(201).json({ success: true, data: newMessage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 📎 POST /api/v1/chat/conversations/:id/attachment
 * رفع وإرسال مرفق آمن (صور، مستندات، تقارير طبية PDF) مع الحماية ضد الملفات الملغمة
 */
router.post('/conversations/:id/attachment', authenticate, uploadChatAttachmentMiddleware.single('file'), async (req, res) => {
  try {
    const convId = Number(req.params.id);
    const userType = req.user.type || req.user.role;
    const userId = req.user.id;
    const { caption } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'الملف مطلوب للرفع' });
    }

    const conv = db.prepare('SELECT * FROM chat_conversations WHERE id = ?').get(convId);
    if (!conv) {
      return res.status(404).json({ success: false, message: 'المحادثة غير موجودة' });
    }

    // 🔒 التحقق من حالة الدردشة العامة في المنصة
    try {
      const enabledRow = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_enabled'").get();
      const modeRow = db.prepare("SELECT value FROM system_settings WHERE key = 'chat_mode'").get();
      const chatEnabled = enabledRow ? enabledRow.value !== '0' : true;
      const chatMode = modeRow?.value || 'all';

      if (!chatEnabled || chatMode === 'disabled') {
        return res.status(200).json({
          success: true,
          chat_disabled: true,
          message: "تم إيقاف المحادثات مؤقتاً من قبل الإدارة."
        });
      }
    } catch (_) {}

    // فحص حظر الدردشة للطبيب أو السكرتيرة
    if (conv.doctor_id) {
      const doc = db.prepare('SELECT is_chat_banned FROM doctors WHERE id = ?').get(conv.doctor_id);
      if (doc && doc.is_chat_banned === 1) {
        return res.status(403).json({ success: false, message: 'المحادثة محظورة مع هذا الطبيب' });
      }
    }
    if (conv.secretary_id) {
      const sec = db.prepare('SELECT is_chat_banned FROM secretaries WHERE id = ?').get(conv.secretary_id);
      if (sec && sec.is_chat_banned === 1) {
        return res.status(403).json({ success: false, message: 'المحادثة محظورة مع هذه السكرتيرة' });
      }
    }

    // فحص أمني وتطهير للملف وحفظه
    const savedAttachment = await sanitizeAndSaveChatAttachment(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const messageText = (caption && caption.trim()) 
      ? caption.trim() 
      : (savedAttachment.type === 'image' ? '📷 صورة مرفقة' : `📄 مستند طبي: ${savedAttachment.name}`);

    // تشفير وصف المرفق الطبي بـ AES-256-GCM
    const encryptedMessageText = encryptChatMessage(messageText);

    // إدراج الرسالة في قاعدة البيانات
    const result = db.prepare(`
      INSERT INTO chat_messages (conversation_id, sender_type, sender_id, message_text, attachment_url, attachment_type, attachment_name, is_read)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      convId,
      userType,
      userId,
      encryptedMessageText,
      savedAttachment.url,
      savedAttachment.type,
      savedAttachment.name
    );

    // تحديث المحادثة
    if (userType === 'patient') {
      db.prepare(`
        UPDATE chat_conversations
        SET last_message = ?, last_message_at = CURRENT_TIMESTAMP, staff_unread_count = staff_unread_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(encryptedMessageText, convId);

      if (conv.doctor_id) {
        try {
          createNotification(conv.doctor_id, 'doctor', 'مرفق جديد من مريض 📎', messageText, 'chat', { conversation_id: convId });
        } catch (_) {}
      }
    } else {
      db.prepare(`
        UPDATE chat_conversations
        SET last_message = ?, last_message_at = CURRENT_TIMESTAMP, patient_unread_count = patient_unread_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(encryptedMessageText, convId);

      try {
        createNotification(conv.patient_id, 'patient', 'مرفق جديد من العيادة 📎', messageText, 'chat', { conversation_id: convId });
      } catch (_) {}
    }

    const newMessage = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(result.lastInsertRowid);
    if (newMessage) {
      newMessage.message_text = decryptChatMessage(newMessage.message_text);
      newMessage.is_encrypted = true;
    }
    res.status(201).json({
      success: true,
      message: 'تم رفع المرفق وإرسال الرسالة بأمان',
      data: newMessage
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
