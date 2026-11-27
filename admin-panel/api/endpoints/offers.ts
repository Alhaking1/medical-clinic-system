import apiClient from '../client';

export interface OfferImage {
  id: number;
  image_path: string;
  sort_order: number;
}

export interface Offer {
  id: number;
  title: string;
  description: string | null;

  doctor_id: number | null;
  doctor_name: string | null;
  doctor_specialty: string | null;
  doctor_avatar: string | null;

  clinic_id: number | null;
  clinic_name: string | null;
  facility_id?: number | null;
  provider_name?: string | null;
  target_audience?: string | null;
  max_capacity?: number | null;
  booked_count?: number | null;

  original_price: number | null;
  discounted_price: number | null;
  discount_percent: number | null;

  image_url: string | null;
  start_date: string | null;
  end_date: string | null;

  is_active: number;
  is_expired: number;

  created_by: number | null;
  created_at: string;

  status?: 'approved' | 'pending' | 'rejected';
  rejection_reason?: string | null;
  created_by_role?: string | null;
  images?: OfferImage[];   // 🆕
}

export interface CreateOfferData {
  title: string;
  description?: string;
  doctor_id?: number;
  clinic_id?: number;
  facility_id?: number;
  provider_name?: string;
  target_audience?: string;
  max_capacity?: number;
  original_price?: number;
  discounted_price?: number;
  discount_percent?: number;
  start_date?: string;
  end_date?: string;
  duration_hours?: number;
  duration_days?: number;
}

export interface ReactivateOfferData {
  duration_hours?: number;
  duration_days?: number;
  end_date?: string;
}

// ==================== للمريض: العروض النشطة ====================
export async function getActiveOffers(): Promise<Offer[]> {
  const response = await apiClient.get('/offers');
  return response.data.data;
}

// ==================== للأدمن: كل العروض ====================
export async function getAllOffers(params?: {
  status?: 'all' | 'active' | 'expired' | 'disabled' | 'pending' | 'approved' | 'rejected';
}): Promise<Offer[]> {
  const response = await apiClient.get('/offers/all', {
    params: { status: params?.status },
  });
  return response.data.data;
}

// ==================== عرض واحد ====================
export async function getOffer(id: number): Promise<Offer> {
  const response = await apiClient.get(`/offers/${id}`);
  return response.data.data;
}

// ==================== إضافة ====================
export async function createOffer(data: CreateOfferData): Promise<Offer> {
  const response = await apiClient.post('/offers', data);
  return response.data.data;
}

// ==================== تعديل ====================
export async function updateOffer(
  id: number,
  data: Partial<CreateOfferData> & { is_active?: number }
): Promise<Offer> {
  const response = await apiClient.put(`/offers/${id}`, data);
  return response.data.data;
}

// ==================== تفعيل/تعطيل ====================
export async function toggleOffer(id: number): Promise<{ is_active: number }> {
  const response = await apiClient.patch(`/offers/${id}/toggle`);
  return response.data.data;
}

// ==================== اعتماد/موافقة على عرض (للأدمن) ====================
export async function approveOffer(id: number): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.patch(`/offers/${id}/approve`);
  return response.data;
}

// ==================== رفض عرض (للأدمن) ====================
export async function rejectOffer(id: number, reason?: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.patch(`/offers/${id}/reject`, { reason });
  return response.data;
}

// ==================== إعادة تفعيل منتهي ====================
export async function reactivateOffer(
  id: number,
  data: ReactivateOfferData
): Promise<Offer> {
  const response = await apiClient.patch(`/offers/${id}/reactivate`, data);
  return response.data.data;
}

// ==================== حذف ====================
export async function deleteOffer(id: number): Promise<void> {
  await apiClient.delete(`/offers/${id}`);
}

// ==================== 🆕 رفع صور ====================
export async function uploadOfferImages(
  offerId: number,
  files: File[]
): Promise<{
  data: OfferImage[];
  failed: Array<{ name: string; reason: string }>;
}> {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));

  const response = await apiClient.post(`/offers/${offerId}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,   // 60 ثانية — للصور الكبيرة
  });

  return {
    data: response.data.data || [],
    failed: response.data.failed || [],
  };
}

// ==================== 🆕 حذف صورة ====================
export async function deleteOfferImage(imageId: number): Promise<void> {
  await apiClient.delete(`/offers/images/${imageId}`);
}