import apiClient from '../client';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface Doctor {
  id: number;
  full_name: string;
  specialty: string;
  clinic_name: string | null;
  governorate: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  avatar_url?: string | null;
  bio: string | null;
  experience_years: number;
  consultation_fee: number;
  slot_duration: number;
  is_active: number;
  is_deleted: number;
  status: string;
  rating: number;
  created_at: string;
  updated_at: string;
  allow_direct_chat?: number;
  raw_password?: string | null;
  secretary_id?: number | null;
  secretary_name?: string | null;
  clinic_google_maps_url?: string | null;
  clinic_address?: string | null;
}

// 🆕 التفاصيل الكاملة للطبيب (من GET /doctors/:id)
export interface DoctorDetails extends Doctor {
  stats?: {
    total_appointments: number;
    completed: number;
    cancelled: number;
    no_show: number;
  };
  revenue?: number;
  clinics?: Array<{
    id: number;
    name: string;
    governorate: string | null;
  }>;
  secretaries?: Array<{
    id: number;
    full_name: string;
    phone: string;
    is_active: number | boolean;
  }>;
  upcoming?: Array<{
    id: number;
    booking_code: string;
    patient_name: string;
    date: string;
    start_time: string;
    payment_status: string;
  }>;
  records?: Array<{
    id: number;
    patient_name: string;
    diagnosis: string | null;
    prescription: string | null;
    created_at: string;
  }>;
}

export interface CreateDoctorData {
  full_name: string;
  specialty: string;
  clinic_name?: string;
  governorate?: string;
  address?: string;
  phone?: string;
  email?: string;
  bio?: string;
  experience_years?: number;
  consultation_fee: number;
  slot_duration: number;
  status?: string;
  avatar?: string | null;
  avatar_url?: string | null;
}

export interface UpdateDoctorData extends Partial<CreateDoctorData> {
  is_active?: boolean;
}

// ═══════════════════════════════════════════
// APIs
// ═══════════════════════════════════════════

export async function getDoctors(params?: {
  search?: string;
  specialty?: string;
  governorate?: string;
  include_hidden?: string | boolean;
}): Promise<Doctor[]> {
  const response = await apiClient.get('/doctors', { params });
  return response.data.data;
}

export async function getDoctor(id: number): Promise<DoctorDetails> {
  const response = await apiClient.get(`/doctors/${id}`);
  return response.data.data;
}

export async function createDoctor(data: CreateDoctorData): Promise<Doctor> {
  const response = await apiClient.post('/doctors', data);
  return response.data.data;
}

export async function updateDoctor(id: number, data: UpdateDoctorData): Promise<void> {
  await apiClient.put(`/doctors/${id}`, data);
}

export async function toggleDoctor(id: number): Promise<void> {
  await apiClient.patch(`/doctors/${id}/toggle`);
}

export async function deleteDoctor(id: number): Promise<void> {
  await apiClient.delete(`/doctors/${id}`);
}
// ═══════════════════════════════════════════
// Pending Doctors
// ═══════════════════════════════════════════

export async function getPendingDoctors(): Promise<Doctor[]> {
  const response = await apiClient.get('/doctors/list/pending');
  return response.data.data;
}

export async function approveDoctor(id: number): Promise<void> {
  await apiClient.patch(`/doctors/${id}/approve`);
}

export async function rejectDoctor(id: number, reason?: string): Promise<void> {
  await apiClient.patch(`/doctors/${id}/reject`, { reason });
}

// ═══════════════════════════════════════════
// Doctor Permissions
// ═══════════════════════════════════════════

export async function getDoctorPermissions(id: number): Promise<{ doctor: Doctor; permissions: Record<string, boolean> }> {
  const response = await apiClient.get(`/doctors/${id}/permissions`);
  return response.data.data;
}

export async function updateDoctorPermissions(id: number, permissions: Record<string, boolean>): Promise<void> {
  await apiClient.patch(`/doctors/${id}/permissions`, { permissions });
}

export async function getGlobalDoctorPermissions(): Promise<{ permissions: Record<string, boolean>; total_doctors: number }> {
  const response = await apiClient.get('/doctors/bulk/permissions');
  return response.data.data;
}

export async function updateGlobalDoctorPermissions(permissions: Record<string, boolean>): Promise<{ message: string; count: number }> {
  const response = await apiClient.patch('/doctors/bulk/permissions', { permissions });
  return response.data;
}
export async function toggleDoctorDirectChat(id: number, allowDirectChat: boolean): Promise<any> {
  const response = await apiClient.patch(`/doctors/${id}/direct-chat`, { allow_direct_chat: allowDirectChat });
  return response.data;
}
