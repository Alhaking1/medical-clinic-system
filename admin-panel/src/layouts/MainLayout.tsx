import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

export default function MainLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // في حالة التحميل
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-xs font-bold text-slate-400">جاري تشغيل لوحة تحكم طبيبك...</p>
        </div>
      </div>
    );
  }

  // في حالة عدم تسجيل الدخول
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // التخطيط الرئيسي الفاخر
  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden selection:bg-teal-500 selection:text-white transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 custom-scrollbar transition-colors duration-200">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
