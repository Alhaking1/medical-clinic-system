import apiClient from '../client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: number;
    username: string;
    full_name: string;
    role: string;
  };
}

export interface AdminUser {
  id: number;
  username: string;
  full_name: string;
  role: string;
  is_active?: number | boolean;
  created_at: string;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', data);
  return response.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function getCurrentUser(): Promise<AdminUser> {
  const response = await apiClient.get('/auth/me');
  return response.data.data;
}

export async function changePassword(data: {
  current_password: string;
  new_password: string;
}): Promise<void> {
  await apiClient.post('/auth/change-password', data);
}

// ==================== إدارة المدراء ====================
export async function getAdmins(): Promise<AdminUser[]> {
  const response = await apiClient.get('/auth/admins');
  return response.data.data;
}

export async function createAdmin(data: {
  username: string;
  password: string;
  full_name: string;
  role?: string;
}): Promise<AdminUser> {
  const response = await apiClient.post('/auth/admins', data);
  return response.data.data;
}

export async function updateAdmin(
  id: number,
  data: {
    full_name?: string;
    role?: string;
    is_active?: boolean;
  }
): Promise<void> {
  await apiClient.put(`/auth/admins/${id}`, data);
}

export async function deleteAdmin(id: number): Promise<void> {
  await apiClient.delete(`/auth/admins/${id}`);
}