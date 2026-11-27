import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, User, Shield, CheckCircle2, MessageSquare, Lock } from 'lucide-react';
import {
  getDoctors,
  deleteDoctor,
  toggleDoctor,
  approveDoctor,
  toggleDoctorDirectChat,
  type Doctor,
} from '../../api/endpoints/doctors';
import UserAvatar from '../../components/ui/UserAvatar';

export default function DoctorsList() {
  const [search, setSearch] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});

  const togglePasswordVisibility = (id: number) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      setIsLoading(true);
      setError('');
      // ✅ include_hidden: true — لعرض كل الأطباء (نشط + مخفي + معلق) في لوحة الأدمن
      const data = await getDoctors({ include_hidden: true });
      setDoctors(data);
    } catch (err: any) {
      console.error('❌ خطأ في تحميل الأطباء:', err);
      setError(err.response?.data?.message || 'خطأ في تحميل الأطباء');
    } finally {
      setIsLoading(false);
    }
  };


  const handleToggleDirectChat = async (id: number, currentAllow: boolean) => {
    try {
      await toggleDoctorDirectChat(id, !currentAllow);
      setDoctors((prev) =>
        prev.map((doc) => (doc.id === id ? { ...doc, allow_direct_chat: !currentAllow ? 1 : 0 } : doc))
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'تعذر تعديل إذن مراسلة الطبيب');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطبيب؟')) return;
    try {
      await deleteDoctor(id);
      loadDoctors();
    } catch (err) {
      alert('خطأ في حذف الطبيب');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await toggleDoctor(id);
      loadDoctors();
    } catch (err) {
      alert('خطأ في تعديل الحالة');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      setApprovingId(id);
      await approveDoctor(id);
      await loadDoctors();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في اعتماد الطبيب');
    } finally {
      setApprovingId(null);
    }
  };

  const filtered = doctors.filter(
    (d) =>
      d.full_name.includes(search) ||
      d.specialty.includes(search) ||
      (d.governorate && d.governorate.includes(search))
  );

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة الأطباء</h1>
          <p className="text-gray-500 mt-1">عدد الأطباء الكلي: {doctors.length}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/doctors/permissions/all"
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition shadow-xs"
            title="التحكم بكامل صلاحيات جميع الأطباء في النظام دفعة واحدة"
          >
            <Shield className="w-5 h-5" />
            التحكم بكامل صلاحيات الأطباء
          </Link>
          <Link
            to="/doctors/add"
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            إضافة طبيب
          </Link>
        </div>
      </div>

      {/* البحث */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو التخصص أو المحافظة..."
            className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">
                  الطبيب
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">
                  التخصص
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">
                  المحافظة والعيادة
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">
                  السعر
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">
                  حالة الحساب
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((doctor) => (
                <tr key={doctor.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <UserAvatar
                        src={(doctor as any).avatar_url || doctor.avatar}
                        name={doctor.full_name}
                        className="w-10 h-10 mt-1"
                      />
                      <div>
                        {/* 🛡️ زر التحكم بالصلاحيات فوق اسم كل طبيب */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <Link
                            to={`/doctors/${doctor.id}/permissions`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md transition shadow-xs"
                            title="التحكم في صلاحيات الطبيب"
                          >
                            <Shield className="w-3 h-3 text-purple-600" />
                            التحكم بالصلاحيات
                          </Link>
                        </div>
                        <p className="font-medium text-gray-900">
                          {doctor.full_name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span dir="ltr">{doctor.phone || '—'}</span>
                          {doctor.email && <span dir="ltr" className="text-gray-400"> • {doctor.email}</span>}
                        </div>
                        {doctor.raw_password && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] bg-amber-50 text-amber-800 border border-amber-200/70 px-2 py-0.5 rounded-md w-fit">
                            <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span className="font-mono font-bold tracking-wider">
                              {visiblePasswords[doctor.id] ? doctor.raw_password : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(doctor.id)}
                              className="text-amber-700 hover:text-amber-900 p-0.5 cursor-pointer"
                              title={visiblePasswords[doctor.id] ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                            >
                              {visiblePasswords[doctor.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{doctor.specialty}</td>
                  <td className="px-6 py-4 text-gray-700">
                    <div>
                      <p className="text-sm font-medium">{doctor.clinic_name || '—'}</p>
                      <p className="text-xs text-gray-400">{doctor.governorate || '—'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {doctor.consultation_fee.toLocaleString('ar-YE')} ر.ي
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5 items-start">
                      {doctor.status === 'approved' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            معتمد
                          </span>
                          {doctor.is_active ? (
                            <span className="text-[11px] text-gray-500">(نشط)</span>
                          ) : (
                            <span className="text-[11px] text-red-500">(مخفي)</span>
                          )}
                        </div>
                      ) : doctor.status === 'rejected' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          مرفوض
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            ⏳ قيد المراجعة
                          </span>
                          <button
                            onClick={() => handleApprove(doctor.id)}
                            disabled={approvingId === doctor.id}
                            className="inline-flex items-center gap-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-2 py-1 rounded shadow-xs transition disabled:opacity-50"
                            title="اعتماد وتفعيل في تطبيق المريض فوراً"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {approvingId === doctor.id ? 'جاري الاعتماد...' : 'اعتماد فوري'}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleDirectChat(doctor.id, !!doctor.allow_direct_chat)}
                        className={`p-2 rounded-lg transition ${doctor.allow_direct_chat ? 'text-teal-600 bg-teal-50 hover:bg-teal-100 ring-1 ring-teal-200' : 'text-gray-400 hover:text-teal-600 hover:bg-gray-50'}`}
                        title={doctor.allow_direct_chat ? 'مراسلة الطبيب مفعلة مباشرة - اضغط لتحويل الرسائل للسكرتيرة' : 'الرسائل موجهة للسكرتيرة افتراضياً - اضغط للسماح بمراسلة الطبيب مباشرة'}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <Link
                        to={`/doctors/${doctor.id}/permissions`}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                        title="التحكم بالصلاحيات"
                      >
                        <Shield className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/doctors/${doctor.id}`}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="عرض الملف"
                      >
                        <User className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/doctors/${doctor.id}/edit`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="تعديل"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleToggle(doctor.id)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                        title={doctor.is_active ? 'إخفاء' : 'إظهار'}
                      >
                        {doctor.is_active ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(doctor.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {doctors.length === 0
              ? 'لا يوجد أطباء بعد. اضغط "إضافة طبيب" للبدء.'
              : 'لا توجد نتائج مطابقة للبحث'}
          </div>
        )}
      </div>
    </div>
  );
}