'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, formatCurrency, formatDate } from '@/lib/api';
import { Order } from '@/lib/types';
import { Icons } from '@/components/Icons';
import { CustomSelect } from '@/components/CustomSelect';
import { useToast } from '@/context/ToastContext';

function OrdersContent() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get('id');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Order for Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Status Form in Modal
  const [newOrderStatus, setNewOrderStatus] = useState<string>('pending');
  const [newPaymentStatus, setNewPaymentStatus] = useState<string>('unpaid');

  const { showToast } = useToast();

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.orders.getAll(statusFilter || undefined);
      if (res.success && res.data) {
        setOrders(res.data);

        // Mở modal nếu có ?id= trên URL
        if (initialOrderId) {
          const matched = res.data.find((o) => String(o.id) === String(initialOrderId));
          if (matched) {
            openDetailModal(matched);
          }
        }
      } else {
        showToast(res.message || 'Không thể tải danh sách đơn hàng', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi tải đơn hàng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const openDetailModal = async (order: Order) => {
    setSelectedOrder(order);
    setNewOrderStatus(order.order_status);
    setNewPaymentStatus(order.payment_status);
    setModalOpen(true);

    // Fetch full order with items if needed
    try {
      const res = await api.orders.getByCode(order.order_code || String(order.id));
      if (res.success && res.data) {
        setSelectedOrder(res.data);
      }
    } catch {
      // Giữ order hiện tại
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;
    setUpdating(true);
    try {
      // Nếu hoàn thành, tự động chuyển payment sang paid
      const finalPayment =
        newOrderStatus === 'completed' ? 'paid' : newPaymentStatus;

      const res = await api.orders.updateStatus(
        selectedOrder.id,
        newOrderStatus,
        finalPayment
      );
      if (res.success) {
        showToast('Cập nhật trạng thái đơn hàng thành công!', 'success');
        setModalOpen(false);
        loadOrders();
      } else {
        showToast(res.message || 'Không thể cập nhật trạng thái', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi cập nhật', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa đơn hàng #${order.order_code || order.id}? Hành động này không thể hoàn tác.`
      )
    ) {
      return;
    }
    try {
      const res = await api.admin.deleteOrder(order.id);
      if (res.success) {
        showToast('Đã xóa đơn hàng thành công!', 'success');
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
      } else {
        showToast(res.message || 'Không thể xóa đơn hàng', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi xóa đơn hàng', 'error');
    }
  };

  const getOrderStatusBadge = (st: string) => {
    switch (st) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Chờ xác nhận
          </span>
        );
      case 'processing':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
            Đang đóng gói
          </span>
        );
      case 'shipping':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            Đang giao hàng
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Hoàn thành
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            Đã hủy
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-[#f7efe5] text-[#72675f] border border-[#eedfca]">{st}</span>;
    }
  };

  const getPaymentStatusBadge = (st: string) => {
    switch (st) {
      case 'paid':
        return <span className="text-[11px] font-semibold text-emerald-700">✓ Đã thanh toán</span>;
      case 'unpaid':
        return <span className="text-[11px] font-semibold text-amber-800">Chưa thanh toán</span>;
      case 'refunded':
        return <span className="text-[11px] font-semibold text-rose-700">Đã hoàn tiền</span>;
      default:
        return <span className="text-[11px] text-[#72675f]">{st}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#eedfca] rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#2b251f] flex items-center gap-2.5">
            <Icons.Orders className="w-6 h-6 text-[#d6a963]" />
            <span>Quản lý đơn hàng</span>
          </h2>
          <p className="text-xs text-[#72675f] mt-1">
            Tổng cộng: <strong className="text-[#2b251f] font-mono">{orders.length}</strong> đơn hàng
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <CustomSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            placeholder="Tất cả trạng thái"
            className="w-56"
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              { value: 'pending', label: 'Chờ xác nhận (Pending)' },
              { value: 'processing', label: 'Đang đóng gói (Processing)' },
              { value: 'shipping', label: 'Đang giao hàng (Shipping)' },
              { value: 'completed', label: 'Đã hoàn thành (Completed)' },
              { value: 'cancelled', label: 'Đã hủy (Cancelled)' },
            ]}
          />

          <button
            onClick={loadOrders}
            className="p-2.5 rounded-xl bg-[#f7efe5] hover:bg-[#eedfca] text-[#2b251f] border border-[#eedfca] transition-colors cursor-pointer"
            title="Làm mới"
          >
            <Icons.Refresh className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#eedfca] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#fbf7f1] text-[#72675f] border-b border-[#eedfca] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Mã đơn</th>
                <th className="py-3.5 px-3">Khách hàng</th>
                <th className="py-3.5 px-3">Số điện thoại</th>
                <th className="py-3.5 px-3">Tổng tiền</th>
                <th className="py-3.5 px-3">Thanh toán</th>
                <th className="py-3.5 px-3">Trạng thái đơn</th>
                <th className="py-3.5 px-3">Ngày đặt</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2e7d7]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#72675f]">
                    <Icons.Refresh className="w-5 h-5 animate-spin mx-auto text-[#d6a963] mb-2" />
                    <span>Đang tải danh sách đơn hàng...</span>
                  </td>
                </tr>
              ) : orders.length > 0 ? (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#fffdfa] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#b58636]">
                      {o.order_code || `#${o.id}`}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-[#2b251f]">
                      {o.customer_name}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[#72675f]">
                      {o.customer_phone}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-[#b58636]">
                      {formatCurrency(o.total_amount)}
                    </td>
                    <td className="py-3.5 px-3">
                      <div>{getPaymentStatusBadge(o.payment_status)}</div>
                      <div className="text-[10px] text-[#72675f] uppercase">{o.payment_method}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      {getOrderStatusBadge(o.order_status)}
                    </td>
                    <td className="py-3.5 px-3 text-[#72675f] text-[11px]">
                      {formatDate(o.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetailModal(o)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#f7efe5] hover:bg-[#eedfca] text-[#b58636] border border-[#eedfca] font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Chi tiết
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(o)}
                          title="Xóa đơn hàng"
                          className="p-1.5 rounded-lg bg-[#f7efe5] hover:bg-rose-50 text-[#72675f] hover:text-rose-600 border border-[#eedfca] hover:border-rose-200 transition-colors cursor-pointer"
                        >
                          <Icons.Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#72675f]">
                    Không tìm thấy đơn hàng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Order Details & Status Workflow */}
      {modalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-white border border-[#eedfca] rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#eedfca] bg-[#fbf7f1] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#2b251f] flex items-center gap-2">
                  <Icons.Orders className="w-5 h-5 text-[#d6a963]" />
                  <span>Chi tiết đơn #{selectedOrder.order_code || selectedOrder.id}</span>
                </h3>
                <p className="text-xs text-[#72675f] mt-0.5">
                  Đặt lúc: {formatDate(selectedOrder.created_at)}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-[#72675f] hover:text-[#2b251f] hover:bg-[#f7efe5] cursor-pointer"
              >
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#fbf7f1] border border-[#eedfca] text-xs">
                <div>
                  <div className="text-[#72675f] mb-1">Khách hàng:</div>
                  <div className="text-[#2b251f] font-bold">{selectedOrder.customer_name}</div>
                  <div className="text-[#72675f] mt-1 font-mono">{selectedOrder.customer_phone}</div>
                  {selectedOrder.customer_email && (
                    <div className="text-[#72675f]">{selectedOrder.customer_email}</div>
                  )}
                </div>
                <div>
                  <div className="text-[#72675f] mb-1">Địa chỉ giao hàng:</div>
                  <div className="text-[#2b251f] font-medium">
                    {selectedOrder.shipping_address || 'Nhận tại showroom Lunihome'}
                  </div>
                  {selectedOrder.note && (
                    <div className="text-[#b58636] mt-2 bg-[#f7efe5] p-2 rounded-lg border border-[#eedfca]">
                      Ghi chú: {selectedOrder.note}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#72675f] mb-3">
                  Danh sách sản phẩm mua
                </h4>
                <div className="border border-[#eedfca] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#fbf7f1] text-[#72675f] border-b border-[#eedfca]">
                        <th className="py-2.5 px-3">Sản phẩm</th>
                        <th className="py-2.5 px-3">Đơn giá</th>
                        <th className="py-2.5 px-3">Số lượng</th>
                        <th className="py-2.5 px-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f2e7d7]">
                      {selectedOrder.items && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-[#fffdfa]">
                            <td className="py-2.5 px-3 text-[#2b251f] font-medium">
                              {item.product_name}
                            </td>
                            <td className="py-2.5 px-3 text-[#72675f] font-mono">
                              {formatCurrency(item.price)}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#b58636]">
                              x{item.quantity}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-[#2b251f]">
                              {formatCurrency(item.subtotal || item.price * item.quantity)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-[#72675f]">
                            Đơn hàng {formatCurrency(selectedOrder.total_amount)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Total Summary */}
                <div className="mt-3 flex justify-end">
                  <div className="w-64 space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#72675f]">
                      <span>Tạm tính:</span>
                      <span className="font-semibold text-[#2b251f]">{formatCurrency(selectedOrder.subtotal || selectedOrder.total_amount)}</span>
                    </div>
                    {selectedOrder.shipping_fee ? (
                      <div className="flex justify-between text-[#72675f]">
                        <span>Phí giao hàng:</span>
                        <span className="font-semibold text-[#2b251f]">+{formatCurrency(selectedOrder.shipping_fee)}</span>
                      </div>
                    ) : null}
                    {selectedOrder.discount_amount ? (
                      <div className="flex justify-between text-emerald-700">
                        <span>Giảm giá:</span>
                        <span className="font-semibold">-{formatCurrency(selectedOrder.discount_amount)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-sm font-extrabold text-[#b58636] pt-2 border-t border-[#eedfca]">
                      <span>Tổng thanh toán:</span>
                      <span>{formatCurrency(selectedOrder.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Workflow Update */}
              <div className="p-4 rounded-xl bg-[#fbf7f1] border border-[#eedfca] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2b251f] uppercase tracking-wider">
                    Tiến trình xử lý đơn hàng
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                    Quy trình chuẩn thương mại điện tử
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                      Trạng thái đơn hàng
                    </label>
                    <select
                      value={newOrderStatus}
                      onChange={(e) => {
                        const st = e.target.value;
                        setNewOrderStatus(st);
                        if (st === 'completed') setNewPaymentStatus('paid');
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                    >
                      <option value="pending">Chờ xác nhận (Pending)</option>
                      <option value="processing">Đang đóng gói (Processing)</option>
                      <option value="shipping">Đang giao hàng (Shipping)</option>
                      <option value="completed">Đã hoàn thành (Completed)</option>
                      <option value="cancelled">Đã hủy (Cancelled)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                      Trạng thái thanh toán
                    </label>
                    <select
                      value={newPaymentStatus}
                      onChange={(e) => setNewPaymentStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                    >
                      <option value="unpaid">Chưa thanh toán (Unpaid)</option>
                      <option value="paid">Đã thanh toán (Paid)</option>
                      <option value="refunded">Đã hoàn tiền (Refunded)</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#f7efe5] border border-[#eedfca] text-[11px] text-[#72675f] flex items-center gap-2">
                  <Icons.Check className="w-4 h-4 text-[#d6a963] shrink-0" />
                  <span>
                    Khi chuyển sang <strong className="text-[#2b251f]">Hoàn thành</strong>, hệ thống tự động đồng bộ sang <strong className="text-[#2b251f]">Đã thanh toán</strong> và cộng doanh thu.
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#eedfca] bg-[#fbf7f1] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#f7efe5] text-[#72675f] border border-[#eedfca] text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={updating}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#d6a963] to-[#b58636] hover:from-[#c5964e] hover:to-[#9f7228] text-[#2b251f] font-bold text-xs shadow-md shadow-[#d6a963]/20 disabled:opacity-50 cursor-pointer"
              >
                {updating ? 'Đang cập nhật...' : 'Cập nhật trạng thái'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] text-[#72675f] text-xs">
          <Icons.Refresh className="w-4 h-4 animate-spin text-[#d6a963] mr-2" />
          <span>Đang tải đơn hàng...</span>
        </div>
      }
    >
      <OrdersContent />
    </React.Suspense>
  );
}
