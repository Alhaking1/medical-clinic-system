/**
 * 🔒 chatFilter.js
 * محرك الفلترة والرقابة الصارمة على رسائل الدردشة لمنع التواصل أو الدفع أو الحجز خارج المنصة
 *
 * يشمل القائمة الكاملة للأقسام 1 إلى 22:
 * 1. الأرقام الرقمية (العربية، الهندية، الفارسية، وأرقام الهواتف اليمنية والدولية).
 * 2. الأرقام المكتوبة بالعربية والمركبة والعامية.
 * 3. الأرقام المكتوبة بالإنجليزية والمركبة.
 * 4. كلمات طلب الحجز خارج التطبيق (عربي).
 * 5. كلمات طلب التواصل الخارجي (عربي).
 * 6. كلمات طلب الدفع الخارجي والبنوك والحوالات (عربي).
 * 7. كلمات طلب تغيير اللغة (عربي).
 * 8. البيانات الشخصية (عربي).
 * 9. كلمات الحجز الخارجي (إنجليزي).
 * 10. كلمات الدفع الخارجي (إنجليزي).
 * 11. كلمات ووسائل التواصل الخارجي والشبكات (إنجليزي).
 * 12. كلمات تغيير اللغة (إنجليزي).
 * 13. البيانات الشخصية (إنجليزي).
 * 14. كلمات الأعداد الإنجليزية المفرقة.
 * 15-18. الكلمات المحظورة بالفرنسية، التركية، الأردية/الهندية، والفارسية.
 * 19. الرموز والروابط المحظورة (@, http, .com, wa.me, t.me...).
 * 20. أنماط Regex الصارمة.
 * 21. الكلمات المشبوهة والسرية.
 * 22. منع الترجمة وتبديل اللغات.
 *
 * الخطوات المطبقة:
 * - الخطوة 1: تطبيع النص (الألف، التاء، الياء، التشكيل، التطويل، تحويل الأرقام، lowercase).
 * - الخطوة 2: تجميع الحروف المفردة والمفرقة (ت س ع ه -> تسعه, o n e -> one, 7 7 1 -> 771, تس عة -> تسعة).
 * - الخطوة 3: فحص النص العادي وفحص النص المدمج بدون مسافات (noSpaces).
 * - الخطوة 4: الفحوصات الأربعة (Regex، الكلمات المحظورة، تتابع الأعداد، واللغات الأجنبية).
 */

// ========================================================
// 1. قواميس الكلمات المحظورة (Normalized Roots)
// ========================================================

// 1.1 الأرقام المكتوبة بالعربية (الأساسية والمركبة)
export const ARABIC_NUMERAL_WORDS = [
  'صفر',
  'واحد', 'واحده', 'وحده', 'وحيد',
  'اثنين', 'اثنان', 'اثنتين', 'اثنتان', 'ثنتين', 'ثنتان',
  'ثلاثه', 'ثلاث', 'ثلاثة',
  'اربعه', 'اربع', 'أربعة', 'أربع',
  'خمسه', 'خمس', 'خمسة',
  'سته', 'ست', 'ستة',
  'سبعه', 'سبع', 'سبعة',
  'ثمانيه', 'ثمان', 'ثماني', 'ثمانية',
  'تسعه', 'تسع', 'تسعة',
  'عشره', 'عشر', 'عشرة',
  'احدعشر', 'احد عشر', 'أحد عشر',
  'اثناعشر', 'اثني عشر', 'اثنا عشر',
  'ثلاثةعشر', 'ثلاثهعشر', 'ثلاثة عشر', 'ثلاثه عشر',
  'اربعةعشر', 'اربعهعشر', 'أربعة عشر', 'اربعه عشر',
  'خمسةعشر', 'خمسهعشر', 'خمسة عشر', 'خمسه عشر',
  'ستةعشر', 'ستهعشر', 'ستة عشر', 'سته عشر',
  'سبعةعشر', 'سبعهعشر', 'سبعة عشر', 'سبعه عشر',
  'ثمانيةعشر', 'ثمانيهعشر', 'ثمانية عشر', 'ثمانيه عشر',
  'تسعةعشر', 'تسعهعشر', 'تسعة عشر', 'تسعه عشر',
  'عشرون', 'عشرين',
  'ثلاثون', 'ثلاثين',
  'اربعون', 'اربعين',
  'خمسون', 'خمسين',
  'ستون', 'ستين',
  'سبعون', 'سبعين',
  'ثمانون', 'ثمانين',
  'تسعون', 'تسعين',
  'مئة', 'مائه', 'مية', 'مئه', 'مئتان', 'مئتين',
  'الف', 'ألف', 'الفان', 'الفين', 'الاف', 'آلاف',
  'مليون', 'ملايين', 'مليار', 'مليارات'
];

