import apiClient from '../client';

export interface RevenueSummary {
  global_commission_rate: number;
  total_appointments: number;
  total_gross_revenue: number;
  total_admin_revenue: number;
  total_clinic_revenue: number;
  today: {
    appointments_count: number;
    gross_revenue: number;
    admin_revenue: number;
    clinic_revenue: number;
  };
  this_month: {
    appointments_count: number;
    gross_revenue: number;
    admin_revenue: number;
    clinic_revenue: number;
  };
}

export interface ClinicRevenueStat {
  id: number;
  name: string;
  commission_rate: number;
  appointments_count: number;
  gross_revenue: number;
  admin_revenue: number;
  clinic_revenue: number;
}

export interface DailyRevenueStat {
  date: string;
  appointments_count: number;
  gross_revenue: number;
  admin_revenue: number;
  clinic_revenue: number;
}

export interface RevenueAnalyticsResponse {
  summary: RevenueSummary;
  clinics: ClinicRevenueStat[];
  daily: DailyRevenueStat[];
}

export async function getRevenueAnalytics(params?: {
  clinic_id?: number | string;
  start_date?: string;
  end_date?: string;
}): Promise<RevenueAnalyticsResponse> {
  const response = await apiClient.get('/registrations/revenue-analytics', { params });
  return response.data.data;
}
