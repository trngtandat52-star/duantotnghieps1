'use client';

import React, { useEffect, useState } from 'react';
import { api, formatDate } from '@/lib/api';
import { User } from '@/lib/types';
import { Icons } from '@/components/Icons';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'customer' as 'admin' | 'customer',
  });
  const [saving, setSaving] = useState(false);

  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getUsers();
      if (res.success && res.data) {
        setUsers(res.data);
      } else {
        showToast(res.message || 'Không thể tải danh sách người dùng', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi tải người dùng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'customer',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      password: '',
      phone: u.phone || '',
      role: u.role,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      showToast('Vui lòng điền Họ tên và Email.', 'warning');
      return;
    }

    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      showToast('Mật khẩu tạo mới phải có ít nhất 6 ký tự.', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const payload: any = {
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
        };
        if (formData.password && formData.password.trim().length >= 6) {
          payload.password = formData.password.trim();
        }
        const res = await api.admin.updateUser(editingUser.id, payload);
        if (res.success) {
          showToast('Cập nhật tài khoản người dùng thành công!', 'success');
          setIsModalOpen(false);
          loadUsers();
        } else {
          showToast(res.message || 'Lỗi khi cập nhật tài khoản', 'error');
        }
      } else {
        const res = await api.admin.createUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          role: formData.role,
        });
        if (res.success) {
          showToast('Tạo tài khoản người dùng mới thành công!', 'success');
          setIsModalOpen(false);
          loadUsers();
        } else {
          showToast(res.message || 'Lỗi khi tạo người dùng', 'error');
        }
      }
    } catch {
      showToast('Lỗi máy chủ khi lưu người dùng', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (currentUser && currentUser.id === u.id) {
      showToast('Bạn không thể tự xóa tài khoản của chính mình!', 'warning');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${u.name}" (${u.email})?`)) {
      return;
    }

    try {
      const res = await api.admin.deleteUser(u.id);
      if (res.success) {
        showToast('Đã xóa tài khoản thành công!', 'success');
        setUsers((prev) => prev.filter((item) => item.id !== u.id));
      } else {
        showToast(res.message || 'Không thể xóa người dùng', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi xóa người dùng', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#eedfca] rounded-2xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#2b251f] flex items-center gap-2.5">
            <Icons.Users className="w-6 h-6 text-[#d6a963]" />
            <span>Quản lý người dùng & Phân quyền</span>
          </h2>
          <p className="text-xs text-[#72675f] mt-1">
            Danh sách tài khoản khách hàng và quản trị viên hệ thống
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d6a963] to-[#b58636] hover:from-[#c5964e] hover:to-[#9f7228] text-[#2b251f] font-bold text-xs shadow-md shadow-[#d6a963]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Icons.Plus className="w-4 h-4" />
          <span>Thêm tài khoản mới</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#eedfca] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#fbf7f1] text-[#72675f] border-b border-[#eedfca] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Họ và tên</th>
                <th className="py-3.5 px-3">Email</th>
                <th className="py-3.5 px-3">Số điện thoại</th>
                <th className="py-3.5 px-3">Vai trò</th>
                <th className="py-3.5 px-3">Ngày tạo</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2e7d7]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#72675f]">
                    <Icons.Refresh className="w-5 h-5 animate-spin mx-auto text-[#d6a963] mb-2" />
                    <span>Đang tải danh sách người dùng...</span>
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-[#fffdfa] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#f7efe5] border border-[#eedfca] flex items-center justify-center font-bold text-[#b58636] text-xs shrink-0">
                            {(u.name ? u.name.charAt(0) : 'U').toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-[#2b251f] flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#f7efe5] text-[#b58636] border border-[#eedfca] font-normal">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#72675f] font-mono">ID: #{u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#2b251f] font-mono">
                        {u.email}
                      </td>
                      <td className="py-3 px-3 text-[#72675f] font-mono">
                        {u.phone || 'Chưa cập nhật'}
                      </td>
                      <td className="py-3 px-3">
                        {u.role === 'admin' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#f7efe5] text-[#b58636] border border-[#eedfca]">
                            Quản trị viên
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            Khách hàng
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[#72675f] text-[11px]">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            title="Sửa"
                            className="p-2 rounded-xl bg-[#f7efe5] hover:bg-[#eedfca] text-[#2b251f] border border-[#eedfca] transition-colors cursor-pointer"
                          >
                            <Icons.Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={isCurrent}
                            title={isCurrent ? 'Không thể tự xóa chính mình' : 'Xóa'}
                            className={`p-2 rounded-xl border border-[#eedfca] transition-colors ${
                              isCurrent
                                ? 'opacity-30 cursor-not-allowed text-[#a4998f] bg-slate-50'
                                : 'bg-[#f7efe5] hover:bg-rose-50 text-[#72675f] hover:text-rose-600 hover:border-rose-200 cursor-pointer'
                            }`}
                          >
                            <Icons.Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#72675f]">
                    Chưa có tài khoản người dùng nào
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
                <Icons.Users className="w-5 h-5 text-[#d6a963]" />
                <span>{editingUser ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}</span>
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
                  Họ và tên *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn A"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                  Địa chỉ Email *
                </label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  placeholder="VD: user@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] ${
                    editingUser ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                  {editingUser ? 'Mật khẩu mới (Để trống nếu giữ nguyên)' : 'Mật khẩu * (Tối thiểu 6 ký tự)'}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  placeholder="VD: 0901234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2b251f] mb-1">
                  Phân quyền vai trò
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#fffdfa] border border-[#eedfca] text-[#2b251f] text-xs focus:outline-none focus:border-[#d6a963] focus:ring-2 focus:ring-[#d6a963]/20"
                >
                  <option value="customer">Khách hàng (Customer)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
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
                  {saving ? 'Đang lưu...' : 'Lưu tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
