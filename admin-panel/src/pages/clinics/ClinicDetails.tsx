import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  ArrowRight,
  Building2,
  Stethoscope,
  UserCog,
  Phone,
  Edit,
  MapPin,
  UserPlus,
  Plus,
  X,
  Map,
  ExternalLink,
} from 'lucide-react';
import { getClinic, type ClinicDetails as ClinicDetailsType } from '../../api/endpoints/clinics';
import { getSecretaries, updateSecretary } from '../../api/endpoints/secretaries';
import { getDoctors, updateDoctor } from '../../api/endpoints/doctors';
import { getClinics, type Clinic } from '../../api/endpoints/clinics';
import { updateAdminClinicSchedule } from '../../api/endpoints/settings';

export default function ClinicDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<ClinicDetailsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allClinics, setAllClinics] = useState<Clinic[]>([]);
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  const [allSecretaries, setAllSecretaries] = useState<any[]>([]);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [showAddSecretary, setShowAddSecretary] = useState(false);
  const [showEditSchedule, setShowEditSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    is_24_hours: false,
    schedule_type: 'daily',
    open_time: '08:00',
    close_time: '22:00',
  });

  useEffect(() => {
    if (id) loadAll(Number(id));
  }, [id]);

  const loadAll = async (clinicId: number) => {
    try {
      setIsLoading(true);
      const [clinicData, clinicsList, doctorsList, secretariesList] = await Promise.all([
        getClinic(clinicId),
        getClinics(),
        getDoctors(),
        getSecretaries(),
      ]);
      setClinic(clinicData);
      setScheduleForm({
        is_24_hours: (clinicData as any).is_24_hours === 1,
        schedule_type: (clinicData as any).schedule_type || 'daily',
        open_time: (clinicData as any).open_time || '08:00',
        close_time: (clinicData as any).close_time || '22:00',
      });
      setAllClinics(clinicsList);
      setAllDoctors(doctorsList);
      setAllSecretaries(secretariesList);
    } catch (err) {
      alert('العيادة غير موجودة');
      navigate('/clinics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!clinic) return;
    try {
      await updateAdminClinicSchedule(clinic.id, {
        is_24_hours: scheduleForm.is_24_hours ? 1 : 0,
        schedule_type: scheduleForm.schedule_type,
        open_time: scheduleForm.open_time,
        close_time: scheduleForm.close_time,
      });
      alert('تم تحديث وتطبيق أوقات دوام العيادة بنجاح ✅');
      setShowEditSchedule(false);
      reload();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل حفظ أوقات الدوام');
    }
  };

  const reload = () => {
    if (id) loadAll(Number(id));
  };

  const handleAddDoctor = async (doctorId: number) => {
    try {
      await updateDoctor(doctorId, { clinic_name: clinic?.name });
      setShowAddDoctor(false);
      reload();
      alert('تم إضافة الطبيب للعيادة');
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ');
    }
  };

  const handleMoveSecretary = async (secretaryId: number, newClinicId: number) => {
    try {
      await updateSecretary(secretaryId, { clinic_id: newClinicId });
      reload();
      alert('تم نقل السكرتيرة');
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ');
    }
  };

  const handleAddSecretary = async (secretaryId: number) => {
    if (!clinic) return;
    await handleMoveSecretary(secretaryId, clinic.id);
    setShowAddSecretary(false);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;
  }

  if (!clinic) return null;

  const availableDoctors = allDoctors.filter(
    (d) => !clinic.doctors.some((cd) => cd.id === d.id)
  );

  const availableSecretaries = allSecretaries.filter(
    (s) => s.clinic_id !== clinic.id
  );

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/clinics')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="bg-blue-100 p-3 rounded-lg">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{clinic.name}</h1>
            <p className="text-gray-500 mt-1">
              {clinic.doctors.length} طبيب · {clinic.secretaries.length} سكرتيرة
            </p>
          </div>
        </div>
      </div>

      {/* معلومات العيادة */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {clinic.governorate && (
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-4 h-4 text-gray-400" />
              {clinic.governorate}
            </div>
          )}
          {clinic.phone && (
            <div className="flex items-center gap-2 text-gray-700">
              <Phone className="w-4 h-4 text-gray-400" />
              {clinic.phone}
            </div>
          )}
        </div>

        {/* 🆕 أرقام تواصل إضافية مقدمة من السكرتيرة (للإدارة فقط) */}
        {clinic.auxiliary_contact_numbers && clinic.auxiliary_contact_numbers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              أرقام تواصل إضافية مقدمة من السكرتيرة (خاص بالإدارة):
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {clinic.auxiliary_contact_numbers.map((aux) => (
                <div key={aux.id} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-emerald-800 text-base" dir="ltr">
                      +967 {aux.phone}
                    </span>
                    {aux.notes && (
                      <p className="text-xs text-gray-600 mt-0.5">{aux.notes}</p>
                    )}
                  </div>
                  <div className="text-left text-xs text-emerald-700">
                    {aux.added_by_secretary_name && (
                      <span>بواسطة: {aux.added_by_secretary_name}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🆕 رابط Google Maps */}
        {clinic.google_maps_url && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <a
              href={clinic.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg transition text-sm font-medium"
            >
              <Map className="w-4 h-4" />
              عرض الموقع على Google Maps
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* الأطباء */}
            {/* مواعيد وساعات عمل العيادة */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2.5 rounded-xl">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">مواعيد وساعات عمل العيادة</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                الحالة: {(clinic as any).status_label || ((clinic as any).is_open ? 'مفتوح الآن 🟢' : 'مغلق حالياً 🔴')} • {((clinic as any).working_hours_display || 'من 08:00 ص إلى 10:00 م')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowEditSchedule(true)}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-1.5 rounded-lg text-sm font-medium transition"
          >
            <Edit className="w-4 h-4" />
            تعديل أوقات الدوام
          </button>
        </div>
      </div>

<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-primary-100 p-2 rounded-lg">
              <Stethoscope className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="font-semibold text-gray-900">
              الأطباء ({clinic.doctors.length})
            </h2>
          </div>
          <button
            onClick={() => setShowAddDoctor(!showAddDoctor)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition text-sm"
          >
            <UserPlus className="w-4 h-4" />
            إضافة طبيب
          </button>
        </div>

        {showAddDoctor && (
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">اختر طبيباً:</p>
              <button
                onClick={() => setShowAddDoctor(false)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {availableDoctors.length === 0 ? (
              <p className="text-sm text-gray-500">لا يوجد أطباء متاحون</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {availableDoctors.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleAddDoctor(d.id)}
                    className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-primary-500 transition text-right"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{d.full_name}</p>
                      <p className="text-xs text-gray-500">{d.specialty}</p>
                    </div>
                    <Plus className="w-4 h-4 text-primary-600" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {clinic.doctors.length === 0 ? (
          <div className="p-8 text-center text-gray-500">لا يوجد أطباء</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">الطبيب</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">التخصص</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">السعر</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">الحالة</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clinic.doctors.map((doctor: any) => (
                <tr key={doctor.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 font-semibold">
                          {doctor.full_name.charAt(0)}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900">{doctor.full_name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{doctor.specialty}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {doctor.consultation_fee.toLocaleString('ar-YE')} ر.ي
                  </td>
                  <td className="px-6 py-4">
                    {doctor.is_active ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        نشط
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        مخفي
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/doctors/${doctor.id}/edit`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition inline-flex"
                      title="تعديل"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* السكرتيرات */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <UserCog className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="font-semibold text-gray-900">
              السكرتيرات ({clinic.secretaries.length})
            </h2>
          </div>
          <button
            onClick={() => setShowAddSecretary(!showAddSecretary)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition text-sm"
          >
            <UserPlus className="w-4 h-4" />
            إضافة سكرتيرة
          </button>
        </div>

        {showAddSecretary && (
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">اختر سكرتيرة:</p>
              <button
                onClick={() => setShowAddSecretary(false)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {availableSecretaries.length === 0 ? (
              <p className="text-sm text-gray-500">لا توجد سكرتيرات متاحات</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {availableSecretaries.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleAddSecretary(s.id)}
                    className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-purple-500 transition text-right"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{s.full_name}</p>
                      <p className="text-xs text-gray-500">{s.phone}</p>
                    </div>
                    <Plus className="w-4 h-4 text-purple-600" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {clinic.secretaries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">لا توجد سكرتيرات</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">الاسم</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">الهاتف</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">الحالة</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">نقل إلى</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clinic.secretaries.map((sec: any) => (
                <tr key={sec.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <UserCog className="w-5 h-5 text-purple-600" />
                      </div>
                      <p className="font-medium text-gray-900">{sec.full_name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{sec.phone}</td>
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
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleMoveSecretary(sec.id, Number(e.target.value));
                        }
                      }}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">نقل إلى عيادة...</option>
                      {allClinics
                        .filter((c) => c.id !== clinic.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/secretaries/${sec.id}/edit`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition inline-flex"
                      title="تعديل"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    
      {/* نافذة تعديل مواعيد وساعات عمل العيادة */}
      {showEditSchedule && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900">تعديل قالب وساعات عمل العيادة</h3>
              </div>
              <button
                onClick={() => setShowEditSchedule(false)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer">
                <div>
                  <span className="text-sm font-semibold text-gray-800">دوام متواصل 24 ساعة</span>
                  <p className="text-xs text-gray-500">العيادة مفتوحة طوال اليوم بدون إغلاق</p>
                </div>
                <input
                  type="checkbox"
                  checked={scheduleForm.is_24_hours}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, is_24_hours: e.target.checked })}
                  className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                />
              </label>

              {!scheduleForm.is_24_hours && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">وقت الفتح:</label>
                    <input
                      type="time"
                      value={scheduleForm.open_time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, open_time: e.target.value })}
                      className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">وقت الإغلاق:</label>
                    <input
                      type="time"
                      value={scheduleForm.close_time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, close_time: e.target.value })}
                      className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowEditSchedule(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveSchedule}
                className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm"
              >
                حفظ وتطبيق الدوام ✅
              </button>
            </div>
          </div>
        </div>
      )}
</div>
  );
}