// كلمات عددية عامية
export const ARABIC_NUMERICAL_COLLOQUIAL = [
  'كم', 'كام', 'قدايش', 'قد ايش', 'قديش',
  'رقم', 'ارقام', 'أرقام',
  'عدد', 'اعداد', 'أعداد', 'العدد'
];

// 1.2 الأرقام المكتوبة بالإنجليزية
export const ENGLISH_NUMERAL_WORDS = [
  'zero', 'oh',
  'one', 'won',
  'two', 'too', 'to',
  'three', 'tree',
  'four', 'for', 'fore',
  'five', 'fiv',
  'six', 'siks', 'sicks',
  'seven', 'sevn', 'sevin',
  'eight', 'ate', 'eit',
  'nine', 'nin', 'nayn',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen',
  'twenty', 'thirty', 'forty', 'fifty',
  'sixty', 'seventy', 'eighty', 'ninety',
  'hundred', 'thousand', 'million', 'billion'
];

export const ENGLISH_NUMERICAL_COLLOQUIAL = [
  'number', 'numbers', 'count', 'counting',
  'phonenumber', 'phone number', 'mobilenumber', 'mobile number', 'cellnumber', 'cell number'
];

// 1.3 كلمات طلب الحجز خارج التطبيق (عربي)
export const ARABIC_BOOKING_OUTSIDE = [
  'احجزلي', 'احجزيلي', 'احجز لي', 'احجزي لي',
  'احجزلي من', 'احجزيلي من',
  'احجزبدون', 'احجزيبدون', 'احجز بدون', 'احجزي بدون',
  'احجزلاحقا', 'احجزي لاحقا', 'احجز لاحقا',
  'احجزمباشر', 'احجزي مباشر', 'احجز مباشر',
  'احجزعندي', 'احجزي عندي', 'احجز عندي',
  'احجزخارج', 'احجزي خارج', 'احجز خارج',
  'بدونحجز', 'بدون حجز',
  'بدونموعد', 'بدون موعد',
  'منالباب', 'من الباب', 'منالبابا',
  'خارجالتطبيق', 'خارج التطبيق',
  'خارجالنظام', 'خارج النظام',
  'بدونالتطبيق', 'بدون التطبيق',
  'بدونالنظام', 'بدون النظام',
  'خارجالموقع', 'خارج الموقع',
  'بدونموقع', 'بدون موقع',
  'منخارج', 'من خارج',
  'بشكلخاص', 'بشكل خاص',
  'مباشره', 'مباشر',
  'احجزليالان', 'احجزيلي الان', 'احجزلي الان',
  'احجزلياليوم', 'احجز لي اليوم',
  'خارجالدور', 'خارج الدور',
  'بدوندور', 'بدون دور',
  'احجزبدوندفع', 'احجز بدون دفع'
];

// 1.4 كلمات طلب التواصل الخارجي (عربي)
export const ARABIC_CONTACT_OUTSIDE = [
  'كلمني', 'كلميني', 'كلمني على', 'كلميني على',
  'كلمني خاص', 'كلميني خاص', 'كلمنيخاص',
  'اتصلبي', 'اتصليبي', 'اتصل بي', 'اتصلي بي', 'اتصلعلي', 'اتصل علي',
  'راسلني', 'راسليني', 'راسلني على', 'راسليني على',
  'راسلنيخاص', 'راسليني خاص', 'راسلني خاص',
  'تواصلمعي', 'تواصل معي',
  'تواصلخاص', 'تواصل خاص',
  'تواصلعلى', 'تواصل على',
  'تعالخاص', 'تعالي خاص', 'تعال خاص',
  'تعالعندي', 'تعال عندي', 'تعالي عندي',
  'تعالللعيادة', 'تعال للعيادة', 'تعاليللعيادة', 'تعالي للعيادة',
  'تعالللمنزل', 'تعالي للمنزل', 'تعال للمنزل',
  'خابرني', 'خابريني', 'خابرني على',
  'دقلي', 'دقيلي', 'دقلي على', 'دق لي',
  'رنلي', 'رنيلي', 'رنلي على', 'رن لي',
  'خاصني', 'خاصيني',
  'ارسللي', 'ارسليلي', 'ارسل لي', 'ارسلي لي',
  'ابعتلي', 'ابعت لي', 'ابعتلي رساله', 'ابعتليرساله',
  'عندي شي', 'عنديشي',
  'بيني وبينك', 'بينيوينك', 'بينيوبينك', 'بيننا',
  'بلسانه', 'همس'
];

