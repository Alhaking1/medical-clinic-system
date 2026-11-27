import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ==================== دمج الأنماط ====================
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==================== تنسيق التاريخ ====================
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('ar-YE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('ar-YE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const period = h >= 12 ? 'م' : 'ص';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
}

// ==================== تنسيق العملة ====================
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-YE').format(amount) + ' ر.ي';
}

// ==================== تنسيق الأرقام ====================
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ar-YE').format(num);
}

// ==================== اختصار النص ====================
export function truncate(text: string, length: number = 50): string {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
}

// ==================== الحصول على الأحرف الأولى ====================
export function getInitials(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2);
  return parts[0][0] + parts[parts.length - 1][0];
}

// ==================== التحقق من الصلاحيات ====================
export function canManage(role: string): boolean {
  return role === 'admin' || role === 'supervisor';
}

// ==================== تأخير ====================
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// ==================== إنشاء رقم عشوائي ====================
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// ==================== الحصول على لون الحالة ====================
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
    paid: 'bg-green-100 text-green-700 border-green-200',
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
    no_show: 'bg-gray-100 text-gray-700 border-gray-200',
    unpaid: 'bg-red-100 text-red-700 border-red-200',
    waiting: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
    done: 'bg-green-100 text-green-700 border-green-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}