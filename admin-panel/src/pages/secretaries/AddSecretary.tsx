import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Save, Info } from 'lucide-react';
import { createSecretary } from '../../api/endpoints/secretaries';
import { getClinics, type Clinic } from '../../api/endpoints/clinics';

export default function AddSecretary() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    clinic_id: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getClinics().then(setClinics).catch(console.error);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await createSecretary({
        full_name: form.full_name,
        phone: form.phone,
        clinic_id: form.clinic_id ? Number(form.clinic_id) : undefined,
      });
      alert('تم إضافة السكرتيرة. ستستلم كود التفعيل عبر واتساب.');
      navigate('/secretaries');
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطأ في الإضافة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectedClinic = clinics.find((c) => c.id === Number(form.clinic_id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/secretaries')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          type="button"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إضافة سكرتيرة جديدة</h1>
          <p className="text-gray-500 mt-1">املأ البيانات التالية</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الاسم الكامل <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="سارة أحمد"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم الهاتف (واتساب) <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="77XXXXXXX"
            />
            <p className="text-xs text-gray-500 mt-1">
              سيستلم كود التفعيل عبر واتساب
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              العيادة التي تعمل بها <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.clinic_id}
              onChange={(e) => updateField('clinic_id', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">اختر العيادة</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.governorate ? `- ${c.governorate}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* معلومات العيادة المختارة */}
        {selectedClinic && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">
                {selectedClinic.name}
              </p>
              <p className="text-blue-700 mt-1">
                {selectedClinic.doctors_count || 0} طبيب في هذه العيادة. ستُربط
                السكرتيرة تلقائياً بهم.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/secretaries')}
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
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ السكرتيرة'}
          </button>
        </div>
      </form>
    </div>
  );
}