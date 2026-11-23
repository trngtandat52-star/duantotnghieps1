'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Category } from '@/lib/types';
import { Icons } from '@/components/Icons';
import { useToast } from '@/context/ToastContext';

// Helper tạo slug tiếng Việt
function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9 -]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    image: '',
    description: '',
    status: 'hien',
  });
  const [saving, setSaving] = useState(false);

  const { showToast } = useToast();

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await api.categories.getAll();
      if (res.success && res.data) {
        setCategories(res.data);
      } else {
        showToast(res.message || 'Không thể tải danh mục', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi tải danh mục', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      image: '',
      description: '',
      status: 'hien',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name || '',
      slug: cat.slug || '',
      image: cat.image || '',
      description: cat.description || '',
      status: cat.status || 'hien',
    });
    setIsModalOpen(true);
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: !editingCategory ? toSlug(name) : prev.slug,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('Vui lòng nhập tên danh mục.', 'warning');
      return;
    }
    setSaving(true);
    const payload = {
      name: formData.name,
      slug: formData.slug || toSlug(formData.name),
      image: formData.image || '',
      description: formData.description || '',
      status: formData.status || 'hien',
    };

    try {
      if (editingCategory) {
        const res = await api.categories.update(editingCategory.id, payload);
        if (res.success) {
          showToast('Cập nhật danh mục thành công!', 'success');
          setIsModalOpen(false);
          loadCategories();
        } else {
          showToast(res.message || 'Lỗi khi cập nhật danh mục', 'error');
        }
      } else {
        const res = await api.categories.create(payload);
        if (res.success) {
          showToast('Tạo danh mục mới thành công!', 'success');
          setIsModalOpen(false);
          loadCategories();
        } else {
          showToast(res.message || 'Lỗi khi tạo danh mục', 'error');
        }
      }
    } catch {
      showToast('Lỗi máy chủ khi lưu danh mục', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#eedfca] rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#2b251f] flex items-center gap-2.5">
            <Icons.Categories className="w-6 h-6 text-[#d6a963]" />
            <span>Quản lý danh mục sản phẩm</span>
          </h2>
          <p className="text-xs text-[#72675f] mt-1">
            Phân loại các dòng đèn trang trí Lunihome (Hình ảnh, Mô tả, Trạng thái)
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d6a963] to-[#b58636] hover:from-[#c5964e] hover:to-[#9f7228] text-[#2b251f] font-bold text-xs shadow-md shadow-[#d6a963]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Icons.Plus className="w-4 h-4" />
          <span>Thêm danh mục mới</span>
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-white border border-[#eedfca] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#fbf7f1] text-[#72675f] border-b border-[#eedfca] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">ID</th>
                <th className="py-3.5 px-3">Hình ảnh</th>
                <th className="py-3.5 px-3">Tên danh mục</th>
                <th className="py-3.5 px-3">Đường dẫn tĩnh (Slug)</th>
                <th className="py-3.5 px-3">Mô tả</th>
                <th className="py-3.5 px-3">Trạng thái</th>
                <th className="py-3.5 px-3 text-center">Số sản phẩm</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2e7d7]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#72675f]">
                    <Icons.Refresh className="w-5 h-5 animate-spin mx-auto text-[#d6a963] mb-2" />
                    <span>Đang tải danh mục...</span>
                  </td>
                </tr>
              ) : categories.length > 0 ? (
                categories.map((c) => (
                  <tr key={c.id} className="hover:bg-[#fffdfa] transition-colors">
                    {/* ID */}
                    <td className="py-3 px-4 font-mono font-bold text-[#b58636]">
                      #{c.id}
                    </td>

                    {/* 1. Hình ảnh */}
                    <td className="py-3 px-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#f7efe5] border border-[#eedfca] flex items-center justify-center shrink-0 shadow-xs">
                        {c.image ? (
                          <img
                            src={c.image}
                            alt={c.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=300&q=80';
                            }}
                          />
                        ) : (
                          <Icons.Categories className="w-5 h-5 text-[#b58636]" />
                        )}
                      </div>
                    </td>

                    {/* Tên danh mục */}
                    <td className="py-3 px-3 font-bold text-[#2b251f] text-sm whitespace-nowrap">
                      {c.name}
                    </td>

                    {/* Slug */}
                    <td className="py-3 px-3 font-mono text-[#72675f] whitespace-nowrap">
                      {c.slug}
                    </td>

                    {/* 2. Mô tả */}
                    <td className="py-3 px-3 text-[#72675f] max-w-xs">
                      <p
                        className="line-clamp-2 text-xs leading-relaxed"
                        title={c.description || ''}
                      >
                        {c.description || 'Chưa có mô tả'}
                      </p>
                    </td>

                    {/* 3. Trạng thái */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {c.status === 'an' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                          Ẩn
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Hiển thị
                        </span>
                      )}
                    </td>

                    {/* Số sản phẩm */}
                    <td className="py-3 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#f7efe5] text-[#b58636] border border-[#eedfca]">
                        {c.product_count ?? 0}
                      </span>
                    </td>

                    {/* Thao tác (Chỉ giữ nút Sửa, đã xóa nút Xóa) */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(c)}
                        title="Chỉnh sửa danh mục"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f7efe5] hover:bg-[#eedfca] text-[#2b251f] border border-[#eedfca] font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <Icons.Edit className="w-3.5 h-3.5 text-[#b58636]" />
                        <span>Sửa</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#72675f]">
                    Chưa có danh mục nào
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
          <div className="w-full max-w-lg bg-white border border-[#eedfca] rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#eedfca]">
              <h3 className="text-base font-bold text-[#2b251f] flex items-center gap-2">
                <Icons.Categories className="w-5 h-5 text-[#d6a963]" />
                <span>{editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}</span>
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
                  Tên danh mục *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Đèn chùm tân cổ điển"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                  Đường dẫn tĩnh (Slug)
                </label>
                <input
                  type="text"
                  placeholder="den-chum-tan-co-dien"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs font-mono focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
              </div>

              {/* 1. Hình ảnh */}
              <div>
                <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                  Hình ảnh (Link URL ảnh)
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
                {formData.image && (
                  <div className="mt-2.5 flex items-center gap-3 p-2 bg-[#fbf7f1] rounded-xl border border-[#eedfca]">
                    <img
                      src={formData.image}
                      alt="Xem trước"
                      className="w-12 h-12 rounded-lg object-cover border border-[#eedfca]"
                      onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                    />
                    <span className="text-xs text-[#72675f]">Xem trước hình ảnh danh mục</span>
                  </div>
                )}
              </div>

              {/* 2. Mô tả */}
              <div>
                <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                  Mô tả danh mục
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả phong cách và không gian phù hợp cho dòng đèn này..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
              </div>

              {/* 3. Trạng thái */}
              <div>
                <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                  Trạng thái hiển thị
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20 cursor-pointer"
                >
                  <option value="hien">🟢 Hiển thị (Công khai trên cửa hàng)</option>
                  <option value="an">⚪ Ẩn (Tạm ngưng hiển thị)</option>
                </select>
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
                  {saving ? 'Đang lưu...' : 'Lưu danh mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
