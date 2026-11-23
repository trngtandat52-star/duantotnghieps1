'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, formatCurrency } from '@/lib/api';
import { Category, Product } from '@/lib/types';
import { Icons } from '@/components/Icons';
import { CustomSelect } from '@/components/CustomSelect';
import { useToast } from '@/context/ToastContext';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortFilter, setSortFilter] = useState('newest');

  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.products.getAll({ limit: 500, status: 'all', include_hidden: true }),
        api.categories.getAll(),
      ]);

      if (prodRes.success && prodRes.data) {
        setProducts(prodRes.data);
      }
      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
    } catch {
      showToast('Lỗi khi tải dữ liệu sản phẩm', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (p: Product) => {
    const newStatus = !p.is_active;
    try {
      const res = await api.products.toggleStatus(p.id, newStatus);
      if (res.success) {
        showToast(
          newStatus ? 'Đã cho phép hiển thị sản phẩm trên web!' : 'Đã ẩn sản phẩm khỏi khách mua!',
          'success'
        );
        setProducts((prev) =>
          prev.map((item) =>
            item.id === p.id ? { ...item, is_active: newStatus } : item
          )
        );
      } else {
        showToast(res.message || 'Không thể đổi trạng thái', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi thay đổi trạng thái', 'error');
    }
  };

  // Filtered List
  const filteredProducts = products
    .filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory =
        !categoryFilter || String(p.category_id) === String(categoryFilter);
      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? Boolean(p.is_active)
          : !p.is_active;
      return matchSearch && matchCategory && matchStatus;
    })
    .sort((a, b) => {
      if (sortFilter === 'price_asc') return Number(a.price) - Number(b.price);
      if (sortFilter === 'price_desc') return Number(b.price) - Number(a.price);
      return Number(b.id) - Number(a.id);
    });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#eedfca] rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#2b251f] flex items-center gap-2.5">
            <Icons.Products className="w-6 h-6 text-[#d6a963]" />
            <span>Quản lý sản phẩm đèn</span>
          </h2>
          <p className="text-xs text-[#72675f] mt-1">
            Tổng cộng: <strong className="text-[#2b251f] font-mono">{products.length}</strong> mẫu sản phẩm trong hệ thống
            <span className="hidden sm:inline text-[#a4998f] ml-2">• Quy định: Chỉ ẩn và sửa thông tin, không xóa sản phẩm</span>
          </p>
        </div>

        <Link
          href="/products/create"
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d6a963] to-[#b58636] hover:from-[#c5964e] hover:to-[#9f7228] text-[#2b251f] font-bold text-xs shadow-md shadow-[#d6a963]/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Icons.Plus className="w-4 h-4" />
          <span>Thêm sản phẩm mới</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white border border-[#eedfca] rounded-2xl p-4 shadow-sm">
        {/* Search */}
        <div className="relative">
          <Icons.Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#72675f]" />
          <input
            type="text"
            placeholder="Tìm theo tên đèn, mã SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] placeholder-[#a4998f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
          />
        </div>

        {/* Category */}
        {/* Category Filter */}
        <CustomSelect
          value={categoryFilter}
          onChange={(val) => setCategoryFilter(val)}
          placeholder="Tất cả danh mục"
          options={[
            { value: '', label: 'Tất cả danh mục' },
            ...categories.map((c) => ({ value: String(c.id), label: c.name })),
          ]}
        />

        {/* Status Filter */}
        <CustomSelect
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
          placeholder="Tất cả trạng thái"
          options={[
            { value: 'all', label: 'Tất cả trạng thái' },
            { value: 'active', label: 'Đang hiển thị trên website' },
            { value: 'hidden', label: 'Đã ẩn khỏi website' },
          ]}
        />

        {/* Sort Filter */}
        <CustomSelect
          value={sortFilter}
          onChange={(val) => setSortFilter(val)}
          placeholder="Sắp xếp sản phẩm"
          options={[
            { value: 'newest', label: 'Mới nhất trước' },
            { value: 'price_asc', label: 'Giá tăng dần' },
            { value: 'price_desc', label: 'Giá giảm dần' },
          ]}
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-[#eedfca] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#fbf7f1] text-[#72675f] border-b border-[#eedfca] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Sản phẩm</th>
                <th className="py-3.5 px-3">Danh mục</th>
                <th className="py-3.5 px-3">Giá bán</th>
                <th className="py-3.5 px-3">Kho</th>
                <th className="py-3.5 px-3">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2e7d7]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#72675f]">
                    <Icons.Refresh className="w-5 h-5 animate-spin mx-auto text-[#d6a963] mb-2" />
                    <span>Đang tải danh sách sản phẩm...</span>
                  </td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <tr key={p.id} className={`hover:bg-[#fffdfa] transition-colors ${!p.is_active ? 'opacity-80 bg-[#faf6f0]/40' : ''}`}>
                    {/* Sản phẩm */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.thumbnail || 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=100'}
                          alt={p.name}
                          className="w-12 h-12 rounded-xl object-cover bg-[#f7efe5] border border-[#eedfca] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-[#2b251f] truncate max-w-xs sm:max-w-md">
                            {p.name}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#72675f] font-mono">
                            <span>SKU: {p.sku || 'N/A'}</span>
                            {p.badge && (
                              <span className="px-1.5 py-0.5 rounded bg-[#f7efe5] text-[#b58636] border border-[#eedfca] font-sans font-semibold text-[10px]">
                                {p.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Danh mục */}
                    <td className="py-3 px-3 text-[#72675f]">
                      {p.category_name || categories.find((c) => c.id === p.category_id)?.name || 'Chung'}
                    </td>

                    {/* Giá bán */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#b58636]">
                        {formatCurrency(p.price)}
                      </div>
                      {p.original_price && p.original_price > p.price && (
                        <div className="text-[10px] text-[#a4998f] line-through">
                          {formatCurrency(p.original_price)}
                        </div>
                      )}
                    </td>

                    {/* Tồn kho */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block font-mono font-bold px-2 py-0.5 rounded-md ${
                          p.stock <= 0
                            ? 'text-rose-700 bg-rose-50 border border-rose-200'
                            : p.stock <= 5
                            ? 'text-amber-800 bg-amber-50 border border-amber-200'
                            : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleToggleStatus(p)}
                        title={p.is_active ? 'Nhấn để ẩn sản phẩm khỏi website' : 'Nhấn để hiển thị lại sản phẩm'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          p.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-[#f7efe5] text-[#72675f] border border-[#eedfca] hover:bg-[#eedfca]'
                        }`}
                      >
                        {p.is_active ? (
                          <>
                            <Icons.Eye className="w-3.5 h-3.5" />
                            <span>Hiển thị</span>
                          </>
                        ) : (
                          <>
                            <Icons.EyeOff className="w-3.5 h-3.5" />
                            <span>Đã ẩn</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Thao tác */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/products/create?id=${p.id}`}
                          title="Sửa sản phẩm"
                          className="p-2 rounded-xl bg-[#f7efe5] hover:bg-[#eedfca] text-[#2b251f] border border-[#eedfca] transition-colors cursor-pointer"
                        >
                          <Icons.Edit className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(p)}
                          title={p.is_active ? 'Ẩn sản phẩm khỏi website' : 'Bật hiển thị sản phẩm'}
                          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                            p.is_active
                              ? 'bg-[#f7efe5] hover:bg-amber-50 text-[#72675f] hover:text-amber-700 border-[#eedfca] hover:border-amber-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {p.is_active ? (
                            <Icons.EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Icons.Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#72675f]">
                    Không tìm thấy sản phẩm nào phù hợp với bộ lọc
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
