import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import UserAvatar from '../../components/ui/UserAvatar';
import {
  ArrowRight,
  Edit,
  Phone,
  MapPin,
  Building2,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  FileText,
  TrendingUp,
  Star,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  getDoctor,
  type DoctorDetails as DoctorDetailsType,
} from '../../api/endpoints/doctors';

export default function DoctorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<DoctorDetailsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (id) loadDoctor(Number(id));
  }, [id]);

  const loadDoctor = async (doctorId: number) => {
    try {
      setIsLoading(true);
      const data = await getDoctor(doctorId);
      setDoctor(data);
    } catch (error) {
      alert('الطبيب غير موجود');
      navigate('/doctors');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;
  }

  if (!doctor) return null;

// avatar handled by UserAvatar

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/doctors')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ملف الطبيب</h1>
            <p className="text-gray-500 mt-1">{doctor.full_name}</p>
          </div>
        </div>
        <Link
          to={`/doctors/${doctor.id}/edit`}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Edit className="w-5 h-5" />
          تعديل
        </Link>
      </div>

      {/* البطاقة الرئيسية */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* الصورة */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <UserAvatar
                src={(doctor as any).avatar_url || doctor.avatar}
                name={doctor.full_name}
                className="w-32 h-32 border-4 border-teal-100 ring-2 ring-teal-500/20"
                iconClassName="w-16 h-16"
              />
            </div>
          </div>

          {/* المعلومات */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {doctor.full_name}
              </h2>
              {doctor.is_active ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  نشط
                </span>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  مخفي
                </span>
              )}
            </div>

            <p className="text-primary-600 font-medium mb-4">{doctor.specialty}</p>

            {doctor.bio && (
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                {doctor.bio}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {doctor.phone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {doctor.phone}
                </div>
              )}
              {doctor.clinic_name && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  {doctor.clinic_name}
                </div>
              )}
              {doctor.governorate && (
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {doctor.governorate}
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-700">
                <DollarSign className="w-4 h-4 text-gray-400" />
                {doctor.consultation_fee.toLocaleString('ar-YE')} ر.ي
              </div>
              {doctor.email && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span dir="ltr">{doctor.email}</span>
                </div>
              )}
              {doctor.raw_password && (
                <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200/60 rounded-xl px-3 py-2 text-gray-800 col-span-1 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-gray-500">كلمة المرور:</span>
                    <span className="font-mono font-bold tracking-wider text-sm">
                      {showPassword ? doctor.raw_password : '••••••••'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        إخفاء
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        إظهار
                      </>
                    )}
                  </button>
                </div>
              )}
              {doctor.experience_years > 0 && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Star className="w-4 h-4 text-gray-400" />
                  {doctor.experience_years} سنة خبرة
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">إجمالي الحجوزات</p>
              <p className="text-2xl font-bold text-gray-900">
                {doctor.stats?.total_appointments || 0}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">مكتملة</p>
              <p className="text-2xl font-bold text-green-600">
                {doctor.stats?.completed || 0}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">ملغاة / لم يحضر</p>
              <p className="text-2xl font-bold text-red-600">
                {(doctor.stats?.cancelled || 0) + (doctor.stats?.no_show || 0)}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">الإيرادات</p>
              <p className="text-lg font-bold text-emerald-600">
                {(doctor.revenue || 0).toLocaleString('ar-YE')} ر.ي
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* السكرتيرات */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="font-semibold text-gray-900">
            السكرتيرات في {doctor.clinic_name || 'العيادة'} ({doctor.secretaries?.length || 0})
          </h2>
        </div>
        {doctor.secretaries && doctor.secretaries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {doctor.secretaries.map((sec) => (
              <div
                key={sec.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-700 font-semibold">
                    {sec.full_name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{sec.full_name}</p>
                  <p className="text-sm text-gray-500">{sec.phone}</p>
                </div>
                {sec.is_active ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    نشطة
                  </span>
                ) : (
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                    معطلة
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">لا توجد سكرتيرات في هذه العيادة</p>
        )}
      </div>

      {/* المواعيد القادمة */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 p-6 border-b border-gray-100">
          <Clock className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">
            المواعيد القادمة ({doctor.upcoming?.length || 0})
          </h2>
        </div>
        {doctor.upcoming && doctor.upcoming.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-700">رقم الحجز</th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-700">المريض</th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-700">التاريخ</th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-700">الوقت</th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-700">الدفع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {doctor.upcoming.map((apt) => (
                <tr key={apt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-mono text-gray-700">
                    {apt.booking_code}
                  </td>
                  <td className="px-6 py-3 text-gray-900">{apt.patient_name}</td>
                  <td className="px-6 py-3 text-gray-700">{apt.date}</td>
                  <td className="px-6 py-3 text-gray-700">{apt.start_time}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        apt.payment_status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : apt.payment_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {apt.payment_status === 'paid'
                        ? 'مدفوع'
                        : apt.payment_status === 'pending'
                        ? 'قيد المراجعة'
                        : 'غير مدفوع'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-500">
            لا توجد مواعيد قادمة
          </div>
        )}
      </div>

      {/* آخر العمليات الطبية */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 p-6 border-b border-gray-100">
          <FileText className="w-5 h-5 text-emerald-600" />
          <h2 className="font-semibold text-gray-900">
            آخر العمليات الطبية ({doctor.records?.length || 0})
          </h2>
        </div>
        {doctor.records && doctor.records.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {doctor.records.map((rec) => (
              <div key={rec.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900">{rec.patient_name}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(rec.created_at).toLocaleDateString('ar-YE')}
                  </p>
                </div>
                {rec.diagnosis && (
                  <p className="text-sm text-gray-600">
                    <span className="text-gray-500">التشخيص: </span>
                    {rec.diagnosis}
                  </p>
                )}
                {rec.prescription && (
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="text-gray-500">الوصفة: </span>
                    {rec.prescription}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            لا توجد عمليات طبية بعد
          </div>
        )}
      </div>
    </div>
  );
}