import { useState, useEffect } from 'react';
import {
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  UserX,
  Save,
  Lock,
  RefreshCw,
  Search,
  Clock,
} from 'lucide-react';
import {
  getChatSettings,
  updateChatSettings,
  setDoctorChatBan,
  setSecretaryChatBan,
  type ChatSettings,
} from '../../api/endpoints/settings';
import { getDoctors, type Doctor } from '../../api/endpoints/doctors';
import { getSecretaries, type Secretary } from '../../api/endpoints/secretaries';

export default function ChatModerationSettings() {
  const [settings, setSettings] = useState<ChatSettings>({
    chat_enabled: true,
    chat_mode: 'all',
    retention_hours: 48,
  });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Search filter
  const [searchDoctor, setSearchDoctor] = useState('');
  const [searchSecretary, setSearchSecretary] = useState('');

  // Ban modal state
  const [banModal, setBanModal] = useState<{
    isOpen: boolean;
    type: 'doctor' | 'secretary';
    targetId: number;
    targetName: string;
    isBanning: boolean;
    reason: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [chatRes, docsRes, secsRes] = await Promise.all([
        getChatSettings().catch(() => ({ chat_enabled: true, chat_mode: 'all' as const, retention_hours: 48, retention_days: 2 })),
        getDoctors({ include_hidden: true }).catch(() => []),
        getSecretaries().catch(() => []),
      ]);
      setSettings({
        ...chatRes,
        retention_hours: chatRes.retention_hours || (chatRes.retention_days ? chatRes.retention_days * 24 : 48),
      });
      setDoctors(docsRes);
      setSecretaries(secsRes);
    } catch (err: any) {
      setErrorMessage('فشل في جلب إعدادات الرقابة والدردشة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');
      await updateChatSettings(settings);
      setSuccessMessage('تم حفظ إعدادات الدردشة والرقابة بنجاح ✅');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'فشل في حفظ إعدادات الدردشة');
    } finally {
      setIsSaving(false);
    }
  };

  const openBanModal = (
    type: 'doctor' | 'secretary',
    targetId: number,
    targetName: string,
    isCurrentlyBanned: boolean
  ) => {
    setBanModal({
      isOpen: true,
      type,
      targetId,
      targetName,
      isBanning: !isCurrentlyBanned,
      reason: !isCurrentlyBanned ? 'مخالفة سياسة التواصل خارج التطبيق وتبادل أرقام خارجية' : '',
    });
  };

  const confirmBanAction = async () => {
    if (!banModal) return;
    try {
      if (banModal.type === 'doctor') {
        await setDoctorChatBan(banModal.targetId, banModal.isBanning, banModal.reason);
        setDoctors((prev) =>
          prev.map((d) =>
            d.id === banModal.targetId
              ? {
                  ...d,
                  is_chat_banned: banModal.isBanning ? 1 : 0,
                  chat_ban_reason: banModal.isBanning ? banModal.reason : undefined,
                }
              : d
          )
        );
      } else {
        await setSecretaryChatBan(banModal.targetId, banModal.isBanning, banModal.reason);
        setSecretaries((prev) =>
          prev.map((s) =>
            s.id === banModal.targetId
              ? {
                  ...s,
                  is_chat_banned: banModal.isBanning ? 1 : 0,
                  chat_ban_reason: banModal.isBanning ? banModal.reason : undefined,
                }
              : s
          )
        );
      }
      setSuccessMessage(
        banModal.isBanning
          ? `تم حظر ${banModal.targetName} من الدردشة بنجاح 🚫`
          : `تم رفع الحظر عن ${banModal.targetName} بنجاح ✅`
      );
      setTimeout(() => setSuccessMessage(''), 4000);
      setBanModal(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'تعذر إتمام الإجراء');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-600" />
        جاري تحميل إعدادات الرقابة والمحادثات...
      </div>
    );
  }

  const filteredDoctors = doctors.filter(
    (d) =>
      d.full_name?.toLowerCase().includes(searchDoctor.toLowerCase()) ||
      d.specialty?.toLowerCase().includes(searchDoctor.toLowerCase()) ||
      d.clinic_name?.toLowerCase().includes(searchDoctor.toLowerCase())
  );

  const filteredSecretaries = secretaries.filter(
    (s) =>
      s.full_name?.toLowerCase().includes(searchSecretary.toLowerCase()) ||
      s.clinic_name?.toLowerCase().includes(searchSecretary.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* قسم التحكم العام بالمحادثات */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 p-2.5 rounded-xl">
              <MessageSquare className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">التحكم العام بالمحادثات داخل المنظومة</h2>
              <p className="text-sm text-gray-500">
                إدارة خدمة الدردشة الفورية، تحديد أطراف التواصل، والتحكم بالرقابة الذكية لمنع التواصل الخارجي
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-sm disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ إعدادات المنظومة
          </button>
        </div>

        {successMessage && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* مفتاح تشغيل/إيقاف الدردشة */}
          <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">تشغيل خدمة الدردشة المباشرة</h3>
                <p className="text-xs text-gray-500 mt-1">
                  عند التعطيل، تتوقف المراسلات بالكامل في جميع التطبيقات
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.chat_enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, chat_enabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
          </div>

          {/* نطاق وتوجيه المحادثات */}
          <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 mb-2">نطاق المحادثات المسموح بها</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white transition">
                <input
                  type="radio"
                  name="chat_mode"
                  value="all"
                  checked={settings.chat_mode === 'all'}
                  onChange={() => setSettings({ ...settings, chat_mode: 'all' })}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800">محادثات كاملة ومفتوحة</span>
                  <p className="text-xs text-gray-500">
                    يمكن للمريض مراسلة السكرتيرة، أو الطبيب (إذا سمح في إعداداته)
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white transition">
                <input
                  type="radio"
                  name="chat_mode"
                  value="patient_secretary_only"
                  checked={settings.chat_mode === 'patient_secretary_only'}
                  onChange={() =>
                    setSettings({ ...settings, chat_mode: 'patient_secretary_only' })
                  }
                  className="text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800">
                    محصورة بالسكرتيرة فقط (موصى به 🛡️)
                  </span>
                  <p className="text-xs text-gray-500">
                    توجيه استفسارات المرضى لسكرتيرة العيادة ومنع مراسلة الأطباء
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white transition">
                <input
                  type="radio"
                  name="chat_mode"
                  value="disabled"
                  checked={settings.chat_mode === 'disabled'}
                  onChange={() => setSettings({ ...settings, chat_mode: 'disabled' })}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800">إيقاف المحادثات مؤقتاً</span>
                  <p className="text-xs text-gray-500">منع إنشاء أو إرسال أي رسائل جديدة في النظام</p>
                </div>
              </label>
            </div>
          </div>

          {/* مؤقت اختفاء الرسائل */}
          <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-600" />
              مؤقت اختفاء الرسائل التلقائي
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              تختفي الرسائل القديمة تلقائياً من المحادثة لحفظ الخصوصية وتخفيف التخزين
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white transition">
                <input
                  type="radio"
                  name="retention_hours"
                  value="24"
                  checked={settings.retention_hours === 24}
                  onChange={() => setSettings({ ...settings, retention_hours: 24 })}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800">24 ساعة (يوم واحد)</span>
                  <p className="text-xs text-gray-500">حذف الرسائل بعد 24 ساعة من إرسالها</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white transition">
                <input
                  type="radio"
                  name="retention_hours"
                  value="48"
                  checked={settings.retention_hours === 48 || !settings.retention_hours}
                  onChange={() => setSettings({ ...settings, retention_hours: 48 })}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800">
                    48 ساعة (يومان — افتراضي وموصى به ⏳)
                  </span>
                  <p className="text-xs text-gray-500">حذف الرسائل بعد 48 ساعة لإعطاء مهلة للمريض والعيادة</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* بطاقة محرك الفلترة والرقابة الذكية (22 قسماً) */}
        <div className="mt-6 p-4 rounded-xl border border-teal-200 bg-teal-50/60">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-700 mt-0.5" />
            <div>
              <h4 className="font-semibold text-teal-900 text-sm">
                محرك الرقابة الذكي والفلترة الشاملة (Anti-Bypass Filter Engine) مفعل 🛡️
              </h4>
              <p className="text-xs text-teal-800 mt-1 leading-relaxed">
                يتم فحص وتطهير كافة الرسائل لحظياً قبل وصولها لقاعدة البيانات بموجب الـ 22 قسماً للمفردات المحظورة:
                حظر 7+ أرقام متتالية أو متفرقة (عربية، هندية، فارسية)، الأرقام المكتوبة بالحروف (عربي، إنجليزي، فرنسي،
                تركي، أوردو)، حظر تقطيع الحروف وأساليب التمويه الفراغي، حظر كلمات الحجز والدفع الخارجي، الروابط
                وحسابات التواصل الاجتماعي.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* قسم حظر أطباء محددين من المحادثات */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-600" />
              رقابة محادثات الأطباء (حظر / تفعيل المحادثة للطبيب)
            </h2>
            <p className="text-sm text-gray-500">
              في حال مخالفة الطبيب لسياسة المنصة، يمكن حظره من استلام أو إرسال الرسائل مع ظهور تنبيه للمريض
            </p>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="بحث عن طبيب..."
              value={searchDoctor}
              onChange={(e) => setSearchDoctor(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500">
                <th className="py-3 px-4">الطبيب</th>
                <th className="py-3 px-4">التخصص والعيادة</th>
                <th className="py-3 px-4">حالة المحادثات</th>
                <th className="py-3 px-4">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredDoctors.slice(0, 20).map((doc) => {
                const isBanned = (doc as any).is_chat_banned === 1;
                return (
                  <tr key={doc.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium text-gray-900">{doc.full_name}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {doc.specialty} • {doc.clinic_name || 'عيادة خاصة'}
                    </td>
                    <td className="py-3 px-4">
                      {isBanned ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          <Lock className="w-3 h-3" />
                          محظور من المحادثات ⚠️
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" />
                          محادثات مسموحة
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openBanModal('doctor', doc.id, doc.full_name, isBanned)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                          isBanned
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        }`}
                      >
                        {isBanned ? 'فك الحظر ✅' : 'حظر من الدردشة 🚫'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* قسم حظر السكرتارية من المحادثات */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-600" />
              رقابة محادثات السكرتارية (حظر / تفعيل المحادثة للسكرتيرة)
            </h2>
            <p className="text-sm text-gray-500">
              حظر سكرتيرة محددة في حال محاولة توجيه المرضى خارج التطبيق أو تسريب أرقام اتصال
            </p>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="بحث عن سكرتيرة..."
              value={searchSecretary}
              onChange={(e) => setSearchSecretary(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500">
                <th className="py-3 px-4">السكرتيرة</th>
                <th className="py-3 px-4">العيادة والهاتف</th>
                <th className="py-3 px-4">حالة المحادثات</th>
                <th className="py-3 px-4">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredSecretaries.slice(0, 20).map((sec) => {
                const isBanned = (sec as any).is_chat_banned === 1;
                return (
                  <tr key={sec.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium text-gray-900">{sec.full_name}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {sec.clinic_name || 'عيادة عامة'} • {sec.phone || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {isBanned ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          <Lock className="w-3 h-3" />
                          محظورة من المحادثات ⚠️
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" />
                          محادثات مسموحة
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openBanModal('secretary', sec.id, sec.full_name, isBanned)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                          isBanned
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        }`}
                      >
                        {isBanned ? 'فك الحظر ✅' : 'حظر من الدردشة 🚫'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة تأكيد وتحديد سبب الحظر */}
      {banModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-lg text-gray-900">
                {banModal.isBanning
                  ? `تأكيد حظر ${banModal.targetName} من المحادثات`
                  : `رفع الحظر عن ${banModal.targetName}`}
              </h3>
            </div>

            {banModal.isBanning ? (
              <>
                <p className="text-sm text-gray-600 leading-relaxed">
                  عند حظر هذا الحساب، لن يتمكن من إرسال أو استقبال رسائل جديدة، وسيظهر للمرضى الذين يحاولون مراسلته رسالة
                  تفيد بحظره لمخالفة سياسة المنصة.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">سبب الحظر (اختياري):</label>
                  <textarea
                    rows={3}
                    value={banModal.reason}
                    onChange={(e) => setBanModal({ ...banModal, reason: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    placeholder="سبب المخالفة..."
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-600 leading-relaxed">
                هل أنت متأكد من رغبتك في رفع الحظر وتمكين هذا الحساب من استخدام المحادثات المباشرة مجدداً؟
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setBanModal(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                إلغاء
              </button>
              <button
                onClick={confirmBanAction}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition shadow-sm ${
                  banModal.isBanning ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {banModal.isBanning ? 'تأكيد الحظر 🚫' : 'تأكيد رفع الحظر ✅'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
