import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Save, Shield } from 'lucide-react';
import { getSecretary, updateSecretary } from '../../api/endpoints/secretaries';

const PERMISSIONS_LIST = [
  { key: 'view_queue', label: 'عرض الطابور', description: 'رؤية قائمة المرضى المنتظرين' },
  { key: 'check_in', label: 'تسجيل الوصول', description: 'تسجيل وصول المرضى' },
  { key: 'view_appointments', label: 'عرض الحجوزات', description: 'رؤية جميع الحجوزات' },
  { key: 'edit_appointments', label: 'تعديل الحجوزات', description: 'تعديل وإلغاء الحجوزات' },
  { key: 'view_patients', label: 'عرض المرضى', description: 'رؤية بيانات المرضى' },
  { key: 'view_slots', label: 'عرض المواعيد', description: 'رؤية المواعيد المتاحة' },
  { key: 'manage_slots', label: 'إدارة المواعيد', description: 'إضافة/حذف/تعديل المواعيد' },
  { key: 'view_payments', label: 'عرض المدفوعات', description: 'رؤية المدفوعات' },
  { key: 'confirm_payments', label: 'تأكيد المدفوعات', description: 'تأكيد أو رفض الدفع' },
  { key: 'approve_doctors', label: 'قبول وتوثيق الأطباء', description: 'صلاحية اعتماد أو رفض طلبات انضمام الأطباء لعيادتها' },
  { key: 'manage_schedules', label: 'إدارة فترات وقوالب الأطباء', description: 'إضافة وتعديل مواعيد وفترات عمل الأطباء' },
];

export default function PermissionsEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [secretary, setSecretary] = useState<any>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) loadSecretary(Number(id));
  }, [id]);

  const loadSecretary = async (secId: number) => {
    try {
      const data = await getSecretary(secId);

      let perms: Record<string, boolean> = {};
      try {
        perms = data.permissions ? JSON.parse(data.permissions) : {};
      } catch (e) {
        perms = {};
      }

      PERMISSIONS_LIST.forEach((p) => {
        if (perms[p.key] === undefined) perms[p.key] = false;
      });

      setSecretary(data);
      setPermissions(perms);
    } catch (err) {
      alert('السكرتيرة غير موجودة');
      navigate('/secretaries');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = (key: string) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSecretary(Number(id), { permissions });
      alert('تم حفظ الصلاحيات');
      navigate('/secretaries');
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في الحفظ');
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
          <h1 className="text-2xl font-bold text-gray-900">صلاحيات السكرتيرة</h1>
          <p className="text-gray-500 mt-1">{secretary?.full_name}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">الصلاحيات</h2>
            <p className="text-sm text-gray-500">حدد ما يمكن للسكرتيرة الوصول إليه</p>
          </div>
        </div>

        <div className="space-y-3">
          {PERMISSIONS_LIST.map((p) => (
            <label
              key={p.key}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition"
            >
              <div>
                <p className="font-medium text-gray-900">{p.label}</p>
                <p className="text-sm text-gray-500">{p.description}</p>
              </div>
              <input
                type="checkbox"
                checked={permissions[p.key] || false}
                onChange={() => togglePermission(p.key)}
                className="w-5 h-5 cursor-pointer"
              />
            </label>
          ))}
        </div>

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