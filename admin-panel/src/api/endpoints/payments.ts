import apiClient from '../client';

export interface Payment {
  id: number;
  appointment_id: number;
  booking_code: string;
  patient_name: string;
  amount: number;
  method: string;
  status: 'pending' | 'confirmed' | 'rejected';
  receipt_image: string | null;
  transaction_id?: string | null;
  appointment_transaction_id?: string | null;
  is_golden?: number;
  queue_number?: number;
  created_at: string;
}

export async function getPayments(status?: string): Promise<Payment[]> {
  const response = await apiClient.get('/payments', { params: { status } });
  return response.data.data;
}

export async function confirmPayment(id: number): Promise<void> {
  await apiClient.patch(`/payments/${id}/confirm`);
}

export async function rejectPayment(id: number): Promise<void> {
  await apiClient.patch(`/payments/${id}/reject`);
}