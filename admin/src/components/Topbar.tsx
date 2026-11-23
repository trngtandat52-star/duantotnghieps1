'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { STORE_URL } from '@/lib/api';
import { Icons } from './Icons';

interface TopbarProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => Promise<void> | void;
  onOpenSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  title,
  subtitle,
  onRefresh,
  onOpenSidebar,
}) => {
  const { user, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi trang quản trị Lunihome?')) {
      logout();
    }
  };

  const userInitial = (user?.name ? user.name.charAt(0) : 'A').toUpperCase();

  return (
    <header className="sticky top-0 z-30 h-20 bg-white/95 backdrop-blur-md border-b border-[#eedfca] px-4 sm:px-8 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenSidebar}
          aria-label="Open Sidebar"
          className="lg:hidden p-2 rounded-xl text-[#72675f] hover:text-[#2b251f] hover:bg-[#f7efe5] transition-colors"
        >
          <Icons.Menu className="w-6 h-6" />
        </button>

        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#2b251f] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-[#72675f] hidden sm:block mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Actions & User Info */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Quay về trang web chính */}
        <a
          href={STORE_URL}
          target="_blank"
          rel="noreferrer"
          className="hidden md:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#b58636] bg-[#f7efe5] border border-[#eedfca] hover:bg-[#eedfca] transition-all"
        >
          <Icons.Store className="w-4 h-4 text-[#d6a963]" />
          <span>Về trang bán hàng</span>
        </a>

        {/* Nút Làm mới */}
        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold text-[#2b251f] bg-[#f7efe5] hover:bg-[#eedfca] border border-[#eedfca] transition-all disabled:opacity-50"
          >
            <Icons.Refresh className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#d6a963]' : 'text-[#72675f]'}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        )}

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-[#eedfca]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d6a963] to-[#f2d8a1] text-[#2b251f] font-bold flex items-center justify-center text-sm shadow-md shadow-[#d6a963]/20">
            {userInitial}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-[#2b251f] truncate max-w-[120px]">
              {user?.name || 'Admin'}
            </div>
            <div className="text-[10px] text-[#b58636] font-semibold">
              Quản trị viên
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="p-2 rounded-xl text-[#72675f] hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Icons.Logout className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