// 1.5 كلمات طلب الدفع خارج التطبيق (عربي)
export const ARABIC_PAYMENT_OUTSIDE = [
  'لاتدفع', 'لا تدفع', 'لاتدفعي', 'لا تدفعي',
  'بدوندفع', 'بدون دفع',
  'بدونرسوم', 'بدون رسوم',
  'بدونعموله', 'بدون عمولة', 'بدون عموله',
  'كاش', 'نقد', 'نقدي', 'كاشي',
  'فلوس', 'فلوسك',
  'دراهم', 'دراهمك',
  'حوالة', 'حواله', 'حوالهبنكيه', 'حواله بنكيه', 'حوالة بنكية',
  'تحويل', 'تحويلبنكي', 'تحويل بنكي',
  'حساببنكي', 'حساب بنكي',
  'رقمالحساب', 'رقم الحساب',
  'رقمالايبان', 'رقم الايبان', 'ايبان', 'iban',
  'بريدي', 'بريديبوست', 'بريدي بوست',
  'الكريمي', 'بنك الكريمي', 'بنكالـكريمي',
  'بنك', 'البنك', 'بنكي',
  'البنكالتجاري', 'البنك التجاري',
  'بنكالتضامن', 'بنك التضامن',
  'بنكاليمن', 'بنك اليمن',
  'دفعيدوي', 'دفع يدوي',
  'دفعمباشر', 'دفع مباشر',
  'دفعبدونفاتورة', 'دفع بدون فاتورة', 'دفعبدونإيصال', 'دفع بدون إيصال',
  'بدونفاتورة', 'بدون فاتورة', 'بدونإيصال', 'بدون إيصال',
  'خصم', 'خصملي', 'خصم لي',
  'خصمخاص', 'خصم خاص',
  'تخفيض', 'تخفيض خاص',
  'عرضخاص', 'عرض خاص',
  'سعرخاص', 'سعر خاص',
  'ببلاش', 'مجانا',
  'هديه', 'هدية',
  'مبلغ', 'مبلغك',
  'محفظه', 'محفظهالكترونيه', 'محفظة الكترونية',
  'جوالي', 'جوالك', 'جواله'
];

// 1.6 كلمات طلب تغيير اللغة أو الترجمة (عربي)
export const ARABIC_LANGUAGE_CHANGE = [
  'لغة', 'لغات', 'لغه',
  'لغةاخرى', 'لغة اخرى', 'لغةثانية', 'لغة ثانية', 'لغهاجنبيه', 'لغة أجنبية',
  'بالعربي', 'بالانجليزي', 'بالفرنسي', 'بالتركي', 'بالهندي', 'بالاوردو', 'بالفارسي', 'بالصيني',
  'عربي', 'انجليزي', 'فرنسي', 'تركي', 'هندي', 'اوردو', 'فارسي', 'صيني', 'روسي', 'اسباني', 'الماني', 'ايطالي', 'برتغالي',
  'غيرلغة', 'غير اللغة', 'بدلغة', 'بدل اللغة',
  'اتكلم', 'اتكلمبي', 'اتكلم بلغة',
  'ترجم', 'ترجملي', 'ترجم لي', 'ترجمة', 'ترجمه', 'مترجم',
  'انجليزية', 'عربيه', 'فرنسيه', 'تركيه', 'هنديه', 'فارسيه', 'صينيه', 'روسيه', 'اسبانية', 'المانية'
];

