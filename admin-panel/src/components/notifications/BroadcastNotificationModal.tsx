import { useState } from 'react';
import { Megaphone, X, Send, Users, UserCheck, ShieldCheck, Globe, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../api/client';

interface BroadcastNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BroadcastNotificationModal({ isOpen, onClose }: BroadcastNotificationModalProps) {
  const [targetGroup, setTargetGroup] = useState<'all' | 'patients' | 'doctors' | 'secretaries'>('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successResult, setSuccessResult] = useState<{ message: string; count: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setErrorMessage('يرجى ملء عنوان الإشعار ونصه بالكامل');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessResult(null);

    try {
      const res = await api.post('/notifications/broadcast', {
        target_group: targetGroup,
        title: title.trim(),
        message: message.trim(),
      });

      if (res.data?.success) {
        setSuccessResult({
          message: res.data.message || 'تم إرسال الإشعار بنجاح',
          count: res.data.count || 0,
        });
        setTitle('');
        setMessage('');
      } else {
        setErrorMessage(res.data?.message || 'تعذر إرسال الإشعار');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'خطأ في الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-600 to-teal-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Megaphone className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">إرسال إشعار عام 📢</h3>
              <p className="text-xs text-teal-100 font-medium mt-0.5">بث تنبيه مباشر للمرضى أو الأطباء أو السكرتيرات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSend} className="p-6 space-y-4">
          {successResult && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold">{successResult.message}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400/90 mt-0.5">تم استلام الإشعار بواسطة {successResult.count} مستخدم في التطبيقات.</p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-800 dark:text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <p className="font-medium">{errorMessage}</p>
            </div>
          )}

          {/* اختيار الفئة المستهدفة */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">الفئة المستهدفة للإشعار</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setTargetGroup('all')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  targetGroup === 'all'
                    ? 'bg-teal-50 dark:bg-teal-500/20 border-teal-500 text-teal-800 dark:text-teal-300 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Globe className="w-4 h-4 mb-1 text-teal-600 dark:text-teal-400" />
                <span>الجميع</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetGroup('patients')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  targetGroup === 'patients'
                    ? 'bg-teal-50 dark:bg-teal-500/20 border-teal-500 text-teal-800 dark:text-teal-300 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4 mb-1 text-blue-600 dark:text-blue-400" />
                <span>المرضى</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetGroup('doctors')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  targetGroup === 'doctors'
                    ? 'bg-teal-50 dark:bg-teal-500/20 border-teal-500 text-teal-800 dark:text-teal-300 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <UserCheck className="w-4 h-4 mb-1 text-emerald-600 dark:text-emerald-400" />
                <span>الأطباء</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetGroup('secretaries')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  targetGroup === 'secretaries'
                    ? 'bg-teal-50 dark:bg-teal-500/20 border-teal-500 text-teal-800 dark:text-teal-300 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 mb-1 text-purple-600 dark:text-purple-400" />
                <span>السكرتيرات</span>
              </button>
            </div>
          </div>

          {/* عنوان الإشعار */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">عنوان الإشعار</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تنبيه هام بشأن دوام العيادات أو عروض جديدة..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition placeholder:text-slate-400"
              required
            />
          </div>

          {/* نص الإشعار */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">نص ومحتوى الإشعار</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب رسالة التنبيه التي ستصل للمستخدمين فوراً في شريط التنبيهات وقائمة الإشعارات..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition resize-none placeholder:text-slate-400"
              required
            />
          </div>

          {/* أزرار الإجراء */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isLoading || !title.trim() || !message.trim()}
              className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري الإرسال...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال الإشعار الآن</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
