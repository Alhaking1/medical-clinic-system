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
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 px-5 py-2.5 sticky top-0 z-30 shadow-[0_1px_6px_rgba(0,0,0,0.02)] transition-colors duration-200 select-none">
      <div className="flex items-center justify-between gap-3">
        {/* البحث السريع الذكي */}
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن طبيب، مريض، عيادة..."
              className="w-full pr-9 pl-3 py-1.5 bg-slate-100/70 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* أدوات الهيدر والساعة والتنبيهات */}
        <div className="flex items-center gap-2">
          {/* التاريخ والوقت الحي بتوقيت اليمن */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 bg-slate-100/70 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>{currentDate}</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-teal-700 dark:text-teal-300 font-extrabold">{currentTime}</span>
          </div>

          {/* مبدل وضع النهار / وضع الليل */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold transition shadow-2xs cursor-pointer"
            title={theme === 'dark' ? 'التحويل إلى وضع النهار ☀️' : 'التحويل إلى وضع الليل 🌙'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">نهار</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">ليل</span>
              </>
            )}
          </button>

          {/* حالة السيرفر وقاعدة البيانات */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>متصل</span>
          </div>

          {/* زر إضافة سريع */}
          <Link
            to="/doctors/add"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-l from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-extrabold transition shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>إضافة طبيب</span>
          </Link>

          {/* 📢 زر إرسال إشعار عام */}
          <button
            onClick={() => setShowBroadcastModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 rounded-xl text-xs font-extrabold transition shadow-2xs cursor-pointer"
            title="إرسال إشعار عام لجميع المرضى أو الأطباء أو السكرتيرات"
          >
            <Megaphone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">إشعار</span>
          </button>

          {/* جرس التنبيهات وقائمة الإشعارات المنبثقة */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title="مركز التنبيهات"
            >
              <Bell className="w-4 h-4 stroke-[2.2]" />
              {(pendingCount + pendingWalletCount) > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[10px] font-black bg-rose-600 text-white rounded-full shadow-xs animate-pulse">
                  {pendingCount + pendingWalletCount}
                </span>
              )}
            </button>

            {/* نافذة التنبيهات المنسدلة */}
            {showNotifications && (
              <div className="absolute left-0 mt-2 w-84 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>تنبيهات الإدارة والعمليات</span>
                  </h4>
                  <span className="text-[10px] font-extrabold bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-500/30">
                    {pendingCount + pendingWalletCount} بانتظار الإجراء
                  </span>
                </div>

                <div className="py-3 space-y-2">
                  {/* تنبيه طلبات شحن المحفظة */}
                  {pendingWalletCount > 0 && (
                    <Link
                      to="/payments"
                      onClick={() => setShowNotifications(false)}
                      className="block p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100/70 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 transition"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-base flex-shrink-0 mt-0.5">💰</span>
                        <div>
                          <p className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            <span>يوجد {pendingWalletCount} طلب شحن محفظة جديد</span>
                            <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black">جديد</span>
                          </p>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-400/90 mt-0.5 font-medium">
                            انقر لمراجعة الحوالات واعتماد المبالغ لحسابات المرضى فوراً.
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
                      className="block p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100/70 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 transition"
                    >
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-extrabold text-amber-800 dark:text-amber-300">
                            يوجد {pendingCount} طلب تسجيل بانتظار الاعتماد
                          </p>
                          <p className="text-[11px] text-amber-700 dark:text-amber-400/90 mt-0.5 font-medium">
                            انقر لمراجعة واعتماد حسابات الأطباء والمرضى الجدد فوراً.
                          </p>
                        </div>
                      </div>
                    </Link>
                  )}

                  {pendingCount === 0 && pendingWalletCount === 0 && (
                    <div className="py-6 text-center text-slate-500 dark:text-slate-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">لا توجد تنبيهات عاجلة حالياً</p>
                      <p className="text-[11px] text-slate-500 mt-1">كافة الطلبات والعمليات مراجعة بالكامل</p>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <Link
                    to="/requests"
                    onClick={() => setShowNotifications(false)}
                    className="text-teal-700 dark:text-teal-400 font-extrabold hover:underline"
                  >
                    عرض صفحة الطلبات الكاملة ←
                  </Link>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-bold cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* المستخدم الحالي */}
          <div className="flex items-center gap-2.5 pr-2.5 border-r border-slate-200 dark:border-slate-800">
            <UserAvatar
              src={(user as any)?.avatar_url}
              name={user?.full_name || 'مدير المنصة'}
              className="w-8.5 h-8.5 ring-2 ring-teal-500/20"
              iconClassName="w-4 h-4"
            />
            <div className="hidden sm:block text-right">
              <p className="text-[12.5px] font-extrabold text-slate-900 dark:text-white leading-tight">
                {user?.full_name || 'مدير المنصة'}
              </p>
              <p className="text-[10px] font-bold text-teal-700 dark:text-teal-400">مسؤول النظام الرئيسي</p>
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
