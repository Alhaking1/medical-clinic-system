import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, CheckCircle, Wallet, Check, X } from 'lucide-react';
import { getPayments, type Payment } from '../../api/endpoints/payments';
import {
  getWalletDepositRequests,
  reviewWalletDepositRequest,
  type WalletDepositRequest
} from '../../api/endpoints/patients';

const methodLabels: Record<string, string> = {
  jawali: 'جوالي',
  jeeb: 'جيب',
  onecash: 'ون كاش',
  cash: 'نقداً',
  kuraimi: 'الكريمي',
  wallet: 'المحفظة',
};

const statusLabels: Record<string, string> = {
  pending: 'قيد المراجعة',
  confirmed: 'مؤكد',
  approved: 'معتمد ✅',
  rejected: 'مرفوض ❌',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function PaymentsList() {
  const [activeTab, setActiveTab] = useState<'appointments' | 'wallet'>('appointments');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [walletRequests, setWalletRequests] = useState<WalletDepositRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab === 'appointments') {
      loadPayments();
    } else {
      loadWalletRequests();
    }
  }, [activeTab, filter]);

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      const data = await getPayments(filter === 'all' ? undefined : filter);
      setPayments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWalletRequests = async () => {
    try {
      setIsLoading(true);
      const data = await getWalletDepositRequests(filter === 'all' ? undefined : filter);
      setWalletRequests(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const [approvingItem, setApprovingItem] = useState<WalletDepositRequest | null>(null);
  const [customAmountInput, setCustomAmountInput] = useState<string>('');
  const [rejectingItem, setRejectingItem] = useState<WalletDepositRequest | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState<string>('رقم الحوالة غير مطابق أو غير مستلم');

  const openApproveModal = (item: WalletDepositRequest) => {
    setApprovingItem(item);
    setCustomAmountInput(item.amount.toString());
  };

  const submitApprove = async () => {
    if (!approvingItem) return;
    const finalAmt = parseFloat(customAmountInput);
    if (isNaN(finalAmt) || finalAmt <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }
    try {
      setProcessingId(approvingItem.id);
      await reviewWalletDepositRequest(approvingItem.id, 'approve', undefined, finalAmt);
      alert(`✅ تم اعتماد مبلغ ${finalAmt.toLocaleString()} ر.ي وإضافته لمحفظة المريض بنجاح!`);
      setApprovingItem(null);
      loadWalletRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل اعتماد طلب الشحن');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (item: WalletDepositRequest) => {
    setRejectingItem(item);
    setRejectReasonInput('رقم الحوالة غير مطابق أو غير مستلم');
  };

  const submitReject = async () => {
    if (!rejectingItem) return;
    try {
      setProcessingId(rejectingItem.id);
      await reviewWalletDepositRequest(rejectingItem.id, 'reject', rejectReasonInput);
      alert('تم رفض طلب الشحن وإشعار المريض.');
      setRejectingItem(null);
      loadWalletRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل رفض الطلب');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredPayments = payments.filter(
    (p) => p.patient_name?.includes(search) || p.booking_code.includes(search)
  );

  const filteredWalletRequests = walletRequests.filter(
    (w) => w.patient_name?.includes(search) || w.patient_phone?.includes(search) || w.reference_number?.includes(search)
  );

  const pendingPaymentsCount = payments.filter((p) => p.status === 'pending').length;
  const pendingWalletCount = walletRequests.filter((w) => w.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>المدفوعات والمحافظ المالية</span>
          </h1>
          <p className="text-gray-500 mt-1">
            متابعة حوالات الحجوزات الطبية وطلبات شحن المحفظة
          </p>
        </div>

        {/* التبديل بين مدفوعات الحجوزات وشحن المحفظة */}
        <div className="flex bg-gray-100 p-1 rounded-xl self-start sm:self-auto border border-gray-200">
          <button
            onClick={() => { setActiveTab('appointments'); setFilter('all'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'appointments'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>مدفوعات الحجوزات</span>
            {pendingPaymentsCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                {pendingPaymentsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('wallet'); setFilter('all'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'wallet'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>طلبات شحن المحفظة</span>
            {pendingWalletCount > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">
                {pendingWalletCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'appointments' ? "ابحث برقم الحجز أو الاسم..." : "ابحث برقم الحوالة، اسم المريض أو الهاتف..."}
            className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'pending', 'confirmed', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                filter === s
                  ? activeTab === 'wallet' ? 'bg-emerald-600 text-white font-bold' : 'bg-primary-600 text-white font-bold'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? 'الكل' : statusLabels[s] || s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
        ) : activeTab === 'appointments' ? (
          /* جدول مدفوعات الحجوزات */
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">رقم الحجز</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">المريض</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">المبلغ</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">الطريقة</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">الحالة</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm font-mono text-gray-700">{p.booking_code}</td>
                  <td className="px-6 py-4 text-gray-900">{p.patient_name || '—'}</td>
                  <td className="px-6 py-4 text-gray-900 font-semibold">
                    {p.amount.toLocaleString('ar-YE')} ر.ي
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {methodLabels[p.method] || p.method}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColors[p.status]}`}>
                      {statusLabels[p.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {p.status === 'pending' ? (
                      <Link
                        to={`/payments/${p.id}/confirm`}
                        className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm transition"
                      >
                        <CheckCircle className="w-4 h-4" />
                        مراجعة
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {p.status === 'confirmed' ? '✅ تم' : '❌ مرفوض'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* جدول طلبات شحن المحفظة */
          <table className="w-full">
            <thead className="bg-emerald-50/50 border-b border-gray-200">
              <tr>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">المريض</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">المبلغ المطلوب</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">رقم الحوالة / السند</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">طريقة التحويل</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">الحالة</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">الإجراء الفوري</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredWalletRequests.map((w) => (
                <tr key={w.id} className="hover:bg-emerald-50/20 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{w.patient_name}</div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">{w.patient_phone}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-700 text-base">
                    {w.amount.toLocaleString()} ر.ي
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono bg-slate-100 border border-slate-200 px-2 py-1 rounded text-xs font-semibold text-slate-800 select-all">
                      {w.reference_number}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-medium">
                    {methodLabels[w.method] || w.method}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColors[w.status] || 'bg-gray-100'}`}>
                      {statusLabels[w.status] || w.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {w.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={processingId === w.id}
                          onClick={() => openApproveModal(w)}
                          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          اعتماد الرصيد ✅
                        </button>
                        <button
                          type="button"
                          disabled={processingId === w.id}
                          onClick={() => openRejectModal(w)}
                          className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          رفض
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 font-medium">
                        {w.status === 'approved' ? '✅ تم إيداع الرصيد' : '❌ تم الرفض'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!isLoading && (
          (activeTab === 'appointments' && filteredPayments.length === 0) ||
          (activeTab === 'wallet' && filteredWalletRequests.length === 0)
        ) && (
          <div className="text-center py-12 text-gray-500">لا توجد عمليات مسجلة</div>
        )}
      </div>

      {/* نافذة تأكيد واعتماد الشحن مع إمكانية تعديل المبلغ */}
      {approvingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <span>اعتماد وشحن محفظة المريض</span>
              <span className="text-emerald-600">💰</span>
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              يمكنك التحقق من بيانات الحوالة وتعديل المبلغ المعتمد قبل إيداعه فورياً في حساب العميل.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 mb-4 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">اسم المريض:</span>
                <span className="font-bold text-gray-900">{approvingItem.patient_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">رقم الهاتف:</span>
                <span className="font-mono text-gray-800">{approvingItem.patient_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">طريقة التحويل:</span>
                <span className="font-semibold text-gray-800">{methodLabels[approvingItem.method] || approvingItem.method}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">رقم الحوالة / السند:</span>
                <span className="font-mono bg-white border border-slate-300 px-2 py-0.5 rounded text-slate-800 font-bold select-all">
                  {approvingItem.reference_number}
                </span>
              </div>
              {approvingItem.notes && (
                <div className="pt-1 border-t border-slate-200 text-gray-600">
                  <span className="font-semibold text-gray-700">ملاحظة العميل: </span>
                  {approvingItem.notes}
                </div>
              )}
            </div>

            <div className="space-y-2 mb-5">
              <label className="block text-xs font-bold text-gray-700">
                المبلغ المراد اعتماده وإيداعه (ر.ي) <span className="text-emerald-600">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={customAmountInput}
                onChange={(e) => setCustomAmountInput(e.target.value)}
                className="w-full px-4 py-2.5 border border-emerald-300 rounded-xl font-bold text-emerald-800 text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="أدخل المبلغ المعتمد..."
              />
              <span className="text-[11px] text-gray-400 block">
                المبلغ المطلوب من المريض أصلاً: {approvingItem.amount.toLocaleString()} ر.ي
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={processingId !== null}
                onClick={() => setApprovingItem(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={processingId !== null}
                onClick={submitApprove}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {processingId === approvingItem.id ? 'جاري الاعتماد...' : 'تأكيد وإيداع الرصيد فوراً ✅'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة رفض طلب الشحن */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <span>رفض طلب شحن المحفظة</span>
              <span className="text-rose-600">❌</span>
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              سيتم إشعار المريض بسبب الرفض ولن يتم تعديل رصيده.
            </p>

            <div className="space-y-2 mb-5">
              <label className="block text-xs font-bold text-gray-700">
                سبب الرفض (سيظهر للمريض)
              </label>
              <input
                type="text"
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                className="w-full px-4 py-2.5 border border-rose-300 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                placeholder="أدخل سبب الرفض..."
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={processingId !== null}
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={processingId !== null}
                onClick={submitReject}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                {processingId === rejectingItem.id ? 'جاري الرفض...' : 'رفض الطلب'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}