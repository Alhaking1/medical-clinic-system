import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserAvatar from '../../components/ui/UserAvatar';
import {
  ArrowRight,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Cake,
  Ban,
  CheckCircle,
  Trash2,
  Award,
  TrendingUp,
  XCircle,
  Clock,
  DollarSign,
  Activity,
  Shield,
} from 'lucide-react';
import {
  getPatient,
  getPatientStats,
  toggleBlockPatient,
  deletePatient,
  adjustPatientBalance,
  type Patient,
  type PatientStats,
} from '../../api/endpoints/patients';


export default function PatientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);

      const [patientData, statsData] = await Promise.all([
        getPatient(Number(id)),
        getPatientStats(Number(id)),
      ]);

      setPatient(patientData);
      setStats(statsData);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'خطأ في تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!patient) return;
    const action = patient.is_blocked ? 'إلغاء الحظر' : 'حظر';
    if (!confirm(`هل تريد ${action} المريض "${patient.full_name}"؟`)) return;

    try {
      await toggleBlockPatient(patient.id);
      loadData();
    } catch (error) {
      alert('خطأ في تعديل الحالة');
    }
  };

  const handleDelete = async () => {
    if (!patient) return;
    const confirmed = confirm(
      `⚠️ هل أنت متأكد من حذف المريض "${patient.full_name}"؟\n\n` +
        `سيتم حذف:\n` +
        `• بيانات المريض\n` +
        `• جميع حجوزاته (${stats?.total_appointments || 0})\n` +
        `• سجلاته الطبية\n\n` +
        `هذا الإجراء لا يمكن التراجع عنه!`
    );

    if (!confirmed) return;

    try {
      await deletePatient(patient.id);
      alert(`✅ تم حذف المريض ${patient.full_name}`);
      navigate('/patients');
    } catch (error: any) {
      alert(error.response?.data?.message || 'خطأ في حذف المريض');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للمرضى
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error || 'المريض غير موجود'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowRight className="w-5 h-5" />
          <span className="font-medium">العودة للمرضى</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleBlock}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm font-medium ${
              patient.is_blocked
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            }`}
          >
            {patient.is_blocked ? (
              <>
                <CheckCircle className="w-4 h-4" />
                إلغاء الحظر
              </>
            ) : (
              <>
                <Ban className="w-4 h-4" />
                حظر
              </>
            )}
          </button>

          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            حذف
          </button>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-l from-blue-500 to-blue-700 h-32" />
        <div className="px-6 pb-6">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4 -mt-16">
            {/* صورة المريض */}
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center flex-shrink-0">
              <UserAvatar
                src={(patient as any).avatar_url || patient.picture}
                name={patient.full_name}
                className="w-full h-full"
                iconClassName="w-16 h-16"
              />
            </div>

            {/* Name + Info */}
            <div className="flex-1 md:pb-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">
                  {patient.full_name}
                </h1>
                {patient.is_blocked ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    <Ban className="w-3 h-3" />
                    محظور
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3" />
                    نشط
                  </span>
                )}
              </div>

              {patient.email && (
                <p className="text-gray-600 mt-1 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {patient.email}
                </p>
              )}

              <p className="text-gray-500 text-sm mt-2">
                عضو منذ {formatDate(patient.created_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Card */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
            💳
          </div>
          <div>
            <div className="text-white/80 text-sm font-medium">رصيد محفظة المريض</div>
            <div className="text-3xl font-bold mt-1">
              {(patient.balance || 0).toLocaleString()} <span className="text-lg font-normal">ر.ي</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              const amountStr = prompt(`أدخل المبلغ المراد إضافته إلى رصيد المريض ${patient.full_name} (ر.ي):`, '5000');
              if (!amountStr) return;
              const rawAmount = parseFloat(amountStr);
              if (isNaN(rawAmount) || rawAmount === 0) {
                alert('يرجى إدخال مبلغ صحيح');
                return;
              }
              const amount = Math.abs(rawAmount);
              const notes = prompt('ملاحظات / سبب الإيداع (اختياري):', 'شحن رصيد بواسطة الإدارة') || 'شحن رصيد بواسطة الإدارة';
              try {
                await adjustPatientBalance(patient.id, amount, notes);
                alert(`✅ تم شحن رصيد المريض بمبلغ ${amount.toLocaleString()} ر.ي بنجاح!`);
                loadData();
              } catch (err: any) {
                alert(err.response?.data?.message || 'فشل في شحن الرصيد');
              }
            }}
            className="px-5 py-2.5 bg-white text-emerald-800 font-bold rounded-xl shadow-md hover:bg-emerald-50 transition transform active:scale-95 flex items-center gap-2 text-sm"
          >
            <span>+ شحن رصيد</span>
          </button>

          <button
            onClick={async () => {
              const curBal = patient.balance || 0;
              const amountStr = prompt(`أدخل المبلغ المراد خصمه من رصيد المريض ${patient.full_name} (الرصيد المتاح: ${curBal.toLocaleString()} ر.ي):`, '1000');
              if (!amountStr) return;
              const rawAmount = parseFloat(amountStr);
              if (isNaN(rawAmount) || rawAmount === 0) {
                alert('يرجى إدخال مبلغ صحيح');
                return;
              }
              const amount = Math.abs(rawAmount);
              if (curBal < amount) {
                alert(`⚠️ عذراً، رصيد المريض المتاح (${curBal.toLocaleString()} ر.ي) أقل من المبلغ المراد خصمه (${amount.toLocaleString()} ر.ي). لا يمكن خصم أكثر من الرصيد المتوفر.`);
                return;
              }
              const notes = prompt('ملاحظات / سبب الخصم (اختياري):', 'خصم رصيد بواسطة الإدارة') || 'خصم رصيد بواسطة الإدارة';
              try {
                await adjustPatientBalance(patient.id, -amount, notes);
                alert(`✅ تم خصم ${amount.toLocaleString()} ر.ي من رصيد المريض بنجاح!`);
                loadData();
              } catch (err: any) {
                alert(err.response?.data?.message || 'فشل في خصم الرصيد');
              }
            }}
            className="px-5 py-2.5 bg-rose-600 text-white font-bold rounded-xl shadow-md hover:bg-rose-700 transition transform active:scale-95 flex items-center gap-2 text-sm"
          >
            <span>- خصم رصيد</span>
          </button>
        </div>
      </div>


      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Calendar className="w-6 h-6" />}
            label="إجمالي الحجوزات"
            value={stats.total_appointments}
            color="blue"
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            label="مكتملة"
            value={stats.completed_appointments}
            color="green"
          />
          <StatCard
            icon={<XCircle className="w-6 h-6" />}
            label="ملغاة"
            value={stats.cancelled_appointments}
            color="red"
          />
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            label="قيد الانتظار"
            value={stats.pending_appointments}
            color="yellow"
          />
        </div>
      )}

      {/* Detailed Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <InfoCard title="المعلومات الشخصية" icon={<User className="w-5 h-5" />}>
          <InfoRow icon={<User className="w-4 h-4" />} label="الاسم الكامل" value={patient.full_name} />
          <InfoRow icon={<Mail className="w-4 h-4" />} label="البريد الإلكتروني" value={patient.email || '—'} />
          <InfoRow icon={<Phone className="w-4 h-4" />} label="رقم الهاتف" value={patient.phone} />
          <InfoRow
            icon={<Cake className="w-4 h-4" />}
            label="العمر"
            value={patient.age ? `${patient.age} سنة` : '—'}
          />
          <InfoRow
            icon={<User className="w-4 h-4" />}
            label="الجنس"
            value={patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : '—'}
          />
          <InfoRow
            icon={<MapPin className="w-4 h-4" />}
            label="المحافظة"
            value={patient.governorate || '—'}
          />
        </InfoCard>

        {/* Google Info */}
        <InfoCard title="معلومات Google" icon={<Shield className="w-5 h-5" />}>
          <InfoRow
            icon={<Mail className="w-4 h-4" />}
            label="البريد الإلكتروني"
            value={patient.email || '—'}
          />
          <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-2 text-gray-600">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Google ID</span>
            </div>
            <span className="text-sm font-mono text-gray-700 break-all text-left max-w-[60%]">
              {patient.google_id || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4" />
              <span className="text-sm">مصدر الحساب</span>
            </div>
            <span className="text-sm">
              {patient.google_id ? (
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                  Google Sign-In
                </span>
              ) : (
                <span className="px-2 py-2 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                  تسجيل عادي
                </span>
              )}
            </span>
          </div>
        </InfoCard>

        {/* Attendance & Activity */}
        {stats && (
          <InfoCard title="النشاط والالتزام" icon={<Activity className="w-5 h-5" />}>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat
                label="مؤكدة"
                value={stats.confirmed_appointments}
                color="green"
              />
              <MiniStat
                label="لم يحضر"
                value={stats.no_show_appointments}
                color="red"
              />
              <MiniStat
                label="no-show (حقل المريض)"
                value={patient.no_show_count}
                color="orange"
              />
              <MiniStat
                label="إجمالي المدفوع"
                value={`${stats.total_paid} ر.ي`}
                color="blue"
                icon={<DollarSign className="w-4 h-4" />}
              />
            </div>
          </InfoCard>
        )}

        {/* Last Appointment */}
        {stats?.last_appointment && (
          <InfoCard title="آخر حجز" icon={<TrendingUp className="w-5 h-5" />}>
            <InfoRow
              icon={<User className="w-4 h-4" />}
              label="الطبيب"
              value={stats.last_appointment.doctor_name || '—'}
            />
            <InfoRow
              icon={<Calendar className="w-4 h-4" />}
              label="التاريخ"
              value={formatDate(stats.last_appointment.slot_date || stats.last_appointment.created_at)}
            />
            <InfoRow
              icon={<Clock className="w-4 h-4" />}
              label="الوقت"
              value={stats.last_appointment.slot_time || '—'}
            />
            <InfoRow
              icon={<Award className="w-4 h-4" />}
              label="الحالة"
              value={translateStatus(stats.last_appointment.status)}
            />
          </InfoCard>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Components
// ═══════════════════════════════════════════

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'red' | 'yellow';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className={`w-12 h-12 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          {icon}
        </div>
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2 text-gray-600">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium text-gray-900 text-left max-w-[60%] break-words">
        {value}
      </span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number | string;
  color: 'blue' | 'green' | 'red' | 'orange';
  icon?: React.ReactNode;
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
  };

  return (
    <div className={`rounded-lg p-3 border ${colors[color]}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-lg font-bold mt-1 flex items-center gap-1">
        {icon}
        {value}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function translateStatus(status?: string): string {
  const map: Record<string, string> = {
    pending: '⏳ قيد الانتظار',
    confirmed: '🟢 مؤكد',
    cancelled: '🔴 ملغي',
    completed: '✅ مكتمل',
    no_show: '⚠️ لم يحضر',
  };
  return map[status || ''] || status || '—';
}