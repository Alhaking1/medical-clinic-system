import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  MapPin,
  Phone,
  User,
  X,
  Save,
  Hospital,
  Pill,
  Stethoscope,
  Layers,
} from 'lucide-react';
import {
  getClinics,
  createClinic,
  deleteClinic,
  type Clinic,
} from '../../api/endpoints/clinics';

const GOVERNORATES = [
  'صنعاء', 'عدن', 'تعز', 'الحديدة', 'إب', 'حجة', 'صعدة', 'عمران',
  'المحويت', 'ريمة', 'ذمار', 'البيضاء', 'مأرب', 'الجوف', 'حضرموت',
  'المهرة', 'شبوة', 'أبين', 'لحج', 'الضالع',
];

const FACILITY_TABS = [
  { id: 'all', label: 'الكل', icon: Layers },
  { id: 'clinic', label: 'العيادات', icon: Stethoscope },
  { id: 'medical_center', label: 'المراكز الطبية', icon: Building2 },
  { id: 'pharmacy', label: 'الصيدليات', icon: Pill },
  { id: 'hospital', label: 'المستشفيات', icon: Hospital },
];

export default function ClinicsList() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    governorate: '',
    address: '',
    phone: '',
    notes: '',
    commission_rate: '',
    facility_type: 'clinic',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    try {
      setIsLoading(true);
      const data = await getClinics();
      setClinics(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createClinic({
        ...form,
        facility_type: form.facility_type,
        commission_rate: form.commission_rate !== '' ? parseFloat(form.commission_rate) : null
      });
      setForm({ name: '', governorate: '', address: '', phone: '', notes: '', commission_rate: '', facility_type: 'clinic' });
      setShowForm(false);
      loadClinics();
      alert('تمت إضافة المنشأة الطبية بنجاح');
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطأ في الإضافة');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه المنشأة؟')) return;
    try {
      await deleteClinic(id);
      loadClinics();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في الحذف');
    }
  };

  const filtered = clinics.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'all' || (c.facility_type || 'clinic') === activeTab;
    return matchesSearch && matchesTab;
  });

  const getFacilityIcon = (type?: string) => {
    switch (type) {
      case 'hospital':
        return <Hospital className="w-6 h-6 text-red-600" />;
      case 'pharmacy':
        return <Pill className="w-6 h-6 text-emerald-600" />;
      case 'medical_center':
        return <Building2 className="w-6 h-6 text-purple-600" />;
      default:
        return <Stethoscope className="w-6 h-6 text-blue-600" />;
    }
  };

  const getFacilityBadge = (type?: string) => {
    switch (type) {
      case 'hospital':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">مستشفى</span>;
      case 'pharmacy':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700">صيدلية</span>;
      case 'medical_center':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700">مركز طبي</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">عيادة</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المنشآت الطبية والعيادات</h1>
          <p className="text-gray-500 mt-1">العدد الإجمالي: {clinics.length}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          إضافة منشأة / عيادة
        </button>
      </div>

      {/* التبويبات الفئوية (عيادات، مراكز، صيدليات، مستشفيات) */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {FACILITY_TABS.map((tab) => {
          const Icon = tab.icon;
          const count = tab.id === 'all' 
            ? clinics.length 
            : clinics.filter((c) => (c.facility_type || 'clinic') === tab.id).length;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                isActive ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* نموذج الإضافة */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">إضافة منشأة جديدة</h2>
            <button
              onClick={() => setShowForm(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نوع المنشأة *
              </label>
              <select
                value={form.facility_type}
                onChange={(e) => setForm({ ...form, facility_type: e.target.value })}
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
                اسم المنشأة *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="مثال: مستشفى الأمل أو عيادة النور"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المحافظة
              </label>
              <select
                value={form.governorate}
                onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="">اختر المحافظة</option>
                {GOVERNORATES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العنوان
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="شارع الزبيري"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الهاتف
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="77XXXXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نسبة عمولة المنصة (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={form.commission_rate}
                onChange={(e) => setForm({ ...form, commission_rate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-bold"
                placeholder="اتركه فارغاً لاعتماد النسبة العامة (10%)"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ملاحظات
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                rows={2}
              />
            </div>

            {error && (
              <div className="md:col-span-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition"
              >
                <Save className="w-5 h-5" />
                حفظ المنشأة
              </button>
            </div>
          </form>
        </div>
      )}

      {/* البحث */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم..."
            className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* القائمة */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100">
          لا توجد منشآت مطابقة للتصنيف المحدد. اضغط "إضافة منشأة / عيادة" للبدء.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((clinic) => (
            <div
              key={clinic.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gray-100 p-3 rounded-xl flex items-center justify-center">
                  {getFacilityIcon(clinic.facility_type)}
                </div>
                <div className="flex gap-1">
                  <Link
                    to={`/clinics/${clinic.id}`}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="عرض"
                  >
                    <User className="w-4 h-4" />
                  </Link>
                  <Link
                    to={`/clinics/${clinic.id}/edit`}
                    className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                    title="تعديل"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(clinic.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold text-gray-900">
                  {clinic.name}
                </h3>
                {getFacilityBadge(clinic.facility_type)}
              </div>

              <div className="space-y-1 text-sm text-gray-600 mb-4">
                {clinic.governorate && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {clinic.governorate}
                  </div>
                )}
                {clinic.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {clinic.phone}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">
                    {clinic.doctors_count || 0}
                  </span>{' '}
                  طبيب / استشاري
                </p>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                  العمولة: {clinic.commission_rate !== null && clinic.commission_rate !== undefined ? `${clinic.commission_rate}%` : 'الافتراضية (10%)'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
