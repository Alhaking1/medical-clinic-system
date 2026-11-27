import apiClient from '../client';

export interface Appointment {
  id: number;
  booking_code: string;
  user_id: number;
  patient_name: string;
  patient_phone: string;
  patient_email: string | null;
  patient_picture: string | null;
  doctor_id: number;
  doctor_name: string;
  doctor_specialty: string | null;
  slot_id: number | null;
  period_id: number | null;
  slot_date: string | null;
  slot_time: string | null;
  slot_end_time: string | null;
  period_date: string | null;
  period_start_time: string | null;
  period_end_time: string | null;
  status: string;
  payment_method: string | null;
  payment_status: string;
  reason: string | null;
  fee: number | null;
  queue_number?: number;
  is_golden?: number;
  transaction_id?: string | null;
  attendance_status?: 'pending' | 'arrived' | 'no_show' | string;
  sequential_booking_number?: number;
  clinic_name: string | null;
  clinic_address: string | null;
  clinic_governorate: string | null;
  clinic_google_maps_url: string | null;
  created_at: string;
  updated_at: string | null;
}

export async function getAppointments(params?: {
  status?: string;
  search?: string;
}): Promise<Appointment[]> {
  const response = await apiClient.get('/appointments', { params });
  return response.data.data;
}

export async function getAppointment(id: number): Promise<Appointment> {
  const response = await apiClient.get(`/appointments/${id}`);
  return response.data.data;
}

export async function cancelAppointment(id: number): Promise<void> {
  await apiClient.patch(`/appointments/${id}/cancel`);
}

export async function markNoShow(id: number): Promise<void> {
  await apiClient.patch(`/appointments/${id}/no-show`);
}

// 🆕 اعتماد الحجز
export async function confirmAppointment(id: number): Promise<void> {
  await apiClient.patch(`/appointments/${id}/confirm`);
}

// 🆕 تعليم مدفوع
export async function markAsPaid(id: number): Promise<void> {
  await apiClient.patch(`/appointments/${id}/pay`);
}

// 🆕 تأكيد الدفع وترقية الحجز الذهبي
export async function confirmAppointmentPayment(id: number): Promise<any> {
  const response = await apiClient.patch(`/appointments/${id}/confirm-payment`);
  return response.data;
}

// 🆕 رفض حوالة الدفع
export async function rejectAppointmentPayment(id: number, reason?: string): Promise<any> {
  const response = await apiClient.patch(`/appointments/${id}/reject-payment`, { reason });
  return response.data;
}

// 🆕 جلب إعداد المقاعد الذهبية
export async function getGoldenSeatsCount(): Promise<number> {
  const response = await apiClient.get('/appointments/settings/golden-seats');
  return response.data.golden_seats_count ?? 3;
}

// 🆕 تحديث إعداد المقاعد الذهبية
export async function updateGoldenSeatsCount(count: number): Promise<void> {
  await apiClient.put('/appointments/settings/golden-seats', { golden_seats_count: count });
}

// 🆕 جلب تقييمات المواعيد
export async function getAllReviews(): Promise<any[]> {
  const response = await apiClient.get('/appointments/reviews/all');
  return response.data.data || [];
}

// 🆕 إكمال الحجز
export async function completeAppointment(id: number): Promise<void> {
  await apiClient.patch(`/appointments/${id}/complete`);
}
export async function updateAppointmentAttendance(id: number, status: "arrived" | "no_show" | "pending") {
  const response = await apiClient.patch(`/appointments/${id}/attendance`, { status });
  return response.data;
}
