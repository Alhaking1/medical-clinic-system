import { useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  Clock,
  User,
  Stethoscope,
  CheckCircle,
  DollarSign,
  XCircle,
  AlertCircle,
  X,
  Loader2,
  Award,
  Star,
  MessageSquare
} from 'lucide-react';
import {
  getAppointments,
  cancelAppointment,
  markNoShow,
  confirmAppointment,
  markAsPaid,
  completeAppointment,
  confirmAppointmentPayment,
  rejectAppointmentPayment,
  getAllReviews,
  updateAppointmentAttendance,
  type Appointment,
} from '../../api/endpoints/appointments';

const attendanceLabels: Record<string, string> = {
  pending: 'لم يسجل',
  arrived: 'حضر للعيادة 🏥',
  no_show: 'لم يحضر ❌',
};

const attendanceColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  arrived: 'bg-teal-100 text-teal-800 border border-teal-300 font-semibold',
  no_show: 'bg-rose-100 text-rose-700',
};

const statusLabels: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  no_show: 'لم يحضر',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-gray-100 text-gray-700',
};

const paymentLabels: Record<string, string> = {
  unpaid: 'غير مدفوع',
  pending: 'قيد المراجعة',
  pending_review: 'بانتظار التحقق من الحوالة',
  paid: 'مدفوع',
  rejected: 'حوالة مرفوضة',
};

const paymentColors: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
  pending_review: 'bg-amber-100 text-amber-800 border border-amber-300 font-semibold',
  paid: 'bg-green-100 text-green-700',
  rejected: 'bg-rose-100 text-rose-700',
};

type ActionType = 'confirm' | 'pay' | 'complete' | 'cancel' | 'no_show' | 'confirm_payment' | 'reject_payment';

const actionConfig: Record<ActionType, {
  title: string;
  description: string;
  buttonText: string;
  buttonColor: string;
  icon: any;
}> = {
  confirm: {
    title: 'اعتماد الحجز',
    description: 'هل تريد اعتماد هذا الحجز؟ سيتم إشعار المريض بأن الحجز مؤكد.',
    buttonText: 'نعم، اعتمد',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    icon: CheckCircle,
  },
  pay: {
    title: 'تعليم كمدفوع',
    description: 'هل تريد تعليم هذا الحجز كمدفوع؟ (المريض دفع نقداً في العيادة)',
    buttonText: 'نعم، مدفوع',
    buttonColor: 'bg-green-600 hover:bg-green-700',
    icon: DollarSign,
  },
  confirm_payment: {
    title: 'تأكيد الحوالة وترقية الحجز الذهبي 👑',
    description: 'هل تريد تأكيد استلام الحوالة؟ سيتم تأكيد الدفع وترقية المريض لأحد المقاعد الأولية (الحجز الذهبي) وإرسال إشعار فوري له.',
    buttonText: 'نعم، تأكيد وترقية المقعد',
    buttonColor: 'bg-amber-600 hover:bg-amber-700',
    icon: Award,
  },
  reject_payment: {
    title: 'رفض حوالة الدفع ❌',
    description: 'هل تريد رفض الحوالة؟ سيتم إشعار المريض بسبب الرفض لمراجعة الحوالة أو السداد نقداً في العيادة.',
    buttonText: 'نعم، رفض الحوالة',
    buttonColor: 'bg-rose-600 hover:bg-rose-700',
    icon: XCircle,
  },
  complete: {
    title: 'إكمال الحجز',
    description: 'هل تريد إكمال هذا الحجز؟ سيتم تعليمه كمدفوع تلقائياً.',
    buttonText: 'نعم، أكمل',
    buttonColor: 'bg-emerald-600 hover:bg-emerald-700',
    icon: CheckCircle,
  },
  cancel: {
    title: 'إلغاء الحجز',
    description: '⚠️ هل أنت متأكد من إلغاء هذا الحجز؟ لا يمكن التراجع.',
    buttonText: 'نعم، إلغاء',
    buttonColor: 'bg-red-600 hover:bg-red-700',
    icon: XCircle,
  },
  no_show: {
    title: 'تسجيل عدم الحضور',
    description: 'هل تريد تسجيل أن المريض لم يحضر؟ سيُضاف غياب لحسابه.',
    buttonText: 'نعم، لم يحضر',
    buttonColor: 'bg-orange-600 hover:bg-orange-700',
    icon: AlertCircle,
  },
};

