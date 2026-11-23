import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// ============================================================
// 🛡️ sanitizeText — تنظيف النصوص من HTML/JS/SQL
// ============================================================
export function sanitizeText(input, maxLength = 500) {
  if (input === undefined || input === null) return null;
  if (typeof input !== 'string') return null;

  let clean = input
    // إزالة HTML tags
    .replace(/<[^>]*>/g, '')
    // إزالة < و >
    .replace(/[<>]/g, '')
    // إزالة null bytes
    .replace(/\0/g, '')
    // إزالة javascript: و data: (قد تُستخدم في XSS)
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    // إزالة on* event handlers (onclick, onerror, ...)
    .replace(/on\w+\s*=/gi, '')
    // إزالة علامات اقتباس خطرة (اختياري — قد نحتاجها للنص العربي)
    // .replace(/['"`]/g, '')
    // إزالة المسافات الزائدة
    .trim();

  // حد الطول
  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength);
  }

  return clean || null;
}

// ============================================================
// 🛡️ sanitizeNumber — تحويل آمن لرقم
// ============================================================
export function sanitizeNumber(input, min = null, max = null) {
  if (input === undefined || input === null || input === '') return null;

  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) return null;

  if (min !== null && num < min) return null;
  if (max !== null && num > max) return null;

  return num;
}

// ============================================================
// 🛡️ sanitizeId — تحقق من ID (عدد صحيح موجب)
// ============================================================
export function sanitizeId(input) {
  if (input === undefined || input === null || input === '') return null;
  const num = Number(input);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

// ============================================================
// 🛡️ validateImageSignature — التحقق من magic bytes للصورة
// ============================================================
export function validateImageSignature(filePath) {
  const signatures = {
    jpeg: [0xFF, 0xD8, 0xFF],
    png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    gif: [0x47, 0x49, 0x46, 0x38],  // GIF8
    webp: null,  // خاص — يُفحص بشكل مختلف
  };

  try {
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    // JPEG
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'jpeg';
    }

    // PNG
    if (
      buffer[0] === 0x89 && buffer[1] === 0x50 &&
      buffer[2] === 0x4E && buffer[3] === 0x47 &&
      buffer[4] === 0x0D && buffer[5] === 0x0A &&
      buffer[6] === 0x1A && buffer[7] === 0x0A
    ) {
      return 'png';
    }

    // GIF
    if (
      buffer[0] === 0x47 && buffer[1] === 0x49 &&
      buffer[2] === 0x46 && buffer[3] === 0x38
    ) {
      return 'gif';
    }

    // WEBP: RIFF....WEBP
    if (
      buffer[0] === 0x52 && buffer[1] === 0x49 &&
      buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 &&
      buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
      return 'webp';
    }

    return null;  // غير معروف — خطر
  } catch (err) {
    console.error('خطأ في قراءة الملف:', err.message);
    return null;
  }
}

// ============================================================
// 🛡️ sanitizeAndReencodeImage — إعادة ترميز الصورة (لإزالة أي شيء مخفي)
// ============================================================
export async function sanitizeAndReencodeImage(inputPath, outputPath) {
  try {
    // 1. اقرأ metadata
    const metadata = await sharp(inputPath).metadata();

    // 2. تحقق من الأبعاد (منع image bomb)
    const MAX_DIMENSION = 4000;
    if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
      // صغّر الصورة
      await sharp(inputPath)
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .rotate()   // ✅ احترم EXIF orientation ثم احذفه
        .jpeg({ quality: 85 })   // ✅ تحويل إلى JPEG موحّد
        .toFile(outputPath);
    } else {
      // أعد الترميز فقط
      await sharp(inputPath)
        .rotate()
        .jpeg({ quality: 85 })
        .toFile(outputPath);
    }

    return {
      success: true,
      width: metadata.width,
      height: metadata.height,
      format: 'jpeg',
    };
  } catch (err) {
    console.error('خطأ في إعادة ترميز الصورة:', err.message);
    return { success: false, error: err.message };
  }
}

// ============================================================
// 🛡️ safeDeleteFile — حذف آمن
// ============================================================
export function safeDeleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error('خطأ في حذف الملف:', err.message);
    return false;
  }
}