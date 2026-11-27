import apiClient from '../client';

export interface Patient {
  id: number;
  full_name: string;
  phone: string;
  // 🆕 حقول Google
  email: string | null;
  google_id: string | null;
  picture: string | null;
  avatar_url?: string | null;
  age: number | null;
  gender: 'male' | 'female' | null;
  governorate: string | null;
  is_blocked: boolean;
  no_show_count: number;
  balance?: number;
  created_at: string;
  // 🆕 حقول إضافية
  status?: string;
  phone_verified?: number;
  approved_at?: string | null;
}


// 🆕 إحصائيات المريض
export interface PatientStats {
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  pending_appointments: number;
  confirmed_appointments: number;
  no_show_appointments: number;
  total_paid: number;
  last_appointment: any | null;
}

export async function getPatients(search?: string): Promise<Patient[]> {
  const response = await apiClient.get('/patients', { params: { search } });
  return response.data.data;
}

export async function getPatient(id: number): Promise<Patient> {
  const response = await apiClient.get(`/patients/${id}`);
  return response.data.data;
}

// 🆕 إحصائيات
export async function getPatientStats(id: number): Promise<PatientStats> {
  const response = await apiClient.get(`/patients/${id}/stats`);
  return response.data.data;
}

export async function toggleBlockPatient(id: number): Promise<void> {
  await apiClient.patch(`/patients/${id}/toggle-block`);
}

// ✅ حذف مريض
export async function deletePatient(id: number): Promise<void> {
  await apiClient.delete(`/patients/${id}`);
}

// 💰 تعديل وشحن رصيد محفظة المريض
export async function adjustPatientBalance(id: number, amount: number, description?: string): Promise<{ new_balance: number }> {
  const response = await apiClient.post(`/patients/${id}/adjust-balance`, { amount, description });
  return response.data.data;
}

export interface WalletDepositRequest {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  amount: number;
  method: string;
  reference_number: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  created_at: string;
}

export async function getWalletDepositRequests(status?: string): Promise<WalletDepositRequest[]> {
  const response = await apiClient.get('/patients/wallet/deposit-requests', { params: { status } });
  return response.data.data;
}

export async function reviewWalletDepositRequest(
  id: number,
  action: 'approve' | 'reject',
  notes?: string,
  customAmount?: number
): Promise<void> {
  await apiClient.patch(`/patients/wallet/deposit-requests/${id}/review`, { action, notes, customAmount });
}
