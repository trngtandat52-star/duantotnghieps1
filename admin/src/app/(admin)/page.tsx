'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { api, formatCurrency, formatDate } from '@/lib/api';
import { DashboardStats, Order } from '@/lib/types';
import { Icons } from '@/components/Icons';
import { useToast } from '@/context/ToastContext';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getStats();
      if (res.success && res.data) {
        setStats(res.data);
      } else {
        showToast(res.message || 'Không thể tải thống kê', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi tải số liệu tổng quan', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">Chờ duyệt</span>;
      case 'processing':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">Đang đóng gói</span>;
      case 'shipping':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">Đang giao hàng</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">Hoàn thành</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">Đã hủy</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f7efe5] text-[#72675f] border border-[#eedfca]">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-3 text-[#72675f] text-sm">
          <Icons.Refresh className="w-5 h-5 animate-spin text-[#d6a963]" />
          <span>Đang tải số liệu bảng điều khiển...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Doanh thu */}
        <div className="bg-white border border-[#eedfca] rounded-2xl p-6 relative overflow-hidden group hover:border-[#d6a963] transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#72675f]">
              Tổng doanh thu
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#f7efe5] text-[#b58636] flex items-center justify-center">
              <Icons.Revenue className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-[#2b251f] tracking-tight">
              {formatCurrency(stats?.totalRevenue || 0)}
            </h3>
            <p className="text-xs text-emerald-700 flex items-center gap-1.5 mt-2">
              <Icons.Check className="w-3.5 h-3.5" />
              <span>Đơn hàng đã hoàn tất & thanh toán</span>
            </p>
          </div>
        </div>

        {/* Đơn hàng */}
        <div className="bg-white border border-[#eedfca] rounded-2xl p-6 relative overflow-hidden group hover:border-[#d6a963] transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#72675f]">
              Tổng đơn hàng
            </span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <Icons.Orders className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-[#2b251f] tracking-tight">
              {stats?.totalOrders || 0}
            </h3>
            <p className="text-xs text-amber-800 flex items-center gap-1.5 mt-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>{stats?.pendingOrders || 0} đơn đang chờ xác nhận</span>
            </p>
          </div>
        </div>

        {/* Sản phẩm */}
        <div className="bg-white border border-[#eedfca] rounded-2xl p-6 relative overflow-hidden group hover:border-[#d6a963] transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#72675f]">
              Mặt hàng đèn
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Icons.Products className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-[#2b251f] tracking-tight">
              {stats?.totalProducts || 0}
            </h3>
            <p className="text-xs text-[#72675f] flex items-center gap-1.5 mt-2">
              {Number(stats?.lowStock || 0) > 0 ? (
                <span className="text-rose-600 font-semibold">
                  ⚠️ {stats?.lowStock} mẫu tồn ít (≤ 5)
                </span>
              ) : (
                <span className="text-emerald-700">Tồn kho ổn định</span>
              )}
            </p>
          </div>
        </div>

        {/* Khách hàng */}
        <div className="bg-white border border-[#eedfca] rounded-2xl p-6 relative overflow-hidden group hover:border-[#d6a963] transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#72675f]">
              Khách hàng đăng ký
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Icons.Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-extrabold text-[#2b251f] tracking-tight">
              {stats?.totalUsers || 0}
            </h3>
            <p className="text-xs text-emerald-700 flex items-center gap-1.5 mt-2">
              <span className="font-medium">Tài khoản thành viên</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left (2 Cols): Đơn hàng mới nhất */}
        <div className="lg:col-span-2 bg-white border border-[#eedfca] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-5 border-b border-[#eedfca]">
            <div className="flex items-center gap-2.5">
              <Icons.Orders className="w-5 h-5 text-[#d6a963]" />
              <h2 className="text-base font-bold text-[#2b251f]">Đơn hàng mới nhất</h2>
            </div>
            <NextLink
              href="/orders"
              className="text-xs font-semibold text-[#b58636] hover:text-[#d6a963] flex items-center gap-1 transition-colors"
            >
              <span>Xem tất cả</span>
              <Icons.ArrowRight className="w-3.5 h-3.5" />
            </NextLink>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#72675f] border-b border-[#eedfca] font-bold uppercase tracking-wider bg-[#fbf7f1]">
                  <th className="py-3 px-3">Mã đơn</th>
                  <th className="py-3 px-3">Khách hàng</th>
                  <th className="py-3 px-3">Tổng tiền</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3">Thời gian</th>
                  <th className="py-3 px-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2e7d7]">
                {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                  stats.recentOrders.map((order: Order) => (
                    <tr key={order.id} className="hover:bg-[#fffdfa] transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#b58636]">
                        {order.order_code || `#${order.id}`}
                      </td>
                      <td className="py-3 px-3 text-[#2b251f] font-medium">
                        <div>{order.customer_name}</div>
                        <div className="text-[10px] text-[#72675f]">{order.customer_phone}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#2b251f]">
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td className="py-3 px-3">
                        {getStatusBadge(order.order_status)}
                      </td>
                      <td className="py-3 px-3 text-[#72675f] text-[11px]">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <NextLink
                          href={`/orders?id=${order.id}`}
                          className="px-2.5 py-1 rounded-lg bg-[#f7efe5] hover:bg-[#eedfca] text-[#2b251f] border border-[#eedfca] font-semibold transition-all inline-block"
                        >
                          Xem
                        </NextLink>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#72675f]">
                      Chưa có đơn hàng nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right (1 Col): Breakdown & Thao tác nhanh */}
        <div className="space-y-6">
          {/* Status Breakdown */}
          <div className="bg-white border border-[#eedfca] rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#2b251f] mb-4 flex items-center gap-2">
              <Icons.Dashboard className="w-4 h-4 text-[#d6a963]" />
              <span>Phân loại tình trạng đơn</span>
            </h2>
            <div className="space-y-3">
              {[
                { key: 'pending', label: 'Chờ xác nhận', color: 'bg-amber-400' },
                { key: 'processing', label: 'Đang xử lý / Đóng gói', color: 'bg-sky-400' },
                { key: 'shipping', label: 'Đang vận chuyển', color: 'bg-purple-400' },
                { key: 'completed', label: 'Đã hoàn tất', color: 'bg-emerald-400' },
                { key: 'cancelled', label: 'Đã hủy đơn', color: 'bg-rose-400' },
              ].map((item) => {
                const count =
                  stats?.statusBreakdown?.find((s) => s.order_status === item.key)
                    ?.count || 0;
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#fbf7f1] border border-[#eedfca]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <span className="text-xs text-[#2b251f] font-medium">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#2b251f] font-mono">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-[#eedfca] rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#2b251f] mb-4 flex items-center gap-2">
              <span>⚡</span>
              <span>Thao tác nhanh</span>
            </h2>
            <div className="space-y-2.5">
              <NextLink
                href="/products"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#f7efe5] border border-[#eedfca] text-[#b58636] text-xs font-bold hover:bg-[#eedfca] transition-all"
              >
                <div className="flex items-center gap-2">
                  <Icons.Plus className="w-4 h-4" />
                  <span>Thêm sản phẩm mới</span>
                </div>
                <Icons.ArrowRight className="w-3.5 h-3.5" />
              </NextLink>

              <NextLink
                href="/coupons"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white hover:bg-[#f7efe5] text-[#2b251f] text-xs font-semibold transition-all border border-[#eedfca]"
              >
                <div className="flex items-center gap-2">
                  <Icons.Coupons className="w-4 h-4 text-[#d6a963]" />
                  <span>Tạo mã giảm giá mới</span>
                </div>
                <Icons.ArrowRight className="w-3.5 h-3.5" />
              </NextLink>

              <NextLink
                href="/posts"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white hover:bg-[#f7efe5] text-[#2b251f] text-xs font-semibold transition-all border border-[#eedfca]"
              >
                <div className="flex items-center gap-2">
                  <Icons.Posts className="w-4 h-4 text-purple-600" />
                  <span>Đăng bài viết mới</span>
                </div>
                <Icons.ArrowRight className="w-3.5 h-3.5" />
              </NextLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
