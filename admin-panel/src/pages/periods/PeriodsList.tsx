import { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  X,
  Save,
  AlertCircle,
  RefreshCw,
  Calendar,
  Ban,
  CheckCircle,
  Users,
} from 'lucide-react';
import { getDoctors, type Doctor } from '../../api/endpoints/doctors';
import {
  getAdminDoctorPeriods,
  getDoctorSchedules,
  addSchedule,
  deleteSchedule,
  cancelPeriod,
  uncancelPeriod,
  deletePeriod,
  regeneratePeriods,
  type DoctorPeriod,
  type DoctorSchedule,
} from '../../api/endpoints/periods';

// 🆕 أسماء أيام الأسبوع
const DAYS_OF_WEEK = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function PeriodsList() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [periods, setPeriods] = useState<DoctorPeriod[]>([]);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [scheduleForm, setScheduleForm] = useState({
    day_of_week: 0,
    start_time: '09:00',
    end_time: '12:00',
    max_bookings: '10',
  });

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      loadPeriods();
      loadSchedules();
    }
  }, [selectedDoctor, selectedDate]);

  const loadDoctors = async () => {
    try {
      const data = await getDoctors();
      setDoctors(data);
      if (data.length > 0 && !selectedDoctor) {
        setSelectedDoctor(data[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadPeriods = async () => {
    if (!selectedDoctor) return;
    try {
      setIsLoading(true);
      const data = await getAdminDoctorPeriods(selectedDoctor, {
        date: selectedDate,
      });
      setPeriods(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchedules = async () => {
    if (!selectedDoctor) return;
    try {
      const data = await getDoctorSchedules(selectedDoctor);
      setSchedules(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedDoctor) return;

    if (scheduleForm.start_time >= scheduleForm.end_time) {
      setFormError('وقت البداية يجب أن يكون قبل وقت النهاية!');
      return;
    }

    try {
      const result = await addSchedule({
        doctor_id: selectedDoctor,
        day_of_week: scheduleForm.day_of_week,
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
        max_bookings: Number(scheduleForm.max_bookings),
      });

      alert(
        `✅ تم إضافة القالب\n` +
          `• تم توليد ${result.periods_created} فترة\n` +
          `• ${result.periods_skipped} فترة موجودة مسبقاً`
      );

      setShowScheduleForm(false);
      setFormError(null);
      loadSchedules();
      loadPeriods();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'خطأ في الإضافة');
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا القالب؟ (لن تُحذف الفترات المولدة)')) return;
    try {
      await deleteSchedule(id);
      loadSchedules();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في الحذف');
    }
  };

  const handleCancelPeriod = async (id: number) => {
    const notes = prompt('سبب الإلغاء (اختياري):', 'الدكتور في إجازة');
    if (notes === null) return; // المستخدم ألغى
    try {
      await cancelPeriod(id, notes || undefined);
      loadPeriods();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في الإلغاء');
    }
  };

  const handleUncancelPeriod = async (id: number) => {
    try {
      await uncancelPeriod(id);
      loadPeriods();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ');
    }
  };

  const handleDeletePeriod = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفترة؟')) return;
    try {
      await deletePeriod(id);
      loadPeriods();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في الحذف');
    }
  };

  const handleRegenerate = async () => {
    if (!selectedDoctor) return;
    if (
      !confirm(
        'سيتم إعادة توليد الفترات من القالب الأسبوعي.\n' +
          '⚠️ الفترات المحجوزة لن تُمس.\n' +
          'هل أنت متأكد؟'
      )
    )
      return;

    try {
      const result = await regeneratePeriods(selectedDoctor, 90);
      alert(
        `✅ تم إعادة التوليد\n` +
          `• ${result.created} فترة جديدة\n` +
          `• ${result.skipped} فترة موجودة`
      );
      loadPeriods();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ');
    }
  };

  const currentDoctor = doctors.find((d) => d.id === selectedDoctor);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الفترات الزمنية</h1>
          <p className="text-gray-500 mt-1">
            إدارة الفترات الأسبوعية للطبيب (يُدار عادةً من السكرتيرة)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerate}
            disabled={!selectedDoctor}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition disabled:opacity-50"
            title="إعادة توليد الفترات من القالب"
          >
            <RefreshCw className="w-5 h-5" />
            إعادة توليد
          </button>
          <button
            onClick={() => setShowScheduleForm(!showScheduleForm)}
            disabled={!selectedDoctor}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            إضافة قالب أسبوعي
          </button>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الطبيب</label>
            <select
              value={selectedDoctor || ''}
              onChange={(e) => setSelectedDoctor(Number(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">اختر الطبيب</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} - {d.specialty}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              التاريخ (لعرض الفترات)
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* نموذج إضافة قالب */}
      {showScheduleForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">إضافة قالب أسبوعي</h2>
            <button
              onClick={() => {
                setShowScheduleForm(false);
                setFormError(null);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}

          <form
            onSubmit={handleAddSchedule}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اليوم
              </label>
              <select
                value={scheduleForm.day_of_week}
                onChange={(e) =>
                  setScheduleForm({
                    ...scheduleForm,
                    day_of_week: Number(e.target.value),
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
              >
                {DAYS_OF_WEEK.map((day, index) => (
                  <option key={index} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                وقت البداية
              </label>
              <input
                type="time"
                value={scheduleForm.start_time}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, start_time: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                وقت النهاية
              </label>
              <input
                type="time"
                value={scheduleForm.end_time}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, end_time: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                حد أقصى للحجوزات
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={scheduleForm.max_bookings}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, max_bookings: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="md:col-span-4 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition"
              >
                <Save className="w-5 h-5" />
                إضافة وتوليد الفترات
              </button>
            </div>
          </form>
        </div>
      )}

      {/* القوالب الحالية */}
      {selectedDoctor && schedules.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            القالب الأسبوعي — {currentDoctor?.full_name}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg p-3"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {DAYS_OF_WEEK[schedule.day_of_week]}
                  </p>
                  <p className="text-sm text-gray-600">
                    {schedule.start_time} — {schedule.end_time}
                  </p>
                  <p className="text-xs text-gray-500">
                    حد أقصى: {schedule.max_bookings} حجز
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteSchedule(schedule.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="حذف القالب"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* فترات التاريخ المحدد */}
      {selectedDoctor && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">
                فترات {selectedDate}
              </h2>
              <p className="text-sm text-gray-500">{periods.length} فترة</p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
          ) : periods.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              لا توجد فترات لهذا اليوم. جرّب يوماً آخر أو أضف قالباً أسبوعياً.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {periods.map((period) => {
                const isFull = period.booked_count >= period.max_bookings;
                const progress = Math.min(
                  100,
                  (period.booked_count / period.max_bookings) * 100
                );

                return (
                  <div
                    key={period.id}
                    className={`relative rounded-xl p-4 border-2 ${
                      period.is_cancelled
                        ? 'bg-gray-100 border-gray-300'
                        : isFull
                        ? 'bg-red-50 border-red-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-600" />
                        <span className="font-bold text-gray-900">
                          {period.start_time} — {period.end_time}
                        </span>
                      </div>
                      {period.is_cancelled && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                          ملغاة
                        </span>
                      )}
                    </div>

                    {/* Progress */}
                    {!period.is_cancelled && (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Users className="w-4 h-4" />
                            <span>
                              {period.booked_count} / {period.max_bookings}
                            </span>
                          </div>
                          {isFull && (
                            <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">
                              مكتمل
                            </span>
                          )}
                        </div>

                        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                          <div
                            className={`h-2 rounded-full transition ${
                              isFull
                                ? 'bg-red-500'
                                : progress > 70
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </>
                    )}

                    {/* Notes */}
                    {period.notes && (
                      <p className="text-xs text-gray-500 mb-2 italic">
                        📝 {period.notes}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      {period.is_cancelled ? (
                        <button
                          onClick={() => handleUncancelPeriod(period.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-sm"
                        >
                          <CheckCircle className="w-4 h-4" />
                          تفعيل
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCancelPeriod(period.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 text-sm"
                        >
                          <Ban className="w-4 h-4" />
                          إلغاء
                        </button>
                      )}

                      {period.booked_count === 0 && (
                        <button
                          onClick={() => handleDeletePeriod(period.id)}
                          className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-sm"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}