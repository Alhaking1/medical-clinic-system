import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Phone, User, Power, Building2, Shield, Eye, EyeOff, Key } from 'lucide-react';
import {
  getSecretaries,
  deleteSecretary,
  toggleSecretary,
  type Secretary,
} from '../../api/endpoints/secretaries';

export default function SecretariesList() {
  const [search, setSearch] = useState('');
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, boolean>>({});
  const toggleShowPassword = (id: number) => { setRevealedPasswords(prev => ({ ...prev, [id]: !prev[id] })); };

  useEffect(() => {
    loadSecretaries();
  }, []);

  const loadSecretaries = async () => {
    try {
      setIsLoading(true);
      const data = await getSecretaries();
      setSecretaries(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه السكرتيرة؟')) return;
    try {
      await deleteSecretary(id);
      loadSecretaries();
    } catch (error) {
      alert('خطأ في الحذف');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await toggleSecretary(id);
      loadSecretaries();
    } catch (error) {
      alert('خطأ في التعديل');
    }
  };

  const filtered = secretaries.filter(
    (s) =>
      s.full_name.includes(search) ||
      s.phone.includes(search) ||
      (s.clinic_name && s.clinic_name.includes(search))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة السكرتيرات</h1>
          <p className="text-gray-500 mt-1">عدد السكرتيرات: {secretaries.length}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/secretaries/permissions/all"
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition shadow-xs"
            title="التحكم بكامل صلاحيات جميع السكرتيرات في النظام دفعة واحدة"
          >
            <Shield className="w-5 h-5" />
            التحكم بكامل صلاحيات السكرتيرات
          </Link>
          <Link
            to="/secretaries/add"
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            إضافة سكرتيرة
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الهاتف أو العيادة..."
            className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {secretaries.length === 0
              ? 'لا توجد سكرتيرات بعد. اضغط "إضافة سكرتيرة" للبدء.'
              : 'لا توجد نتائج مطابقة للبحث'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">السكرتيرة</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">الهاتف</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">العيادة</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">الحالة</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((sec) => (
                <tr key={sec.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                        <User className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        {/* 🛡️ زر التحكم بالصلاحيات فوق اسم كل سكرتيرة */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <Link
                            to={`/secretaries/${sec.id}/permissions`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md transition shadow-xs"
                            title="التحكم في صلاحيات السكرتيرة"
                          >
                            <Shield className="w-3 h-3 text-purple-600" />
                            التحكم بالصلاحيات
                          </Link>
                        </div>
                        <p className="font-medium text-gray-900">{sec.full_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="font-mono text-sm">{sec.phone}</span>
                      </div>
                      {sec.raw_password ? (
                        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded text-xs w-fit">
                          <Key className="w-3 h-3 text-amber-600 shrink-0" />
                          <span className="font-mono font-medium">
                            {revealedPasswords[sec.id] ? sec.raw_password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleShowPassword(sec.id)}
                            className="p-0.5 hover:text-amber-900 transition"
                            title={revealedPasswords[sec.id] ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                          >
                            {revealedPasswords[sec.id] ? (
                              <EyeOff className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {sec.clinic_name ? (
                      <span className="inline-flex items-center gap-1 text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                        <Building2 className="w-3 h-3" />
                        {sec.clinic_name}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {sec.is_active ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        نشطة
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        معطلة
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/secretaries/${sec.id}/edit`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="تعديل"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/secretaries/${sec.id}/permissions`}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                        title="الصلاحيات"
                      >
                        <Shield className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleToggle(sec.id)}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                        title="تفعيل/تعطيل"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sec.id)}
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
      </div>
    </div>
  );
}