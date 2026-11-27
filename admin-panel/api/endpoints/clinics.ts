import apiClient from '../client';

export interface Clinic {
  id: number;
  name: string;
  governorate: string | null;
  address: string | null;
  phone: string | null;
  notes: string | null;
  is_active: number | boolean;
  google_maps_url: string | null;
  commission_rate?: number | null;
  facility_type?: 'clinic' | 'medical_center' | 'pharmacy' | 'hospital' | string;
  created_at: string;
  doctors_count?: number;
  secretaries_count?: number;
}

export interface ClinicDetails extends Clinic {
  doctors: Array<{
    id: number;
    full_name: string;
    specialty: string;
    consultation_fee: number;
    is_active: number | boolean;
  }>;
  secretaries: Array<{
    id: number;
    full_name: string;
    phone: string;
    is_active: number | boolean;
  }>;
  auxiliary_contact_numbers?: Array<{
    id: number;
    phone: string;
    notes?: string;
    added_by_secretary_name?: string;
    created_at: string;
  }>;
}

export interface CreateClinicData {
  name: string;
  governorate?: string;
  address?: string;
  phone?: string;
  notes?: string;
  google_maps_url?: string;
  commission_rate?: number | null;
  facility_type?: string;
}

export interface UpdateClinicData {
  name?: string;
  governorate?: string;
  address?: string;
  phone?: string;
  notes?: string;
  is_active?: boolean;
  google_maps_url?: string;
  commission_rate?: number | null;
  facility_type?: string;
}

// ==================== APIs ====================

export async function getClinics(): Promise<Clinic[]> {
  const response = await apiClient.get('/clinics-direct');
  return response.data.data;
}

export async function getClinic(id: number): Promise<ClinicDetails> {
  const response = await apiClient.get(`/clinics-direct/${id}`);
  return response.data.data;
}

export async function createClinic(data: CreateClinicData): Promise<Clinic> {
  const response = await apiClient.post('/clinics-direct', data);
  return response.data.data;
}

export async function updateClinic(id: number, data: UpdateClinicData): Promise<void> {
  await apiClient.put(`/clinics-direct/${id}`, data);
}

export async function deleteClinic(id: number): Promise<void> {
  await apiClient.delete(`/clinics-direct/${id}`);
}

export async function moveSecretaryToClinic(
  secretaryId: number,
  clinicId: number | null
): Promise<void> {
  await apiClient.patch(`/secretaries/${secretaryId}/move-clinic`, {
    clinic_id: clinicId,
  });
}
// ═══════════════════════════════════════════
// Pending Clinics
// ═══════════════════════════════════════════

export async function getPendingClinics(): Promise<Clinic[]> {
  const response = await apiClient.get('/clinics/list/pending');
  return response.data.data;
}

export async function approveClinic(id: number): Promise<void> {
  await apiClient.patch(`/clinics/${id}/approve`);
}

export async function rejectClinic(id: number, reason?: string): Promise<void> {
  await apiClient.patch(`/clinics/${id}/reject`, { reason });
}