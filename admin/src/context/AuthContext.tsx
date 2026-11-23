'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, authStorage } from '@/lib/api';
import { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: () => {},
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = authStorage.getToken();
      const storedUser = authStorage.getUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);

        // Xác thực lại với backend
        try {
          const res = await api.auth.getMe();
          const verifiedUser = (res as any).user || res.data;
          if (res.success && verifiedUser) {
            if (verifiedUser.role !== 'admin') {
              authStorage.clearSession();
              setUser(null);
              setToken(null);
              router.push('/login?error=unauthorized');
              return;
            }
            setUser(verifiedUser);
            authStorage.setSession(storedToken, verifiedUser);
          } else if (res.message?.includes('Token') || res.message?.includes('hết hạn') || res.message?.includes('không hợp lệ')) {
            authStorage.clearSession();
            setUser(null);
            setToken(null);
            if (pathname !== '/login') {
              router.push('/login?expired=1');
            }
          } else {
            // Giữ lại session admin đã lưu
            if (storedUser.role === 'admin') {
              setUser(storedUser);
            }
          }
        } catch {
          if (storedUser.role === 'admin') {
            setUser(storedUser);
          } else {
            authStorage.clearSession();
            setUser(null);
            setToken(null);
            router.push('/login');
          }
        }
      } else {
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [pathname, router]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(email, pass);
      if (res.success && res.token && res.user) {
        if (res.user.role !== 'admin') {
          setIsLoading(false);
          return {
            success: false,
            message: 'Tài khoản của bạn không có quyền Quản trị viên (Admin)!',
          };
        }
        authStorage.setSession(res.token, res.user);
        setToken(res.token);
        setUser(res.user);
        setIsLoading(false);
        router.push('/');
        return { success: true };
      }
      setIsLoading(false);
      return {
        success: false,
        message: res.message || 'Email hoặc mật khẩu không chính xác!',
      };
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: false,
        message: err.message || 'Lỗi kết nối máy chủ.',
      };
    }
  };

  const logout = () => {
    authStorage.clearSession();
    setUser(null);
    setToken(null);
    router.push('/login');
  };

  const refreshUser = async () => {
    const res = await api.auth.getMe();
    if (res.success && res.data) {
      setUser(res.data);
      if (token) authStorage.setSession(token, res.data);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
