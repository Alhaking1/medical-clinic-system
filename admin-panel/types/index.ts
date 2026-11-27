// ==================== الأدوار ====================
export type UserRole = 'admin' | 'supervisor' | 'doctor' | 'secretary';

// ==================== المستخدم ====================
export interface AdminUser {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

// ==================== المريض ====================
export interface Patient {
  id: number;
  phone: string;
  full_name: string;
  age: number | null;
  gender: 'male' | 'female' | null;
  governorate: string | null;
  is_blocked: boolean;
  block_until: string | null;
  no_show_count: number;
  created_at: string;
}

// ==================== الطبيب ====================
export interface Doctor {
  id: number;
  full_name: string;
  specialty: string;
  clinic_name: string | null;
  governorate: string | null;
  address: string | null;
  phone: string | null;
  consultation_fee: number;
  slot_duration: number;
  is_active: boolean;
  rating: number;
  created_at: string;
}

// ==================== السكرتيرة ====================
export interface Secretary {
  id: number;
  full_name: string;
  phone: string;
  doctor_id: number | null;
  doctor_name?: string;
  is_active: boolean;
  created_at: string;
}

// ==================== الموعد ====================
export type SlotStatus = 'available' | 'booked' | 'closed';

export interface Slot {
  id: number;
  doctor_id: number;
  date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  is_closed: boolean;
}

// ==================== الحجز ====================
export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'paid'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export type PaymentMethod = 'online' | 'clinic';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid';

export interface Appointment {
  id: number;
  booking_code: string;
  user_id: number;
  patient_name?: string;
  patient_phone?: string;
  doctor_id: number;
  doctor_name?: string;
  slot_id: number;
  slot_date?: string;
  slot_time?: string;
  status: AppointmentStatus;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== الدفع ====================
export type PaymentConfirmationStatus = 'pending' | 'confirmed' | 'rejected';

export interface Payment {
  id: number;
  appointment_id: number;
  booking_code?: string;
  patient_name?: string;
  amount: number;
  method: 'jawali' | 'jeeb' | 'onecash' | 'cash';
  receipt_image: string | null;
  status: PaymentConfirmationStatus;
  confirmed_by: number | null;
  confirmed_at: string | null;
  created_at: string;
}

// ==================== الطابور ====================
export type QueueStatus = 'waiting' | 'in_progress' | 'done';

export interface QueueItem {
  id: number;
  appointment_id: number | null;
  doctor_id: number;
  patient_name: string;
  patient_phone: string;
  queue_number: number;
  status: QueueStatus;
  checked_in_at: string;
  started_at: string | null;
  finished_at: string | null;
}

// ==================== التقييم ====================
export interface Rating {
  id: number;
  appointment_id: number;
  doctor_id: number;
  user_id: number;
  patient_name?: string;
  stars: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
}

// ==================== الإشعار ====================
export interface Notification {
  id: number;
  user_id: number | null;
  doctor_id: number | null;
  title: string;
  body: string;
  type: 'appointment' | 'payment' | 'reminder' | 'general';
  is_read: boolean;
  created_at: string;
}

// ==================== التقارير ====================
export interface DashboardStats {
  total_doctors: number;
  total_patients: number;
  total_appointments: number;
  today_appointments: number;
  pending_payments: number;
  total_revenue: number;
  monthly_revenue: number;
  admin_share: number;
}

export interface DailyReport {
  date: string;
  appointments: number;
  completed: number;
  cancelled: number;
  no_show: number;
  revenue: number;
}