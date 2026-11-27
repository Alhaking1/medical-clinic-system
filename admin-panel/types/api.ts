// ==================== استجابة API ====================
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// ==================== الطلبات ====================
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refresh_token?: string;
  user: {
    id: number;
    username: string;
    full_name: string;
    role: string;
  };
}

export interface CreateDoctorRequest {
  full_name: string;
  specialty: string;
  clinic_name?: string;
  governorate?: string;
  address?: string;
  phone?: string;
  consultation_fee: number;
  slot_duration: number;
}

export interface CreateSecretaryRequest {
  full_name: string;
  phone: string;
  password: string;
  doctor_id?: number;
}

export interface ConfirmPaymentRequest {
  status: 'confirmed' | 'rejected';
  notes?: string;
}

// ==================== الفلاتر ====================
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface DoctorFilters extends PaginationParams {
  specialty?: string;
  governorate?: string;
  is_active?: boolean;
}

export interface AppointmentFilters extends PaginationParams {
  status?: string;
  doctor_id?: number;
  date_from?: string;
  date_to?: string;
}

export interface PaymentFilters extends PaginationParams {
  status?: string;
  method?: string;
  date_from?: string;
  date_to?: string;
}