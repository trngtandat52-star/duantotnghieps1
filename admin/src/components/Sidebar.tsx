'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import { STORE_URL } from '@/lib/api';
import { Icons } from './Icons';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pendingOrdersCount?: number;
  totalProductsCount?: number;
  lowStockAlertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  pendingOrdersCount = 0,
  totalProductsCount = 0,
  lowStockAlertCount = 0,
}) => {
  const pathname = usePathname();

  const navGroups = [
    {
      title: 'Chức năng chính',
      items: [
        {
          name: 'Tổng quan',
          href: '/',
          icon: Icons.Dashboard,
        },
        {
          name: 'Đơn hàng',
          href: '/orders',
          icon: Icons.Orders,
          badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
          badgeColor: 'bg-[#d6a963] text-[#2b251f] font-bold shadow-sm',
        },
        {
          name: 'Sản phẩm',
          href: '/products',
          icon: Icons.Products,
          badge: totalProductsCount > 0 ? totalProductsCount : undefined,
          badgeColor: 'bg-[#f7efe5] text-[#72675f] border border-[#eedfca] font-bold',
        },
        {
          name: 'Quản lý tồn kho',
          href: '/inventory',
          icon: Icons.Inventory,
          badge: lowStockAlertCount > 0 ? lowStockAlertCount : undefined,
          badgeColor: 'bg-rose-500 text-white font-bold shadow-sm animate-pulse',
        },
        {
          name: 'Danh mục',
          href: '/categories',
          icon: Icons.Categories,
        },
      ],
    },
    {
      title: 'Tiếp thị & Khách hàng',
      items: [
        {
          name: 'Mã giảm giá',
          href: '/coupons',
          icon: Icons.Coupons,
        },
        {
          name: 'Bài viết / Tin tức',
          href: '/posts',
          icon: Icons.Posts,
        },
        {
          name: 'Người dùng & Quyền',
          href: '/users',
          icon: Icons.Users,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-white border-r border-[#eedfca] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-[#eedfca]">
          <NextLink href="/" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="Lunihome Logo"
              className="h-12 w-auto object-contain group-hover:scale-105 transition-transform"
            />
            <div>
              <div className="font-extrabold text-lg tracking-wider text-[#2b251f]">
                LUNIHOME
              </div>
              <div className="text-[10px] tracking-widest uppercase font-bold text-[#b58636]">
                Admin Panel
              </div>
            </div>
          </NextLink>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-[#72675f] hover:text-[#2b251f] hover:bg-[#f7efe5]"
          >
            <Icons.Close className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#8f8278]">
                {group.title}
              </div>
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <NextLink
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                      isActive
                        ? 'bg-[#f7efe5] text-[#b58636] font-bold border-l-4 border-[#d6a963]'
                        : 'text-[#72675f] hover:text-[#2b251f] hover:bg-[#f7efe5]'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-[#d6a963]' : 'text-[#8f8278] group-hover:text-[#2b251f]'
                      }`}
                    />
                    <span className="flex-1">{item.name}</span>
                    {item.badge !== undefined && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          item.badgeColor || 'bg-[#f7efe5] text-[#72675f]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NextLink>
                );
              })}
            </div>
          ))}

          {/* Hệ thống */}
          <div className="pt-2">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#8f8278]">
              Hệ thống
            </div>
            <a
              href={STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#b58636] bg-[#f7efe5] border border-[#eedfca] hover:bg-[#eedfca] transition-all"
            >
              <Icons.Store className="w-4 h-4 text-[#d6a963]" />
              <span className="flex-1">Xem Trang Bán Hàng</span>
              <Icons.ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#eedfca] bg-[#fbf7f1]">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-xs text-[#72675f]">
              API Server: <span className="text-emerald-700 font-mono font-bold">Online</span> (5000)
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
