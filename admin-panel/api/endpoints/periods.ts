import apiClient from '../client';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface DoctorSchedule {
  id: number;
  doctor_id: number;
  day_of_week: number;       // 0=أحد، 1=اثنين، ... 6=سبت
  start_time: string;         // "09:00"
  end_time: string;           // "12:00"
  max_bookings: number;
  is_active: number;
  created_at: string;
}

export interface DoctorPeriod {
  id: number;
  doctor_id: number;
  date: string;               // "2026-10-05"
  start_time: string;
  end_time: string;
  max_bookings: number;
  booked_count: number;
  is_cancelled: number;
  notes: string | null;
  created_at: string;
  // حقول مشتقة (من GET /doctor/:id)
  slots_available?: number;
  is_full?: boolean;
}

// ═══════════════════════════════════════════
// الفترات
// ═══════════════════════════════════════════

/**
 * 🆕 الفترات المتاحة (للمريض — عامة)
 */
export async function getDoctorPeriods(
  doctorId: number,
  date?: string
): Promise<DoctorPeriod[]> {
  const response = await apiClient.get(`/periods/doctor/${doctorId}`, {
    params: date ? { date } : {},
  });
  return response.data.data;
}

/**
 * 🆕 كل الفترات (للأدمن — مع الملغاة)
 */
export async function getAdminDoctorPeriods(
  doctorId: number,
  filters?: { date?: string; from?: string; to?: string }
): Promise<DoctorPeriod[]> {
  const response = await apiClient.get(`/periods/admin/doctor/${doctorId}`, {
    params: filters || {},
  });
  return response.data.data;
}

/**
 * 🆕 إلغاء فترة (الدكتور مريض)
 */
export async function cancelPeriod(id: number, notes?: string): Promise<void> {
  await apiClient.patch(`/periods/${id}/cancel`, { notes });
}

/**
 * 🆕 إعادة تفعيل فترة
 */
export async function uncancelPeriod(id: number): Promise<void> {
  await apiClient.patch(`/periods/${id}/uncancel`);
}

/**
 * 🆕 حذف فترة (فقط إذا لا توجد حجوزات)
 */
export async function deletePeriod(id: number): Promise<void> {
  await apiClient.delete(`/periods/${id}`);
}

// ═══════════════════════════════════════════
// القوالب الأسبوعية
// ═══════════════════════════════════════════

/**
 * 🆕 إضافة قالب أسبوعي
 */
export async function addSchedule(data: {
  doctor_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_bookings?: number;
}): Promise<{ schedule_id: number; periods_created: number; periods_skipped: number }> {
  const response = await apiClient.post('/periods/schedule', data);
  return response.data.data;
}

/**
 * 🆕 عرض القوالب
 */
export async function getDoctorSchedules(doctorId: number): Promise<DoctorSchedule[]> {
  const response = await apiClient.get(`/periods/schedule/doctor/${doctorId}`);
  return response.data.data;
}

/**
 * 🆕 حذف قالب
 */
export async function deleteSchedule(id: number): Promise<void> {
  await apiClient.delete(`/periods/schedule/${id}`);
}

/**
 * 🆕 توليد فترات يدوياً
 */
export async function generatePeriods(
  doctorId: number,
  days: number = 90
): Promise<{ created: number; skipped: number }> {
  const response = await apiClient.post('/periods/generate', {
    doctor_id: doctorId,
    days,
  });
  return response.data.data;
}

/**
 * 🆕 إعادة توليد (بعد تعديل القالب)
 */
export async function regeneratePeriods(
  doctorId: number,
  days: number = 90
): Promise<{ created: number; skipped: number }> {
  const response = await apiClient.post('/periods/regenerate', {
    doctor_id: doctorId,
    days,
  });
  return response.data.data;
}