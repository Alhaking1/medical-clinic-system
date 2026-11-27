import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserAvatar from '../../components/ui/UserAvatar';
import { Search, Ban, CheckCircle, Phone, Trash2, Mail } from 'lucide-react';
import {
  getPatients,
  toggleBlockPatient,
  deletePatient,
  adjustPatientBalance,
  type Patient,
} from '../../api/endpoints/patients';

export default function PatientsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [walletAction, setWalletAction] = useState<'deposit' | 'deduct'>('deposit');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [isSubmittingWallet, setIsSubmittingWallet] = useState(false);


  useEffect(() => {
    loadPatients();
  }, []);


  const loadPatients = async () => {
    try {
      setIsLoading(true);
      const data = await getPatients();
      setPatients(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBlock = async (id: number) => {
    try {
      await toggleBlockPatient(id);
      loadPatients();
    } catch (error) {
      alert('خطأ في تعديل الحالة');
    }
  };

  const handleDelete = async (patient: Patient) => {
    const confirmed = confirm(
      `هل أنت متأكد من حذف المريض "${patient.full_name}"؟\n\n` +
        `رقم الهاتف: ${patient.phone}\n\n` +
        `⚠️ سيتم حذف:\n` +
        `• بيانات المريض\n` +
        `• جميع حجوزاته\n` +
        `• سجلاته الطبية\n\n` +
        `هذا الإجراء لا يمكن التراجع عنه!`
    );

    if (!confirmed) return;

    try {
      await deletePatient(patient.id);
      alert(`✅ تم حذف المريض ${patient.full_name}`);
      loadPatients();
    } catch (error: any) {
      console.error('خطأ في الحذف:', error);
      alert(error.response?.data?.message || 'خطأ في حذف المريض');
    }
  };

  const filtered = patients.filter(
    (p) =>
      p.full_name.includes(search) ||
      p.phone.includes(search) ||
      (p.email && p.email.includes(search)) ||
      (p.governorate && p.governorate.includes(search))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">المرضى</h1>
        <p className="text-gray-500 mt-1">عدد المرضى: {patients.length}</p>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الهاتف أو البريد..."
            className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">المريض</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">العمر</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">الجنس</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">المحافظة</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">رصيد المحفظة 💰</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">عدم الحضور</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">الحالة</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className="hover:bg-blue-50/40 transition cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={(p as any).avatar_url || p.picture}
                        name={p.full_name}
                        className="w-10 h-10"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{p.full_name}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {p.phone}
                        </p>
                        {p.email && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{p.email}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{p.age || '—'}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {p.gender === 'male' ? 'ذكر' : p.gender === 'female' ? 'أنثى' : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-700">{p.governorate || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {(p.balance || 0).toLocaleString()} ر.ي
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPatient(p);
                          setWalletAction('deposit');
                          setDepositAmount('');
                          setDepositNotes('');
                        }}
                        className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 transition font-medium"
                        title="شحن رصيد"
                      >
                        + شحن
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPatient(p);
                          setWalletAction('deduct');
                          setDepositAmount('');
                          setDepositNotes('');
                        }}
                        className="px-2 py-1 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-200 transition font-medium"
                        title="خصم رصيد"
                      >
                        - خصم
                      </button>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        p.no_show_count >= 5
                          ? 'bg-red-100 text-red-700'
                          : p.no_show_count >= 3
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {p.no_show_count}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {p.is_blocked ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        محظور
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        نشط
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleBlock(p.id);
                        }}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg transition text-sm ${
                          p.is_blocked
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-orange-600 hover:bg-orange-50'
                        }`}
                        title={p.is_blocked ? 'إلغاء الحظر' : 'حظر'}
                      >
                        {p.is_blocked ? (
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p);
                        }}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg transition text-sm text-red-600 hover:bg-red-50"
                        title="حذف المريض"
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">لا توجد نتائج</div>
        )}
      </div>

      {/* مودال شحن وتعديل رصيد المحفظة */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <span>{walletAction === 'deposit' ? '💳 شحن رصيد محفظة المريض' : '🔻 خصم من محفظة المريض'}</span>
              </h3>
              <button
                onClick={() => setSelectedPatient(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-sm font-bold text-gray-900">{selectedPatient.full_name}</div>
              <div className="text-xs text-gray-500 font-mono mt-0.5">{selectedPatient.phone}</div>
              <div className="text-sm font-semibold text-emerald-700 mt-2">
                الرصيد الحالي: {(selectedPatient.balance || 0).toLocaleString()} ر.ي
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {walletAction === 'deposit' ? 'المبلغ المراد إضافته (ر.ي)' : 'المبلغ المراد خصمه (ر.ي)'}
              </label>
              <input
                type="number"
                min="1"
                placeholder="مثال: 5000"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-lg font-bold"
              />
              <p className="text-xs text-gray-500 mt-1">
                {walletAction === 'deposit'
                  ? 'سيُضاف هذا المبلغ فوراً إلى رصيد المريض وسيصله إشعار فوري في التطبيق.'
                  : 'سيُخصم هذا المبلغ فوراً من رصيد المريض وسيصله إشعار فوري بالتحديث.'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ملاحظات / السبب (اختياري)
              </label>
              <input
                type="text"
                placeholder={walletAction === 'deposit' ? 'مثال: تحويل كريمي / إيداع نقدي...' : 'مثال: تسوية حساب / خصم إداري...'}
                value={depositNotes}
                onChange={(e) => setDepositNotes(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSubmittingWallet || !depositAmount || parseFloat(depositAmount) <= 0}
                onClick={async () => {
                  if (!selectedPatient) return;
                  const rawAmount = parseFloat(depositAmount);
                  const finalAmount = walletAction === 'deposit' ? rawAmount : -rawAmount;
                  const defaultDesc = walletAction === 'deposit' ? 'شحن رصيد بواسطة الإدارة' : 'خصم رصيد بواسطة الإدارة';
                  try {
                    setIsSubmittingWallet(true);
                    await adjustPatientBalance(
                      selectedPatient.id,
                      finalAmount,
                      depositNotes || defaultDesc
                    );
                    alert(walletAction === 'deposit'
                      ? `✅ تم شحن رصيد المريض بمبلغ ${rawAmount.toLocaleString()} ر.ي بنجاح`
                      : `✅ تم خصم ${rawAmount.toLocaleString()} ر.ي من رصيد المريض بنجاح`
                    );
                    setSelectedPatient(null);
                    loadPatients();
                  } catch (err: any) {
                    alert(err.response?.data?.message || 'فشل في تعديل الرصيد');
                  } finally {
                    setIsSubmittingWallet(false);
                  }
                }}
                className={`flex-1 py-2.5 px-4 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 ${
                  walletAction === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isSubmittingWallet
                  ? 'جاري المعالجة...'
                  : walletAction === 'deposit'
                  ? 'تأكيد إضافة الرصيد ✅'
                  : 'تأكيد الخصم 🔻'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
