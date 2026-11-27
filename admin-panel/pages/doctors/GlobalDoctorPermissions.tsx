import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Save, Shield, CheckCircle2, Users, AlertTriangle } from 'lucide-react';
import { getGlobalDoctorPermissions, updateGlobalDoctorPermissions } from '../../api/endpoints/doctors';

const PERMISSIONS_LIST = [
  { key: 'view_queue', label: 'عرض وإدارة الطابور', description: 'رؤية قائمة المرضى المنتظرين في العيادة' },
  { key: 'receive_patient', label: 'استدعاء ومعاينة المريض', description: 'بدء الكشف الطبي وإنهاء جلسة المعاينة' },
  { key: 'view_appointments', label: 'عرض المواعيد والحجوزات', description: 'رؤية جميع حجوزات ومواعيد الطبيب' },
  { key: 'view_patients', label: 'سجلات المرضى', description: 'الاطلاع على قائمة وبيانات المرضى' },
  { key: 'view_slots', label: 'عرض الفترات المتاحة', description: 'رؤية المواعيد والفترات المفتوحة للحجز' },
  { key: 'manage_schedule', label: 'إدارة أوقات الدوام والفترات', description: 'تعديل وتحديد أوقات الفترات وأيام العمل' },
  { key: 'medical_records', label: 'السجلات والتقارير الطبية', description: 'كتابة وتعديل التشخيص والتقارير الطبية' },
  { key: 'prescriptions', label: 'إصدار الوصفات الطبية', description: 'إنشاء وطباعة الروشتة الإلكترونية للمريض' },
  { key: 'video_consultations', label: 'الاستشارات عن بُعد (فيديو)', description: 'إجراء المكالمات المرئية والاستشارات أونلاين' },
  { key: 'chat_patients', label: 'المراسلة المباشرة', description: 'الرد على رسائل واستفسارات المرضى عبر التطبيق' },
];

export default function GlobalDoctorPermissions() {
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [totalDoctors, setTotalDoctors] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getGlobalDoctorPermissions();
      setPermissions(data.permissions || {});
      setTotalDoctors(data.total_doctors || 0);
    } catch (err: any) {
      console.error(err);
      alert('تعذر تحميل الصلاحيات الافتراضية');
      navigate('/doctors');
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
    if (!confirm(`هل أنت متأكد من تعميم هذه الصلاحيات على جميع الأطباء (${totalDoctors} طبيب)؟`)) {
      return;
    }

    setIsSaving(true);
    setSavedSuccess(null);
    try {
      const res = await updateGlobalDoctorPermissions(permissions);
      setSavedSuccess(res.message || 'تم تحديث وتعميم كامل صلاحيات الأطباء بنجاح');
      setTimeout(() => {
        navigate('/doctors');
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
          onClick={() => navigate('/doctors')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">التحكم بكامل صلاحيات الأطباء</h1>
          <p className="text-gray-500 mt-1">
            إدارة الصلاحيات العامة وتعميمها على جميع الأطباء المسجلين دفعة واحدة
          </p>
        </div>
      </div>

      {/* تنبيه عدد الأطباء */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Users className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">تعميم الصلاحيات الشاملة</h3>
            <p className="text-xs text-purple-700 mt-0.5">
              أي تعديل تقوم بحفظه هنا سيتم تطبيقه فوراً على كافة حسابات الأطباء النشطة ({totalDoctors} طبيب)
            </p>
          </div>
        </div>
        <span className="bg-purple-200 text-purple-900 font-bold px-3 py-1 rounded-full text-xs">
          {totalDoctors} طبيب
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 p-2 rounded-lg">
              <Shield className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">قائمة الصلاحيات العامة</h2>
              <p className="text-sm text-gray-500">
                حدد الصلاحيات المسموح بها لجميع الأطباء في التطبيق
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-teal-500 text-teal-600 hover:bg-teal-50 transition"
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
            const isChecked = permissions[p.key] ?? true;
            return (
              <label
                key={p.key}
                className={`flex items-center justify-between p-4 rounded-xl cursor-pointer border transition ${
                  isChecked
                    ? 'bg-teal-50/40 border-teal-200'
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
                  className="w-5 h-5 accent-teal-600 cursor-pointer"
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
            <span>تنبيه: هذا الإجراء سيستبدل الصلاحيات المخصصة لكافة الأطباء بهذه الصلاحيات الموحدة.</span>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition disabled:opacity-50 shadow-sm"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'جاري التعميم...' : 'تطبيق وتعميم الصلاحيات على جميع الأطباء'}
          </button>
        </div>
      </div>
    </div>
  );
}
