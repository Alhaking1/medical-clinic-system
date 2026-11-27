import apiClient from '../client';

export interface ChatSettings {
  chat_enabled: boolean;
  chat_mode: 'all' | 'patient_secretary_only' | 'disabled';
  retention_hours?: number;
  retention_days?: number;
}

export const getChatSettings = async (): Promise<ChatSettings> => {
  const res = await apiClient.get('/registrations/chat-settings');
  return res.data.data;
};

export const updateChatSettings = async (settings: ChatSettings): Promise<void> => {
  await apiClient.put('/registrations/chat-settings', settings);
};

export const setDoctorChatBan = async (doctorId: number, isBanned: boolean, reason?: string): Promise<void> => {
  await apiClient.patch(`/registrations/doctors/${doctorId}/chat-ban`, { is_banned: isBanned, reason });
};

export const setSecretaryChatBan = async (secretaryId: number, isBanned: boolean, reason?: string): Promise<void> => {
  await apiClient.patch(`/registrations/secretaries/${secretaryId}/chat-ban`, { is_banned: isBanned, reason });
};

export const updateAdminClinicSchedule = async (clinicId: number, data: any): Promise<void> => {
  await apiClient.put(`/registrations/clinics/${clinicId}/schedule`, data);
};
