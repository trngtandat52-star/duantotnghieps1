'use client';

import React, { useEffect, useState } from 'react';
import { api, formatDate } from '@/lib/api';
import { Post } from '@/lib/types';
import { Icons } from '@/components/Icons';
import { useToast } from '@/context/ToastContext';

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

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    category: 'Mẹo bài trí',
    author: 'Ban biên tập',
    thumbnail: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=500',
    excerpt: '',
    content: '',
  });
  const [saving, setSaving] = useState(false);

  const { showToast } = useToast();

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await api.posts.getAll({ limit: 100 });
      if (res.success && res.data) {
        setPosts(res.data);
      } else {
        showToast(res.message || 'Không thể tải bài viết', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi tải bài viết', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const openAddModal = () => {
    setEditingPost(null);
    setFormData({
      title: '',
      slug: '',
      category: 'Mẹo bài trí',
      author: 'Ban biên tập',
      thumbnail: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=500',
      excerpt: '',
      content: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Post) => {
    setEditingPost(p);
    setFormData({
      title: p.title,
      slug: p.slug,
      category: p.category || 'Mẹo bài trí',
      author: p.author || 'Ban biên tập',
      thumbnail: p.thumbnail || '',
      excerpt: p.excerpt || '',
      content: p.content || '',
    });
    setIsModalOpen(true);
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: !editingPost ? toSlug(title) : prev.slug,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      showToast('Vui lòng điền Tiêu đề và Nội dung bài viết.', 'warning');
      return;
    }

    setSaving(true);
    const payload = {
      title: formData.title,
      slug: formData.slug || toSlug(formData.title),
      category: formData.category,
      author: formData.author,
      thumbnail: formData.thumbnail,
      excerpt: formData.excerpt,
      content: formData.content,
      is_published: 1,
    };

    try {
      if (editingPost) {
        const res = await api.posts.update(editingPost.id, payload);
        if (res.success) {
          showToast('Cập nhật bài viết thành công!', 'success');
          setIsModalOpen(false);
          loadPosts();
        } else {
          showToast(res.message || 'Lỗi khi cập nhật bài viết', 'error');
        }
      } else {
        const res = await api.posts.create(payload);
        if (res.success) {
          showToast('Đăng bài viết mới thành công!', 'success');
          setIsModalOpen(false);
          loadPosts();
        } else {
          showToast(res.message || 'Lỗi khi tạo bài viết', 'error');
        }
      }
    } catch {
      showToast('Lỗi máy chủ khi lưu bài viết', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Post) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bài viết "${p.title}"?`)) {
      return;
    }
    try {
      const res = await api.posts.delete(p.id);
      if (res.success) {
        showToast('Đã xóa bài viết thành công!', 'success');
        setPosts((prev) => prev.filter((item) => item.id !== p.id));
      } else {
        showToast(res.message || 'Không thể xóa bài viết', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi xóa bài viết', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#eedfca] rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#2b251f] flex items-center gap-2.5">
            <Icons.Posts className="w-6 h-6 text-[#d6a963]" />
            <span>Quản lý bài viết & Tin tức</span>
          </h2>
          <p className="text-xs text-[#72675f] mt-1">
            Biên tập tin tức, cẩm nang thiết kế và bài trí ánh sáng không gian sống
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d6a963] to-[#b58636] hover:from-[#c5964e] hover:to-[#9f7228] text-[#2b251f] font-bold text-xs shadow-md shadow-[#d6a963]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Icons.Plus className="w-4 h-4" />
          <span>Viết bài mới</span>
        </button>
      </div>

      {/* Posts Table */}
      <div className="bg-white border border-[#eedfca] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#fbf7f1] text-[#72675f] border-b border-[#eedfca] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Bài viết</th>
                <th className="py-3.5 px-3">Chuyên mục</th>
                <th className="py-3.5 px-3">Tác giả</th>
                <th className="py-3.5 px-3">Lượt xem</th>
                <th className="py-3.5 px-3">Ngày đăng</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2e7d7]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#72675f]">
                    <Icons.Refresh className="w-5 h-5 animate-spin mx-auto text-[#d6a963] mb-2" />
                    <span>Đang tải danh sách bài viết...</span>
                  </td>
                </tr>
              ) : posts.length > 0 ? (
                posts.map((p) => (
                  <tr key={p.id} className="hover:bg-[#fffdfa] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.thumbnail || 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=100'}
                          alt={p.title}
                          className="w-12 h-10 rounded-lg object-cover bg-[#f7efe5] border border-[#eedfca] shrink-0"
                        />
                        <div className="font-bold text-[#2b251f] max-w-sm truncate">
                          {p.title}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        {p.category || 'Mẹo bài trí'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#2b251f]">
                      {p.author || 'Ban biên tập'}
                    </td>
                    <td className="py-3 px-3 font-mono text-[#b58636] font-bold">
                      {p.views || 0}
                    </td>
                    <td className="py-3 px-3 text-[#72675f] text-[11px]">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          title="Sửa"
                          className="p-2 rounded-xl bg-[#f7efe5] hover:bg-[#eedfca] text-[#2b251f] border border-[#eedfca] transition-colors cursor-pointer"
                        >
                          <Icons.Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
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
                    Chưa có bài viết nào
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
          <div className="w-full max-w-2xl bg-white border border-[#eedfca] rounded-2xl shadow-2xl p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#eedfca]">
              <h3 className="text-base font-bold text-[#2b251f] flex items-center gap-2">
                <Icons.Posts className="w-5 h-5 text-[#d6a963]" />
                <span>{editingPost ? 'Chỉnh sửa bài viết' : 'Viết bài mới'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#72675f] hover:text-[#2b251f] hover:bg-[#f7efe5] cursor-pointer"
              >
                <Icons.Close className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
              <div>
                <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                  Tiêu đề bài viết *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: 5 Xu hướng đèn trang trí phòng khách nổi bật 2026"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                    Chuyên mục
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                    Tác giả
                  </label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                  Ảnh bìa (URL)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.thumbnail}
                  onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                  Đoạn tóm tắt (Excerpt)
                </label>
                <textarea
                  rows={2}
                  placeholder="Tóm tắt ngắn 1-2 câu để thu hút người đọc..."
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                  Nội dung chi tiết *
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Nội dung bài viết..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
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
                  {saving ? 'Đang lưu...' : 'Lưu bài viết'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
