import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-200">
      <div className="w-full max-w-sm relative z-10">
        <Outlet />
      </div>
    </div>
  );
}
