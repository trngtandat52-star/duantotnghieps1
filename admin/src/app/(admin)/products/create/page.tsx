'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, formatCurrency } from '@/lib/api';
import { Category, Product } from '@/lib/types';
import { Icons } from '@/components/Icons';
import { CustomSelect } from '@/components/CustomSelect';
import { useToast } from '@/context/ToastContext';

const PRESET_IMAGES = [
  { name: 'Đèn chùm Aurora', url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600' },
  { name: 'Đèn thả Minimalist', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600' },
  { name: 'Đèn bàn Vintage', url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600' },
  { name: 'Đèn ngủ Bắc Âu', url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600' },
  { name: 'Đèn tường Luxury', url: 'https://images.unsplash.com/photo-1494526585095-c41746248156?w=600' },
];

function parseVariants(input: any, defaults: string[]): string[] {
  if (!input) return defaults;
  if (Array.isArray(input)) return input;
  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    if (typeof input === 'string') {
      return input.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return defaults;
}

function ProductFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id') || searchParams.get('edit');
  const isEditing = Boolean(editId);

  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category_id: '',
    price: '',
    original_price: '',
    stock: '10',
    badge: '',
    thumbnail: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500',
    short_description: '',
    is_active: true,
    is_featured: false,
    is_hot: false,
  });

  // Biến thể sản phẩm
  const [variantsSize, setVariantsSize] = useState<string[]>([
    '24W (Ø40cm)',
    '36W (Ø50cm)',
    '48W (Ø60cm)',
  ]);
  const [variantsColor, setVariantsColor] = useState<string[]>([
    'Vàng ấm (3000K)',
    'Trung tính (4000K)',
    'Trắng sáng (6500K)',
  ]);
  const [newSizeInput, setNewSizeInput] = useState('');
  const [newColorInput, setNewColorInput] = useState('');

  // Tải danh mục & dữ liệu sản phẩm nếu đang ở chế độ chỉnh sửa
  useEffect(() => {
    async function initData() {
      setLoading(true);
      try {
        const catRes = await api.categories.getAll();
        if (catRes.success && catRes.data) {
          setCategories(catRes.data);
          if (!isEditing && catRes.data && catRes.data.length > 0) {
            setFormData((prev) => ({ ...prev, category_id: String(catRes.data![0].id) }));
          }
        }

        if (editId) {
          const prodRes = await api.products.getById(editId);
          if (prodRes.success && prodRes.data) {
            const p = prodRes.data;
            setFormData({
              name: p.name || '',
              sku: p.sku || '',
              category_id: p.category_id ? String(p.category_id) : '',
              price: String(p.price || ''),
              original_price: p.original_price ? String(p.original_price) : '',
              stock: String(p.stock ?? 10),
              badge: p.badge || '',
              thumbnail: p.thumbnail || '',
              short_description: p.short_description || '',
              is_active: Boolean(p.is_active),
              is_featured: Boolean(p.is_featured),
              is_hot: Boolean(p.is_hot),
            });

            // Tải biến thể kích thước & màu sắc từ sản phẩm
            if (p.variants_size) {
              setVariantsSize(parseVariants(p.variants_size, ['24W (Ø40cm)', '36W (Ø50cm)']));
            }
            if (p.variants_color) {
              setVariantsColor(parseVariants(p.variants_color, ['Vàng ấm (3000K)', 'Trung tính (4000K)']));
            }
          } else {
            showToast('Không tìm thấy thông tin sản phẩm', 'error');
            router.push('/products');
          }
        }
      } catch {
        showToast('Lỗi khi tải dữ liệu ban đầu', 'error');
      } finally {
        setLoading(false);
      }
    }

    initData();
  }, [editId]);

  // Thao tác với Biến thể Kích thước
  const handleAddSize = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !variantsSize.includes(trimmed)) {
      setVariantsSize([...variantsSize, trimmed]);
      setNewSizeInput('');
    }
  };

  const handleRemoveSize = (val: string) => {
    setVariantsSize(variantsSize.filter((s) => s !== val));
  };

  // Thao tác với Biến thể Màu sắc
  const handleAddColor = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !variantsColor.includes(trimmed)) {
      setVariantsColor([...variantsColor, trimmed]);
      setNewColorInput('');
    }
  };

  const handleRemoveColor = (val: string) => {
    setVariantsColor(variantsColor.filter((c) => c !== val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('Vui lòng nhập tên sản phẩm', 'warning');
      return;
    }

    if (!formData.price || Number(formData.price) <= 0) {
      showToast('Vui lòng nhập giá bán hợp lệ (> 0 VNĐ)', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Product> = {
        name: formData.name.trim(),
        sku: formData.sku.trim() || undefined,
        category_id: formData.category_id ? Number(formData.category_id) : undefined,
        price: Number(formData.price),
        original_price: formData.original_price ? Number(formData.original_price) : undefined,
        stock: Number(formData.stock) || 0,
        badge: formData.badge.trim() || undefined,
        thumbnail: formData.thumbnail.trim(),
        short_description: formData.short_description.trim() || undefined,
        variants_size: JSON.stringify(variantsSize.length > 0 ? variantsSize : ['Tiêu chuẩn']),
        variants_color: JSON.stringify(variantsColor.length > 0 ? variantsColor : ['Mặc định']),
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        is_hot: formData.is_hot,
      };

      if (isEditing && editId) {
        const res = await api.products.update(Number(editId), payload);
        if (res.success) {
          showToast('Cập nhật sản phẩm & biến thể thành công!', 'success');
          router.push('/products');
        } else {
          showToast(res.message || 'Không thể cập nhật sản phẩm', 'error');
        }
      } else {
        const res = await api.products.create(payload);
        if (res.success) {
          showToast('Đã tạo mới sản phẩm đèn kèm biến thể thành công!', 'success');
          router.push('/products');
        } else {
          showToast(res.message || 'Không thể thêm sản phẩm', 'error');
        }
      }
    } catch {
      showToast('Lỗi máy chủ khi lưu sản phẩm', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-[#72675f] space-y-3">
        <Icons.Refresh className="w-8 h-8 animate-spin text-[#d6a963]" />
        <p className="text-sm font-medium">Đang chuẩn bị trang soạn thảo sản phẩm...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#eedfca] rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#a4998f] mb-1.5 font-medium">
            <Link href="/" className="hover:text-[#d6a963] transition-colors">Trang chủ</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-[#d6a963] transition-colors">Quản lý sản phẩm</Link>
            <span>/</span>
            <span className="text-[#2b251f] font-semibold">
              {isEditing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#2b251f] flex items-center gap-2.5">
            <Icons.Products className="w-7 h-7 text-[#d6a963]" />
            <span>{isEditing ? 'Chỉnh sửa sản phẩm đèn' : 'Thêm sản phẩm mới'}</span>
          </h1>
          <p className="text-xs text-[#72675f] mt-1">
            {isEditing
              ? `Cập nhật thông tin và biến thể cho sản phẩm #${editId} trong cơ sở dữ liệu Lunihome`
              : 'Điền đầy đủ thông tin và các biến thể để niêm yết sản phẩm lên trang bán hàng'}
          </p>
        </div>

        {/* Action Buttons Top */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/products"
            className="px-4 py-2.5 rounded-xl border border-[#eedfca] bg-[#fffdfa] hover:bg-[#f6ebd9] text-[#72675f] font-semibold text-xs flex items-center gap-2 transition-all"
          >
            <Icons.ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d6a963] to-[#b58636] hover:from-[#c5964e] hover:to-[#9f7228] text-[#2b251f] font-bold text-xs shadow-md shadow-[#d6a963]/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <Icons.Refresh className="w-4 h-4 animate-spin text-[#2b251f]" />
            ) : (
              <Icons.Check className="w-4 h-4" />
            )}
            <span>{saving ? 'Đang lưu...' : isEditing ? 'Cập nhật sản phẩm' : 'Lưu sản phẩm'}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT TRÁI: Thông tin chính (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Thông tin cơ bản */}
          <div className="bg-white border border-[#eedfca] rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#2b251f] pb-3 border-b border-[#f2e7d7] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d6a963]"></span>
              Thông tin cơ bản
            </h2>

            {/* Tên sản phẩm */}
            <div>
              <label className="block text-xs font-bold text-[#2b251f] mb-1.5">
                Tên sản phẩm đèn <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Đèn chùm pha lê cao cấp Lunihome Aurora..."
                className="w-full px-4 py-3 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] placeholder-[#a4998f] text-sm focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20 transition-all font-medium"
              />
            </div>

            {/* Danh mục & Mã SKU */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2b251f] mb-1.5">
                  Danh mục sản phẩm <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={formData.category_id}
                  onChange={(val) => setFormData({ ...formData, category_id: val })}
                  placeholder="-- Chọn danh mục đèn --"
                  options={[
                    { value: '', label: '-- Chọn danh mục đèn --' },
                    ...categories.map((c) => ({ value: String(c.id), label: c.name })),
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2b251f] mb-1.5">
                  Mã SKU sản phẩm
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  placeholder="VD: LUNI-CR-01"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] font-mono placeholder-[#a4998f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
              </div>
            </div>

            {/* Huy hiệu Badge */}
            <div>
              <label className="block text-xs font-bold text-[#2b251f] mb-1.5">
                Huy hiệu nổi bật (Badge nhãn góc)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {['Mới về', 'Bán chạy', 'Hot', '-15%', '-20%', 'Độc quyền'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFormData({ ...formData, badge: preset })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                      formData.badge === preset
                        ? 'bg-[#d6a963] text-[#2b251f] border-[#d6a963]'
                        : 'bg-[#fffdfa] text-[#72675f] border-[#eedfca] hover:border-[#d6a963]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
                {formData.badge && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, badge: '' })}
                    className="px-2 py-1 text-[11px] text-red-500 hover:underline"
                  >
                    Xóa huy hiệu
                  </button>
                )}
              </div>
              <input
                type="text"
                value={formData.badge}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                placeholder="Hoặc tự gõ huy hiệu tùy chỉnh (VD: Giảm 25%, Cao cấp...)"
                className="w-full px-4 py-2 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] placeholder-[#a4998f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
              />
            </div>
          </div>

          {/* Card 2: Giá & Quản lý kho */}
          <div className="bg-white border border-[#eedfca] rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#2b251f] pb-3 border-b border-[#f2e7d7] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d6a963]"></span>
              Giá bán & Kho hàng
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Giá bán */}
              <div>
                <label className="block text-xs font-bold text-[#2b251f] mb-1.5">
                  Giá bán thực tế (VNĐ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="1290000"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] font-semibold text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
                <p className="text-[11px] text-[#a4998f] mt-1 font-mono">
                  {formData.price ? formatCurrency(Number(formData.price)) : 'Chưa nhập giá'}
                </p>
              </div>

              {/* Giá niêm yết gốc */}
              <div>
                <label className="block text-xs font-bold text-[#2b251f] mb-1.5">
                  Giá gốc niêm yết (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.original_price}
                  onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                  placeholder="1590000"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
                <p className="text-[11px] text-[#a4998f] mt-1 font-mono line-through">
                  {formData.original_price ? formatCurrency(Number(formData.original_price)) : 'Không có giá gạch'}
                </p>
              </div>

              {/* Tồn kho */}
              <div>
                <label className="block text-xs font-bold text-[#2b251f] mb-1.5">
                  Số lượng trong kho
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="10"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
                <p className="text-[11px] text-[#72675f] mt-1">
                  {Number(formData.stock) > 0 ? `Còn hàng (${formData.stock} sp)` : 'Đang hết hàng'}
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Biến thể sản phẩm (Kích thước & Màu sắc ánh sáng) - MỚI BỔ SUNG */}
          <div className="bg-white border border-[#eedfca] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="pb-3 border-b border-[#f2e7d7] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h2 className="text-base font-bold text-[#2b251f] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#d6a963]"></span>
                <span>Biến thể sản phẩm (Kích thước & Ánh sáng)</span>
              </h2>
              <span className="text-[11px] text-[#72675f]">
                Khách hàng sẽ chọn các biến thể này khi đặt mua trên website
              </span>
            </div>

            {/* 1. Biến thể Kích thước / Công suất */}
            <div>
              <label className="block text-xs font-bold text-[#2b251f] mb-1.5 flex items-center justify-between">
                <span>1. Kích thước & Công suất đèn (Variants Size)</span>
                <span className="text-[11px] font-normal text-[#a4998f]">
                  (VD: 12W, 24W, Ø40cm, Ø50cm...)
                </span>
              </label>

              {/* Danh sách chip kích thước hiện tại */}
              <div className="flex flex-wrap gap-2 mb-3 min-h-[36px] p-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca]">
                {variantsSize.length > 0 ? (
                  variantsSize.map((size) => (
                    <span
                      key={size}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#f7efe5] text-[#b58636] border border-[#eedfca] shadow-2xs"
                    >
                      <span>{size}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSize(size)}
                        className="text-[#72675f] hover:text-red-500 font-bold ml-1 transition-colors cursor-pointer"
                        title="Xóa kích thước này"
                      >
                        ✕
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#a4998f] italic py-0.5">
                    Chưa có kích thước nào. Thêm bằng ô nhập hoặc nút gợi ý bên dưới.
                  </span>
                )}
              </div>

              {/* Gợi ý nhanh kích thước */}
              <div className="flex items-center gap-2 flex-wrap mb-2.5 text-xs text-[#72675f]">
                <span className="text-[11px] font-medium text-[#a4998f]">Gợi ý nhanh:</span>
                {['12W (Ø30cm)', '24W (Ø40cm)', '36W (Ø50cm)', '48W (Ø60cm)', 'Bàn nhỏ (6W)', 'Bàn lớn (9W)'].map(
                  (preset) => {
                    const already = variantsSize.includes(preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => !already && handleAddSize(preset)}
                        disabled={already}
                        title={already ? 'Đã thêm vào danh sách' : `Thêm "${preset}"`}
                        className={`px-2 py-0.5 rounded-md text-[11px] border transition-colors ${
                          already
                            ? 'bg-[#f7efe5] text-[#d6a963] border-[#d6a963] cursor-default font-semibold'
                            : 'bg-white text-[#72675f] border-[#eedfca] hover:border-[#d6a963] hover:text-[#b58636] cursor-pointer'
                        }`}
                      >
                        {already ? '✓ ' : '+ '}{preset}
                      </button>
                    );
                  }
                )}
              </div>

              {/* Ô nhập kích thước tùy chỉnh */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Gõ kích thước / công suất mới (VD: 30W Ø45cm)..."
                  value={newSizeInput}
                  onChange={(e) => setNewSizeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSize(newSizeInput);
                    }
                  }}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] placeholder-[#a4998f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
                <button
                  type="button"
                  onClick={() => handleAddSize(newSizeInput)}
                  className="px-4 py-2 rounded-xl bg-[#f7efe5] hover:bg-[#eedfca] text-[#2b251f] font-bold text-xs border border-[#eedfca] transition-colors cursor-pointer whitespace-nowrap"
                >
                  + Thêm kích thước
                </button>
              </div>
            </div>

            {/* 2. Biến thể Màu sắc / Nhiệt độ ánh sáng */}
            <div className="pt-4 border-t border-[#f2e7d7]">
              <label className="block text-xs font-bold text-[#2b251f] mb-1.5 flex items-center justify-between">
                <span>2. Màu sắc & Nhiệt độ ánh sáng (Variants Color)</span>
                <span className="text-[11px] font-normal text-[#a4998f]">
                  (VD: Vàng ấm 3000K, Trung tính 4000K, Vàng đồng, Đen mờ...)
                </span>
              </label>

              {/* Danh sách chip màu sắc hiện tại */}
              <div className="flex flex-wrap gap-2 mb-3 min-h-[36px] p-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca]">
                {variantsColor.length > 0 ? (
                  variantsColor.map((color) => (
                    <span
                      key={color}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[#fbf7f1] text-[#2b251f] border border-[#eedfca] shadow-2xs"
                    >
                      <span>{color}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveColor(color)}
                        className="text-[#72675f] hover:text-red-500 font-bold ml-1 transition-colors cursor-pointer"
                        title="Xóa màu này"
                      >
                        ✕
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#a4998f] italic py-0.5">
                    Chưa có màu sắc nào. Thêm bằng ô nhập hoặc nút gợi ý bên dưới.
                  </span>
                )}
              </div>

              {/* Gợi ý nhanh màu sắc */}
              <div className="flex items-center gap-2 flex-wrap mb-2.5 text-xs text-[#72675f]">
                <span className="text-[11px] font-medium text-[#a4998f]">Gợi ý nhanh:</span>
                {[
                  'Vàng ấm (3000K)',
                  'Trung tính (4000K)',
                  'Trắng sáng (6500K)',
                  'Đổi màu 3 chế độ',
                  'Vàng đồng',
                  'Đen mờ',
                  'Trắng tinh tế',
                ].map((preset) => {
                  const already = variantsColor.includes(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => !already && handleAddColor(preset)}
                      disabled={already}
                      title={already ? 'Đã thêm vào danh sách' : `Thêm "${preset}"`}
                      className={`px-2 py-0.5 rounded-md text-[11px] border transition-colors ${
                        already
                          ? 'bg-[#f7efe5] text-[#d6a963] border-[#d6a963] cursor-default font-semibold'
                          : 'bg-white text-[#72675f] border-[#eedfca] hover:border-[#d6a963] hover:text-[#b58636] cursor-pointer'
                      }`}
                    >
                      {already ? '✓ ' : '+ '}{preset}
                    </button>
                  );
                })}
              </div>

              {/* Ô nhập màu sắc tùy chỉnh */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Gõ màu sắc / ánh sáng mới (VD: Hổ phách, Xám khói)..."
                  value={newColorInput}
                  onChange={(e) => setNewColorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddColor(newColorInput);
                    }
                  }}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] placeholder-[#a4998f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
                <button
                  type="button"
                  onClick={() => handleAddColor(newColorInput)}
                  className="px-4 py-2 rounded-xl bg-[#f7efe5] hover:bg-[#eedfca] text-[#2b251f] font-bold text-xs border border-[#eedfca] transition-colors cursor-pointer whitespace-nowrap"
                >
                  + Thêm màu sắc
                </button>
              </div>
            </div>


          </div>

          {/* Card 4: Mô tả chi tiết & Thông số đèn */}
          <div className="bg-white border border-[#eedfca] rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#2b251f] pb-3 border-b border-[#f2e7d7] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d6a963]"></span>
              Mô tả chi tiết & Thông số đèn
            </h2>

            <div>
              <label className="block text-xs font-bold text-[#2b251f] mb-1.5">
                Mô tả đặc điểm & kích thước
              </label>
              <textarea
                rows={5}
                value={formData.short_description}
                onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                placeholder="Ví dụ: Thiết kế phong cách Bắc Âu hiện đại, khung kim loại mạ vàng cao cấp chống gỉ, kích thước đường kính 60cm, phù hợp cho phòng khách và bàn ăn..."
                className="w-full px-4 py-3 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] placeholder-[#a4998f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
              />
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: Hình ảnh & Cài đặt (1/3 width) */}
        <div className="space-y-6">
          {/* Card Hình ảnh sản phẩm */}
          <div className="bg-white border border-[#eedfca] rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#2b251f] pb-3 border-b border-[#f2e7d7] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d6a963]"></span>
              Ảnh đại diện sản phẩm
            </h2>

            {/* Preview hình ảnh */}
            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#fbf7f1] border-2 border-dashed border-[#eedfca] flex items-center justify-center group">
              {formData.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={formData.thumbnail}
                  alt="Xem trước sản phẩm"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/F7EFE5/2B251F?text=Loi+Hinh+Anh';
                  }}
                />
              ) : (
                <div className="text-center p-4 text-[#a4998f]">
                  <Icons.Products className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Chưa có ảnh đại diện</p>
                </div>
              )}

              {formData.badge && (
                <span className="absolute top-3 left-3 bg-[#c99c42] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
                  {formData.badge}
                </span>
              )}
            </div>

            {/* Input URL */}
            <div>
              <label className="block text-xs font-bold text-[#2b251f] mb-1.5">
                Đường dẫn hình ảnh (URL) <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                required
                value={formData.thumbnail}
                onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] placeholder-[#a4998f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
              />
            </div>

            {/* Thư viện ảnh mẫu */}
            <div>
              <label className="block text-[11px] font-semibold text-[#72675f] mb-1.5">
                Chọn nhanh ảnh mẫu đèn đẹp:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setFormData({ ...formData, thumbnail: preset.url })}
                    className="p-1.5 rounded-lg border border-[#eedfca] bg-[#fffdfa] hover:bg-[#f6ebd9] text-left text-[11px] text-[#2b251f] truncate transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preset.url} alt={preset.name} className="w-5 h-5 rounded object-cover" />
                    <span className="truncate">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card Cài đặt hiển thị & Phân loại */}
          <div className="bg-white border border-[#eedfca] rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#2b251f] pb-3 border-b border-[#f2e7d7] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d6a963]"></span>
              Trạng thái & Hiển thị
            </h2>

            <div className="space-y-3.5">
              {/* Hiển thị trên website */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-[#fffdfa] border border-[#eedfca] cursor-pointer hover:border-[#d6a963] transition-colors">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="mt-0.5 w-4 h-4 text-[#d6a963] rounded border-[#eedfca] focus:ring-[#d6a963]"
                />
                <div>
                  <div className="text-xs font-bold text-[#2b251f]">Hiển thị trên website</div>
                  <div className="text-[11px] text-[#72675f]">
                    Cho phép khách hàng nhìn thấy và mua sản phẩm này trên cửa hàng
                  </div>
                </div>
              </label>

              {/* Nổi bật */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-[#fffdfa] border border-[#eedfca] cursor-pointer hover:border-[#d6a963] transition-colors">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="mt-0.5 w-4 h-4 text-[#d6a963] rounded border-[#eedfca] focus:ring-[#d6a963]"
                />
                <div>
                  <div className="text-xs font-bold text-[#2b251f]">Sản phẩm nổi bật (Featured)</div>
                  <div className="text-[11px] text-[#72675f]">
                    Ưu tiên hiển thị tại trang chủ và banner nổi bật
                  </div>
                </div>
              </label>

              {/* Bán chạy */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-[#fffdfa] border border-[#eedfca] cursor-pointer hover:border-[#d6a963] transition-colors">
                <input
                  type="checkbox"
                  checked={formData.is_hot}
                  onChange={(e) => setFormData({ ...formData, is_hot: e.target.checked })}
                  className="mt-0.5 w-4 h-4 text-[#d6a963] rounded border-[#eedfca] focus:ring-[#d6a963]"
                />
                <div>
                  <div className="text-xs font-bold text-[#2b251f]">Sản phẩm bán chạy (Hot)</div>
                  <div className="text-[11px] text-[#72675f]">
                    Gắn nhãn bán chạy và ưu tiên trong bộ lọc người dùng
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Card Nút Lưu / Hủy */}
          <div className="bg-white border border-[#eedfca] rounded-2xl p-6 shadow-sm space-y-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d6a963] to-[#b58636] hover:from-[#c5964e] hover:to-[#9f7228] text-[#2b251f] font-bold text-sm shadow-md shadow-[#d6a963]/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <Icons.Refresh className="w-4 h-4 animate-spin text-[#2b251f]" />
              ) : (
                <Icons.Check className="w-4 h-4" />
              )}
              <span>{saving ? 'Đang lưu sản phẩm...' : isEditing ? 'Cập nhật thay đổi' : 'Lưu sản phẩm mới'}</span>
            </button>

            <Link
              href="/products"
              className="w-full py-2.5 rounded-xl border border-[#eedfca] bg-[#fffdfa] hover:bg-[#f6ebd9] text-[#72675f] font-semibold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <span>Hủy bỏ và quay lại</span>
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}

export default function CreateProductPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] text-[#72675f] space-y-3">
          <Icons.Refresh className="w-8 h-8 animate-spin text-[#d6a963]" />
          <p className="text-sm font-medium">Đang tải...</p>
        </div>
      }
    >
      <ProductFormContent />
    </Suspense>
  );
}
