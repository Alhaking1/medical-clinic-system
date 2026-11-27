import { useState, useEffect } from 'react';
import { getClinics, type Clinic } from '../../api/endpoints/clinics';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Trash2, Edit, ToggleLeft, ToggleRight,
  RefreshCw, Calendar, Clock, AlertCircle, Percent,
  CheckCircle, XCircle,
} from 'lucide-react';
import {
  getAllOffers,
  toggleOffer,
  deleteOffer,
  reactivateOffer,
  approveOffer,
  rejectOffer,
  type Offer,
} from '../../api/endpoints/offers';

type FilterType = 'all' | 'pending' | 'active' | 'expired' | 'disabled';

export default function OffersList() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [selectedFacility, setSelectedFacility] = useState<string>('');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOffers();
    getClinics().then(data => setClinics(data || [])).catch(() => {});
  }, [filter]);

  const loadOffers = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await getAllOffers({ status: filter });
      setOffers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطأ في تحميل العروض');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await toggleOffer(id);
      loadOffers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في تعديل الحالة');
    }
  };

  const handleDelete = async (offer: Offer) => {
    const confirmed = confirm(
      `هل أنت متأكد من حذف العرض "${offer.title}"؟\n\nهذا الإجراء لا يمكن التراجع عنه!`
    );
    if (!confirmed) return;

    try {
      await deleteOffer(offer.id);
      alert('✅ تم حذف العرض');
      loadOffers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في الحذف');
    }
  };

  const handleReactivate = async (offer: Offer) => {
    const input = prompt(
      `إعادة تفعيل العرض "${offer.title}"\n\nأدخل المدة بالساعات (مثلاً: 24):`,
      '24'
    );
    if (!input) return;

    const hours = Number(input);
    if (!hours || hours <= 0) {
      alert('المدة غير صحيحة');
      return;
    }

    try {
      await reactivateOffer(offer.id, { duration_hours: hours });
      alert('✅ تم إعادة تفعيل العرض');
      loadOffers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في إعادة التفعيل');
    }
  };

  const handleApprove = async (offer: Offer) => {
    const confirmed = confirm(`هل أنت متأكد من اعتماد ونشر العرض "${offer.title}"؟`);
    if (!confirmed) return;

    try {
      await approveOffer(offer.id);
      alert('✅ تم اعتماد ونشر العرض بنجاح');
      loadOffers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في اعتماد العرض');
    }
  };

  const handleReject = async (offer: Offer) => {
    const reason = prompt(`رفض العرض "${offer.title}"\n\nأدخل سبب الرفض (اختياري):`, '');
    if (reason === null) return;

    try {
      await rejectOffer(offer.id, reason || undefined);
      alert('✅ تم رفض العرض');
      loadOffers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في رفض العرض');
    }
  };

  const filtered = offers.filter((o) =>
    o.title?.includes(search) ||
    o.doctor_name?.includes(search) ||
    o.clinic_name?.includes(search)
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('ar-YE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getTimeRemaining = (endDate: string | null) => {
    if (!endDate) return 'دائم';
    try {
      const end = new Date(endDate).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) return 'انتهى';

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days} يوم`;
      if (hours > 0) return `${hours} ساعة`;
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} دقيقة`;
    } catch {
      return '—';
    }
  };

  const getStatusBadge = (offer: Offer) => {
    if (offer.status === 'pending') {
      return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">معلق ⏳</span>;
    }
    if (offer.status === 'rejected') {
      return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">مرفوض ❌</span>;
    }
    if (offer.is_expired) {
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">منتهي</span>;
    }
    if (!offer.is_active) {
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">معطّل</span>;
    }
    return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">نشط</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">العروض</h1>
          <p className="text-gray-500 mt-1">إجمالي: {offers.length} عرض</p>
        </div>
        <button
          onClick={() => navigate('/offers/add')}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-3 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          إضافة عرض
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بعنوان العرض أو الطبيب أو العيادة..."
            className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <span className="text-xs text-gray-500 font-medium">المنشأة الطبية:</span>
            <select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
            >
              <option value="">جميع المنشآت والعيادات</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {([
            { key: 'all', label: 'الكل' },
            { key: 'pending', label: 'معلقة ⏳' },
            { key: 'active', label: 'نشطة' },
            { key: 'expired', label: 'منتهية' },
            { key: 'disabled', label: 'معطّلة' },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                filter === f.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-700">العرض ومقدم الخدمة</th>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-700">الفئة المستهدفة</th>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-700">نسبة الحجوزات والسعة</th>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-700">الخصم</th>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-700">السعر</th>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-700">ينتهي</th>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-700">الوقت المتبقي</th>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-700">الحالة</th>
                  <th className="text-right px-4 py-4 text-sm font-semibold text-gray-700">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((offer) => (
                  <tr key={offer.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">{offer.title}</p>
                      {offer.created_by_role === 'secretary' && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          بواسطة السكرتيرة 👩‍💼
                        </span>
                      )}
                      {offer.rejection_reason && offer.status === 'rejected' && (
                        <p className="text-xs text-red-600 mt-1">سبب الرفض: {offer.rejection_reason}</p>
                      )}
                      {offer.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {offer.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-700 text-sm">
                      {offer.doctor_name || '—'}
                      {offer.clinic_name && (
                        <p className="text-xs text-gray-500 mt-1">{offer.clinic_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {offer.discount_percent ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                          <Percent className="w-4 h-4" />
                          {offer.discount_percent}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {offer.original_price && offer.discounted_price ? (
                        <div>
                          <p className="text-gray-400 line-through text-xs">
                            {offer.original_price}
                          </p>
                          <p className="text-green-600 font-bold">
                            {offer.discounted_price}
                          </p>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(offer.end_date)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className={`flex items-center gap-1 text-sm font-medium ${
                        offer.is_expired ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        <Clock className="w-4 h-4" />
                        {getTimeRemaining(offer.end_date)}
                      </div>
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(offer)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        {/* موافقة / رفض للعروض المعلقة */}
                        {offer.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(offer)}
                              className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition"
                              title="اعتماد ونشر العرض ✅"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleReject(offer)}
                              className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                              title="رفض العرض ❌"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}

                        {/* تعديل */}
                        <button
                          onClick={() => navigate(`/offers/${offer.id}/edit`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* تفعيل/تعطيل */}
                        <button
                          onClick={() => handleToggle(offer.id)}
                          className={`p-2 rounded-lg transition ${
                            offer.is_active
                              ? 'text-gray-600 hover:bg-gray-100'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={offer.is_active ? 'تعطيل' : 'تفعيل'}
                        >
                          {offer.is_active ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </button>

                        {/* إعادة تفعيل — يظهر فقط للمنتهي */}
                        {offer.is_expired && (
                          <button
                            onClick={() => handleReactivate(offer)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                            title="إعادة تفعيل"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}

                        {/* حذف */}
                        <button
                          onClick={() => handleDelete(offer)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {search ? 'لا توجد نتائج' : 'لا توجد عروض'}
          </div>
        )}
      </div>
    </div>
  );
}