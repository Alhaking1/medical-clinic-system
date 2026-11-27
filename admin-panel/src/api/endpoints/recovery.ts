import apiClient from '../client';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════
export interface RecoverySubmittedData {
  full_name: string;
  phone: string;
  matched_words?: number;
  total_words?: number;
  match_ratio?: number;
  requested_at?: string;
}

export interface RecoveryRegisteredUser {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  status: string;
  is_blocked?: number;
  is_deleted?: number;
  user_type: 'patient' | 'doctor' | 'secretary';
}

export interface RecoveryRequest {
  id: number;
  user_id: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
  notes: string | null;
  submitted: RecoverySubmittedData;
  registered: RecoveryRegisteredUser | null;
  match_confirmed: boolean;
}

export interface RecoveryStats {
  pending: number;
  approved: number;
  rejected: number;
}

// ═══════════════════════════════════════════
// API Functions
// ═══════════════════════════════════════════
export async function getRecoveryRequests(
  status: 'pending' | 'approved' | 'rejected' = 'pending'
): Promise<RecoveryRequest[]> {
  const response = await apiClient.get('/recovery/requests', {
    params: { status },
  });
  return response.data.data;
}

export async function getRecoveryStats(): Promise<RecoveryStats> {
  const response = await apiClient.get('/recovery/stats');
  return response.data.data;
}

export async function approveRecovery(id: number): Promise<void> {
  await apiClient.patch(`/recovery/requests/${id}/approve`);
}

export async function rejectRecovery(id: number, reason?: string): Promise<void> {
  await apiClient.patch(`/recovery/requests/${id}/reject`, { reason });
}

export async function getRecoveryStatus(phone: string): Promise<any> {
  const response = await apiClient.get(`/recovery/status/${phone}`);
  return response.data;
}