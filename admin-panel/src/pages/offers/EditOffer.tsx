import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight, Save, Clock, Calendar, AlertCircle,
  Upload, FolderOpen, X, Image as ImageIcon, Trash2,
  CheckCircle,
} from 'lucide-react';
import {
  getOffer,
  updateOffer,
  uploadOfferImages,
  deleteOfferImage,
  type Offer,
  type OfferImage,
} from '../../api/endpoints/offers';
import { getDoctors, type Doctor } from '../../api/endpoints/doctors';
import { getClinics, type Clinic } from '../../api/endpoints/clinics';

type DurationUnit = 'hours' | 'days';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export default function EditOffer() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const offerId = Number(id);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [originalOffer, setOriginalOffer] = useState<Offer | null>(null);

  const [existingImages, setExistingImages] = useState<OfferImage[]>([]);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);

  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    doctor_id: '',
    clinic_id: '',
    original_price: '',
    discounted_price: '',
  });

  const [duration, setDuration] = useState('24');
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('hours');
  const [extendDuration, setExtendDuration] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [offerId]);

  useEffect(() => {
    return () => {
      newImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newImagePreviews]);

  // ⏱️ إخفاء الرسائل تلقائياً
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [offerData, doctorsData, clinicsData] = await Promise.all([
        getOffer(offerId),
        getDoctors(),
        getClinics(),
      ]);

      setOriginalOffer(offerData);
      setDoctors(doctorsData);
      setClinics(clinicsData);

      setExistingImages(offerData.images || []);

      setForm({
        title: offerData.title || '',
        description: offerData.description || '',
        doctor_id: offerData.doctor_id?.toString() || '',
        clinic_id: offerData.clinic_id?.toString() || '',
        original_price: offerData.original_price?.toString() || '',
        discounted_price: offerData.discounted_price?.toString() || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطأ في تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  const calcDiscount = () => {
    const orig = Number(form.original_price);
    const disc = Number(form.discounted_price);
    if (orig > 0 && disc > 0 && disc < orig) {
      return Math.round(((orig - disc) / orig) * 100);
    }
    return 0;
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;

    const newWarnings: string[] = [];
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!ALLOWED_TYPES.includes(file.type)) {
        newWarnings.push(`"${file.name}" — نوع غير مدعوم`);
        continue;
      }

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

    const totalCount = existingImages.length + newImages.length + validFiles.length;
    if (totalCount > MAX_IMAGES) {
      newWarnings.push(`الحد الأقصى ${MAX_IMAGES} صور — تم تجاهل الباقي`);
    }

    const remainingSlots = Math.max(0, MAX_IMAGES - existingImages.length - newImages.length);
    const finalNew = [...newImages, ...validFiles].slice(0, remainingSlots);

    setNewImages(finalNew);

    newImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    const newPreviews = finalNew.map((f) => URL.createObjectURL(f));
    setNewImagePreviews(newPreviews);

    setWarnings(newWarnings);

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const removeNewImage = (index: number) => {
    const newList = newImages.filter((_, i) => i !== index);
    setNewImages(newList);

    newImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    const newPreviews = newList.map((f) => URL.createObjectURL(f));
    setNewImagePreviews(newPreviews);
  };

  // ✅ حذف صورة موجودة — بتحديث فوري بدون alert
  const handleDeleteExistingImage = async (image: OfferImage) => {
    if (!confirm('هل أنت متأكد من حذف هذه الصورة؟')) return;

    setDeletingImageId(image.id);
    setError('');

    try {
      await deleteOfferImage(image.id);
      // ✅ تحديث الـ state فوراً
      setExistingImages((prev) => prev.filter((img) => img.id !== image.id));
      setSuccessMessage('✅ تم حذف الصورة');
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطأ في حذف الصورة');
    } finally {
      setDeletingImageId(null);
    }
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

    try {
      const data: any = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        doctor_id: form.doctor_id ? Number(form.doctor_id) : undefined,
        clinic_id: form.clinic_id ? Number(form.clinic_id) : undefined,
        original_price: form.original_price ? Number(form.original_price) : undefined,
        discounted_price: form.discounted_price ? Number(form.discounted_price) : undefined,
        discount_percent: calcDiscount() || undefined,
      };

      if (extendDuration) {
        const durationNum = Number(duration);
        if (!durationNum || durationNum <= 0) {
          setError('المدة يجب أن تكون أكبر من 0');
          setIsSubmitting(false);
          return;
        }

        if (durationUnit === 'hours') {
          data.duration_hours = durationNum;
        } else {
          data.duration_days = durationNum;
        }
      }

      await updateOffer(offerId, data);

      // رفع الصور الجديدة
      if (newImages.length > 0) {
        try {
          const result = await uploadOfferImages(offerId, newImages);

          if (result.failed && result.failed.length > 0) {
            const failedNames = result.failed.map((f) => f.name).join('، ');
            setSuccessMessage(`✅ تم تحديث العرض — لكن فشل رفع: ${failedNames}`);
          } else {
            setSuccessMessage('✅ تم تحديث العرض مع الصور بنجاح');
          }
        } catch (uploadErr: any) {
          setSuccessMessage(`✅ تم تحديث العرض — فشل رفع الصور: ${uploadErr.response?.data?.message || uploadErr.message}`);
        }
      } else {
        setSuccessMessage('✅ تم تحديث العرض بنجاح');
      }

      // ⏱️ انتظر ثانية ثم ارجع
      setTimeout(() => navigate('/offers'), 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطأ في التحديث');
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

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

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
    );
  }

  const discount = calcDiscount();
  const totalImages = existingImages.length + newImages.length;
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';

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
          <h1 className="text-2xl font-bold text-gray-900">تعديل العرض</h1>
          <p className="text-gray-500 mt-1">{originalOffer?.title}</p>
        </div>
      </div>

      {/* الرسائل */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* معلومات الحالة الحالية */}
      {originalOffer && (
        <div className={`rounded-xl p-4 border flex items-start gap-3 ${
          originalOffer.is_expired
            ? 'bg-orange-50 border-orange-200'
            : originalOffer.is_active
            ? 'bg-green-50 border-green-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            originalOffer.is_expired
              ? 'text-orange-600'
              : originalOffer.is_active
              ? 'text-green-600'
              : 'text-gray-600'
          }`} />
          <div className="text-sm">
            <p className="font-semibold">
              {originalOffer.is_expired
                ? '⚠️ هذا العرض منتهي'
                : originalOffer.is_active
                ? '✅ هذا العرض نشط'
                : '⏸️ هذا العرض معطّل'}
            </p>
            <p className="mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              ينتهي: {formatDate(originalOffer.end_date)}
            </p>
            <p className="mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              الوقت المتبقي: {getTimeRemaining(originalOffer.end_date)}
            </p>
          </div>
        </div>
      )}

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
            />
            <p className="text-xs text-gray-400 mt-1">{form.title.length}/200</p>
          </div>

          {/* الوصف */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">الوصف</label>
            <textarea
              maxLength={2000}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
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
            />
          </div>

          {/* نسبة الخصم */}
          {discount > 0 && (
            <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-semibold">
                نسبة الخصم: {discount}%
              </p>
            </div>
          )}

          {/* ============ إدارة الصور ============ */}
          <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-5 h-5 text-blue-600" />
              <p className="font-semibold text-blue-900">
                صور العرض ({totalImages}/{MAX_IMAGES})
              </p>
            </div>

            {/* الصور الحالية */}
            {existingImages.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  الصور الحالية ({existingImages.length}):
                </p>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {existingImages.map((img) => (
                    <div
                      key={img.id}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 border-blue-300 group ${
                        deletingImageId === img.id ? 'opacity-50' : ''
                      }`}
                    >
                      <img
                        src={`${baseUrl}${img.image_path}`}
                        alt="offer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      {deletingImageId === img.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingImage(img)}
                        disabled={deletingImageId === img.id}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
                        title="حذف"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* إضافة صور جديدة */}
            {totalImages < MAX_IMAGES && (
              <>
                <p className="text-sm font-medium text-blue-800 mb-2">
                  إضافة صور جديدة:
                </p>
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
              </>
            )}

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

            {/* معاينة الصور الجديدة */}
            {newImagePreviews.length > 0 && (
              <div>
                <p className="text-sm font-medium text-blue-800 mb-2">
                  صور جديدة ({newImagePreviews.length}) — لم تُرفع بعد:
                </p>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {newImagePreviews.map((url, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-300 group"
                    >
                      <img
                        src={url}
                        alt={`new ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded">
                        {(newImages[index].size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalImages === 0 && (
              <p className="text-xs text-blue-600 text-center py-4">
                لا توجد صور — يمكنك إضافة حتى {MAX_IMAGES} صور
              </p>
            )}
          </div>

          {/* ============ تعديل المدة ============ */}
          <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <p className="font-semibold text-blue-900">تعديل المدة (اختياري)</p>
            </div>

            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={extendDuration}
                onChange={(e) => setExtendDuration(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-blue-800">
                تمديد/تعديل مدة العرض
              </span>
            </label>

            {extendDuration && (
              <>
                <p className="text-sm text-blue-700 mb-4">
                  سيتم احتساب المدة الجديدة من الآن — ويستبدل وقت الانتهاء القديم.
                </p>

                <div className="flex gap-3">
                  <input
                    type="number"
                    min="1"
                    max={durationUnit === 'hours' ? 8760 : 365}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="flex-1 px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
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
              </>
            )}
          </div>

        </div>

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
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      </form>
    </div>
  );
}