// 1.7 كلمات البيانات الشخصية (عربي)
export const ARABIC_PERSONAL_INFO = [
  'رقمي', 'رقمك', 'رقمه', 'رقمها', 'رقمهم',
  'جوالي', 'جوالك', 'جواله', 'جوالها',
  'موبايلي', 'موبايلك', 'موبايله',
  'تلفوني', 'تلفونك', 'هاتفي', 'هاتفك',
  'ايميلي', 'ايميلك', 'ايميله',
  'بريدي', 'بريدك', 'بريده',
  'بريديالالكتروني', 'بريدك الالكتروني', 'بريدي الالكتروني',
  'حسابي', 'حسابك', 'حسابه', 'حسابيالخاص', 'حسابي الخاص',
  'معرفي', 'معرفك', 'الصفحه', 'صفحتك', 'بروفايل', 'بروفايلك',
  'عنواني', 'عنوانك', 'بيتي', 'بيتك', 'بيتها',
  'سكني', 'سكنك', 'شارعي', 'شارعك',
  'منطقتي', 'منطقتك', 'مدينتي', 'مدينتك', 'محافظتي', 'محافظتك', 'قريتي', 'قريتك', 'حيي', 'حيك'
];

// 1.8 كلمات مشبوهة إضافية (عربي)
export const ARABIC_SUSPICIOUS = [
  'سر', 'سري',
  'خاص', 'خاصه', 'شخصيه',
  'بيني', 'بينك', 'بيننا',
  'مالعام', 'مال عام',
  'بدونعلم', 'بدون علم',
  'بدونالادارة', 'بدون الإدارة', 'بدون الادارة',
  'بدونالدكتور', 'بدون الدكتور',
  'بدونالسكرتيره', 'بدون السكرتيرة', 'بدون السكرتيره',
  'علىالجنب', 'على الجانب', 'على الجنب',
  'منغير', 'من غير',
  'بشكلغيررسمي', 'بشكل غير رسمي',
  'بعيدعن', 'بعيد عن',
  'بمعزل', 'بمعزل عن'
];

// 1.9 كلمات الحجز الخارجي (إنجليزي)
export const ENGLISH_BOOKING_OUTSIDE = [
  'bookme', 'book me', 'booking', 'bookings',
  'reserve', 'reserve me', 'reservation',
  'schedule me', 'schedule outside',
  'appointment outside', 'without app', 'outside app',
  'without system', 'outside system',
  'directly', 'directly to', 'without booking',
  'no booking', 'no appointment',
  'bypass', 'bypass the app', 'skip the app', 'manual booking'
];

// 1.10 كلمات الدفع الخارجي (إنجليزي)
export const ENGLISH_PAYMENT_OUTSIDE = [
  'paycash', 'pay cash', 'cash',
  'transfer', 'bank transfer', 'banktransfer',
  'bankaccount', 'bank account',
  'accountnumber', 'account number',
  'iban', 'swift',
  'withoutinvoice', 'without invoice', 'no receipt',
  'discount', 'discount me',
  'paydirect', 'pay direct', 'manualpay', 'manual pay',
  'offline payment', 'outside the app', 'without app payment',
  'no payment', 'free', 'for free', 'gift', 'gifted',
  'wallet', 'ewallet'
];

// 1.11 كلمات التواصل الخارجي والشبكات (إنجليزي)
export const ENGLISH_CONTACT_OUTSIDE = [
  'contactme', 'contact me',
  'callme', 'call me',
  'textme', 'text me',
  'dmme', 'dm me', 'message me',
  'whatsapp', 'whats app', 'whatsapp me', 'wa.me',
  'telegram', 'telegram me', 't.me',
  'instagram', 'insta', 'ig',
  'facebook', 'fb',
  'snapchat', 'snap',
  'tiktok', 'tik tok',
  'twitter', 'x.com',
  'wechat', 'line', 'viber', 'kik', 'signal',
  'skype', 'zoom', 'google meet',
  'private', 'privately', 'dm', 'inbox me'
];

