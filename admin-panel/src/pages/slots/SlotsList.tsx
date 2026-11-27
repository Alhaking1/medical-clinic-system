import { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Lock,
  Unlock,
  X,
  Save,
  AlertCircle,
} from 'lucide-react';
import { getDoctors, type Doctor } from '../../api/endpoints/doctors';
import {
  getDoctorSlots,
  generateSlots,
  toggleSlot,
  deleteSlot,
  deleteDoctorDaySlots,
  type Slot,
} from '../../api/endpoints/slots';

// 🆕 الحصول على تاريخ اليوم بصيغة yyyy-MM-dd
function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function SlotsList() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  // 🆕 التاريخ الافتراضي = اليوم
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [genForm, setGenForm] = useState({
    start_time: '09:00',
    end_time: '12:00',
    duration: '20',
  });

  const todayString = getTodayString();

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      loadSlots();
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

  const loadSlots = async () => {
    if (!selectedDoctor) return;
    try {
      setIsLoading(true);
      const data = await getDoctorSlots(selectedDoctor, selectedDate);
      setSlots(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedDoctor) return;

    // 🆕 التحقق من التاريخ
    if (selectedDate < todayString) {
      setFormError('لا يمكن إنشاء مواعيد في تاريخ سابق!');
      return;
    }

    // 🆕 التحقق من الأوقات
    if (genForm.start_time >= genForm.end_time) {
      setFormError('وقت البداية يجب أن يكون قبل وقت النهاية!');
      return;
    }

    try {
      const result = await generateSlots({
        doctor_id: selectedDoctor,
        date: selectedDate,
        start_time: genForm.start_time,
        end_time: genForm.end_time,
        duration: Number(genForm.duration),
      });
      alert(`تم إنشاء ${result.created} موعد من أصل ${result.total}`);
      setShowGenerateForm(false);
      setFormError(null);
      loadSlots();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'خطأ في التوليد');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await toggleSlot(id);
      loadSlots();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في التعديل');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموعد؟')) return;
    try {
      await deleteSlot(id);
      loadSlots();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في الحذف');
    }
  };

  const handleDeleteDay = async () => {
    if (!selectedDoctor) return;
    if (!confirm('هل أنت متأكد من حذف كل المواعيد غير المحجوزة لهذا اليوم؟')) return;
    try {
      const result = await deleteDoctorDaySlots(selectedDoctor, selectedDate);
      alert(result.message);
      loadSlots();
    } catch (err) {
      alert('خطأ في الحذف');
    }
  };

  const currentDoctor = doctors.find((d) => d.id === selectedDoctor);

  // 🆕 هل التاريخ في الماضي؟
  const isPastDate = selectedDate < todayString;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المواعيد</h1>
          <p className="text-gray-500 mt-1">
            إدارة مواعيد الأطباء (تُدار عادةً من السكرتيرة)
          </p>
        </div>
        <button
          onClick={() => setShowGenerateForm(!showGenerateForm)}
          disabled={!selectedDoctor || isPastDate}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          title={isPastDate ? 'لا يمكن إضافة مواعيد في تاريخ سابق' : ''}
        >
          <Plus className="w-5 h-5" />
          توليد مواعيد
        </button>
      </div>

      {/* 🆕 تحذير للتاريخ السابق */}
      {isPastDate && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-900">
              أنت تستعرض تاريخاً سابقاً ({selectedDate})
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              لا يمكن إضافة أو تعديل المواعيد في الماضي. اختر تاريخ اليوم ({todayString}) أو تاريخاً مستقبلياً.
            </p>
          </div>
        </div>
      )}

      {/* الفلاتر */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الطبيب
            </label>
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
              التاريخ
            </label>
            <input
              type="date"
              value={selectedDate}
              // 🆕 منع اختيار تاريخ سابق
              min={todayString}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleDeleteDay}
              disabled={!selectedDoctor || isPastDate}
              className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              حذف غير المحجوزة
            </button>
          </div>
        </div>
      </div>

      {/* نموذج التوليد */}
      {showGenerateForm && !isPastDate && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">توليد مواعيد جديدة</h2>
            <button
              onClick={() => {
                setShowGenerateForm(false);
                setFormError(null);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 🆕 رسالة الخطأ */}
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}

          <form
            onSubmit={handleGenerate}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                وقت البداية
              </label>
              <input
                type="time"
                value={genForm.start_time}
                onChange={(e) =>
                  setGenForm({ ...genForm, start_time: e.target.value })
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
                value={genForm.end_time}
                onChange={(e) =>
                  setGenForm({ ...genForm, end_time: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                مدة الموعد (دقائق)
              </label>
              <select
                value={genForm.duration}
                onChange={(e) =>
                  setGenForm({ ...genForm, duration: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="10">10 دقائق</option>
                <option value="15">15 دقيقة</option>
                <option value="20">20 دقيقة</option>
                <option value="30">30 دقيقة</option>
                <option value="45">45 دقيقة</option>
              </select>
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition"
              >
                <Save className="w-5 h-5" />
                توليد
              </button>
            </div>
          </form>
        </div>
      )}

      {/* عرض المواعيد */}
      {!selectedDoctor ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-100">
          اختر طبيباً لعرض مواعيده
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">
                مواعيد {currentDoctor?.full_name}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedDate} · {slots.length} موعد
              </p>
            </div>
          </div>

          {slots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              لا توجد مواعيد. اضغط "توليد مواعيد" لإنشاء مواعيد جديدة.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className={`relative rounded-lg p-3 text-center border-2 transition ${
                    slot.is_booked
                      ? 'bg-green-50 border-green-300'
                      : slot.is_closed
                      ? 'bg-gray-100 border-gray-300'
                      : 'bg-white border-gray-200 hover:border-primary-400'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold text-gray-900">
                      {slot.start_time.slice(0, 5)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {slot.end_time.slice(0, 5)}
                  </p>

                  <div className="text-xs mb-2">
                    {slot.is_booked ? (
                      <span className="text-green-700 font-medium">محجوز</span>
                    ) : slot.is_closed ? (
                      <span className="text-gray-500">مغلق</span>
                    ) : (
                      <span className="text-blue-600">متاح</span>
                    )}
                  </div>

                  {!slot.is_booked && !isPastDate && (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleToggle(slot.id)}
                        className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                        title={slot.is_closed ? 'فتح' : 'إغلاق'}
                      >
                        {slot.is_closed ? (
                          <Unlock className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(slot.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="حذف"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}