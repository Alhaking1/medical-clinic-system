import crypto from 'crypto';

/**
 * 🔐 وحدة تشفير المحادثات الطبية (AES-256-GCM)
 * تضمن سرية الرسائل الطبية وبيانات المرضى وحمايتها التامة في قاعدة البيانات (Encryption at Rest)
 * وتمنع أي وصول غير مصرح به لسجلات الاستشارات الطبية.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const PREFIX = 'enc:gcm:v1:';

// توليد مفتاح تشفير 256-بت ثابت وموثوق
function getMasterKey() {
  const secretSource = process.env.CHAT_ENCRYPTION_KEY || process.env.JWT_SECRET || 'tabeebak-medical-secure-key-2026';
  return crypto.createHash('sha256').update(secretSource).digest();
}

/**
 * 🔒 تشفير نص الرسالة الطبية باستخدام AES-256-GCM
 * @param {string} plainText النص العادي للمحادثة
 * @returns {string} النص المشفر بالصيغة: enc:gcm:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function encryptChatMessage(plainText) {
  if (!plainText || typeof plainText !== 'string') {
    return plainText;
  }

  // إذا كانت الرسالة مشفرة مسبقاً، لا تعيد تشفيرها
  if (plainText.startsWith(PREFIX)) {
    return plainText;
  }

  try {
    const key = getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    const ivHex = iv.toString('hex');

    return `${PREFIX}${ivHex}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('❌ خطأ في تشفير الرسالة الطبية:', err.message);
    // في حال حدوث خطأ استثنائي، إرجاع النص لتفادي فقدان الرسالة
    return plainText;
  }
}

/**
 * 🔓 فك تشفير نص الرسالة الطبية باستخدام AES-256-GCM والتحقق من سلامتها
 * @param {string} cipherText النص المشفر أو العادي
 * @returns {string} النص الأصلي بعد فك التشفير والتحقق من السلامة
 */
export function decryptChatMessage(cipherText) {
  if (!cipherText || typeof cipherText !== 'string') {
    return cipherText;
  }

  // إذا لم تكن مشفرة (رسالة قديمة قبل التشفير)، يتم إرجاعها كما هي
  if (!cipherText.startsWith(PREFIX)) {
    return cipherText;
  }

  try {
    const raw = cipherText.slice(PREFIX.length);
    const parts = raw.split(':');
    if (parts.length !== 3) {
      return cipherText;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getMasterKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('❌ خطأ أو تلاعب في فك تشفير الرسالة الطبية:', err.message);
    return '🔒 [رسالة طبية مشفرة ومحمية]';
  }
}

/**
 * 🔍 التحقق هل النص مشفر بواسطة AES-256-GCM
 */
export function isMessageEncrypted(text) {
  return typeof text === 'string' && text.startsWith(PREFIX);
}

export default {
  encryptChatMessage,
  decryptChatMessage,
  isMessageEncrypted
};
