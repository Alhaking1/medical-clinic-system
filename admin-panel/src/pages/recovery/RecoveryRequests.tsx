import { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
  RefreshCw,
  User,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import {
  getRecoveryRequests,
  getRecoveryStats,
  approveRecovery,
  rejectRecovery,
  type RecoveryRequest,
  type RecoveryStats,
} from '../../api/endpoints/recovery';
import RecoveryDetailsModal from './RecoveryDetailsModal';

export default function RecoveryRequests() {
  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [stats, setStats] = useState<RecoveryStats | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RecoveryRequest | null>(null);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [requestsData, statsData] = await Promise.all([
        getRecoveryRequests(filter),
        getRecoveryStats(),
      ]);
      setRequests(requestsData);
      setStats(statsData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    if (!confirm('هل أنت متأكد من الموافقة على طلب استعادة هذا الحساب؟')) return;
    try {
      await approveRecovery(id);
      setSelectedRequest(null);
      loadData();
      alert('✅ تم اعتماد الطلب. المستخدم سيتمكن من تعيين كلمة مرور جديدة.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في الاعتماد');
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('سبب الرفض (سيظهر للمستخدم):');
    if (reason === null) return;
    try {
      await rejectRecovery(id, reason || undefined);
      setSelectedRequest(null);
      loadData();
      alert('تم رفض الطلب');
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في الرفض');
    }
  };

  const getUserTypeLabel = (t?: string) => {
    if (t === 'doctor') return '👨‍⚕️ طبيب';
    if (t === 'secretary') return '👩‍💼 سكرتيرة';
    if (t === 'patient') return '🧑‍🦱 مريض';
    return '❓ غير معروف';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary-600" />
            طلبات استعادة الحساب
          </h1>
          <p className="text-gray-500 mt-1">
            مراجعة طلبات استعادة الحسابات المفوّضة — قارن البيانات المُدخلة مع المسجّلة
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">قيد المراجعة</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending}</p>
              </div>
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">معتمدة</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.approved}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">مرفوضة</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.rejected}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100 flex gap-2">
        {[
          { value: 'pending', label: 'قيد المراجعة', icon: Clock, count: stats?.pending },
          { value: 'approved', label: 'معتمدة', icon: CheckCircle, count: stats?.approved },
          { value: 'rejected', label: 'مرفوضة', icon: XCircle, count: stats?.rejected },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition ${
              filter === tab.value
                ? 'bg-primary-50 text-primary-700 font-semibold border-2 border-primary-500'
                : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-transparent'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                filter === tab.value ? 'bg-primary-200 text-primary-800' : 'bg-gray-200 text-gray-700'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500">
          جاري التحميل...
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-500 text-lg">لا توجد طلبات في هذه الحالة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      req.match_confirmed ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {req.match_confirmed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {req.submitted?.full_name || 'غير معروف'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          #{req.id}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          req.match_confirmed
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {req.match_confirmed ? '✅ متطابق' : '❌ غير متطابق'}
                        </span>
                        {req.registered && (
                          <span className="text-xs text-gray-500">
                            {getUserTypeLabel(req.registered.user_type)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <p className="text-xs font-semibold text-blue-800 mb-1">📥 بيانات الطلب</p>
                      <div className="flex items-center gap-2 text-gray-700">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        <span className="truncate">{req.submitted?.full_name || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 mt-1">
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                        <span className="font-mono">{req.submitted?.phone || '—'}</span>
                      </div>
                    </div>

                    <div className={`rounded-lg p-3 border ${
                      req.registered
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <p className={`text-xs font-semibold mb-1 ${
                        req.registered ? 'text-gray-800' : 'text-red-800'
                      }`}>
                        {req.registered ? '💾 بيانات النظام' : '❌ لا يوجد حساب'}
                      </p>
                      {req.registered ? (
                        <>
                          <div className="flex items-center gap-2 text-gray-700">
                            <User className="w-3.5 h-3.5 text-gray-600" />
                            <span className="truncate">{req.registered.full_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700 mt-1">
                            <Phone className="w-3.5 h-3.5 text-gray-600" />
                            <span className="font-mono">{req.registered.phone}</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-red-700">
                          رقم الهاتف غير مسجل في النظام
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="text-xs text-gray-500 mt-2">
                    📅 {new Date(req.created_at).toLocaleString('ar-EG')}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setSelectedRequest(req)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    مراجعة البيانات
                  </button>

                  {req.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={!req.match_confirmed}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm ${
                          req.match_confirmed
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        موافقة
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition text-sm"
                      >
                        <XCircle className="w-4 h-4" />
                        رفض
                      </button>
                    </>
                  )}

                  {req.status === 'approved' && (
                    <span className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      معتمد
                    </span>
                  )}

                  {req.status === 'rejected' && (
                    <span className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                      <XCircle className="w-4 h-4" />
                      مرفوض
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedRequest && (
        <RecoveryDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={() => handleApprove(selectedRequest.id)}
          onReject={() => handleReject(selectedRequest.id)}
        />
      )}
    </div>
  );
}