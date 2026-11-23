'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { Icons } from '@/components/Icons';
import { api } from '@/lib/api';

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Tổng quan hệ thống',
    subtitle: 'Thống kê kinh doanh và số liệu vận hành Lunihome',
  },
  '/orders': {
    title: 'Quản lý đơn hàng',
    subtitle: 'Theo dõi tiến trình xử lý, duyệt đơn và cập nhật trạng thái',
  },
  '/products': {
    title: 'Quản lý sản phẩm',
    subtitle: 'Danh sách đèn trang trí, cập nhật giá bán, hình ảnh và trạng thái',
  },
  '/inventory': {
    title: 'Quản lý tồn kho & Xuất nhập',
    subtitle: 'Kiểm soát hàng sẵn có, cảnh báo hết hàng và nhật ký xuất nhập kho',
  },
  '/categories': {
    title: 'Quản lý danh mục',
    subtitle: 'Phân loại các dòng sản phẩm đèn trang trí Lunihome',
  },
  '/coupons': {
    title: 'Quản lý mã giảm giá',
    subtitle: 'Thiết lập các chương trình khuyến mãi và voucher ưu đãi',
  },
  '/posts': {
    title: 'Quản lý bài viết / Tin tức',
    subtitle: 'Biên tập tin tức, cẩm nang thiết kế và bài trí ánh sáng',
  },
  '/users': {
    title: 'Quản lý người dùng & Quyền',
    subtitle: 'Danh sách tài khoản khách hàng và quản trị viên hệ thống',
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Badge statistics
  const [pendingOrders, setPendingOrders] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockAlert, setLowStockAlert] = useState(0);

  const fetchBadges = async () => {
    try {
      const statsRes = await api.admin.getStats();
      if (statsRes.success && statsRes.data) {
        setPendingOrders(statsRes.data.pendingOrders || 0);
        setTotalProducts(statsRes.data.totalProducts || 0);
        setLowStockAlert(statsRes.data.lowStock || 0);
      }
    } catch (e) {
      console.error('Lỗi tải số liệu badges:', e);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (!user || user.role !== 'admin') {
        router.push('/login');
      } else {
        fetchBadges();
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fffaf3] flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#d6a963] to-[#f2d8a1] text-[#2b251f] flex items-center justify-center font-bold text-xl shadow-xl shadow-[#d6a963]/30 animate-bounce">
          <Icons.Products className="w-7 h-7 text-[#2b251f]" />
        </div>
        <div className="text-sm font-semibold text-[#72675f] flex items-center gap-2">
          <Icons.Refresh className="w-4 h-4 animate-spin text-[#d6a963]" />
          <span>Đang xác thực quyền Quản trị...</span>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const currentMeta = routeTitles[pathname] || {
    title: 'Bảng Điều Khiển Quản Trị',
    subtitle: 'Lunihome Decorative Lighting',
  };

  return (
    <div className="min-h-screen bg-[#fffaf3] text-[#2b251f] flex">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingOrdersCount={pendingOrders}
        totalProductsCount={totalProducts}
        lowStockAlertCount={lowStockAlert}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0 bg-[#fffaf3]">
        <Topbar
          title={currentMeta.title}
          subtitle={currentMeta.subtitle}
          onRefresh={fetchBadges}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
