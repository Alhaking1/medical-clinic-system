import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Save, Shield, CheckCircle2, Users, AlertTriangle } from 'lucide-react';
import { getGlobalSecretaryPermissions, updateGlobalSecretaryPermissions } from '../../api/endpoints/secretaries';

const PERMISSIONS_LIST = [
  { key: 'view_queue', label: 'عرض الطابور', description: 'رؤية قائمة المرضى المنتظرين' },
  { key: 'check_in', label: 'تسجيل الوصول', description: 'تسجيل وصول المرضى بالعيادة' },
  { key: 'view_appointments', label: 'عرض الحجوزات', description: 'رؤية جميع الحجوزات' },
  { key: 'edit_appointments', label: 'تعديل وإلغاء الحجوزات', description: 'تعديل مواعيد وإلغاء حجوزات المرضى' },
  { key: 'view_patients', label: 'عرض بيانات المرضى', description: 'الاطلاع على ملفات وبيانات المرضى' },
  { key: 'view_slots', label: 'عرض المواعيد والفترات', description: 'رؤية المواعيد المتاحة للحجز' },
  { key: 'manage_slots', label: 'إدارة المواعيد', description: 'إضافة وتعديل وحذف المواعيد' },
  { key: 'view_payments', label: 'عرض المدفوعات', description: 'رؤية سجلات وسندات دفع المرضى' },
  { key: 'confirm_payments', label: 'تأكيد وقبول المدفوعات', description: 'تأكيد استلام رسوم الكشف والتحويلات' },
  { key: 'manage_doctors', label: 'إدارة أطباء العيادة', description: 'ربط وإدارة أطباء العيادة التابعة لها' },
  { key: 'approve_doctors', label: 'اعتماد الأطباء الجدد', description: 'اعتماد طلبات انضمام الأطباء لعيادتها' },
  { key: 'manage_schedules', label: 'إدارة القوالب الأسبوعية', description: 'تعديل جداول دوام أطباء العيادة' },
  { key: 'manage_periods', label: 'إدارة فترات الحجز', description: 'إيقاف واستئناف الفترات وتعديل سعة الحجز' },
  { key: 'delegate_doctors', label: 'تفويض إدارة الأطباء', description: 'إرسال واستقبال طلبات تفويض الأطباء مع سكرتيرات أخريات' },
];

export default function GlobalSecretaryPermissions() {
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [totalSecretaries, setTotalSecretaries] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getGlobalSecretaryPermissions();
      setPermissions(data.permissions || {});
      setTotalSecretaries(data.total_secretaries || 0);
    } catch (err: any) {
      console.error(err);
      alert('تعذر تحميل الصلاحيات الافتراضية');
      navigate('/secretaries');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = (key: string) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
    setSavedSuccess(null);
  };

  const handleSelectAll = (val: boolean) => {
    const updated: Record<string, boolean> = {};
    PERMISSIONS_LIST.forEach((p) => {
      updated[p.key] = val;
    });
    setPermissions(updated);
    setSavedSuccess(null);
  };

  const handleSave = async () => {
    if (!confirm(`هل أنت متأكد من تعميم هذه الصلاحيات على جميع السكرتيرات (${totalSecretaries} سكرتيرة)؟`)) {
      return;
    }

    setIsSaving(true);
    setSavedSuccess(null);
    try {
      const res = await updateGlobalSecretaryPermissions(permissions);
      setSavedSuccess(res.message || 'تم تحديث وتعميم كامل صلاحيات السكرتيرات بنجاح');
      setTimeout(() => {
        navigate('/secretaries');
      }, 1500);
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في حفظ الصلاحيات');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/secretaries')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">التحكم بكامل صلاحيات السكرتيرات</h1>
          <p className="text-gray-500 mt-1">
            إدارة الصلاحيات العامة وتعميمها على جميع السكرتيرات المسجلات دفعة واحدة
          </p>
        </div>
      </div>

      {/* تنبيه عدد السكرتيرات */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Users className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">تعميم الصلاحيات الشاملة للسكرتيرات</h3>
            <p className="text-xs text-purple-700 mt-0.5">
              أي تعديل تقوم بحفظه هنا سيتم تطبيقه فوراً على كافة حسابات السكرتيرات ({totalSecretaries} سكرتيرة)
            </p>
          </div>
        </div>
        <span className="bg-purple-200 text-purple-900 font-bold px-3 py-1 rounded-full text-xs">
          {totalSecretaries} سكرتيرة
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">قائمة الصلاحيات العامة</h2>
              <p className="text-sm text-gray-500">
                حدد ما يمكن للسكرتيرات الوصول إليه واستخدامه بشكل عام
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50 transition"
            >
              تحديد الكل
            </button>
            <button
              type="button"
              onClick={() => handleSelectAll(false)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
            >
              إلغاء الكل
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {PERMISSIONS_LIST.map((p) => {
            const isChecked = permissions[p.key] ?? false;
            return (
              <label
                key={p.key}
                className={`flex items-center justify-between p-4 rounded-xl cursor-pointer border transition ${
                  isChecked
                    ? 'bg-blue-50/40 border-blue-200'
                    : 'bg-gray-50 border-gray-200 opacity-75'
                } hover:shadow-sm`}
              >
                <div>
                  <p className="font-medium text-gray-900">{p.label}</p>
                  <p className="text-sm text-gray-500">{p.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => togglePermission(p.key)}
                  className="w-5 h-5 accent-blue-600 cursor-pointer"
                />
              </label>
            );
          })}
        </div>

        {savedSuccess && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{savedSuccess} — جاري العودة...</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-amber-700">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>تنبيه: هذا الإجراء سيستبدل الصلاحيات المخصصة لكافة السكرتيرات بهذه الصلاحيات الموحدة.</span>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition disabled:opacity-50 shadow-sm"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'جاري التعميم...' : 'تطبيق وتعميم الصلاحيات على جميع السكرتيرات'}
          </button>
        </div>
      </div>
    </div>
  );
}
