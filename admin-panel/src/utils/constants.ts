// ==================== API ====================
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://medical-booking-backend-production.up.railway.app/api/v1';

export const API_TIMEOUT = 30000;

// ==================== التخزين المحلي ====================
export const STORAGE_KEYS = {
  TOKEN: 'admin_token',
  REFRESH_TOKEN: 'admin_refresh_token',
  USER: 'admin_user',
  THEME: 'admin_theme',
} as const;

// ==================== التخصصات ====================
export const SPECIALTIES = [
  'باطنية',
  'أطفال',
  'أسنان',
  'جلدية',
  'عيون',
  'نساء وتوليد',
  'عظام',
  'أنف وأذن وحنجرة',
  'مسالك بولية',
  'نفسية',
  'قلب',
  'مخ وأعصاب',
  'جهاز هضمي',
  'غدد وسكري',
  'جراحة عامة',
] as const;

// ==================== المحافظات اليمنية ====================
export const GOVERNORATES = [
  'صنعاء',
  'عدن',
  'تعز',
  'الحديدة',
  'إب',
  'حجة',
  'صعدة',
  'عمران',
  'المحويت',
  'ريمة',
  'ذمار',
  'البيضاء',
  'مأرب',
  'الجوف',
  'حضرموت',
  'المهرة',
  'شبوة',
  'أبين',
  'لحج',
  'الضالع',
  'الحديدة',
  'سقطرى',
] as const;

// ==================== طرق الدفع ====================
export const PAYMENT_METHODS = [
  { value: 'jawali', label: 'جوالي', color: 'bg-purple-100 text-purple-700' },
  { value: 'jeeb', label: 'جيب', color: 'bg-blue-100 text-blue-700' },
  { value: 'onecash', label: 'ون كاش', color: 'bg-green-100 text-green-700' },
  { value: 'cash', label: 'نقداً', color: 'bg-gray-100 text-gray-700' },
] as const;

// ==================== حالات الحجز ====================
export const APPOINTMENT_STATUSES = [
  { value: 'pending', label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'confirmed', label: 'مؤكد', color: 'bg-blue-100 text-blue-700' },
  { value: 'paid', label: 'مدفوع', color: 'bg-green-100 text-green-700' },
  { value: 'completed', label: 'مكتمل', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'cancelled', label: 'ملغي', color: 'bg-red-100 text-red-700' },
  { value: 'no_show', label: 'لم يحضر', color: 'bg-gray-100 text-gray-700' },
] as const;

// ==================== حالات الدفع ====================
export const PAYMENT_STATUSES = [
  { value: 'unpaid', label: 'غير مدفوع', color: 'bg-red-100 text-red-700' },
  { value: 'pending', label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'paid', label: 'مدفوع', color: 'bg-green-100 text-green-700' },
] as const;

// ==================== الصفحات ====================
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  DOCTORS: '/doctors',
  ADD_DOCTOR: '/doctors/add',
  EDIT_DOCTOR: '/doctors/:id/edit',
  SECRETARIES: '/secretaries',
  ADD_SECRETARY: '/secretaries/add',
  PATIENTS: '/patients',
  APPOINTMENTS: '/appointments',
  PAYMENTS: '/payments',
  REPORTS: '/reports',
  SETTINGS: '/settings',
} as const;

// ==================== الترقيم ====================
export const PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// ==================== العملة ====================
export const CURRENCY = 'ريال';
export const CURRENCY_SYMBOL = 'ر.ي';