// 1.12 كلمات اللغة والبيانات الشخصية والشكوك (إنجليزي)
export const ENGLISH_OTHER_FORBIDDEN = [
  'speakarabic', 'speak english', 'speakenglish',
  'french', 'turkish', 'hindi', 'urdu', 'persian', 'farsi', 'chinese', 'russian', 'spanish', 'german', 'italian', 'portuguese',
  'switchlanguage', 'switch language', 'changelanguage', 'change language', 'other language', 'different language',
  'translation', 'translator',
  'myphone', 'my phone', 'myemail', 'my email', 'mynumber', 'my number',
  'mymobile', 'my mobile', 'mycontact', 'my contact', 'myaccount', 'my account',
  'myprofile', 'my profile', 'myaddress', 'my address', 'myhouse', 'my home',
  'mylocation', 'my location', 'myarea', 'my city', 'mycountry',
  'secret', 'secretly', 'between us', 'just between us', 'off the record',
  'informal', 'informally', 'outside management', 'without admin', 'without doctor', 'without secretary'
];

// 1.13 الكلمات باللغات الأجنبية (الفرنسية، التركية، الأردية، الفارسية)
export const FOREIGN_LANGUAGES_FORBIDDEN = [
  // French
  'argent', 'paiement', 'payer', 'especes', 'espece', 'numero', 'telephone', 'portable', 'mobile',
  'reserver', 'reservation', 'compte', 'banque', 'rib', 'hors application', 'sans application', 'en dehors',
  // Turkish
  'para', 'odeme', 'nakit', 'numara', 'telefon', 'cep', 'rezervasyon', 'rezerve', 'hesap', 'banka',
  'uygulama disinda', 'uygulama olmadan',
  // Urdu / Hindi
  'paisa', 'paise', 'bhejo', 'baat karo', 'book karo', 'app ke bina', 'app ke bahar',
  // Persian
  'پول', 'پرداخت', 'نقدی', 'شماره', 'همراه', 'رزرو', 'بوکینگ', 'شبا', 'واتساپ', 'خارج از برنامه', 'بدون برنامه'
];

// ========================================================
// 2. دوال التطبيع وتجهيز النص (Normalization)
// ========================================================

/**
 * تحويل جميع الأرقام الهندية (٠-٩) والفارسية (۰-۹) إلى أرقام إنجليزية (0-9)
 */
export function convertEasternToWesternDigits(str) {
  if (!str) return '';
  const easternDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  let result = str;
  for (let i = 0; i <= 9; i++) {
    result = result.replace(easternDigits[i], String(i));
    result = result.replace(persianDigits[i], String(i));
  }
  return result;
}

/**
 * الخطوة 1: تطبيع النص العربي والرموز
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  let str = convertEasternToWesternDigits(text);
  return str
    // حذف التشكيل والتنوين
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // حذف التطويل والمدات (ـ)
    .replace(/\u0640/g, '')
    // توحيد الألفات (أ، إ، آ، ٱ -> ا)
    .replace(/[أإآٱ]/g, 'ا')
    // توحيد التاء المربوطة (ة -> ه)
    .replace(/ة/g, 'ه')
    // توحيد الياء والياء المقصورة (ى -> ي)
    .replace(/ى/g, 'ي')
    // تحويل الإنجليزية للأحرف الصغيرة
    .toLowerCase()
    .trim();
}

/**
 * الخطوة 2: تجميع الحروف المفردة المقطعة
 * مثل: "ت س ع ه" -> "تسعه", "7 7 1" -> "771", "o n e" -> "one"
 */
