import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Save, Shield, CheckCircle2 } from 'lucide-react';
import { getDoctorPermissions, updateDoctorPermissions } from '../../api/endpoints/doctors';

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

export default function DoctorPermissionsEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<any>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (id) loadData(Number(id));
  }, [id]);

  const loadData = async (docId: number) => {
    try {
      setIsLoading(true);
      const data = await getDoctorPermissions(docId);
      setDoctor(data.doctor);
      setPermissions(data.permissions || {});
    } catch (err: any) {
      console.error(err);
      alert('تعذر تحميل صلاحيات الطبيب');
      navigate('/doctors');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = (key: string) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
    setSavedSuccess(false);
  };

  const handleSelectAll = (val: boolean) => {
    const updated: Record<string, boolean> = {};
    PERMISSIONS_LIST.forEach((p) => {
      updated[p.key] = val;
    });
    setPermissions(updated);
    setSavedSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await updateDoctorPermissions(Number(id), permissions);
      setSavedSuccess(true);
      setTimeout(() => {
        navigate('/doctors');
      }, 1000);
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
          <h1 className="text-2xl font-bold text-gray-900">صلاحيات الطبيب</h1>
          <p className="text-gray-500 mt-1">
            {doctor?.full_name} {doctor?.specialty ? `— ${doctor.specialty}` : ''}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 p-2 rounded-lg">
              <Shield className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">التحكم في الصلاحيات</h2>
              <p className="text-sm text-gray-500">
                حدد ما يمكن للطبيب الوصول إليه واستخدامه في التطبيق
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
            <span>تم حفظ الصلاحيات بنجاح! جاري العودة...</span>
          </div>
        )}

        <div className="flex justify-end mt-6 pt-6 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
          </button>
        </div>
      </div>
    </div>
  );
}
