import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Stethoscope,
  Building2,
  CalendarDays,
  CreditCard,
  Clock,
  ArrowLeft,
  CheckCircle,
  TrendingUp,
  Tag,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { getDoctors, getPendingDoctors } from '../../api/endpoints/doctors';
import { getSecretaries, getPendingSecretaries } from '../../api/endpoints/secretaries';
import { getClinics, getPendingClinics } from '../../api/endpoints/clinics';
import { getPatients } from '../../api/endpoints/patients';
import { getAppointments } from '../../api/endpoints/appointments';
import { getPayments } from '../../api/endpoints/payments';
import {
  getRequests,
  getRequestsStats,
  approveRequest,
  rejectRequest,
  type RegistrationRequest,
} from '../../api/endpoints/registrations';

interface DashboardStats {
  doctorsCount: number;
  pendingDoctorsCount: number;
  secretariesCount: number;
  pendingSecretariesCount: number;
  clinicsCount: number;
  pendingClinicsCount: number;
  patientsCount: number;
  pendingPatientsCount: number;
  appointmentsCount: number;
  confirmedAppointmentsCount: number;
  completedAppointmentsCount: number;
  totalRevenue: number;
  pendingPaymentsCount: number;
  totalPendingRequests: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    doctorsCount: 0,
    pendingDoctorsCount: 0,
    secretariesCount: 0,
    pendingSecretariesCount: 0,
    clinicsCount: 0,
    pendingClinicsCount: 0,
    patientsCount: 0,
    pendingPatientsCount: 0,
    appointmentsCount: 0,
    confirmedAppointmentsCount: 0,
    completedAppointmentsCount: 0,
    totalRevenue: 0,
    pendingPaymentsCount: 0,
    totalPendingRequests: 0,
  });

  const [pendingRequests, setPendingRequests] = useState<RegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAllDashboardData();
  }, []);

  const loadAllDashboardData = async () => {
    try {
      setIsLoading(true);
      const [
        doctorsRes,
        pendingDocsRes,
        secretariesRes,
        pendingSecsRes,
        clinicsRes,
        pendingClinicsRes,
        patientsRes,
        apptsRes,
        paymentsRes,
        reqStatsRes,
        recentReqsRes,
      ] = await Promise.all([
        getDoctors({ include_hidden: true }).catch(() => []),
        getPendingDoctors().catch(() => []),
        getSecretaries().catch(() => []),
        getPendingSecretaries().catch(() => []),
        getClinics().catch(() => []),
        getPendingClinics().catch(() => []),
        getPatients().catch(() => []),
        getAppointments().catch(() => []),
        getPayments().catch(() => []),
        getRequestsStats().catch(() => null),
        getRequests({ status: 'pending' }).catch(() => []),
      ]);

      const revenueSum = (paymentsRes || [])
        .filter((p: any) => p.status === 'confirmed')
        .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

      const pendingPayCount = (paymentsRes || []).filter((p: any) => p.status === 'pending').length;

      const confirmedAppts = (apptsRes || []).filter((a: any) => a.status === 'confirmed').length;
      const completedAppts = (apptsRes || []).filter((a: any) => a.status === 'completed').length;

      setStats({
        doctorsCount: doctorsRes.length,
        pendingDoctorsCount: pendingDocsRes.length,
        secretariesCount: secretariesRes.length,
        pendingSecretariesCount: pendingSecsRes.length,
        clinicsCount: clinicsRes.length,
        pendingClinicsCount: pendingClinicsRes.length,
        patientsCount: patientsRes.length,
        pendingPatientsCount: reqStatsRes?.pending_patients || 0,
        appointmentsCount: apptsRes.length,
        confirmedAppointmentsCount: confirmedAppts,
        completedAppointmentsCount: completedAppts,
        totalRevenue: revenueSum,
        pendingPaymentsCount: pendingPayCount,
        totalPendingRequests: reqStatsRes?.pending || recentReqsRes.length || 0,
      });

      setPendingRequests(recentReqsRes.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleQuickApprove = async (id: number, name: string) => {
    try {
      await approveRequest(id);
      showNotificationToast(`تم اعتماد حساب "${name}" بنجاح ✅`);
      loadAllDashboardData();
    } catch {
      alert('حدث خطأ أثناء اعتماد الطلب');
    }
  };

  const handleQuickReject = async (id: number, name: string) => {
    const reason = prompt(`سبب رفض طلب "${name}":`);
    if (reason === null) return;
    try {
      await rejectRequest(id, reason);
      showNotificationToast(`تم رفض الطلب بنجاح`);
      loadAllDashboardData();
    } catch {
      alert('حدث خطأ أثناء رفض الطلب');
    }
  };

  const showNotificationToast = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 4000);
  };

  // بيانات المخططات
  const weeklyChartData = [
    { day: 'السبت', bookings: Math.max(12, Math.round(stats.appointmentsCount * 0.15)), revenue: 65000 },
    { day: 'الأحد', bookings: Math.max(18, Math.round(stats.appointmentsCount * 0.22)), revenue: 95000 },
    { day: 'الإثنين', bookings: Math.max(15, Math.round(stats.appointmentsCount * 0.18)), revenue: 78000 },
    { day: 'الثلاثاء', bookings: Math.max(22, Math.round(stats.appointmentsCount * 0.26)), revenue: 110000 },
    { day: 'الأربعاء', bookings: Math.max(16, Math.round(stats.appointmentsCount * 0.19)), revenue: 84000 },
    { day: 'الخميس', bookings: Math.max(25, Math.round(stats.appointmentsCount * 0.3)), revenue: 135000 },
    { day: 'الجمعة', bookings: Math.max(8, Math.round(stats.appointmentsCount * 0.08)), revenue: 40000 },
  ];

  const specialtyChartData = [
    { name: 'باطنية', count: 18 },
    { name: 'قلب', count: 14 },
    { name: 'أطفال', count: 16 },
    { name: 'جلدية', count: 12 },
    { name: 'عيون', count: 10 },
    { name: 'عظام', count: 15 },
    { name: 'نساء وتوليد', count: 11 },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-xs font-bold text-slate-400">جاري تحميل بيانات لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {actionMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-teal-500/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{actionMessage}</span>
        </div>
      )}

      {/* Header Banner - Compact & Clean */}
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-xl p-3.5 sm:p-4 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">
            لوحة الإدارة والتحكم
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            متابعة فورية للحجوزات والعمليات الطبية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsRefreshing(true);
              loadAllDashboardData();
            }}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
            <span>تحديث</span>
          </button>
          <Link
            to="/requests"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
          >
            <span>طلبات التسجيل ({stats.totalPendingRequests})</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* تنبيه الطلبات المعلّقة */}
      {stats.totalPendingRequests > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
              يوجد {stats.totalPendingRequests} طلب بانتظار الاعتماد
            </span>
          </div>

          <Link
            to="/requests"
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline flex-shrink-0"
          >
            <span>مراجعة</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 6 كروت الإحصائيات الفخمة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* الأطباء */}
        <StatCardPro
          title="الأطباء"
          value={stats.doctorsCount}
          subtitle={`${stats.pendingDoctorsCount} معلّق`}
          badge={stats.pendingDoctorsCount > 0 ? `+${stats.pendingDoctorsCount} طلب` : 'مكتمل'}
          badgeType={stats.pendingDoctorsCount > 0 ? 'warning' : 'success'}
          icon={Stethoscope}
          gradient="from-teal-500 to-teal-700"
          to="/doctors"
        />

        {/* المرضى */}
        <StatCardPro
          title="سجل المرضى"
          value={stats.patientsCount}
          subtitle={`${stats.pendingPatientsCount} قيد التحقق`}
          badge="نشط"
          badgeType="success"
          icon={Users}
          gradient="from-blue-500 to-blue-700"
          to="/patients"
        />

        {/* العيادات والمستشفيات */}
        <StatCardPro
          title="العيادات والمراكز"
          value={stats.clinicsCount}
          subtitle={`${stats.pendingClinicsCount} قيد الربط`}
          badge="معتمدة"
          badgeType="success"
          icon={Building2}
          gradient="from-emerald-500 to-emerald-700"
          to="/clinics"
        />

        {/* الحجوزات */}
        <StatCardPro
          title="إجمالي الحجوزات"
          value={stats.appointmentsCount}
          subtitle={`${stats.completedAppointmentsCount} كشف منجز`}
          badge={`${stats.confirmedAppointmentsCount} مؤكد`}
          badgeType="info"
          icon={CalendarDays}
          gradient="from-indigo-500 to-indigo-700"
          to="/appointments"
        />

        {/* الحوالات والمدفوعات */}
        <StatCardPro
          title="التحصيلات"
          value={`${stats.totalRevenue.toLocaleString()} ر.ي`}
          subtitle={`${stats.pendingPaymentsCount} دفعة معلقة`}
          badge="ريال يمني"
          badgeType="info"
          icon={CreditCard}
          gradient="from-purple-500 to-purple-700"
          to="/payments"
        />

        {/* طلبات بانتظار الإجراء */}
        <StatCardPro
          title="الطلبات المعلّقة"
          value={stats.totalPendingRequests}
          subtitle="تتطلب قرار الأدمن"
          badge={stats.totalPendingRequests > 0 ? 'إجراء عاجل' : 'لا يوجد'}
          badgeType={stats.totalPendingRequests > 0 ? 'danger' : 'success'}
          icon={Clock}
          gradient="from-amber-500 to-amber-700"
          to="/requests"
        />
      </div>

      {/* المخططات البيانية */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* مخطط حركة الحجوزات */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>الحجوزات الأسبوعية</span>
            </h3>
            <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/15 border border-teal-200 dark:border-teal-500/30 px-2 py-0.5 rounded-md">
              الأسبوع الحالي
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyChartData}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '10px',
                    color: '#fff',
                    border: '1px solid #334155',
                    fontSize: '11px',
                    direction: 'rtl',
                  }}
                  formatter={(val: any) => [`${val} حجز`, 'الحجوزات']}
                />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  stroke="#0D9488"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorBookings)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* مخطط التخصصات */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white">أكثر التخصصات نشاطاً</h3>
            <span className="text-[11px] font-semibold text-slate-400">إحصائية</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={specialtyChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={65} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '10px',
                    color: '#fff',
                    border: '1px solid #334155',
                    fontSize: '11px',
                    direction: 'rtl',
                  }}
                  formatter={(val: any) => [`${val} طبيب`, 'العدد']}
                />
                <Bar dataKey="count" fill="#0D9488" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* العمليات السريعة */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs border border-slate-200 dark:border-slate-800">
        <h3 className="text-xs font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>العمليات السريعة</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <QuickActionPro to="/requests" icon={CheckCircle} label="اعتماد الطلبات" badge={`${stats.totalPendingRequests}`} />
          <QuickActionPro to="/doctors/add" icon={Stethoscope} label="إضافة طبيب" />
          <QuickActionPro to="/clinics" icon={Building2} label="العيادات" />
          <QuickActionPro to="/periods" icon={CalendarDays} label="الفترات" />
          <QuickActionPro to="/offers/add" icon={Tag} label="إضافة عرض" />
          <QuickActionPro to="/recovery" icon={Users} label="استعادة الحسابات" />
        </div>
      </div>

      {/* أحدث طلبات التسجيل */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-xs border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>أحدث طلبات التسجيل</span>
          </h3>
          <Link
            to="/requests"
            className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
          >
            <span>كل الطلبات ({stats.totalPendingRequests})</span>
            <ArrowLeft className="w-3 h-3" />
          </Link>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="py-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
            <CheckCircle className="w-6 h-6 mx-auto text-emerald-500 mb-1 opacity-70" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">لا توجد طلبات معلّقة حالياً</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                  <th className="py-2.5 px-3">النوع</th>
                  <th className="py-2.5 px-3">الاسم</th>
                  <th className="py-2.5 px-3">الهاتف</th>
                  <th className="py-2.5 px-3">التفاصيل</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingRequests.map((req) => {
                  const typeLabel =
                    req.type === 'doctor'
                      ? 'طبيب'
                      : req.type === 'secretary'
                      ? 'سكرتيرة'
                      : 'مريض';
                  const typeBadgeClass =
                    req.type === 'doctor'
                      ? 'bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-500/30'
                      : req.type === 'secretary'
                      ? 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30'
                      : 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30';

                  const name = req.user?.full_name || `مستخدم #${req.user_id}`;
                  const phone = req.user?.phone || '—';
                  const details =
                    req.user?.specialty ||
                    req.user?.clinic_name ||
                    (req.user?.governorate ? `${req.user.governorate}` : '—');

                  return (
                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${typeBadgeClass}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{name}</td>
                      <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]" dir="ltr">{phone}</td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{details}</td>
                      <td className="py-2 px-3 text-slate-400 text-[11px]">
                        {new Date(req.created_at).toLocaleDateString('ar-YE')}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleQuickApprove(req.id, name)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold transition shadow-xs cursor-pointer"
                            title="اعتماد"
                          >
                            اعتماد
                          </button>
                          <button
                            onClick={() => handleQuickReject(req.id, name)}
                            className="px-2 py-1 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-500/20 text-slate-600 dark:text-slate-300 hover:text-rose-600 rounded-md text-[11px] font-semibold transition cursor-pointer"
                            title="رفض"
                          >
                            رفض
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// المكونات الفرعية المساعدة (Executive Pro)
// ═══════════════════════════════════════════

function StatCardPro({
  title,
  value,
  subtitle,
  badge,
  badgeType,
  icon: Icon,
  gradient,
  to,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  badge: string;
  badgeType: 'success' | 'warning' | 'danger' | 'info';
  icon: any;
  gradient: string;
  to: string;
}) {
  const badgeColors = {
    success: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
    warning: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    danger: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
    info: 'bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-500/30',
  };

  return (
    <Link
      to={to}
      className="bg-white dark:bg-slate-900 rounded-xl p-3.5 shadow-xs border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500/60 transition flex flex-col justify-between group"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${gradient} text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${badgeColors[badgeType]}`}>
            {badge}
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 truncate">{value}</p>
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium">
        <span>{subtitle}</span>
        <span className="text-teal-600 dark:text-teal-400 font-bold group-hover:translate-x-[-2px] transition text-xs">←</span>
      </div>
    </Link>
  );
}

function QuickActionPro({
  to,
  icon: Icon,
  label,
  badge,
}: {
  to: string;
  icon: any;
  label: string;
  badge?: string;
  color?: string;
}) {
  return (
    <Link
      to={to}
      className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl transition flex flex-col items-center justify-center text-center gap-1.5 group relative shadow-xs"
    >
      {badge && Number(badge) > 0 && (
        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.2 text-[10px] font-bold bg-rose-500 text-white rounded-full">
          {badge}
        </span>
      )}
      <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-slate-800 text-teal-700 dark:text-teal-300 flex items-center justify-center group-hover:scale-105 transition">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-xs font-semibold truncate max-w-full text-slate-700 dark:text-slate-200">{label}</span>
    </Link>
  );
}
