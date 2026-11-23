'use client';

import React, { useEffect, useState } from 'react';
import { api, formatCurrency, formatDate } from '@/lib/api';
import { Category, InventoryLog, InventoryStats, Product } from '@/lib/types';
import { Icons } from '@/components/Icons';
import { CustomSelect } from '@/components/CustomSelect';
import { useToast } from '@/context/ToastContext';

export default function InventoryPage() {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'logs'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortFilter, setSortFilter] = useState('stock_asc');

  // Local state chỉnh sửa số lượng tồn kho theo từng sản phẩm
  const [stockEdits, setStockEdits] = useState<{ [id: number]: number }>({});
  const [savingStockId, setSavingStockId] = useState<number | null>(null);

  const { showToast } = useToast();

  const loadInventoryData = async () => {
    setLoading(true);
    try {
      const [invRes, catRes] = await Promise.all([
        api.inventory.getOverview(),
        api.categories.getAll(),
      ]);

      if (invRes.success && invRes.products) {
        setProducts(invRes.products);
        if (invRes.stats) setStats(invRes.stats);
      }
      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
    } catch {
      showToast('Lỗi khi tải dữ liệu tồn kho', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await api.inventory.getLogs(undefined, 100);
      if (res.success && res.logs) {
        setLogs(res.logs);
      }
    } catch {
      showToast('Lỗi khi tải nhật ký xuất nhập kho', 'error');
    }
  };

  useEffect(() => {
    loadInventoryData();
    loadLogs();
  }, []);

  // Lấy giá trị tồn đang hiển thị (nếu đang sửa thì lấy từ stockEdits, nếu không thì lấy p.stock)
  const getEditingStock = (p: Product): number => {
    return stockEdits[p.id] !== undefined ? stockEdits[p.id] : p.stock;
  };

  // Tăng hoặc giảm số lượng
  const handleStepStock = (productId: number, delta: number, currentVal: number) => {
    const nextVal = Math.max(0, currentVal + delta);
    setStockEdits((prev) => ({ ...prev, [productId]: nextVal }));
  };

  // Nhập trực tiếp số lượng
  const handleInputChange = (productId: number, raw: string) => {
    const parsed = parseInt(raw, 10);
    const nextVal = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setStockEdits((prev) => ({ ...prev, [productId]: nextVal }));
  };

  // Lưu số lượng tồn mới vào Database
  const handleSaveStock = async (p: Product) => {
    const nextStock = getEditingStock(p);
    if (nextStock === p.stock) return;

    setSavingStockId(p.id);
    try {
      const res = await api.inventory.adjustStock(
        p.id,
        'adjust',
        nextStock,
        `Điều chỉnh nhanh tồn kho từ ${p.stock} thành ${nextStock}`
      );
      if (res.success) {
        showToast(`Đã cập nhật tồn kho cho "${p.name}" thành ${nextStock}!`, 'success');
        // Cập nhật state nội bộ
        setProducts((prev) =>
          prev.map((item) => (item.id === p.id ? { ...item, stock: nextStock } : item))
        );
        // Xóa khỏi danh sách tạm
        setStockEdits((prev) => {
          const clone = { ...prev };
          delete clone[p.id];
          return clone;
        });
        loadInventoryData();
        loadLogs();
      } else {
        showToast(res.message || 'Không thể cập nhật tồn kho', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi cập nhật tồn kho', 'error');
    } finally {
      setSavingStockId(null);
    }
  };

  // Filtered products
  const filteredProducts = products
    .filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory =
        !categoryFilter || String(p.category_id) === String(categoryFilter);

      let matchStatus = true;
      if (statusFilter === 'out_of_stock') {
        matchStatus = p.stock <= 0;
      } else if (statusFilter === 'low_stock') {
        matchStatus = p.stock > 0 && p.stock <= 10;
      } else if (statusFilter === 'abundant') {
        matchStatus = p.stock > 10;
      }

      return matchSearch && matchCategory && matchStatus;
    })
    .sort((a, b) => {
      if (sortFilter === 'stock_asc') return a.stock - b.stock;
      if (sortFilter === 'stock_desc') return b.stock - a.stock;
      if (sortFilter === 'name_asc') return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & KPI Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tổng mặt hàng */}
        <div className="bg-white border border-[#eedfca] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#72675f]">
              Mặt hàng trong kho
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Icons.Products className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-[#2b251f]">
              {stats?.totalProducts || products.length}
            </h3>
            <p className="text-[11px] text-[#72675f] mt-1">Tổng chủng loại mẫu mã</p>
          </div>
        </div>

        {/* Tổng số lượng chiếc */}
        <div className="bg-white border border-[#eedfca] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#72675f]">
              Tổng lượng tồn kho
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#b58636] flex items-center justify-center">
              <Icons.Inventory className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-[#2b251f]">
              {stats?.totalStock || 0}
            </h3>
            <p className="text-[11px] text-[#72675f] mt-1">Chiếc đèn sẵn sàng giao</p>
          </div>
        </div>

        {/* Cảnh báo thiếu hàng */}
        <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Cảnh báo hết hàng
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center animate-pulse">
              <Icons.Alert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-rose-600">
              {(stats?.outOfStockCount || 0) + (stats?.lowStockCount || 0)}
            </h3>
            <p className="text-[11px] text-rose-700/80 mt-1">
              {stats?.outOfStockCount || 0} hết hàng • {stats?.lowStockCount || 0} sắp hết
            </p>
          </div>
        </div>
      </div>

      {/* 2. Main Box with Sub-tabs */}
      <div className="bg-white border border-[#eedfca] rounded-2xl shadow-sm overflow-hidden">
        {/* Sub-tab Navigation & Actions */}
        <div className="px-6 py-4 border-b border-[#eedfca] bg-[#fbf7f1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSubTab('products')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'products'
                  ? 'bg-[#f7efe5] text-[#b58636] border border-[#eedfca]'
                  : 'text-[#72675f] hover:text-[#2b251f] hover:bg-[#f7efe5]'
              }`}
            >
              Danh sách tồn kho ({products.length})
            </button>
            <button
              onClick={() => {
                setActiveSubTab('logs');
                loadLogs();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'logs'
                  ? 'bg-[#f7efe5] text-[#b58636] border border-[#eedfca]'
                  : 'text-[#72675f] hover:text-[#2b251f] hover:bg-[#f7efe5]'
              }`}
            >
              Nhật ký xuất / nhập kho
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Đã bỏ nút Nhập kho nhanh, chỉ giữ nút Làm mới */}
            <button
              onClick={() => {
                loadInventoryData();
                loadLogs();
              }}
              className="px-3.5 py-2 rounded-xl bg-[#f7efe5] hover:bg-[#eedfca] text-[#2b251f] border border-[#eedfca] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Làm mới số liệu"
            >
              <Icons.Refresh className="w-4 h-4 text-[#b58636]" />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Products View */}
        {activeSubTab === 'products' && (
          <div className="p-6 space-y-4">
            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Icons.Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#72675f]" />
                <input
                  type="text"
                  placeholder="Tìm theo tên đèn, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] placeholder-[#a4998f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
              </div>

              <CustomSelect
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val)}
                placeholder="Tất cả danh mục"
                options={[
                  { value: '', label: 'Tất cả danh mục' },
                  ...categories.map((c) => ({ value: String(c.id), label: c.name })),
                ]}
              />

              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                placeholder="Tất cả tình trạng tồn"
                options={[
                  { value: '', label: 'Tất cả tình trạng tồn' },
                  { value: 'abundant', label: 'Tồn kho dồi dào (> 10)' },
                  { value: 'low_stock', label: 'Cảnh báo sắp hết (1 - 10)' },
                  { value: 'out_of_stock', label: 'Đã hết hàng (0)' },
                ]}
              />

              <CustomSelect
                value={sortFilter}
                onChange={(val) => setSortFilter(val)}
                placeholder="Sắp xếp tồn kho"
                options={[
                  { value: 'stock_asc', label: 'Tồn ít nhất trước (Cần nhập)' },
                  { value: 'stock_desc', label: 'Tồn nhiều nhất trước' },
                  { value: 'name_asc', label: 'Tên A ➔ Z' },
                ]}
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#fbf7f1] text-[#72675f] border-b border-[#eedfca] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Mã SKU</th>
                    <th className="py-3.5 px-3">Sản phẩm</th>
                    <th className="py-3.5 px-3">Giá bán</th>
                    <th className="py-3.5 px-4">Tồn hiện tại (Tăng / Giảm & Cập nhật)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2e7d7]">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-[#72675f]">
                        <Icons.Refresh className="w-5 h-5 animate-spin mx-auto text-[#d6a963] mb-2" />
                        <span>Đang tải số liệu tồn kho...</span>
                      </td>
                    </tr>
                  ) : filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => {
                      const editVal = getEditingStock(p);
                      const isDirty = editVal !== p.stock;
                      const isSaving = savingStockId === p.id;
                      const isOutOfStock = editVal <= 0;
                      const isLowStock = editVal > 0 && editVal <= 10;

                      return (
                        <tr key={p.id} className="hover:bg-[#fffdfa] transition-colors">
                          {/* Mã SKU */}
                          <td className="py-3.5 px-4 font-mono font-bold text-[#72675f] whitespace-nowrap">
                            {p.sku || `#${p.id}`}
                          </td>

                          {/* Sản phẩm */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={p.thumbnail || 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=100'}
                                alt={p.name}
                                className="w-11 h-11 rounded-xl object-cover bg-[#f7efe5] border border-[#eedfca] shrink-0"
                              />
                              <div>
                                <div className="font-bold text-[#2b251f] text-sm">
                                  {p.name}
                                </div>
                                <div className="text-[11px] text-[#72675f]">
                                  Mã SP: #{p.id}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Giá bán */}
                          <td className="py-3.5 px-3 font-semibold text-[#2b251f] whitespace-nowrap">
                            {formatCurrency(p.price)}
                          </td>

                          {/* Tồn hiện tại: Cho phép Tăng / Giảm và Cập nhật trực tiếp */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3 flex-wrap">
                              {/* Bộ nút - [Số lượng] + */}
                              <div className="inline-flex items-center border border-[#eedfca] rounded-xl bg-[#fffdfa] shadow-2xs overflow-hidden p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleStepStock(p.id, -1, editVal)}
                                  disabled={isSaving || editVal <= 0}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#72675f] hover:text-[#2b251f] hover:bg-[#f7efe5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base font-bold cursor-pointer select-none"
                                  title="Giảm 1"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  value={editVal}
                                  onChange={(e) => handleInputChange(p.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveStock(p);
                                    }
                                  }}
                                  disabled={isSaving}
                                  className="w-16 text-center text-xs font-mono font-bold text-[#2b251f] bg-transparent focus:outline-none focus:ring-1 focus:ring-[#d6a963] rounded py-1"
                                  title="Gõ số lượng hoặc bấm nút - / +"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleStepStock(p.id, 1, editVal)}
                                  disabled={isSaving}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#72675f] hover:text-[#2b251f] hover:bg-[#f7efe5] disabled:opacity-30 transition-colors text-base font-bold cursor-pointer select-none"
                                  title="Tăng 1"
                                >
                                  +
                                </button>
                              </div>

                              {/* Nút Cập nhật khi có sự thay đổi */}
                              {isDirty ? (
                                <button
                                  type="button"
                                  onClick={() => handleSaveStock(p)}
                                  disabled={isSaving}
                                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#d6a963] to-[#b58636] hover:from-[#c5964e] hover:to-[#9f7228] text-[#2b251f] font-bold text-xs shadow-md shadow-[#d6a963]/20 flex items-center gap-1.5 cursor-pointer transition-all animate-pulse"
                                  title="Bấm để lưu tồn kho vào Database"
                                >
                                  {isSaving ? (
                                    <Icons.Refresh className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Icons.Check className="w-3.5 h-3.5" />
                                  )}
                                  <span>Cập nhật</span>
                                </button>
                              ) : (
                                /* Trạng thái hiển thị tồn khi chưa chỉnh sửa */
                                <div>
                                  {isOutOfStock ? (
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                      Hết hàng
                                    </span>
                                  ) : isLowStock ? (
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                      Sắp hết
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Sẵn hàng
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-[#72675f]">
                        Không có sản phẩm nào phù hợp
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Logs View */}
        {activeSubTab === 'logs' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#fbf7f1] text-[#72675f] border-b border-[#eedfca] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Thời gian</th>
                    <th className="py-3 px-3">Sản phẩm</th>
                    <th className="py-3 px-3">Hành động</th>
                    <th className="py-3 px-3">Số lượng</th>
                    <th className="py-3 px-3">Tồn cũ ➔ Mới</th>
                    <th className="py-3 px-3">Ghi chú</th>
                    <th className="py-3 px-3">Người thực hiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2e7d7]">
                  {logs.length > 0 ? (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#fffdfa] transition-colors">
                        <td className="py-3 px-3 text-[#72675f] font-mono text-[11px]">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="py-3 px-3 text-[#2b251f] font-medium">
                          {log.product_name}
                        </td>
                        <td className="py-3 px-3">
                          {log.change_type === 'import' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Nhập kho
                            </span>
                          ) : log.change_type === 'export' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Xuất kho
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Điều chỉnh
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold">
                          {log.quantity_change > 0 ? (
                            <span className="text-emerald-700">+{log.quantity_change}</span>
                          ) : (
                            <span className="text-rose-600">{log.quantity_change}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-[#72675f]">
                          {log.old_stock} ➔ <span className="font-bold text-[#2b251f]">{log.new_stock}</span>
                        </td>
                        <td className="py-3 px-3 text-[#2b251f]">
                          {log.note || '---'}
                        </td>
                        <td className="py-3 px-3 text-[#72675f] text-[11px]">
                          {log.created_by || 'Admin'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-[#72675f]">
                        Chưa có lịch sử xuất nhập kho nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
