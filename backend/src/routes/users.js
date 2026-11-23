import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads/avatars');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer memory storage as required
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('الملف المرفوع يجب أن يكون صورة فقط'));
    }
  },
});

/**
 * POST /api/v1/users/upload-avatar
 * معالجة وتغيير حجم الصورة إلى 400x400 بصيغة WebP وحفظها في قاعدة البيانات للمستخدم
 */
router.post('/upload-avatar', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'يرجى اختيار صورة لرفعها',
      });
    }

    // 🛡️ فحص أمني: الحد الأقصى للحجم 3 ميجابايت
    if (req.file.size > 3 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'حجم الصورة كبير جداً: الحد الأقصى المسموح به هو 3 ميجابايت',
      });
    }

    // 🛡️ فحص التلغيم والبرمجيات الخبيثة المضمنة
    const bufferString = req.file.buffer.toString('binary').toLowerCase();
    const dangerousSignatures = [
      '<?php', '<script', '<html', '<svg', 'javascript:',
      'onerror=', 'onload=', 'eval(', 'base64_decode',
      'exec(', 'system(', 'passthru(', 'shell_exec(',
      '<!entity', '<!doctype', '/bin/sh', '/bin/bash',
      'powershell', 'cmd.exe', 'mshta', 'cscript'
    ];
    if (dangerousSignatures.some(sig => bufferString.includes(sig))) {
      return res.status(400).json({
        success: false,
        message: 'تم رفض الملف: تم رصد نصوص برمجية مشبوهة أو أكواد غير مصرح بها داخل الملف',
      });
    }

    const userId = req.user.id;
    const role = req.user.role || req.user.type || 'patient';
    const filename = `user_${role}_${userId}_${Date.now()}.webp`;
    const outputPath = path.join(uploadDir, filename);

    // معالجة الصورة باستخدام Sharp: اقتصاص مربع 400x400 وتوليد صيغة webp خفيفة
    await sharp(req.file.buffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 85, effort: 4 })
      .toFile(outputPath);

    const relativePath = `/uploads/avatars/${filename}`;
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const fullUrl = `${baseUrl}${relativePath}`;

    // حفظ الرابط في قاعدة البيانات وفق نوع المستخدم
    if (role === 'doctor') {
      db.prepare('UPDATE doctors SET avatar_url = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(relativePath, relativePath, userId);
    } else if (role === 'secretary') {
      db.prepare('UPDATE secretaries SET avatar_url = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(relativePath, relativePath, userId);
    } else if (role === 'admin') {
      db.prepare('UPDATE admins SET avatar_url = ? WHERE id = ?')
        .run(relativePath, userId);
    } else {
      // patient
      db.prepare('UPDATE patients SET avatar_url = ?, picture = ? WHERE id = ?')
        .run(relativePath, relativePath, userId);
    }

    return res.json({
      success: true,
      message: 'تم تحديث الصورة الشخصية بنجاح',
      avatar_url: fullUrl,
      data: {
        avatar_url: relativePath,
        full_url: fullUrl,
        user_id: userId,
        role: role,
      },
    });
  } catch (err) {
    console.error('Error uploading avatar:', err);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء معالجة ورفع الصورة: ' + err.message,
    });
  }
});

/**
 * GET /api/v1/users/me
 * جلب بيانات الملف الشخصي والصورة المحدثة للمستخدم المسجل
 */
router.get('/me', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role || req.user.type || 'patient';
    let user = null;

    if (role === 'doctor') {
      user = db.prepare('SELECT id, full_name, email, phone, specialty, clinic_name, avatar, avatar_url FROM doctors WHERE id = ?').get(userId);
    } else if (role === 'secretary') {
      user = db.prepare('SELECT id, full_name, email, phone, clinic_id, avatar, avatar_url FROM secretaries WHERE id = ?').get(userId);
    } else if (role === 'admin') {
      user = db.prepare('SELECT id, username, full_name, role, avatar_url FROM admins WHERE id = ?').get(userId);
    } else {
      user = db.prepare('SELECT id, full_name, email, phone, picture, avatar_url, age, gender, governorate, blood_group FROM patients WHERE id = ?').get(userId);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const avatar = user.avatar_url || user.avatar || user.picture;
    const fullAvatarUrl = avatar ? (avatar.startsWith('http') ? avatar : `${baseUrl}${avatar}`) : null;

    return res.json({
      success: true,
      data: {
        ...user,
        role,
        avatar_url: avatar,
        full_avatar_url: fullAvatarUrl,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
