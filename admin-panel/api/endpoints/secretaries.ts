import apiClient from '../client';

export interface SecretaryDoctor {
  id: number;
  full_name: string;
  specialty: string;
}

export interface Secretary {
  id: number;
  full_name: string;
  phone: string;
  email?: string | null;
  status?: string;
  clinic_id: number | null;
  clinic_name: string | null;
  permissions: string | null;
  is_active: number | boolean;
  raw_password?: string | null;
  created_at: string;
  doctors: SecretaryDoctor[];
  doctor_ids: number[];
}

export interface CreateSecretaryData {
  full_name: string;
  phone: string;
  clinic_id?: number;
  permissions?: any;
}

export interface UpdateSecretaryData {
  full_name?: string;
  phone?: string;
  clinic_id?: number;
  permissions?: any;
}

export async function getSecretaries(search?: string): Promise<Secretary[]> {
  const response = await apiClient.get('/secretaries', { params: { search } });
  return response.data.data;
}

export async function getSecretary(id: number): Promise<Secretary> {
  const response = await apiClient.get(`/secretaries/${id}`);
  return response.data.data;
}

export async function createSecretary(data: CreateSecretaryData): Promise<Secretary> {
  const response = await apiClient.post('/secretaries', data);
  return response.data.data;
}

export async function updateSecretary(id: number, data: UpdateSecretaryData): Promise<void> {
  await apiClient.put(`/secretaries/${id}`, data);
}

export async function toggleSecretary(id: number): Promise<void> {
  await apiClient.patch(`/secretaries/${id}/toggle`);
}

export async function deleteSecretary(id: number): Promise<void> {
  await apiClient.delete(`/secretaries/${id}`);
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
// Pending Secretaries
// ═══════════════════════════════════════════

export async function getPendingSecretaries(): Promise<Secretary[]> {
  const response = await apiClient.get('/secretaries/list/pending');
  return response.data.data;
}

export async function approveSecretary(id: number): Promise<void> {
  await apiClient.patch(`/secretaries/${id}/approve`);
}

export async function rejectSecretary(id: number, reason?: string): Promise<void> {
  await apiClient.patch(`/secretaries/${id}/reject`, { reason });
}

export async function getGlobalSecretaryPermissions(): Promise<{ permissions: Record<string, boolean>; total_secretaries: number }> {
  const response = await apiClient.get('/secretaries/bulk/permissions');
  return response.data.data;
}

export async function updateGlobalSecretaryPermissions(permissions: Record<string, boolean>): Promise<{ message: string; count: number }> {
  const response = await apiClient.patch('/secretaries/bulk/permissions', { permissions });
  return response.data;
}