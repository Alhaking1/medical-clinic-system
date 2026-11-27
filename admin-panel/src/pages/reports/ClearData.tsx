import { useState } from 'react';
import { AlertTriangle, Trash2, Database } from 'lucide-react';
import apiClient from '../../api/client';

export default function ClearData() {
  const [isClearing, setIsClearing] = useState(false);
  const [result, setResult] = useState('');

  const clearTable = async (table: string) => {
    if (!confirm(`⚠️ هل أنت متأكد من مسح كل بيانات "${table}"؟\n\nهذا الإجراء لا يمكن التراجع عنه!`)) {
      return;
    }

    setIsClearing(true);
    setResult('');

    try {
      const response = await apiClient.delete(`/admin/clear/${table}`);
      setResult(`✅ ${response.data.message}`);
      alert(`✅ ${response.data.message}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'خطأ في مسح البيانات';
      setResult(`❌ ${msg}`);
      alert(`❌ ${msg}`);
    } finally {
      setIsClearing(false);
    }
  };

  const clearAll = async () => {
    if (!confirm('⚠️⚠️ هل أنت متأكد من مسح كل البيانات؟\n\n(الأطباء، السكرتيرات، المرضى، الحجوزات، المدفوعات)\n\nهذا الإجراء لا يمكن التراجع عنه!')) {
      return;
    }

    if (!confirm('⚠️ تأكيد أخير: مسح كل شيء؟')) {
      return;
    }

    setIsClearing(true);
    setResult('');

    try {
      const response = await apiClient.delete('/admin/clear-all');
      setResult(`✅ ${response.data.message}`);
      alert(`✅ ${response.data.message}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'خطأ في مسح البيانات';
      setResult(`❌ ${msg}`);
      alert(`❌ ${msg}`);
    } finally {
      setIsClearing(false);
    }
  };

  const tables = [
    { name: 'doctors', label: 'الأطباء' },
    { name: 'secretaries', label: 'السكرتيرات' },
    { name: 'patients', label: 'المرضى' },
    { name: 'appointments', label: 'الحجوزات' },
    { name: 'payments', label: 'المدفوعات' },
    { name: 'slots', label: 'المواعيد' },
    { name: 'queue', label: 'الطابور' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">محو البيانات</h1>
        <p className="text-gray-500 mt-1">مسح البيانات التجريبية قبل الإطلاق الرسمي</p>
      </div>

      {/* تحذير */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-800">تحذير</p>
          <p className="text-sm text-red-700 mt-1">
            هذه العمليات لا يمكن التراجع عنها. تأكد من أنك لا تحتاج هذه البيانات.
          </p>
        </div>
      </div>

      {/* نتيجة */}
      {result && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-700">{result}</p>
        </div>
      )}

      {/* مسح الكل */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <Database className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">مسح كل البيانات</h2>
              <p className="text-sm text-gray-500">مسح جميع الجداول دفعة واحدة</p>
            </div>
          </div>
          <button
            onClick={clearAll}
            disabled={isClearing}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition disabled:opacity-50"
          >
            <Trash2 className="w-5 h-5" />
            {isClearing ? 'جاري المسح...' : 'مسح الكل'}
          </button>
        </div>
      </div>

      {/* مسح فردي */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">مسح جدول محدد</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tables.map((t) => (
            <button
              key={t.name}
              onClick={() => clearTable(t.name)}
              disabled={isClearing}
              className="flex items-center justify-between bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 px-4 py-3 rounded-lg transition disabled:opacity-50"
            >
              <span className="text-gray-700">{t.label}</span>
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}