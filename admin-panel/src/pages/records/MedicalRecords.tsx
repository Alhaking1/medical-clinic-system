import { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Building2,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import apiClient from '../../api/client';
import { getClinics, type Clinic } from '../../api/endpoints/clinics';
import { getDoctors, type Doctor } from '../../api/endpoints/doctors';

interface MedicalRecordItem {
  appointment_id: number;
  booking_code: string;
  sequential_booking_number?: number;
  appointment_status: string;
  attendance_status?: string;
  booked_at: string;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  patient_gender?: string;
  patient_blood_group?: string;
  patient_age?: number;
  doctor_id: number;
  doctor_name: string;
  doctor_specialty: string;
  clinic_name: string;
  clinic_id: number;
  record_id?: number;
  diagnosis?: string;
  prescription?: string;
  lab_tests?: string;
  notes?: string;
  follow_up_date?: string;
  record_date?: string;
}

export default function MedicalRecords() {
  const [records, setRecords] = useState<MedicalRecordItem[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modal view for full record details
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecordItem | null>(null);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [selectedClinic, selectedDoctor, page]);

  const loadFilterOptions = async () => {
    try {
      const [cList, dList] = await Promise.all([
        getClinics(),
        getDoctors()
      ]);
      setClinics(cList || []);
      setDoctors(dList || []);
    } catch (e) {
      console.error('Error loading filters:', e);
    }
  };

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page,
        limit: 15,
      };
      if (selectedClinic) params.clinic_id = selectedClinic;
      if (selectedDoctor) params.doctor_id = selectedDoctor;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await apiClient.get('/admin/medical-records', { params });
      if (res.data.success) {
        setRecords(res.data.data || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalCount(res.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load medical records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadRecords();
  };

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-teal-600" />
            السجلات الطبية وتاريخ المرضى
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            استعراض ملفات المرضى، التشخيصات، الوصفات، وتاريخ الحجوزات الطبية في جميع المنشآت
          </p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl shadow-xs border border-gray-200 text-sm">
          إجمالي السجلات: <span className="font-bold text-teal-600">{totalCount}</span>
        </div>
      </div>

      {/* شريط الفلاتر والبحث */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم المريض، رقم الهاتف، أو كود الحجز..."
              className="w-full pr-9 pl-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition"
          >
            بحث
          </button>
        </form>

        <div className="flex gap-2">
          {/* فلتر العيادة */}
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <Building2 className="w-4 h-4 text-gray-500" />
            <select
              value={selectedClinic}
              onChange={(e) => {
                setSelectedClinic(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
            >
              <option value="">جميع المنشآت والعيادات</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* فلتر الطبيب */}
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <Stethoscope className="w-4 h-4 text-gray-500" />
            <select
              value={selectedDoctor}
              onChange={(e) => {
                setSelectedDoctor(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
            >
              <option value="">جميع الأطباء</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} ({d.specialty || 'طبيب'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* جدول السجلات */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">جاري تحميل السجلات الطبية...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-gray-500">لا توجد سجلات طبية مطابقة لخيارات البحث.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">كود ورقم الحجز</th>
                  <th className="px-4 py-3">المريض</th>
                  <th className="px-4 py-3">الطبيب والعيادة</th>
                  <th className="px-4 py-3">التشخيص الطبي</th>
                  <th className="px-4 py-3">العلاج والوصفة</th>
                  <th className="px-4 py-3">حالة الحضور</th>
                  <th className="px-4 py-3">التاريخ</th>
                  <th className="px-4 py-3 text-center">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {records.map((r, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/80 transition">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-gray-900">{r.booking_code}</div>
                      {r.sequential_booking_number && (
                        <div className="text-[11px] text-teal-600 font-semibold">
                          رقم تسلسلي: #{r.sequential_booking_number}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.patient_name || '—'}</div>
                      <div className="text-xs text-gray-400 font-mono">{r.patient_phone || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{r.doctor_name || '—'}</div>
                      <div className="text-xs text-gray-500">{r.clinic_name || '—'}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">
                      {r.diagnosis ? (
                        <span className="text-gray-800 font-medium">{r.diagnosis}</span>
                      ) : (
                        <span className="text-gray-400 italic">بانتظار الفحص / لا يوجد</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">
                      {r.prescription ? (
                        <span className="text-emerald-700">{r.prescription}</span>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          r.attendance_status === 'arrived'
                            ? 'bg-teal-100 text-teal-800'
                            : r.attendance_status === 'no_show'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {r.attendance_status === 'arrived'
                          ? 'حضر 🏥'
                          : r.attendance_status === 'no_show'
                          ? 'لم يحضر ❌'
                          : 'معلق'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.booked_at ? new Date(r.booked_at).toLocaleDateString('ar-YE') : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedRecord(r)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                      >
                        معاينة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ترقيم الصفحات */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              صفحة {page} من {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* نافذة تفاصيل السجل الطبي */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                تفاصيل السجل الطبي #{selectedRecord.booking_code}
              </h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-gray-50 p-3 rounded-xl grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500 text-xs block">اسم المريض:</span>
                  <span className="font-semibold text-gray-800">{selectedRecord.patient_name}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">الهاتف:</span>
                  <span className="font-mono text-gray-800">{selectedRecord.patient_phone}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">الطبيب المعالج:</span>
                  <span className="font-semibold text-gray-800">{selectedRecord.doctor_name}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs block">المنشأة الطبية:</span>
                  <span className="text-gray-800">{selectedRecord.clinic_name}</span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-1">التشخيص الطبي (Diagnosis):</h4>
                <div className="bg-teal-50/60 border border-teal-100 p-3 rounded-lg text-gray-800 text-sm">
                  {selectedRecord.diagnosis || 'لم يُدوّن تشخيص بعد'}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-1">الوصفة الطبية (Prescription):</h4>
                <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-lg text-emerald-900 text-sm whitespace-pre-wrap">
                  {selectedRecord.prescription || 'لا توجد أدوية مسجلة'}
                </div>
              </div>

              {selectedRecord.lab_tests && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">الفحوصات والتحاليل المطلوبة:</h4>
                  <div className="bg-blue-50/60 border border-blue-100 p-3 rounded-lg text-blue-900 text-sm">
                    {selectedRecord.lab_tests}
                  </div>
                </div>
              )}

              {selectedRecord.notes && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">ملاحظات الطبيب:</h4>
                  <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg text-gray-700 text-sm">
                    {selectedRecord.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
