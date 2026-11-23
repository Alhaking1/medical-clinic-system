import crypto from 'crypto';

// توليد رقم حجز فريد
export function generateBookingCode() {
  const year = new Date().getFullYear();
  const random = crypto.randomInt(0, 1000000)
    .toString()
    .padStart(6, '0');
  return `BK-${year}-${random}`;
}

// توليد رمز OTP
export function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

// التحقق من رقم الهاتف اليمني
export function isValidYemeniPhone(phone) {
  return /^7[0-9]{8}$/.test(phone);
}

// تنسيق التاريخ
export function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}