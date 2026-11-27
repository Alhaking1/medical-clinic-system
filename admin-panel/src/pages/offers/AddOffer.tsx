import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Save, Clock, Calendar, Upload, FolderOpen,
  X, Image as ImageIcon, AlertCircle,
} from 'lucide-react';
import { createOffer, uploadOfferImages } from '../../api/endpoints/offers';
import { getDoctors, type Doctor } from '../../api/endpoints/doctors';
import { getClinics, type Clinic } from '../../api/endpoints/clinics';

type DurationUnit = 'hours' | 'days';

// 🛡️ حدود الأمان
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;    // 5 MB
const MAX_IMAGES = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export default function AddOffer() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);

  // refs للأزرار
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    doctor_id: '',
    clinic_id: '',
    original_price: '',
    discounted_price: '',
  });

  // 🆕 الصور (قبل الرفع)
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // 🆕 المدة
  const [duration, setDuration] = useState('24');
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('hours');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    getDoctors().then(setDoctors).catch(console.error);
    getClinics().then(setClinics).catch(console.error);
  }, []);

  // تنظيف previews
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  // حساب نسبة الخصم
  const calcDiscount = () => {
    const orig = Number(form.original_price);
    const disc = Number(form.discounted_price);
    if (orig > 0 && disc > 0 && disc < orig) {
      return Math.round(((orig - disc) / orig) * 100);
    }
    return 0;
  };

  // 🛡️ معالجة اختيار الصور (مع فحص)
  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;

    const newWarnings: string[] = [];
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // فحص النوع
      if (!ALLOWED_TYPES.includes(file.type)) {
        newWarnings.push(`"${file.name}" — نوع غير مدعوم (فقط صور)`);
        continue;
      }

      // فحص الحجم
      if (file.size > MAX_IMAGE_SIZE) {
        newWarnings.push(`"${file.name}" — الحجم أكبر من 5 ميجا`);
        continue;
      }

      if (file.size === 0) {
        newWarnings.push(`"${file.name}" — ملف فارغ`);
        continue;
      }

      validFiles.push(file);
    }

    // دمج مع الصور الحالية (بحد أقصى 5)
    const combined = [...images, ...validFiles];
    if (combined.length > MAX_IMAGES) {
      newWarnings.push(`الحد الأقصى ${MAX_IMAGES} صور — تم تجاهل الباقي`);
    }

    const finalImages = combined.slice(0, MAX_IMAGES);
    setImages(finalImages);

    // تنظيف previews القديمة
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));

    // إنشاء previews جديدة
    const newPreviews = finalImages.map((f) => URL.createObjectURL(f));
    setImagePreviews(newPreviews);

    setWarnings(newWarnings);

    // إعادة تعيين الـ input
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  // حذف صورة قبل الرفع
  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);

    // تنظيف previews
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    const newPreviews = newImages.map((f) => URL.createObjectURL(f));
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!form.title.trim()) {
      setError('العنوان مطلوب');
      setIsSubmitting(false);
      return;
    }

    const durationNum = Number(duration);
    if (!durationNum || durationNum <= 0) {
      setError('المدة يجب أن تكون أكبر من 0');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. إنشاء العرض
      const data: any = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        doctor_id: form.doctor_id ? Number(form.doctor_id) : undefined,
        clinic_id: form.clinic_id ? Number(form.clinic_id) : undefined,
        original_price: form.original_price ? Number(form.original_price) : undefined,
        discounted_price: form.discounted_price ? Number(form.discounted_price) : undefined,
        discount_percent: calcDiscount() || undefined,
      };

      if (durationUnit === 'hours') {
        data.duration_hours = durationNum;
      } else {
        data.duration_days = durationNum;
      }

      const createdOffer = await createOffer(data);

      // 2. رفع الصور (إن وُجدت)
      if (images.length > 0) {
        try {
          const result = await uploadOfferImages(createdOffer.id, images);

          if (result.failed && result.failed.length > 0) {
            const failedNames = result.failed.map((f) => f.name).join('، ');
            alert(
              `✅ تم إنشاء العرض\n\n` +
              `⚠️ لكن فشل رفع بعض الصور:\n${failedNames}\n\n` +
              `يمكنك إعادة رفعها من صفحة التعديل.`
            );
          } else {
            alert('✅ تم إضافة العرض مع الصور بنجاح');
          }
        } catch (uploadErr: any) {
          alert(
            `✅ تم إنشاء العرض\n\n` +
            `⚠️ لكن فشل رفع الصور: ${uploadErr.response?.data?.message || uploadErr.message}\n\n` +
            `يمكنك إعادة رفعها من صفحة التعديل.`
          );
        }
      } else {
        alert('✅ تم إضافة العرض بنجاح');
      }

      navigate('/offers');
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطأ في إضافة العرض');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const discount = calcDiscount();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/offers')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          type="button"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إضافة عرض جديد</h1>
          <p className="text-gray-500 mt-1">املأ البيانات التالية</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* العنوان */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              عنوان العرض <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="خصم 30% على الكشف"
            />
            <p className="text-xs text-gray-400 mt-1">{form.title.length}/200</p>
          </div>

          {/* الوصف */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الوصف
            </label>
            <textarea
              maxLength={2000}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="تفاصيل العرض..."
            />
            <p className="text-xs text-gray-400 mt-1">{form.description.length}/2000</p>
          </div>

          {/* الطبيب */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الطبيب</label>
            <select
              value={form.doctor_id}
              onChange={(e) => updateField('doctor_id', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">بدون طبيب محدد</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} {d.specialty ? `- ${d.specialty}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* العيادة */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">العيادة</label>
            <select
              value={form.clinic_id}
              onChange={(e) => updateField('clinic_id', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">بدون عيادة محددة</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.governorate ? `- ${c.governorate}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* السعر الأصلي */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              السعر الأصلي (ريال)
            </label>
            <input
              type="number"
              min="0"
              max="999999999"
              value={form.original_price}
              onChange={(e) => updateField('original_price', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="5000"
            />
          </div>

          {/* السعر بعد الخصم */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              السعر بعد الخصم (ريال)
            </label>
            <input
              type="number"
              min="0"
              max="999999999"
              value={form.discounted_price}
              onChange={(e) => updateField('discounted_price', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="3500"
            />
          </div>

          {/* نسبة الخصم */}
          {discount > 0 && (
            <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-semibold">
                نسبة الخصم المحسوبة: {discount}%
              </p>
            </div>
          )}

          {/* ============ 🆕 صور العرض ============ */}
          <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-5 h-5 text-blue-600" />
              <p className="font-semibold text-blue-900">
                صور العرض (اختياري — بحد أقصى {MAX_IMAGES} صور، 5 ميجا لكل صورة)
              </p>
            </div>

            {/* أزرار الاختيار */}
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-blue-300 text-blue-700 px-4 py-2 rounded-lg transition"
              >
                <Upload className="w-4 h-4" />
                اختيار صور
              </button>

              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-blue-300 text-blue-700 px-4 py-2 rounded-lg transition"
              >
                <FolderOpen className="w-4 h-4" />
                اختيار مجلد كامل
              </button>
            </div>

            {/* inputs مخفية */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />

            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore
              webkitdirectory=""
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />

            {/* تحذيرات */}
            {warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                {warnings.map((w, i) => (
                  <p key={i} className="text-xs text-yellow-800 flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    {w}
                  </p>
                ))}
              </div>
            )}

            {/* معاينة الصور */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {imagePreviews.map((url, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-blue-200 group"
                  >
                    <img
                      src={url}
                      alt={`preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded">
                      {(images[index].size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                ))}
              </div>
            )}

            {imagePreviews.length === 0 && (
              <p className="text-xs text-blue-600 text-center py-4">
                لم تختر أي صور بعد
              </p>
            )}
          </div>

          {/* ============ المدة ============ */}
          <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <p className="font-semibold text-blue-900">
                مدة العرض <span className="text-red-500">*</span>
              </p>
            </div>
            <p className="text-sm text-blue-700 mb-4">
              بعد انتهاء المدة — سيختفي العرض من التطبيق تلقائياً،
              ويمكنك إعادة تفعيله لاحقاً.
            </p>

            <div className="flex gap-3">
              <input
                type="number"
                required
                min="1"
                max={durationUnit === 'hours' ? 8760 : 365}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="flex-1 px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="24"
              />

              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
                className="px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="hours">ساعة</option>
                <option value="days">يوم</option>
              </select>
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm text-blue-700">
              <Calendar className="w-4 h-4" />
              <span>
                ينتهي بعد: {duration || '0'} {durationUnit === 'hours' ? 'ساعة' : 'يوم'}
              </span>
            </div>
          </div>

        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/offers')}
            className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ العرض'}
          </button>
        </div>
      </form>
    </div>
  );
}