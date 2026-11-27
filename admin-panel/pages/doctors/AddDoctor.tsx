import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Save, Building2, MapPin } from 'lucide-react';
import { createDoctor } from '../../api/endpoints/doctors';
import { getClinics, type Clinic } from '../../api/endpoints/clinics';

const SPECIALTIES = [
  'باطنية', 'أطفال', 'أسنان', 'جلدية', 'عيون', 'نساء وتوليد',
  'عظام', 'أنف وأذن وحنجرة', 'مسالك بولية', 'نفسية', 'قلب', 'مخ وأعصاب',
];

export default function AddDoctor() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [form, setForm] = useState({
    full_name: '',
    specialty: '',
    clinic_name: '',
    phone: '',
    consultation_fee: '',
    slot_duration: '20',
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

    const selectedClinic = clinics.find((c) => c.name === form.clinic_name);

    try {
      await createDoctor({
        full_name: form.full_name,
        specialty: form.specialty,
        clinic_name: form.clinic_name || undefined,
        governorate: selectedClinic?.governorate || undefined,
        phone: form.phone || undefined,
        consultation_fee: Number(form.consultation_fee),
        slot_duration: Number(form.slot_duration),
      });
      alert('تم إضافة الطبيب بنجاح');
      navigate('/doctors');
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطأ في إضافة الطبيب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectedClinic = clinics.find((c) => c.name === form.clinic_name);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/doctors')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          type="button"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إضافة طبيب جديد</h1>
          <p className="text-gray-500 mt-1">املأ البيانات التالية</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* الاسم */}
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
              placeholder="د. أحمد محمد"
            />
          </div>

          {/* التخصص */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              التخصص <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.specialty}
              onChange={(e) => updateField('specialty', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">اختر التخصص</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* العيادة */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              العيادة <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.clinic_name}
              onChange={(e) => updateField('clinic_name', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">اختر العيادة</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} {c.governorate ? `- ${c.governorate}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* معلومات العيادة المختارة */}
          {selectedClinic && (
            <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Building2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">{selectedClinic.name}</p>
                {selectedClinic.governorate && (
                  <p className="text-blue-700 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedClinic.governorate}
                  </p>
                )}
                {selectedClinic.address && (
                  <p className="text-blue-600 mt-1 text-xs">{selectedClinic.address}</p>
                )}
              </div>
            </div>
          )}

          {/* الهاتف */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم الهاتف
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="77XXXXXXX"
            />
          </div>

          {/* السعر */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              سعر الكشف (ريال) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              value={form.consultation_fee}
              onChange={(e) => updateField('consultation_fee', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="5000"
            />
          </div>

          {/* مدة الكشف */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              مدة الكشف (دقائق) <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.slot_duration}
              onChange={(e) => updateField('slot_duration', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="10">10 دقائق</option>
              <option value="15">15 دقيقة</option>
              <option value="20">20 دقيقة</option>
              <option value="30">30 دقيقة</option>
              <option value="45">45 دقيقة</option>
            </select>
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
            onClick={() => navigate('/doctors')}
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
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ الطبيب'}
          </button>
        </div>
      </form>
    </div>
  );
}