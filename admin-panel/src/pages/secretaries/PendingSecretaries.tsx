import { useState, useEffect } from 'react';
import { ArrowLeft, Check, X, Phone, User, Building2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getPendingSecretaries,
  approveSecretary,
  rejectSecretary,
  type Secretary,
} from '../../api/endpoints/secretaries';

export default function PendingSecretaries() {
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    loadSecretaries();
  }, []);

  const loadSecretaries = async () => {
    try {
      setIsLoading(true);
      const data = await getPendingSecretaries();
      setSecretaries(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: number, name: string) => {
    if (!confirm(`هل أنت متأكد من الموافقة على "${name}"؟`)) return;
    try {
      setProcessing(id);
      await approveSecretary(id);
      await loadSecretaries();
    } catch (error) {
      alert('خطأ في الموافقة');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: number, name: string) => {
    const reason = prompt(`سبب رفض "${name}":`);
    if (reason === null) return;
    try {
      setProcessing(id);
      await rejectSecretary(id, reason || undefined);
      await loadSecretaries();
    } catch (error) {
      alert('خطأ في الرفض');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/secretaries"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              ⏳ السكرتيرات المعلّقات
            </h1>
            <p className="text-gray-500 mt-1">
              عدد الطلبات: {secretaries.length}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500">
          جاري التحميل...
        </div>
      ) : secretaries.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-gray-500 text-lg">لا توجد طلبات معلّقة</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {secretaries.map((sec) => (
            <div
              key={sec.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {sec.full_name || '—'}
                      </h3>
                      <span className="inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                        قيد المراجعة
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {sec.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{sec.phone}</span>
                      </div>
                    )}
                    {sec.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{sec.email}</span>
                      </div>
                    )}
                    {sec.clinic_name && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span>{sec.clinic_name}</span>
                      </div>
                    )}
                    {sec.created_at && (
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        📅 {new Date(sec.created_at).toLocaleDateString('ar')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleApprove(sec.id, sec.full_name)}
                    disabled={processing === sec.id}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition"
                  >
                    <Check className="w-4 h-4" />
                    موافقة
                  </button>
                  <button
                    onClick={() => handleReject(sec.id, sec.full_name)}
                    disabled={processing === sec.id}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                    رفض
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}