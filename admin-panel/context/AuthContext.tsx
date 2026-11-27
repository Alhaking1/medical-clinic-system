import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AdminUser } from '../types';
import { login as apiLogin, logout as apiLogout, getCurrentUser } from '../api/endpoints/auth';

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('admin_token');
      const storedUser = localStorage.getItem('admin_user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          const userData = await getCurrentUser();
          setUser(userData as any);
          localStorage.setItem('admin_user', JSON.stringify(userData));
        } catch (error) {
          console.warn('التوكن غير صالح، جاري تسجيل الخروج');
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          setUser(null);
          setToken(null);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await apiLogin({ username, password });
    const { token: newToken, user: userData } = response;

    localStorage.setItem('admin_token', newToken);
    localStorage.setItem('admin_user', JSON.stringify(userData));

    setToken(newToken);
    setUser(userData as any);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
    } finally {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}