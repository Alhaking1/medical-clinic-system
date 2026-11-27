import { useState, useEffect } from 'react';
import {
  DollarSign,
  Calendar,
  Building2,
  Filter,
  RefreshCw,
  Receipt
} from 'lucide-react';

import {
  getRevenueAnalytics,
  type RevenueAnalyticsResponse,
  type ClinicRevenueStat
} from '../../api/endpoints/reports';
import { updateClinic } from '../../api/endpoints/clinics';

export default function Reports() {
  const [data, setData] = useState<RevenueAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // حالة تعديل نسبة عمولة عيادة مباشرة
  const [editingClinicId, setEditingClinicId] = useState<number | null>(null);
  const [editRateValue, setEditRateValue] = useState<string>('');
  const [isSavingRate, setIsSavingRate] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [selectedClinicId, startDate, endDate]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const res = await getRevenueAnalytics({
        clinic_id: selectedClinicId || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setData(res);
    } catch (error) {
      console.error('Failed to load revenue analytics', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCommissionRate = async (clinic: ClinicRevenueStat) => {
    try {
      setIsSavingRate(true);
      const newRate = editRateValue.trim() === '' ? null : parseFloat(editRateValue);
      await updateClinic(clinic.id, {
        commission_rate: newRate,
      });
      setEditingClinicId(null);
      await loadAnalytics();
      alert(`✅ تم تحديث نسبة عمولة ${clinic.name} بنجاح إلى ${newRate !== null ? `${newRate}%` : 'الافتراضية العامة'}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'فشل تحديث نسبة العمولة');
    } finally {
      setIsSavingRate(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${(amount || 0).toLocaleString('ar-YE')} ر.ي`;
  };

  const summary = data?.summary;
  const clinics = data?.clinics || [];
  const daily = data?.daily || [];

  return (
    <div className="space-y-6">
      {/* الترويسة وأزرار التصفية والتحديث */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-600" />
            تقارير الإيرادات والعمولات
          </h1>
          <p className="text-gray-500 mt-1">
            متابعة دقيقة للعائد المالي للمنصة وللعيادات، مع تحكم فوري بنسبة عمولة كل عيادة
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg transition shadow-sm w-fit"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          تحديث البيانات
        </button>
      </div>

      {/* شريط الفلاتر: اختيار العيادة، التاريخ من - إلى */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <Filter className="w-5 h-5 text-emerald-600" />
          <span>تصفية الإيرادات:</span>
        </div>

        {/* فلترة العيادة */}
        <div className="min-w-[200px] flex-1">
          <select
            value={selectedClinicId}
            onChange={(e) => setSelectedClinicId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">جميع العيادات</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (عمولة: {c.commission_rate}%)
              </option>
            ))}
          </select>
        </div>

        {/* من تاريخ */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">من:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {/* إلى تاريخ */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">إلى:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {(selectedClinicId || startDate || endDate) && (
          <button
            onClick={() => {
              setSelectedClinicId('');
              setStartDate('');
              setEndDate('');
            }}
            className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1"
          >
            إلغاء التصفية
          </button>
        )}
      </div>

      {/* بطاقات الإحصائيات العامة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* إجمالي الحجوزات */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">إجمالي الحجوزات</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {isLoading ? '...' : summary?.total_appointments || 0}
            </p>
            <p className="text-xs text-gray-400 mt-1">حجز مسجل</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* إجمالي الإيرادات الكلية */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">إجمالي قيمة الحجوزات</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {isLoading ? '...' : formatCurrency(summary?.total_gross_revenue || 0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">قبل خصم العمولات</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        {/* عائد الأدمن (المنصة) */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-800 font-bold">عائد المنصة (الأدمن 👑)</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">
              {isLoading ? '...' : formatCurrency(summary?.total_admin_revenue || 0)}
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              اليوم: {formatCurrency(summary?.today?.admin_revenue || 0)}
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-sm">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* عائد العيادات الصافي */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">صافي عائد العيادات</p>
            <p className="text-xl font-bold text-gray-800 mt-1">
              {isLoading ? '...' : formatCurrency(summary?.total_clinic_revenue || 0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              اليوم: {formatCurrency(summary?.today?.clinic_revenue || 0)}
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* المقارنة الزمنية: اليوم مقابل الشهر الحالي */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* إحصائيات اليوم */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                📅
              </div>
              <div>
                <h3 className="font-bold text-gray-900">عائد اليوم الحقيقي</h3>
                <p className="text-xs text-gray-500">حجوزات وإيرادات اليوم</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
              {summary?.today?.appointments_count || 0} حجز اليوم
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">إجمالي الحجوزات</p>
              <p className="font-bold text-gray-900 text-sm">
                {formatCurrency(summary?.today?.gross_revenue || 0)}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <p className="text-xs text-emerald-800 font-bold mb-1">عائد الأدمن</p>
              <p className="font-bold text-emerald-700 text-sm">
                {formatCurrency(summary?.today?.admin_revenue || 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800 mb-1">صافي العيادات</p>
              <p className="font-bold text-blue-900 text-sm">
                {formatCurrency(summary?.today?.clinic_revenue || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* إحصائيات الشهر الحالي */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                🗓️
              </div>
              <div>
                <h3 className="font-bold text-gray-900">عائد الشهر الحالي</h3>
                <p className="text-xs text-gray-500">إجمالي إيرادات هذا الشهر</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
              {summary?.this_month?.appointments_count || 0} حجز هذا الشهر
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">إجمالي الحجوزات</p>
              <p className="font-bold text-gray-900 text-sm">
                {formatCurrency(summary?.this_month?.gross_revenue || 0)}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <p className="text-xs text-emerald-800 font-bold mb-1">عائد الأدمن</p>
              <p className="font-bold text-emerald-700 text-sm">
                {formatCurrency(summary?.this_month?.admin_revenue || 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800 mb-1">صافي العيادات</p>
              <p className="font-bold text-blue-900 text-sm">
                {formatCurrency(summary?.this_month?.clinic_revenue || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* جدول العائد من كل عيادة وتعديل نسبة العمولة فورياً */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-gray-900">
              العائد المالي ونسبة العمولة لكل عيادة ({clinics.length})
            </h2>
          </div>
          <span className="text-xs text-gray-500">
            النسبة العامة الافتراضية: <strong className="text-emerald-700">{summary?.global_commission_rate || 10}%</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 font-semibold">اسم العيادة</th>
                <th className="py-3 px-4 font-semibold">نسبة العمولة (%)</th>
                <th className="py-3 px-4 font-semibold">عدد الحجوزات</th>
                <th className="py-3 px-4 font-semibold">إجمالي الحجوزات</th>
                <th className="py-3 px-4 font-semibold text-emerald-700">عائد الأدمن 👑</th>
                <th className="py-3 px-4 font-semibold text-blue-700">عائد العيادة الصافي</th>
                <th className="py-3 px-4 font-semibold text-center">إجراءات العمولة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clinics.map((clinic) => (
                <tr key={clinic.id} className="hover:bg-gray-50/80 transition">
                  <td className="py-3.5 px-4 font-bold text-gray-900">
                    {clinic.name}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-600">
                    {editingClinicId === clinic.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={editRateValue}
                          onChange={(e) => setEditRateValue(e.target.value)}
                          className="w-20 px-2 py-1 border border-emerald-400 rounded text-sm font-bold text-center"
                          placeholder="مثلاً: 12"
                        />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                    ) : (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs">
                        {clinic.commission_rate}%
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-gray-800">
                    {clinic.appointments_count}
                  </td>
                  <td className="py-3.5 px-4 text-gray-700">
                    {formatCurrency(clinic.gross_revenue)}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-700">
                    {formatCurrency(clinic.admin_revenue)}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-blue-700">
                    {formatCurrency(clinic.clinic_revenue)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {editingClinicId === clinic.id ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleSaveCommissionRate(clinic)}
                          disabled={isSavingRate}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition disabled:opacity-50"
                        >
                          {isSavingRate ? 'حفظ...' : 'تطبيق فوراً'}
                        </button>
                        <button
                          onClick={() => setEditingClinicId(null)}
                          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs transition"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingClinicId(clinic.id);
                          setEditRateValue(String(clinic.commission_rate));
                        }}
                        className="px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 border border-emerald-300 rounded-lg transition"
                      >
                        تعديل العمولة ✏️
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {clinics.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 text-sm">
                    لا توجد عيادات مسجلة حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* جدول السجل اليومي للإيرادات */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-gray-900">سجل الإيرادات اليومية التفصيلي</h2>
          </div>
          <span className="text-xs text-gray-500">حسب تاريخ إنشاء الحجز</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 font-semibold">التاريخ</th>
                <th className="py-3 px-4 font-semibold">عدد الحجوزات</th>
                <th className="py-3 px-4 font-semibold">إجمالي الحجوزات</th>
                <th className="py-3 px-4 font-semibold text-emerald-700">عائد الأدمن</th>
                <th className="py-3 px-4 font-semibold text-blue-700">عائد العيادات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {daily.slice(0, 30).map((d) => (
                <tr key={d.date} className="hover:bg-gray-50/80 transition">
                  <td className="py-3 px-4 font-bold text-gray-800">
                    📅 {d.date}
                  </td>
                  <td className="py-3 px-4 font-semibold text-gray-700">
                    {d.appointments_count}
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {formatCurrency(d.gross_revenue)}
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-700">
                    {formatCurrency(d.admin_revenue)}
                  </td>
                  <td className="py-3 px-4 font-bold text-blue-700">
                    {formatCurrency(d.clinic_revenue)}
                  </td>
                </tr>
              ))}
              {daily.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 text-sm">
                    لا توجد بيانات حجوزات مسجلة في هذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}