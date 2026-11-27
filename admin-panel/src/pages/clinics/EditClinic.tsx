import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Save, Map } from 'lucide-react';
import { getClinic, updateClinic } from '../../api/endpoints/clinics';

const GOVERNORATES = [
  'صنعاء', 'عدن', 'تعز', 'الحديدة', 'إب', 'حجة', 'صعدة', 'عمران',
  'المحويت', 'ريمة', 'ذمار', 'البيضاء', 'مأرب', 'الجوف', 'حضرموت',
  'المهرة', 'شبوة', 'أبين', 'لحج', 'الضالع',
];

export default function EditClinic() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState({
    name: '',
    governorate: '',
    address: '',
    phone: '',
    notes: '',
    is_active: true,
    google_maps_url: '',   // 🆕
    commission_rate: '',
    facility_type: 'clinic',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) loadClinic(Number(id));
  }, [id]);

  const loadClinic = async (clinicId: number) => {
    try {
      const clinic = await getClinic(clinicId);
      setForm({
        name: clinic.name,
        governorate: clinic.governorate || '',
        address: clinic.address || '',
        phone: clinic.phone || '',
        notes: clinic.notes || '',
        is_active: Boolean(clinic.is_active),
        google_maps_url: clinic.google_maps_url || '',
        commission_rate: clinic.commission_rate !== null && clinic.commission_rate !== undefined ? String(clinic.commission_rate) : '',
        facility_type: clinic.facility_type || 'clinic',
      });
    } catch (err) {
      alert('العيادة غير موجودة');
      navigate('/clinics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await updateClinic(Number(id), {
        name: form.name,
        governorate: form.governorate || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
        is_active: form.is_active,
        google_maps_url: form.google_maps_url || undefined,
        commission_rate: form.commission_rate !== '' ? parseFloat(form.commission_rate) : null,
        facility_type: form.facility_type,
      });
      alert('تم تعديل العيادة بنجاح');
      navigate('/clinics');
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطأ في التعديل');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/clinics')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          type="button"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تعديل العيادة</h1>
          <p className="text-gray-500 mt-1">قم بتحديث بيانات العيادة</p>
        </div>
      </div>

      {/* النموذج */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع المنشأة <span className="text-red-500">*</span>
            </label>
            <select
              value={form.facility_type}
              onChange={(e) => updateField('facility_type', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white font-medium"
            >
              <option value="clinic">عيادة طبية (Clinic)</option>
              <option value="medical_center">مركز طبي متكامل (Medical Center)</option>
              <option value="pharmacy">صيدلية (Pharmacy)</option>
              <option value="hospital">مستشفى (Hospital)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اسم المنشأة <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المحافظة
            </label>
            <select
              value={form.governorate}
              onChange={(e) => updateField('governorate', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">اختر المحافظة</option>
              {GOVERNORATES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              العنوان
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* 🆕 رابط Google Maps */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Map className="w-4 h-4 text-primary-600" />
              رابط موقع العيادة على Google Maps
            </label>
            <input
              type="url"
              value={form.google_maps_url}
              onChange={(e) => updateField('google_maps_url', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="https://maps.app.goo.gl/xxxxx"
              dir="ltr"
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 افتح Google Maps → ابحث عن العيادة → "Share" → "Copy link" → الصق هنا
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نسبة عمولة المنصة (%) للعيادة
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={form.commission_rate}
              onChange={(e) => updateField('commission_rate', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-bold"
              placeholder="فارغ = النسبة الافتراضية العامة"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 يمكنك تخصيص نسبة عمولة مستقلة لهذه العيادة أو ترك الحقل فارغاً لاعتماد العمولة العامة.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الهاتف
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ملاحظات
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => updateField('is_active', e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-gray-700">العيادة نشطة</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/clinics')}
            className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      </form>
    </div>
  );
}