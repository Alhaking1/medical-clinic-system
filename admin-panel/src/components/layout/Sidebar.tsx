import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Stethoscope,
  Building2,
  CalendarDays,
  UserCog,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Trash2,
  UserCheck,
  Tag,
  ClipboardList,
  FileText,
  ShieldCheck,
  HeartPulse,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRequestsStats } from '../../api/endpoints/registrations';
import { getWalletDepositRequests } from '../../api/endpoints/patients';

interface MenuItem {
  to: string;
  icon: any;
  label: string;
  iconBg: string;
  badgeKey?: 'pendingRequests' | 'pendingWallet';
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingWalletCount, setPendingWalletCount] = useState(0);

  useEffect(() => {
    loadPendingCount();
    loadWalletPendingCount();
    const interval = setInterval(() => {
      loadPendingCount();
      loadWalletPendingCount();
    }, 15000); // تحديث دوري كل 15 ثانية
    return () => clearInterval(interval);
  }, []);

  const loadPendingCount = async () => {
    try {
      const stats = await getRequestsStats();
      if (stats && typeof stats.pending === 'number') {
        setPendingRequestsCount(stats.pending);
      }
    } catch {
      // ignore
    }
  };

  const loadWalletPendingCount = async () => {
    try {
      const list = await getWalletDepositRequests('pending');
      if (Array.isArray(list)) {
        setPendingWalletCount(list.length);
      }
    } catch {
      // ignore
    }
  };

  const menuSections: MenuSection[] = [
    {
      title: 'الرئيسية',
      items: [
        {
          to: '/',
          icon: LayoutDashboard,
          label: 'لوحة التحكم',
          iconBg: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20',
        },
      ],
    },
    {
      title: 'إدارة الطلبات والتحقق',
      items: [
        {
          to: '/requests',
          icon: UserCheck,
          label: 'طلبات التسجيل',
          iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20',
          badgeKey: 'pendingRequests',
        },
        {
          to: '/recovery',
          icon: ShieldCheck,
          label: 'استعادة الحسابات',
          iconBg: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20',
        },
      ],
    },
    {
      title: 'الكادر والمنشآت',
      items: [
        {
          to: '/doctors',
          icon: Stethoscope,
          label: 'الأطباء والاستشاريون',
          iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
        },
        {
          to: '/clinics',
          icon: Building2,
          label: 'المستشفيات والعيادات',
          iconBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20',
        },
        {
          to: '/secretaries',
          icon: UserCog,
          label: 'طاقم السكرتارية',
          iconBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
        },
      ],
    },
    {
      title: 'العمليات والمواعيد',
      items: [
        {
          to: '/periods',
          icon: CalendarDays,
          label: 'الفترات وسعات الحجز',
          iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20',
        },
        {
          to: '/appointments',
          icon: ClipboardList,
          label: 'سجل الحجوزات',
          iconBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
        },
        {
          to: '/medical-records',
          icon: FileText,
          label: 'السجلات والملفات الطبية',
          iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20',
        },
        {
          to: '/patients',
          icon: Users,
          label: 'سجل المرضى',
          iconBg: 'bg-blue-600/15 text-blue-700 dark:text-blue-400 border border-blue-600/20',
        },
        {
          to: '/payments',
          icon: CreditCard,
          label: 'المدفوعات وشحن الرصيد',
          iconBg: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-600/20',
          badgeKey: 'pendingWallet',
        },
      ],
    },
    {
      title: 'التسويق والعروض',
      items: [
        {
          to: '/offers',
          icon: Tag,
          label: 'العروض والباقات المخفضة',
          iconBg: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20',
        },
      ],
    },
    {
      title: 'النظام والإدارة',
      items: [
        {
          to: '/reports',
          icon: BarChart3,
          label: 'التقارير والإحصائيات',
          iconBg: 'bg-purple-600/15 text-purple-700 dark:text-purple-400 border border-purple-600/20',
        },
        {
          to: '/settings',
          icon: Settings,
          label: 'إعدادات النظام والمدراء',
          iconBg: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/20',
        },
        {
          to: '/clear-data',
          icon: Trash2,
          label: 'محو البيانات التجريبية',
          iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20',
        },
      ],
    },
  ];

  return (
    <aside className="w-68 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col h-screen border-l border-slate-200/90 dark:border-slate-800 shadow-[1px_0_10px_rgba(0,0,0,0.03)] select-none transition-colors duration-200">
      {/* الشعار والهوية الطبية */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-600/25">
            <HeartPulse className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">طبيبك</span>
              <span className="text-[10px] font-black bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 px-1.5 py-0.5 rounded-md border border-teal-300/60 dark:border-teal-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">منظومة الإدارة الطبية</p>
          </div>
        </div>
      </div>

      {/* قائمة الروابط */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3.5 custom-scrollbar">
        {menuSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <div className="px-2 pt-1 pb-1 flex items-center gap-2">
              <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500">
                {section.title}
              </span>
              <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800/60" />
            </div>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-bold transition-all duration-150 group ${
                        isActive
                          ? 'bg-gradient-to-l from-teal-600 to-teal-700 text-white shadow-md shadow-teal-700/25 ring-1 ring-teal-500/30'
                          : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:text-teal-700 dark:hover:text-teal-300'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* حاوية الأيقونة الملونة الفاخرة */}
                        <div
                          className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-150 group-hover:scale-105 ${
                            isActive
                              ? 'bg-white text-teal-700 shadow-xs'
                              : item.iconBg
                          }`}
                        >
                          <item.icon className="w-4 h-4 stroke-[2.2]" />
                        </div>

                        <span className="flex-1 truncate tracking-tight">{item.label}</span>

                        {/* بادج طلبات التسجيل */}
                        {item.badgeKey === 'pendingRequests' && pendingRequestsCount > 0 && (
                          <span
                            className={`px-2 py-0.5 text-[11px] font-extrabold rounded-full transition shadow-xs ${
                              isActive
                                ? 'bg-white text-teal-800'
                                : 'bg-amber-500 text-white'
                            }`}
                          >
                            {pendingRequestsCount}
                          </span>
                        )}

                        {/* بادج طلبات شحن المحفظة */}
                        {item.badgeKey === 'pendingWallet' && pendingWalletCount > 0 && (
                          <span
                            className={`px-2 py-0.5 text-[11px] font-extrabold rounded-full transition shadow-xs ${
                              isActive
                                ? 'bg-white text-teal-800'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {pendingWalletCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* المستخدم الحالي وزر تسجيل الخروج */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 mb-2 shadow-2xs">
          <div className="w-8.5 h-8.5 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {user?.full_name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-extrabold text-slate-900 dark:text-white truncate">
              {user?.full_name || 'المدير العام'}
            </p>
            <p className="text-[11px] text-teal-600 dark:text-teal-400 font-bold truncate">
              مسؤول النظام
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg transition duration-150 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 stroke-[2.2]" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
