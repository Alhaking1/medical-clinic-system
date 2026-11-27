import apiClient from '../client';

export interface RegistrationRequest {
  id: number;
  type: 'doctor' | 'patient' | 'secretary';
  user_id: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: number | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  user: any;
}

export interface RegistrationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  pending_doctors: number;
  pending_secretaries: number;
  pending_patients: number;
  total_doctors: number;
  total_secretaries: number;
  total_patients: number;
  approved_doctors: number;
  approved_secretaries: number;
  approved_patients: number;
}

export async function getRequests(params?: {
  status?: string;
  type?: string;
}): Promise<RegistrationRequest[]> {
  const response = await apiClient.get('/registrations/requests', { params });
  return response.data.data;
}

export async function getRequestsStats(): Promise<RegistrationStats> {
  const response = await apiClient.get('/registrations/requests/stats');
  return response.data.data;
}

export async function approveRequest(id: number): Promise<void> {
  await apiClient.patch(`/registrations/requests/${id}/approve`);
}

export async function rejectRequest(id: number, notes?: string): Promise<void> {
  await apiClient.patch(`/registrations/requests/${id}/reject`, { notes });
}