import { useState, useEffect } from 'react';
import {
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  Stethoscope,
  Users,
  UserCog,
  Search,
  MessageCircle,
  Copy,
  Check,
  AlertTriangle,
  MapPin,
  X,
  Lock,
  Eye,
  EyeOff,
  Mail,
} from 'lucide-react';
import {
  getRequests,
  getRequestsStats,
  approveRequest,
  rejectRequest,
  type RegistrationRequest,
  type RegistrationStats,
} from '../../api/endpoints/registrations';

export default function RequestsList() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [stats, setStats] = useState<RegistrationStats | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [typeFilter, setTypeFilter] = useState<'all' | 'doctor' | 'secretary' | 'patient'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State for Reject
  const [rejectingItem, setRejectingItem] = useState<RegistrationRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [visibleReqPasswords, setVisibleReqPasswords] = useState<Record<number, boolean>>({});

  const toggleReqPassword = (id: number) => {
    setVisibleReqPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    loadData();
  }, [filter, typeFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [requestsData, statsData] = await Promise.all([
        getRequests({
          status: filter === 'all' ? undefined : filter,
          type: typeFilter === 'all' ? undefined : typeFilter,
        }),
        getRequestsStats(),
      ]);
      setRequests(requestsData || []);
      setStats(statsData || null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    showToast(`تم نسخ رقم الهاتف (${phone}) 📋`);
    setTimeout(() => setCopiedPhone(null), 2500);
  };

  const handleApprove = async (id: number, name: string) => {
    try {
      await approveRequest(id);
      showToast(`تم اعتماد حساب "${name}" بنجاح وتفعيله ✅`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'حدث خطأ في الاعتماد');
    }
  };

  const handleOpenRejectModal = (req: RegistrationRequest) => {
    setRejectingItem(req);
    setRejectReason('بيانات غير مكتملة أو يرجى مراجعة الإدارة');
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    try {
      setIsSubmitting(true);
      await rejectRequest(rejectingItem.id, rejectReason);
      showToast(`تم رفض الطلب بنجاح`);
      setRejectingItem(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'حدث خطأ في الرفض');
    } finally {
      setIsSubmitting(false);
    }
  };

  // فلترة بالبحث اللحظي
  const filteredRequests = requests.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (r.user?.full_name || '').toLowerCase();
    const phone = (r.user?.phone || '').toLowerCase();
    const specialty = (r.user?.specialty || '').toLowerCase();
    const clinic = (r.user?.clinic_name || '').toLowerCase();
    const governorate = (r.user?.governorate || '').toLowerCase();
    return (
      name.includes(q) ||
      phone.includes(q) ||
      specialty.includes(q) ||
      clinic.includes(q) ||
      governorate.includes(q)
    );
  });

  const getTypeLabel = (type: string) => {
    if (type === 'doctor') return 'طبيب';
    if (type === 'secretary') return 'سكرتيرة';
    if (type === 'patient') return 'مريض';
    return type;
  };

  const getTypeBadgeClass = (type: string) => {
    if (type === 'doctor') return 'bg-teal-50 text-teal-700 border-teal-200';
    if (type === 'secretary') return 'bg-purple-50 text-purple-700 border-purple-200';
    if (type === 'patient') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-teal-500/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>مركز مراجعة واعتماد الحسابات</span>
            <span className="text-xs font-bold bg-teal-50 text-teal-700 px-2.5 py-1 rounded-xl border border-teal-200">
              إدارة الهويات
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            مراجعة طلبات الانضمام للأطباء، السكرتيرات، وتأكيدات استكمال الملفات الشخصية للمرضى
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition shadow-xs flex items-center gap-1.5"
          >
            <Clock className="w-4 h-4 text-slate-400" />
            <span>تحديث الطلبات</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400">بانتظار المراجعة</p>
              <p className="text-3xl font-black text-amber-600 mt-1">{stats.pending || 0}</p>
              <p className="text-[10px] text-amber-700 font-medium mt-1">إجراء عاجل مطلوب</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-200/60">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400">أطباء بانتظار التفعيل</p>
              <p className="text-3xl font-black text-teal-600 mt-1">{stats.pending_doctors || 0}</p>
              <p className="text-[10px] text-teal-700 font-medium mt-1">من إجمالي {stats.total_doctors || 0}</p>
            </div>
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center border border-teal-200/60">
              <Stethoscope className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400">مرضى بانتظار التحقق</p>
              <p className="text-3xl font-black text-blue-600 mt-1">{stats.pending_patients || 0}</p>
              <p className="text-[10px] text-blue-700 font-medium mt-1">من إجمالي {stats.total_patients || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-200/60">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400">سكرتيرات بانتظار التفعيل</p>
              <p className="text-3xl font-black text-purple-600 mt-1">{stats.pending_secretaries || 0}</p>
              <p className="text-[10px] text-purple-700 font-medium mt-1">من إجمالي {stats.total_secretaries || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center border border-purple-200/60">
              <UserCog className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search Station */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* حقل البحث */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، رقم الهاتف، التخصص، أو المحافظة..."
              className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition placeholder:text-slate-400"
            />
          </div>

          {/* فلتر النوع */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'doctor', label: 'الأطباء 👨‍⚕️' },
              { id: 'patient', label: 'المرضى 👥' },
              { id: 'secretary', label: 'السكرتيرات 👩‍💼' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  typeFilter === t.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* أزرار فلتر الحالة */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-400 ml-2">حالة الطلب:</span>
          {[
            { value: 'pending', label: 'بانتظار المراجعة (معلّقة)', count: stats?.pending, icon: Clock, activeColor: 'bg-amber-50 border-amber-400 text-amber-800' },
            { value: 'approved', label: 'معتمدة ومفعلة', count: stats?.approved, icon: CheckCircle, activeColor: 'bg-emerald-50 border-emerald-400 text-emerald-800' },
            { value: 'rejected', label: 'مرفوضة', count: stats?.rejected, icon: XCircle, activeColor: 'bg-rose-50 border-rose-400 text-rose-800' },
            { value: 'all', label: 'كافة الحالات', count: stats?.total, icon: UserCheck, activeColor: 'bg-teal-50 border-teal-400 text-teal-800' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition ${
                filter === tab.value
                  ? tab.activeColor
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className="px-1.5 py-0.2 bg-slate-200/80 rounded-full text-[10px]">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* قائمة الطلبات */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-200/80">
          <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-xs font-bold text-slate-500">جاري تحميل سجلات الطلبات...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-200/80">
          <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">لا توجد طلبات مطابقة</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            لا توجد طلبات تندرج تحت الفلتر المحدد أو نتائج البحث الحالية. يمكنك تغيير الحالة أو تصفير البحث.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRequests.map((req) => {
            const user = req.user;
            const name = user?.full_name || `طلب #${req.id}`;
            const phone = user?.phone || 'غير مسجل';
            const cleanPhone = phone.replace(/\D/g, '');
            const waPhone = cleanPhone.startsWith('967') ? cleanPhone : `967${cleanPhone}`;

            return (
              <div
                key={req.id}
                className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 hover:shadow-md hover:border-teal-300 transition duration-150 flex flex-col justify-between"
              >
                <div>
                  {/* رأس البطاقة والنوع */}
                  <div className="flex items-center justify-between mb-3.5">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${getTypeBadgeClass(req.type)}`}>
                      {getTypeLabel(req.type)}
                    </span>

                    {/* حالة المراجعة */}
                    <span
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
                        req.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : req.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {req.status === 'approved' ? 'معتمد ✅' : req.status === 'rejected' ? 'مرفوض ❌' : 'قيد المراجعة ⏳'}
                    </span>
                  </div>

                  {/* الاسم والمعلومات الأساسية */}
                  <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                    {name}
                  </h3>

                  {/* التفاصيل الإضافية */}
                  <div className="mt-3 space-y-2 text-xs text-slate-600 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                    {/* رقم الهاتف والنسخ السريع */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">الهاتف:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-800" dir="ltr">{phone}</span>
                        <button
                          onClick={() => handleCopyPhone(phone)}
                          className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 transition"
                          title="نسخ رقم الهاتف"
                        >
                          {copiedPhone === phone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* البريد الإلكتروني إن وجد */}
                    {user?.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          البريد:
                        </span>
                        <span className="font-mono text-slate-700 text-[11px]" dir="ltr">{user.email}</span>
                      </div>
                    )}

                    {/* كلمة المرور */}
                    {user?.raw_password && (
                      <div className="flex items-center justify-between bg-amber-50/80 p-1.5 rounded-xl border border-amber-200/60">
                        <span className="text-amber-800 font-bold flex items-center gap-1 text-[11px]">
                          <Lock className="w-3 h-3 text-amber-600" />
                          كلمة المرور:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-amber-900" dir="ltr">
                            {visibleReqPasswords[req.id] ? user.raw_password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleReqPassword(req.id)}
                            className="p-0.5 text-amber-700 hover:text-amber-900 transition cursor-pointer"
                            title={visibleReqPasswords[req.id] ? "إخفاء" : "إظهار"}
                          >
                            {visibleReqPasswords[req.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* التخصص للأطباء */}
                    {req.type === 'doctor' && user?.specialty && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">التخصص:</span>
                        <span className="font-bold text-teal-700">{user.specialty}</span>
                      </div>
                    )}

                    {/* العيادة أو المستشفى */}
                    {user?.clinic_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">العيادة:</span>
                        <span className="font-bold text-slate-700 truncate max-w-[170px]">{user.clinic_name}</span>
                      </div>
                    )}

                    {/* المحافظة */}
                    {user?.governorate && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">المحافظة:</span>
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 inline" />
                          <span>{user.governorate}</span>
                        </span>
                      </div>
                    )}

                    {/* كشف الطبيب أو عمر المريض */}
                    {req.type === 'doctor' && user?.consultation_fee !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">سعر الكشف:</span>
                        <span className="font-bold text-emerald-700">{user.consultation_fee} ريال</span>
                      </div>
                    )}

                    {req.type === 'patient' && (user?.age || user?.gender) && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">العمر / الجنس:</span>
                        <span className="font-semibold text-slate-700">
                          {user.age ? `${user.age} سنة` : ''} {user.gender === 'male' ? 'ذكر' : user.gender === 'female' ? 'أنثى' : ''}
                        </span>
                      </div>
                    )}

                    {req.type === 'patient' && user?.blood_group && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">فصيلة الدم:</span>
                        <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md text-xs">{user.blood_group}</span>
                      </div>
                    )}

                    {user?.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">البريد:</span>
                        <span className="font-medium text-slate-600 text-xs truncate max-w-[170px]">{user.email}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px] text-slate-400">
                      <span>تاريخ الطلب:</span>
                      <span>{new Date(req.created_at).toLocaleDateString('ar-YE')}</span>
                    </div>

                    {req.notes && (
                      <div className="pt-1 text-[11px] text-rose-600 bg-rose-50/50 p-2 rounded-xl border border-rose-100">
                        ملاحظة الرفض: {req.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* أزرار الإجراءات والتواصل */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2">
                  {/* زر واتساب السريع */}
                  {cleanPhone && (
                    <a
                      href={`https://wa.me/${waPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                      title="مراسلة واتساب للتأكيد"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}

                  {req.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleApprove(req.id, name)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-emerald-600/20"
                      >
                        <Check className="w-4 h-4" />
                        <span>اعتماد وتفعيل</span>
                      </button>

                      <button
                        onClick={() => handleOpenRejectModal(req)}
                        className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition"
                      >
                        <X className="w-4 h-4" />
                        <span>رفض</span>
                      </button>
                    </>
                  ) : req.status === 'rejected' ? (
                    <button
                      onClick={() => handleApprove(req.id, name)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold transition"
                      title="الموافقة على الحساب ونقله إلى المعتمدة"
                    >
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>إعادة مراجعة واعتماد الحساب 🔄</span>
                    </button>
                  ) : (
                    <div className="flex-1 text-center py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50/70 rounded-xl border border-emerald-100">
                      ✅ حساب معتمد ونشط
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* نافذة الرفض المنبثقة الاحترافية */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-rose-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span>رفض طلب التسجيل</span>
              </h3>
              <button
                onClick={() => setRejectingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-600">
                أنت على وشك رفض طلب التسجيل للمستخدم:
                <span className="font-bold text-slate-900 block mt-1">
                  {rejectingItem.user?.full_name || `#${rejectingItem.id}`}
                </span>
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  سبب الرفض (سيظهر للمستخدم):
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'بيانات غير مكتملة',
                    'رقم الهاتف غير متاح',
                    'عدم توافق وثائق التخصص',
                    'مرفوض بقرار إدارة العيادة',
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRejectReason(r)}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                  placeholder="اكتب سبب الرفض هنا..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setRejectingItem(null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm shadow-rose-600/30 flex items-center gap-1.5"
              >
                {isSubmitting ? 'جاري المعالجة...' : 'تأكيد الرفض'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}