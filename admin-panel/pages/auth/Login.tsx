import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, User, Lock } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'خطأ في تسجيل الدخول. تحقق من اسم المستخدم أو كلمة المرور.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 relative">
      {/* Header section */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-teal-600 text-white mx-auto flex items-center justify-center text-xl shadow-xs mb-3">
          🩺
        </div>

        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          لوحة الإدارة
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          تسجيل الدخول للنظام
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-4 p-2.5 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 rounded-lg text-rose-700 dark:text-rose-300 text-xs font-semibold text-center">
          ⚠️ {error}
        </div>
      )}

      {/* Login form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            اسم المستخدم
          </label>
          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs font-medium placeholder-slate-400 focus:outline-none focus:border-teal-500 transition"
              placeholder="admin"
              required
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            كلمة المرور
          </label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs font-medium placeholder-slate-400 focus:outline-none focus:border-teal-500 transition"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        {/* Credentials shortcut info */}
        <div className="p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>الحساب:</span>
          <span className="font-mono text-teal-700 dark:text-teal-300 font-bold">admin / admin123456</span>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition duration-150 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