export default function AppointmentsList() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog State
  const [dialogAction, setDialogAction] = useState<ActionType | null>(null);
  const [dialogAppointment, setDialogAppointment] = useState<Appointment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Reviews Modal State
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, [filter]);

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      const data = await getAppointments({
        status: filter === 'all' ? undefined : filter,
      });
      setAppointments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const openReviews = async () => {
    setShowReviewsModal(true);
    setReviewsLoading(true);
    try {
      const data = await getAllReviews();
      setReviews(data);
    } catch (err) {
      console.error(err);
    } finally {
      setReviewsLoading(false);
    }
  };

  // فتح Dialog
  const openDialog = (appointment: Appointment, action: ActionType) => {
    setDialogAppointment(appointment);
    setDialogAction(action);
    setRejectionReason('');
    setDialogError(null);
  };

  // إغلاق Dialog
  const closeDialog = () => {
    if (isProcessing) return;
    setDialogAction(null);
    setDialogAppointment(null);
    setRejectionReason('');
    setDialogError(null);
  };

  // تنفيذ الإجراء
  const executeAction = async () => {
    if (!dialogAction || !dialogAppointment) return;

    setIsProcessing(true);
    setDialogError(null);

    try {
      const id = dialogAppointment.id;

      switch (dialogAction) {
        case 'confirm':
          await confirmAppointment(id);
          break;
        case 'pay':
          await markAsPaid(id);
          break;
        case 'confirm_payment':
          await confirmAppointmentPayment(id);
          break;
        case 'reject_payment':
          await rejectAppointmentPayment(id, rejectionReason || 'بيانات الحوالة غير صحيحة أو لم تصل');
          break;
        case 'complete':
          await completeAppointment(id);
          break;
        case 'cancel':
          await cancelAppointment(id);
          break;
        case 'no_show':
          await markNoShow(id);
          break;
      }

      // نجاح
      closeDialog();
      loadAppointments();
    } catch (err: any) {
      setDialogError(err.response?.data?.message || 'حدث خطأ في العملية');
    } finally {
      setIsProcessing(false);
    }
  };

  const filtered = appointments.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.booking_code?.toLowerCase().includes(q) ||
      a.patient_name?.toLowerCase().includes(q) ||
      a.doctor_name?.toLowerCase().includes(q) ||
      a.transaction_id?.toLowerCase().includes(q)
    );
  });

  const getDisplayDate = (a: Appointment) => {
    return a.period_date || a.slot_date || '—';
  };

  const getDisplayTime = (a: Appointment) => {
    if (a.period_start_time && a.period_end_time) {
      return `${a.period_start_time} - ${a.period_end_time}`;
    }
    if (a.slot_time) {
      return a.slot_end_time ? `${a.slot_time} - ${a.slot_end_time}` : a.slot_time;
    }
    return '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>الحجوزات والمواعيد</span>
          </h1>
          <p className="text-gray-500 mt-1">إجمالي الحجوزات: {appointments.length}</p>
        </div>
        <button
          onClick={openReviews}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
          <span>عرض تقييمات المرضى للخدمة والأطباء</span>
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم الحجز أو اسم المريض أو الطبيب أو رقم الحوالة..."
            className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'confirmed', 'completed', 'cancelled', 'no_show'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                filter === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? 'الكل' : statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-700">رقم الحجز والدور</th>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-700">المريض</th>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-700">الطبيب</th>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-700">التاريخ</th>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-700">الوقت</th>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-700">الحالة</th>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-700">حضور المريض</th>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-700">الدفع والحوالة</th>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-700">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-4 text-sm">
                      <div className="font-mono font-bold text-gray-800">{a.booking_code}</div>
                      {a.sequential_booking_number && (
                        <div className="text-[11px] font-semibold text-teal-600 mt-0.5">
                          رقم تسلسلي: #{a.sequential_booking_number}
                        </div>
                      )}
                      <div className="mt-1">
                        {a.is_golden === 1 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                            👑 المقعد الذهبي #{a.queue_number || 1}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            المقعد #{a.queue_number || 1}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 font-medium">{a.patient_name || '—'}</span>
                      </div>
                      {a.patient_phone && (
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{a.patient_phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{a.doctor_name || '—'}</span>
                      </div>
                      {a.clinic_name && (
                        <div className="text-xs text-gray-500 mt-0.5">{a.clinic_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {getDisplayDate(a)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {getDisplayTime(a)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColors[a.status] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {statusLabels[a.status] || a.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            attendanceColors[a.attendance_status || 'pending'] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {attendanceLabels[a.attendance_status || 'pending'] || a.attendance_status || 'لم يسجل'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={async () => {
                              try {
                                await updateAppointmentAttendance(a.id, 'arrived');
                                loadAppointments();
                              } catch (err: any) {
                                alert(err.response?.data?.message || 'فشل تحديث الحضور');
                              }
                            }}
                            title="تسجيل حضور المريض"
                            className="p-1 rounded text-teal-700 hover:bg-teal-100 bg-teal-50 text-[11px] font-bold border border-teal-200"
                          >
                            حضر
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await updateAppointmentAttendance(a.id, 'no_show');
                                loadAppointments();
                              } catch (err: any) {
                                alert(err.response?.data?.message || 'فشل تحديث الحضور');
                              }
                            }}
                            title="تسجيل عدم حضور"
                            className="p-1 rounded text-rose-700 hover:bg-rose-100 bg-rose-50 text-[11px] font-bold border border-rose-200"
                          >
                            لم يحضر
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentColors[a.payment_status] || 'bg-gray-100 text-gray-700'}`}
                        >
                          {paymentLabels[a.payment_status] || a.payment_status}
                        </span>
                        {a.transaction_id && (
                          <div className="text-xs font-mono bg-blue-50 border border-blue-200 text-blue-900 px-2 py-0.5 rounded flex items-center gap-1">
                            <span>رقم الحوالة:</span>
                            <span className="font-bold">{a.transaction_id}</span>
                          </div>
                        )}
                        {a.payment_method && (
                          <div className="text-xs text-gray-500">
                            طريقة السداد: {a.payment_method === 'online' ? 'إلكتروني / حوالة' : 'نقداً'}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        {/* تأكيد الحوالة وترقية المقعد الذهبي */}
                        {a.transaction_id && a.payment_status !== 'paid' && (
                          <button
                            onClick={() => openDialog(a, 'confirm_payment')}
                            className="p-2 text-amber-700 hover:bg-amber-100 bg-amber-50 rounded-lg transition border border-amber-300"
                            title="تأكيد الحوالة وترقية الحجز الذهبي 👑"
                          >
                            <Award className="w-4 h-4" />
                          </button>
                        )}

                        {/* رفض الحوالة */}
                        {a.transaction_id && a.payment_status !== 'paid' && a.payment_status !== 'rejected' && (
                          <button
                            onClick={() => openDialog(a, 'reject_payment')}
                            className="p-2 text-rose-700 hover:bg-rose-100 bg-rose-50 rounded-lg transition border border-rose-300"
                            title="رفض الحوالة"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* اعتماد — pending فقط */}
                        {a.status === 'pending' && (
                          <button
                            onClick={() => openDialog(a, 'confirm')}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="اعتماد الحجز"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* دفع نقدي — confirmed + unpaid */}
                        {a.status === 'confirmed' && a.payment_status !== 'paid' && !a.transaction_id && (
                          <button
                            onClick={() => openDialog(a, 'pay')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="تعليم مدفوع نقداً"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}

                        {/* إكمال — confirmed فقط */}
                        {a.status === 'confirmed' && (
                          <button
                            onClick={() => openDialog(a, 'complete')}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="إكمال الكشف"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* لم يحضر — confirmed فقط */}
                        {a.status === 'confirmed' && (
                          <button
                            onClick={() => openDialog(a, 'no_show')}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                            title="لم يحضر"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* إلغاء — pending أو confirmed */}
                        {['pending', 'confirmed'].includes(a.status) && (
                          <button
                            onClick={() => openDialog(a, 'cancel')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="إلغاء الحجز"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        {['completed', 'cancelled', 'no_show'].includes(a.status) && a.payment_status === 'paid' && (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">لا توجد نتائج</div>
        )}
      </div>

      {/* Dialog مخصص لتأكيد الإجراءات */}
      {dialogAction && dialogAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = actionConfig[dialogAction].icon;
                  return (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100">
                      <Icon className="w-5 h-5 text-gray-700" />
                    </div>
                  );
                })()}
                <h3 className="text-lg font-bold text-gray-900">
                  {actionConfig[dialogAction].title}
                </h3>
              </div>
              <button
                onClick={closeDialog}
                disabled={isProcessing}
                className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <p className="text-gray-600 text-sm">
              {actionConfig[dialogAction].description}
            </p>

            {/* Appointment Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">رقم الحجز:</span>
                <span className="font-mono font-medium text-gray-900">
                  {dialogAppointment.booking_code}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">المريض:</span>
                <span className="font-medium text-gray-900">
                  {dialogAppointment.patient_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">الطبيب:</span>
                <span className="font-medium text-gray-900">
                  {dialogAppointment.doctor_name}
                </span>
              </div>
              {dialogAppointment.transaction_id && (
                <div className="flex items-center justify-between bg-blue-50 p-2 rounded border border-blue-200">
                  <span className="text-blue-700 font-medium">رقم الحوالة:</span>
                  <span className="font-mono font-bold text-blue-900">
                    {dialogAppointment.transaction_id}
                  </span>
                </div>
              )}
              {dialogAppointment.fee && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">المبلغ:</span>
                  <span className="font-bold text-green-600">
                    {dialogAppointment.fee.toLocaleString('ar-YE')} ر.ي
                  </span>
                </div>
              )}
            </div>

            {/* Rejection reason input if rejecting payment */}
            {dialogAction === 'reject_payment' && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">سبب رفض الحوالة (اختياري، يظهر للمريض):</label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="مثال: رقم الحوالة غير مطابق أو لم نجد التحويل..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}

            {/* Error */}
            {dialogError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {dialogError}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={closeDialog}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={executeAction}
                disabled={isProcessing}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-lg transition font-medium disabled:opacity-50 ${actionConfig[dialogAction].buttonColor}`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري...
                  </>
                ) : (
                  actionConfig[dialogAction].buttonText
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال استعراض كل تقييمات المرضى ⭐ */}
      {showReviewsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-amber-50">
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                <div>
                  <h3 className="font-bold text-lg text-gray-900">سجل تقييمات المرضى للخدمات والعيادات</h3>
                  <p className="text-xs text-gray-500">تقييمات المرضى بعد انتهاء فترات الكشف (المستشفى، الطبيب، السكرتيرة، مستوى الخدمة)</p>
                </div>
              </div>
              <button
                onClick={() => setShowReviewsModal(false)}
                className="p-2 hover:bg-amber-100 rounded-lg text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {reviewsLoading ? (
                <div className="text-center py-12 text-gray-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                  <span>جاري تحميل التقييمات...</span>
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد تقييمات مسجلة بعد. تظهر التقييمات بعد انتهاء المواعيد وتقييم المرضى لها.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3 shadow-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-gray-900">{rev.patient_name || 'مريض'}</div>
                          <div className="text-xs text-gray-500">رقم الحجز: #{rev.booking_code} • {rev.patient_phone}</div>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">{rev.created_at?.slice(0, 10)}</span>
                      </div>

                      <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-900">الطبيب: </span> {rev.doctor_name} ({rev.doctor_specialty || rev.clinic_name || 'العيادة'})
                      </div>

                      {/* معايير التقييم الأربعة */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-amber-50/70 p-2 rounded border border-amber-100 flex items-center justify-between">
                          <span className="text-amber-900">🏥 المستشفى/العيادة:</span>
                          <span className="font-bold text-amber-700 flex items-center gap-0.5">
                            {rev.rating_hospital} <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          </span>
                        </div>
                        <div className="bg-blue-50/70 p-2 rounded border border-blue-100 flex items-center justify-between">
                          <span className="text-blue-900">👨‍⚕️ الطبيب:</span>
                          <span className="font-bold text-blue-700 flex items-center gap-0.5">
                            {rev.rating_doctor} <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          </span>
                        </div>
                        <div className="bg-teal-50/70 p-2 rounded border border-teal-100 flex items-center justify-between">
                          <span className="text-teal-900">👩‍💼 السكرتيرة:</span>
                          <span className="font-bold text-teal-700 flex items-center gap-0.5">
                            {rev.rating_secretary} <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          </span>
                        </div>
                        <div className="bg-purple-50/70 p-2 rounded border border-purple-100 flex items-center justify-between">
                          <span className="text-purple-900">⭐ الخدمة العامة:</span>
                          <span className="font-bold text-purple-700 flex items-center gap-0.5">
                            {rev.rating_service} <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          </span>
                        </div>
                      </div>

                      {rev.comment && (
                        <div className="text-xs text-gray-700 bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="font-semibold text-gray-900">ملاحظات المريض: </span>
                          "{rev.comment}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}