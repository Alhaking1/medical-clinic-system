import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, '../../uploads');

// تأكد من وجود مجلدات الرفع
['avatars', 'clinics', 'chat'].forEach((dir) => {
  const full = path.join(uploadsRoot, dir);
  if (!fs.existsSync(full)) {
    fs.mkdirSync(full, { recursive: true });
  }
});

// إعداد multer للتخزين في الذاكرة لفحص ومعالجة الصورة قبل حفظها على القرص
const storage = multer.memoryStorage();

export const uploadImageMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 ميجابايت كحد أقصى
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('صيغة الملف غير مدعومة. يسمح فقط بصور JPG أو PNG أو WebP.'));
    }
  },
});

/**
 * 🛡️ فحص ومعالجة وتطهير الصورة (Sanitize & Optimize)
 * - تجريد كامل لبيانات EXIF والبيانات الوصفية التي قد تحوي أكواد خبيثة.
 * - إعادة تشفير الصورة إلى WebP أو JPEG نقي ومضغوط.
 * - تعديل الأبعاد للأبعاد المناسبة (مثلاً 512x512 للبروفايل، أو 1024x768 للعيادات).
 *
 * @param {Buffer} buffer - بافر الصورة الأصلية
 * @param {string} subfolder - المجلد الفرعي ('avatars' أو 'clinics')
 * @param {object} options - خيارات الأبعاد { width, height, fit }
 * @returns {Promise<string>} مسار الملف النسبي (مثلاً /uploads/avatars/abc.webp)
 */
export async function sanitizeAndSaveImage(buffer, subfolder = 'avatars', options = {}) {
  const targetDir = path.join(uploadsRoot, subfolder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const filename = `${subfolder}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.webp`;
  const filePath = path.join(targetDir, filename);

  const width = options.width || (subfolder === 'avatars' ? 512 : 1080);
  const height = options.height || (subfolder === 'avatars' ? 512 : 1080);
  const fit = options.fit || 'inside';

  // معالجة آمنة ومحسنة بواسطة sharp (تحويل إلى WebP وضغط متقدم):
  // 1. يرفض الملفات غير الصورية تلقائياً في حال وجود بايتات تالفة أو نصوص shell.
  // 2. يجرّد كل الـ metadata و EXIF tags لتقليل الحجم ومنع الاختراق.
  // 3. يقلص الأبعاد إلى حد أقصى 1080p ويحول الصيغة إلى WebP (توفير 70% من الحجم وسرعة تحميل 5x).
  await sharp(buffer)
    .resize(width, height, { fit, withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toFile(filePath);

  return `/uploads/${subfolder}/${filename}`;
}

/**
 * 🛡️ ميدلوير رفع مستندات وملفات الدردشة الآمنة
 * - يسمح فقط بـ: PDF, JPG, PNG, WebP
 * - يمنع منعاً باتاً: EXE, JS, PHP, SH, BAT, SVG, HTML أو أي امتدادات تنفيذية
 * - حجم أقصى 10 ميجابايت للمستندات والتقارير الطبية
 */
export const uploadChatAttachmentMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 ميجابايت
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];

    if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مسموح به. يسمح فقط بالصور (JPG, PNG, WebP) والتقارير الطبية والمستندات بصيغة PDF.'));
    }
  },
});

/**
 * 🛡️ حفظ ومعالجة مرفقات الدردشة الطبية بأمان
 */
export async function sanitizeAndSaveChatAttachment(buffer, originalname, mimetype) {
  const targetDir = path.join(uploadsRoot, 'chat');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const ext = path.extname(originalname).toLowerCase();
  const safeRandom = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // إذا كانت صورة: إعادة معالجة وتشفير وتجريد البيانات الوصفية بـ Sharp إلى 1080p و WebP
  if (mimetype.startsWith('image/')) {
    const filename = `chat_${safeRandom}.webp`;
    const filePath = path.join(targetDir, filename);

    await sharp(buffer)
      .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toFile(filePath);

    return {
      url: `/uploads/chat/${filename}`,
      type: 'image',
      name: path.basename(originalname, ext) + '.webp',
    };
  }

  // إذا كان PDF: التحقق من الترويسة السحرية %PDF- لمنع تلغيم الملفات
  if (mimetype === 'application/pdf' || ext === '.pdf') {
    const header = buffer.slice(0, 5).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      throw new Error('ملف PDF غير صالح أو ملغم، تم رفض الرفع.');
    }

    const filename = `doc_${safeRandom}.pdf`;
    const filePath = path.join(targetDir, filename);
    fs.writeFileSync(filePath, buffer);

    return {
      url: `/uploads/chat/${filename}`,
      type: 'document',
      name: originalname.replace(/[^\w\s.-]/gi, '_'),
    };
  }

  throw new Error('نوع المرفق غير مدعوم.');
}