export function mergeSegmentedCharacters(text) {
  if (!text) return '';
  // استبدال الرموز الخاصة بمسافة واحدة
  const cleanWithSpaces = text.replace(/[\.,\-_/\\#@!$%^&*()+=~`|<>?:;"'{}[\]]/g, ' ');

  // دمج تتابع الحروف المفردة
  // يبحث عن تسلسل من حروف مفردة مفصولة بمسافة ويدمجها
  return cleanWithSpaces
    .replace(/(?:(?<=^|\s)[a-z0-9\u0621-\u064A]\s+){2,}[a-z0-9\u0621-\u064A](?=\s|$)/gi, (match) => {
      return match.replace(/\s+/g, '');
    })
    // إزالة المسافات المتكررة
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * الخطوة 3: استخراج النص الخالي تماماً من المسافات والرموز
 */
export function stripAllSpacesAndPunctuation(text) {
  if (!text) return '';
  return text.replace(/[\s\.,\-_/\\#@!$%^&*()+=~`|<>?:;"'{}[\]]/g, '');
}

// دمج كل القوائم الممنوعة في مصفوفة موحدة لفحص النص المدمج (noSpaces)
const ALL_FORBIDDEN_PHRASES = [
  ...ARABIC_BOOKING_OUTSIDE,
  ...ARABIC_CONTACT_OUTSIDE,
  ...ARABIC_PAYMENT_OUTSIDE,
  ...ARABIC_LANGUAGE_CHANGE,
  ...ARABIC_PERSONAL_INFO,
  ...ARABIC_SUSPICIOUS,
  ...ENGLISH_BOOKING_OUTSIDE,
  ...ENGLISH_PAYMENT_OUTSIDE,
  ...ENGLISH_CONTACT_OUTSIDE,
  ...ENGLISH_OTHER_FORBIDDEN,
  ...FOREIGN_LANGUAGES_FORBIDDEN
].map(p => normalizeText(p));

// مصفوفة الكلمات بدون مسافات للبحث في noSpacesText
const FORBIDDEN_NO_SPACES = Array.from(new Set(
  ALL_FORBIDDEN_PHRASES.map(p => stripAllSpacesAndPunctuation(p)).filter(p => p.length >= 3)
));

// مجموعات الأرقام اللفظية للبحث التتابعي
const ARABIC_NUMERALS_SET = new Set(ARABIC_NUMERAL_WORDS.map(w => normalizeText(w)));
const ENGLISH_NUMERALS_SET = new Set(ENGLISH_NUMERAL_WORDS.map(w => w.toLowerCase()));

// ========================================================
// 3. المحرك الرئيسي: validateChatMessage
// ========================================================

/**
 * الفحص الشامل لرسالة الدردشة
 * @param {string} text - نص الرسالة
 * @returns {object} { isValid: boolean, reason: string | null, detectedWords: string[] }
 */
export function validateChatMessage(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      isValid: false,
      reason: 'الرسالة فارغة',
      detectedWords: []
    };
  }

  const rawText = text;
  const normalized = normalizeText(rawText);
  const mergedChars = mergeSegmentedCharacters(normalized);
  const noSpaces = stripAllSpacesAndPunctuation(normalized);

  const detected = [];

  // ========================================================
  // فحص 1: الرموز والروابط والإيميلات (Section 19 & 20)
  // ========================================================

  // 1.1 الروابط والنطاقات
  const linkRegex = /(?:https?:\/\/|www\.|\.(?:com|net|org|ye|info|io|co|me|app|xyz|online|site)|wa\.me|t\.me)/i;
  if (linkRegex.test(rawText) || linkRegex.test(noSpaces)) {
    return {
      isValid: false,
      reason: 'يُمنع مشاركة الروابط أو المواقع الإلكترونية داخل المحادثة',
      detectedWords: ['رابط إلكتروني / عنوان موقع']
    };
  }

  // 1.2 البريد الإلكتروني
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
  if (emailRegex.test(rawText) || emailRegex.test(normalized)) {
    return {
      isValid: false,
      reason: 'يُمنع مشاركة عناوين البريد الإلكتروني',
      detectedWords: ['بريد إلكتروني']
    };
  }

  // ========================================================
  // فحص 2: الأرقام الرقمية والهواتف (Sections 1 & 20)
  // ========================================================

  // 2.1 رقم يمني كامل (مع رمز الدولة أو بدونه)
  // مثال: 771234567 أو 967771234567 أو 0771234567
  const yemeniPhoneRegex = /(?:\+?967|00967)?[\s.\-_/]*0?7[01378](?:[\s.\-_/]*\d){7}/;
  if (yemeniPhoneRegex.test(normalized) || yemeniPhoneRegex.test(noSpaces)) {
    return {
      isValid: false,
      reason: 'يُمنع مشاركة أرقام الهواتف والتواصل',
      detectedWords: ['رقم هاتف يمني']
    };
  }

  // 2.2 أي 7 أرقام أو أكثر متتالية أو متفرقة بمسافات أو رموز
  const sevenDigitsRegex = /(?:\d[\s.\-_/]*){7,}/;
  if (sevenDigitsRegex.test(normalized) || sevenDigitsRegex.test(noSpaces)) {
    return {
      isValid: false,
      reason: 'يُمنع كتابة أرقام الهواتف أو الأرقام الطويلة',
      detectedWords: ['رقم اتصال / أرقام متسلسلة']
    };
  }

  // 2.3 رمز الدولة المشبوه
  if (noSpaces.includes('967') && /\d/.test(noSpaces.replace('967', ''))) {
    const digitsOnly = noSpaces.replace(/\D/g, '');
    if (digitsOnly.length >= 6) {
      return {
        isValid: false,
        reason: 'يُمنع كتابة مفاتيح الاتصال وأرقام الهواتف',
        detectedWords: ['مفتاح دولة / اتصال']
      };
    }
  }

  // ========================================================
  // فحص 3: الكلمات الممنوعة (الأقسام 4-13 و 15-18 و 21-22)
  // ========================================================

  // 3.1 فحص العبارات الصريحة في النص المطبع والمدمج
  for (const phrase of ALL_FORBIDDEN_PHRASES) {
    if (phrase.length > 2 && (normalized.includes(phrase) || mergedChars.includes(phrase))) {
      detected.push(phrase);
    }
  }

  // 3.2 فحص النص الخالي من المسافات (noSpaces) لاكتشاف التقطيع
  // مثال: "و ا ت س ا ب" -> "واتساب", "ت س ع ه" -> "تسعه", "ك ا ش" -> "كاش"
  for (const compact of FORBIDDEN_NO_SPACES) {
    if (compact.length >= 4 && noSpaces.includes(compact)) {
      detected.push(compact);
    }
  }

  if (detected.length > 0) {
    return {
      isValid: false,
      reason: 'تحتوي الرسالة على كلمات أو عبارات محظورة لمخالفتها شروط الخدمة',
      detectedWords: Array.from(new Set(detected)).slice(0, 5)
    };
  }

  // ========================================================
  // فحص 4: تتابع الأرقام المكتوبة لفظياً (عربي وإنجليزي - الأقسام 2, 3, 14)
  // القاعدة: 7+ كلمات عددية في الرسالة أو تتابع أرقام مكتوبة
  // ========================================================

  const words = normalized.split(/[\s\.,\-_/\\#@!$%^&*()+=~`|<>?:;"'{}[\]]+/);
  let arabicNumberCount = 0;
  let englishNumberCount = 0;

  for (const w of words) {
    if (!w) continue;
    if (ARABIC_NUMERALS_SET.has(w)) {
      arabicNumberCount++;
    }
    if (ENGLISH_NUMERALS_SET.has(w)) {
      englishNumberCount++;
    }
  }

  if (arabicNumberCount >= 4 || englishNumberCount >= 4) {
    return {
      isValid: false,
      reason: 'يُمنع كتابة الأرقام أو الهواتف كتابةً بالحروف والألفاظ',
      detectedWords: ['أرقام وأعداد لفظية مكتوبة بالحروف']
    };
  }

  // فحص تتابع أرقام لفظية مقطعة في noSpaces
  // مثال: سبعهواحداثنينثلاثهاربعهخمسهسته
  let spelledOutCountInCompact = 0;
  for (const numWord of ARABIC_NUMERAL_WORDS) {
    const compactNum = normalizeText(numWord);
    if (compactNum.length >= 3 && noSpaces.includes(compactNum)) {
      spelledOutCountInCompact++;
    }
  }
  if (spelledOutCountInCompact >= 4) {
    return {
      isValid: false,
      reason: 'يُمنع كتابة أرقام الهواتف أو تسلسل الأعداد بالحروف',
      detectedWords: ['تسلسل أرقام لفظية']
    };
  }

  // ✅ الرسالة سليمة
  return {
    isValid: true,
    reason: null,
    detectedWords: []
  };
}

/**
 * ميدلوير Express لفحص نصوص الرسائل في أي مسار دردشة تلقائياً
 */
export function chatFilterMiddleware(req, res, next) {
  const messageText = req.body?.message || req.body?.message_text || req.body?.text || req.body?.content;

  if (messageText) {
    const result = validateChatMessage(messageText);
    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        message: '⚠️ تنبيه أمني: تمنع سياسة منصة طبيبك كتابة الأرقام أو وسائل التواصل أو طلبات الدفع والحجز الخارجي حفاظاً على خصوصيتك وتنظيم الحجوزات الطبية.',
        error_code: 'CHAT_POLICY_VIOLATION',
        details: {
          reason: result.reason,
          detected: result.detectedWords
        }
      });
    }
  }

  next();
}
