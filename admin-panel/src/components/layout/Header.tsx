import { useEffect, useState } from 'react';
import {
  Bell,
  Search,
  ShieldAlert,
  Clock,
  Sparkles,
  PlusCircle,
  Database,
  Megaphone,
  Sun,
  Moon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRequestsStats } from '../../api/endpoints/registrations';
import BroadcastNotificationModal from '../notifications/BroadcastNotificationModal';
import { getWalletDepositRequests } from '../../api/endpoints/patients';
import UserAvatar from '../ui/UserAvatar';

export default function Header() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('admin_theme') as 'light' | 'dark') || 'light';
  });
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingWalletCount, setPendingWalletCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('admin_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    loadNotificationsCount();
    const notifTimer = setInterval(loadNotificationsCount, 15000);

    return () => {
      clearInterval(timer);
      clearInterval(notifTimer);
    };
  }, []);

  const updateDateTime = () => {
    const now = new Date();
    setCurrentTime(
      now.toLocaleTimeString('ar-YE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    );
    setCurrentDate(
      now.toLocaleDateString('ar-YE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    );
  };

  const loadNotificationsCount = async () => {
    try {
      const stats = await getRequestsStats();
      if (stats && typeof stats.pending === 'number') {
        setPendingCount(stats.pending);
      }
    } catch {
      // ignore
    }
    try {
      const list = await getWalletDepositRequests('pending');
      if (Array.isArray(list)) {
        setPendingWalletCount(list.length);
      }
    } catch {
      // ignore
    }
  };

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-5 py-2.5 sticky top-0 z-30 shadow-xs transition-colors duration-200">
      <div className="flex items-center justify-between gap-3">
        {/* البحث السريع الذكي */}
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن طبيب، مريض، عيادة..."
              className="w-full pr-9 pl-3 py-1.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* أدوات الهيدر والساعة والتنبيهات */}
        <div className="flex items-center gap-2">
          {/* التاريخ والوقت الحي بتوقيت اليمن */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>{currentDate}</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-teal-700 dark:text-teal-300 font-bold">{currentTime}</span>
          </div>

          {/* مبدل وضع النهار / وضع الليل */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            title={theme === 'dark' ? 'التحويل إلى وضع النهار ☀️' : 'التحويل إلى وضع الليل 🌙'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">النهار</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">الليل</span>
              </>
            )}
          </button>

          {/* حالة السيرفر وقاعدة البيانات */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/40 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>متصل</span>
          </div>

          {/* زر إضافة سريع */}
          <Link
            to="/doctors/add"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>إضافة طبيب</span>
          </Link>

          {/* 📢 زر إرسال إشعار عام */}
          <button
            onClick={() => setShowBroadcastModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            title="إرسال إشعار عام لجميع المرضى أو الأطباء أو السكرتيرات"
          >
            <Megaphone className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span className="hidden sm:inline">إشعار</span>
          </button>

          {/* جرس التنبيهات وقائمة الإشعارات المنبثقة */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition"
              title="مركز التنبيهات"
            >
              <Bell className="w-4 h-4" />
              {(pendingCount + pendingWalletCount) > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                  {pendingCount + pendingWalletCount}
                </span>
              )}
            </button>

            {/* نافذة التنبيهات المنسدلة */}
            {showNotifications && (
              <div className="absolute left-0 mt-2 w-80 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span>تنبيهات الإدارة والعمليات</span>
                  </h4>
                  <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/30">
                    {pendingCount + pendingWalletCount} بانتظار الإجراء
                  </span>
                </div>

                <div className="py-3 space-y-2">
                  {/* تنبيه طلبات شحن المحفظة */}
                  {pendingWalletCount > 0 && (
                    <Link
                      to="/payments"
                      onClick={() => setShowNotifications(false)}
                      className="block p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 transition"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-base flex-shrink-0 mt-0.5">💰</span>
                        <div>
                          <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                            <span>يوجد {pendingWalletCount} طلب شحن محفظة جديد</span>
                            <span className="bg-emerald-500 text-slate-950 text-[9px] px-1.5 py-0.2 rounded-full font-black">جديد</span>
                          </p>
                          <p className="text-[11px] text-emerald-400/80 mt-0.5">
                            انقر لمراجعة الحوالات واعتماد أو تعديل المبالغ لحسابات المرضى فوراً.
                          </p>
                        </div>
                      </div>
                    </Link>
                  )}

                  {/* تنبيه طلبات التسجيل */}
                  {pendingCount > 0 && (
                    <Link
                      to="/requests"
                      onClick={() => setShowNotifications(false)}
                      className="block p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 transition"
                    >
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-amber-300">
                            يوجد {pendingCount} طلب تسجيل بانتظار الاعتماد
                          </p>
                          <p className="text-[11px] text-amber-400/80 mt-0.5">
                            انقر لمراجعة واعتماد حسابات الأطباء والمرضى الجدد فوراً.
                          </p>
                        </div>
                      </div>
                    </Link>
                  )}

                  {pendingCount === 0 && pendingWalletCount === 0 && (
                    <div className="py-6 text-center text-slate-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                      <p className="text-xs font-semibold text-slate-300">لا توجد تنبيهات عاجلة حالياً</p>
                      <p className="text-[11px] text-slate-500 mt-1">كافة الطلبات والعمليات مراجعة بالكامل</p>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <Link
                    to="/requests"
                    onClick={() => setShowNotifications(false)}
                    className="text-teal-400 font-bold hover:underline"
                  >
                    عرض صفحة الطلبات الكاملة ←
                  </Link>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* المستخدم الحالي */}
          <div className="flex items-center gap-2.5 pr-2.5 border-r border-slate-800">
            <UserAvatar
              src={(user as any)?.avatar_url}
              name={user?.full_name || 'مدير المنصة'}
              className="w-8 h-8"
              iconClassName="w-4 h-4"
            />
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-white leading-tight">
                {user?.full_name || 'مدير المنصة'}
              </p>
              <p className="text-[10px] font-semibold text-teal-400">مسؤول النظام الرئيسي</p>
            </div>
          </div>
        </div>
      </div>
      <BroadcastNotificationModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
      />
    </header>
  );
}
