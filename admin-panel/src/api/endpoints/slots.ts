import apiClient from '../client';

export interface Slot {
  id: number;
  doctor_id: number;
  date: string;
  start_time: string;
  end_time: string;
  is_booked: number | boolean;
  is_closed: number | boolean;
  created_at: string;
}

export async function getDoctorSlots(
  doctorId: number,
  date?: string
): Promise<Slot[]> {
  const response = await apiClient.get(`/slots/doctor/${doctorId}`, {
    params: { date },
  });
  return response.data.data;
}

export async function generateSlots(data: {
  doctor_id: number;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
}): Promise<{ created: number; total: number }> {
  const response = await apiClient.post('/slots/generate', data);
  return response.data.data;
}

export async function toggleSlot(id: number): Promise<void> {
  await apiClient.patch(`/slots/${id}/toggle`);
}

export async function deleteSlot(id: number): Promise<void> {
  await apiClient.delete(`/slots/${id}`);
}

export async function deleteDoctorDaySlots(
  doctorId: number,
  date: string
): Promise<{ message: string }> {
  const response = await apiClient.delete(
    `/slots/doctor/${doctorId}/date/${date}`
  );
  return response.data;
}