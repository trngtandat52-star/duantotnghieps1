'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { STORE_URL } from '@/lib/api';
import { Icons } from '@/components/Icons';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@lunihome.vn');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        showToast('Đăng nhập thành công! Chào mừng Quản trị viên Lunihome.', 'success');
        window.location.href = '/';
      } else {
        setError(result.message || 'Email hoặc mật khẩu không chính xác.');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống khi đăng nhập.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#fffaf3] relative overflow-hidden">
      {/* Background Decorative Lighting Warm Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#d6a963]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#f2d8a1]/30 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white border border-[#eedfca] rounded-2xl p-8 shadow-xl">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <img
              src="/logo.png"
              alt="Lunihome"
              className="h-20 w-auto mx-auto object-contain mb-3 drop-shadow-sm"
            />
            <h1 className="text-2xl font-extrabold text-[#2b251f] tracking-wider">
              LUNIHOME
            </h1>
            <p className="text-xs uppercase font-bold text-[#b58636] tracking-widest mt-1">
              Admin Portal
            </p>
            <p className="text-sm text-[#72675f] mt-2">
              Hệ thống quản trị cửa hàng đèn trang trí cao cấp
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
              <Icons.Alert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#2b251f] uppercase tracking-wider mb-2">
                Email Quản trị viên
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@lunihome.vn"
                className="w-full px-4 py-3 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] placeholder-[#a4998f] focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2b251f] uppercase tracking-wider mb-2">
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] placeholder-[#a4998f] focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20 transition-all text-sm"
              />
            </div>

            {/* Hint Box for Thesis Evaluators */}
            <div
              onClick={() => {
                setEmail('admin@lunihome.vn');
                setPassword('admin123');
              }}
              className="p-3 rounded-xl bg-[#f7efe5] border border-[#eedfca] text-xs text-[#72675f] flex items-center justify-between cursor-pointer hover:bg-[#eedfca]/60 transition-colors"
              title="Bấm để tự động điền tài khoản quản trị"
            >
              <span>Gợi ý tài khoản:</span>
              <span className="font-mono font-bold text-[#b58636]">admin@lunihome.vn / admin123</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#d6a963] to-[#b58636] hover:from-[#c5964e] hover:to-[#9f7228] text-[#2b251f] font-bold text-sm tracking-wide shadow-md shadow-[#d6a963]/20 transition-all transform active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Icons.Refresh className="w-4 h-4 animate-spin text-[#2b251f]" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập Quản trị</span>
                  <Icons.ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Back to store */}
          <div className="mt-8 text-center border-t border-[#eedfca] pt-6">
            <a
              href={STORE_URL}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#72675f] hover:text-[#b58636] transition-colors"
            >
              <Icons.Store className="w-3.5 h-3.5" />
              <span>Quay về trang web bán hàng Lunihome</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
