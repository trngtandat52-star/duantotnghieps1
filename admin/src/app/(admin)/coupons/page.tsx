'use client';

import React, { useEffect, useState } from 'react';
import { api, formatCurrency } from '@/lib/api';
import { Coupon } from '@/lib/types';
import { Icons } from '@/components/Icons';
import { useToast } from '@/context/ToastContext';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'fixed' as 'fixed' | 'percent',
    discount_value: '',
    min_order_amount: '0',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const { showToast } = useToast();

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await api.coupons.getAll();
      if (res.success && res.data) {
        setCoupons(res.data);
      } else {
        showToast(res.message || 'Không thể tải mã giảm giá', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi tải mã giảm giá', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const openAddModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      discount_type: 'fixed',
      discount_value: '',
      min_order_amount: '0',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type || 'fixed',
      discount_value: String(coupon.discount_value),
      min_order_amount: String(coupon.min_order_amount || 0),
      is_active: Boolean(coupon.is_active),
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.discount_value) {
      showToast('Vui lòng nhập Mã code và Giá trị giảm.', 'warning');
      return;
    }

    setSaving(true);
    const payload = {
      code: formData.code.toUpperCase().trim(),
      discount_type: formData.discount_type,
      discount_value: Number(formData.discount_value),
      min_order_amount: Number(formData.min_order_amount) || 0,
      is_active: formData.is_active ? 1 : 0,
    };

    try {
      if (editingCoupon) {
        const res = await api.coupons.update(editingCoupon.id, payload);
        if (res.success) {
          showToast('Cập nhật mã giảm giá thành công!', 'success');
          setIsModalOpen(false);
          loadCoupons();
        } else {
          showToast(res.message || 'Lỗi khi cập nhật mã', 'error');
        }
      } else {
        const res = await api.coupons.create(payload);
        if (res.success) {
          showToast('Tạo mã giảm giá mới thành công!', 'success');
          setIsModalOpen(false);
          loadCoupons();
        } else {
          showToast(res.message || 'Lỗi khi tạo mã', 'error');
        }
      }
    } catch {
      showToast('Lỗi máy chủ khi lưu mã giảm giá', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mã "${coupon.code}"?`)) {
      return;
    }
    try {
      const res = await api.coupons.delete(coupon.id);
      if (res.success) {
        showToast('Đã xóa mã giảm giá thành công!', 'success');
        setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
      } else {
        showToast(res.message || 'Không thể xóa mã giảm giá', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi xóa mã', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#eedfca] rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#2b251f] flex items-center gap-2.5">
            <Icons.Coupons className="w-6 h-6 text-[#d6a963]" />
            <span>Quản lý mã giảm giá (Coupon)</span>
          </h2>
          <p className="text-xs text-[#72675f] mt-1">
            Thiết lập các chương trình voucher ưu đãi dành cho khách hàng
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d6a963] to-[#b58636] hover:from-[#c5964e] hover:to-[#9f7228] text-[#2b251f] font-bold text-xs shadow-md shadow-[#d6a963]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Icons.Plus className="w-4 h-4" />
          <span>Tạo mã giảm giá mới</span>
        </button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white border border-[#eedfca] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#fbf7f1] text-[#72675f] border-b border-[#eedfca] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Mã Voucher</th>
                <th className="py-3.5 px-3">Loại giảm</th>
                <th className="py-3.5 px-3">Mức giảm</th>
                <th className="py-3.5 px-3">Đơn tối thiểu</th>
                <th className="py-3.5 px-3">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2e7d7]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#72675f]">
                    <Icons.Refresh className="w-5 h-5 animate-spin mx-auto text-[#d6a963] mb-2" />
                    <span>Đang tải mã giảm giá...</span>
                  </td>
                </tr>
              ) : coupons.length > 0 ? (
                coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-[#fffdfa] transition-colors">
                    <td className="py-3 px-4">
                      <span className="px-3 py-1 rounded-lg font-mono font-bold text-sm bg-[#f7efe5] text-[#b58636] border border-[#eedfca] tracking-wider">
                        {c.code}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#2b251f]">
                      {c.discount_type === 'percent' ? 'Phần trăm (%)' : 'Số tiền cố định (VNĐ)'}
                    </td>
                    <td className="py-3 px-3 font-bold text-[#b58636]">
                      {c.discount_type === 'percent'
                        ? `${c.discount_value}%`
                        : formatCurrency(c.discount_value)}
                    </td>
                    <td className="py-3 px-3 font-mono text-[#72675f]">
                      {c.min_order_amount ? formatCurrency(c.min_order_amount) : 'Không giới hạn'}
                    </td>
                    <td className="py-3 px-3">
                      {c.is_active ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f7efe5] text-[#72675f] border border-[#eedfca]">
                          Tạm dừng
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          title="Sửa"
                          className="p-2 rounded-xl bg-[#f7efe5] hover:bg-[#eedfca] text-[#2b251f] border border-[#eedfca] transition-colors cursor-pointer"
                        >
                          <Icons.Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          title="Xóa"
                          className="p-2 rounded-xl bg-[#f7efe5] hover:bg-rose-50 text-[#72675f] hover:text-rose-600 border border-[#eedfca] hover:border-rose-200 transition-colors cursor-pointer"
                        >
                          <Icons.Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#72675f]">
                    Chưa có mã giảm giá nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-[#eedfca] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#eedfca]">
              <h3 className="text-base font-bold text-[#2b251f] flex items-center gap-2">
                <Icons.Coupons className="w-5 h-5 text-[#d6a963]" />
                <span>{editingCoupon ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá mới'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#72675f] hover:text-[#2b251f] hover:bg-[#f7efe5] cursor-pointer"
              >
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                  Mã Voucher (Code) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: LUNI100K hoặc TET2026"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] font-mono text-sm tracking-wider uppercase focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                    Loại giảm
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                  >
                    <option value="fixed">Số tiền cố định (VNĐ)</option>
                    <option value="percent">Phần trăm (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                    Giá trị giảm *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder={formData.discount_type === 'percent' ? '10 (tức 10%)' : '100000'}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                  Đơn hàng tối thiểu (VNĐ)
                </label>
                <input
                  type="number"
                  placeholder="0 nếu không yêu cầu"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#2b251f] p-3 rounded-xl bg-[#fbf7f1] border border-[#eedfca]">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded accent-[#d6a963]"
                  />
                  <span>Kích hoạt mã (cho phép áp dụng trong giỏ hàng)</span>
                </label>
              </div>

              <div className="pt-4 border-t border-[#eedfca] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-[#f7efe5] text-[#72675f] border border-[#eedfca] text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#d6a963] to-[#b58636] hover:from-[#c5964e] hover:to-[#9f7228] text-[#2b251f] font-bold text-xs shadow-md shadow-[#d6a963]/20 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Đang lưu...' : 'Lưu mã voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
