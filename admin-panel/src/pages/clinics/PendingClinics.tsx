import { useState, useEffect } from 'react';
import { ArrowLeft, Check, X, Phone, Building2, MapPin, Users, UserCog, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getPendingClinics,
  approveClinic,
  rejectClinic,
  type Clinic,
} from '../../api/endpoints/clinics';

export default function PendingClinics() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    try {
      setIsLoading(true);
      const data = await getPendingClinics();
      setClinics(data);
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
      await approveClinic(id);
      await loadClinics();
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
      await rejectClinic(id, reason || undefined);
      await loadClinics();
    } catch (error) {
      alert('خطأ في الرفض');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/clinics"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              ⏳ العيادات المعلّقة
            </h1>
            <p className="text-gray-500 mt-1">
              عدد الطلبات: {clinics.length}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500">
          جاري التحميل...
        </div>
      ) : clinics.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-gray-500 text-lg">لا توجد طلبات معلّقة</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {clinics.map((clinic) => (
            <div
              key={clinic.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {clinic.name || '—'}
                      </h3>
                      <span className="inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                        قيد المراجعة
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {clinic.governorate && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{clinic.governorate}</span>
                      </div>
                    )}
                    {clinic.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{clinic.phone}</span>
                      </div>
                    )}
                    {clinic.address && (
                      <div className="flex items-center gap-2 text-gray-600 md:col-span-2">
                        📍 {clinic.address}
                      </div>
                    )}
                    {clinic.doctors_count !== undefined && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{clinic.doctors_count} طبيب</span>
                      </div>
                    )}
                    {clinic.secretaries_count !== undefined && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <UserCog className="w-4 h-4 text-gray-400" />
                        <span>{clinic.secretaries_count} سكرتيرة</span>
                      </div>
                    )}
                    {clinic.created_at && (
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        📅 {new Date(clinic.created_at).toLocaleDateString('ar')}
                      </div>
                    )}
                  </div>

                  {clinic.google_maps_url && (
                    <a
                      href={clinic.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                      فتح في خرائط Google
                    </a>
                  )}

                  {clinic.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                      {clinic.notes}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleApprove(clinic.id, clinic.name)}
                    disabled={processing === clinic.id}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition"
                  >
                    <Check className="w-4 h-4" />
                    موافقة
                  </button>
                  <button
                    onClick={() => handleReject(clinic.id, clinic.name)}
                    disabled={processing === clinic.id}
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