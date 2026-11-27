import { useState, useEffect } from 'react';
import { ArrowLeft, Check, X, Phone, User, Building2, Mail, Stethoscope, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getPendingDoctors,
  approveDoctor,
  rejectDoctor,
  type Doctor,
} from '../../api/endpoints/doctors';

export default function PendingDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      setIsLoading(true);
      const data = await getPendingDoctors();
      setDoctors(data);
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
      await approveDoctor(id);
      await loadDoctors();
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
      await rejectDoctor(id, reason || undefined);
      await loadDoctors();
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
            to="/doctors"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              ⏳ الأطباء المعلّقون
            </h1>
            <p className="text-gray-500 mt-1">
              عدد الطلبات: {doctors.length}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500">
          جاري التحميل...
        </div>
      ) : doctors.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-gray-500 text-lg">لا توجد طلبات معلّقة</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {doc.full_name || '—'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                          قيد المراجعة
                        </span>
                        {doc.specialty && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                            <Stethoscope className="w-3 h-3" />
                            {doc.specialty}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {doc.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{doc.phone}</span>
                      </div>
                    )}
                    {doc.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{doc.email}</span>
                      </div>
                    )}
                    {doc.clinic_name && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span>{doc.clinic_name}</span>
                      </div>
                    )}
                    {doc.experience_years !== undefined && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Award className="w-4 h-4 text-gray-400" />
                        <span>{doc.experience_years} سنوات خبرة</span>
                      </div>
                    )}
                    {doc.consultation_fee !== undefined && (
                      <div className="flex items-center gap-2 text-gray-600">
                        💰 {doc.consultation_fee} ريال
                      </div>
                    )}
                    {doc.created_at && (
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        📅 {new Date(doc.created_at).toLocaleDateString('ar')}
                      </div>
                    )}
                  </div>

                  {doc.bio && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                      {doc.bio}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleApprove(doc.id, doc.full_name)}
                    disabled={processing === doc.id}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition"
                  >
                    <Check className="w-4 h-4" />
                    موافقة
                  </button>
                  <button
                    onClick={() => handleReject(doc.id, doc.full_name)}
                    disabled={processing === doc.id}
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