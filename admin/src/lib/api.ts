import {
  ApiResponse,
  Category,
  Coupon,
  DashboardStats,
  InventoryLog,
  InventoryStats,
  Order,
  Post,
  Product,
  User,
} from './types';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const STORE_URL =
  process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3000';

// Quản lý Token & Session trong Browser
export const authStorage = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('lunihome_token');
  },
  getUser(): User | null {
    if (typeof window === 'undefined') return null;
    try {
      const u = localStorage.getItem('lunihome_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  setSession(token: string, user: User) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('lunihome_token', token);
    localStorage.setItem('lunihome_user', JSON.stringify(user));
  },
  clearSession() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('lunihome_token');
    localStorage.removeItem('lunihome_user');
  },
  isLoggedIn(): boolean {
    return !!this.getToken();
  },
};

// Helper gửi request kèm Header Token
async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error(`Lỗi gọi API [${options.method || 'GET'} ${url}]:`, err);
    return {
      success: false,
      message: err.message || 'Không thể kết nối đến máy chủ backend (Port 5000)',
    };
  }
}

export const api = {
  // 1. Auth & Session
  auth: {
    async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> {
      const res = await request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.success) {
        const token = res.token || (res.data as any)?.token;
        const user = (res as any).user || (res.data as any)?.user || res.data;
        return {
          ...res,
          token,
          user,
          data: { token, user } as any,
        };
      }
      return res;
    },
    async getMe(): Promise<ApiResponse<User>> {
      const res = await request<User>('/auth/me');
      if (res.success) {
        const user = (res as any).user || res.data;
        return {
          ...res,
          user,
          data: user,
        };
      }
      return res;
    },
  },

  // 2. Thống kê Dashboard
  admin: {
    async getStats(): Promise<ApiResponse<DashboardStats>> {
      return request('/admin/stats');
    },
    async getUsers(): Promise<ApiResponse<User[]>> {
      return request('/admin/users');
    },
    async createUser(userData: Partial<User> & { password: string }): Promise<ApiResponse<User>> {
      return request('/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
    async updateUser(id: number, userData: Partial<User> & { password?: string }): Promise<ApiResponse> {
      return request(`/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
    },
    async deleteUser(id: number): Promise<ApiResponse> {
      return request(`/admin/users/${id}`, {
        method: 'DELETE',
      });
    },
    async deleteOrder(id: number): Promise<ApiResponse> {
      return request(`/admin/orders/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // 3. Quản lý sản phẩm
  products: {
    async getAll(params: Record<string, string | number | boolean> = {}): Promise<ApiResponse<Product[]>> {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.append(k, String(v));
        }
      });
      const query = searchParams.toString();
      return request(`/products${query ? `?${query}` : ''}`);
    },
    async getById(id: number | string): Promise<ApiResponse<Product>> {
      return request(`/products/${id}`);
    },
    async create(productData: Partial<Product>): Promise<ApiResponse<Product>> {
      return request('/products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
    },
    async update(id: number, productData: Partial<Product>): Promise<ApiResponse<Product>> {
      return request(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(productData),
      });
    },
    async toggleStatus(id: number, isActive?: boolean): Promise<ApiResponse> {
      return request(`/products/${id}/toggle-status`, {
        method: 'PATCH',
        body: JSON.stringify(isActive !== undefined ? { is_active: isActive ? 1 : 0 } : {}),
      });
    },
    async delete(id: number): Promise<ApiResponse> {
      return request(`/products/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // 4. Quản lý Tồn kho
  inventory: {
    async getOverview(): Promise<ApiResponse<{ stats: InventoryStats; products: Product[] }>> {
      const res = await request('/admin/inventory');
      if (res.success && res.stats) {
        return res;
      }
      // Fallback nếu cần
      const prodRes = await api.products.getAll({ limit: 300 });
      if (prodRes.success && prodRes.data) {
        const prods = prodRes.data;
        let totalStock = 0;
        let totalInventoryValue = 0;
        let outOfStockCount = 0;
        let lowStockCount = 0;
        let abundantStockCount = 0;

        const formatted = prods.map((p) => {
          const stock = Number(p.stock) || 0;
          const price = Number(p.price) || 0;
          totalStock += stock;
          totalInventoryValue += stock * price;
          let status: 'abundant' | 'low_stock' | 'out_of_stock' = 'abundant';
          if (stock === 0) {
            outOfStockCount++;
            status = 'out_of_stock';
          } else if (stock <= 10) {
            lowStockCount++;
            status = 'low_stock';
          } else {
            abundantStockCount++;
          }
          return {
            ...p,
            stock,
            price,
            totalValue: stock * price,
            status,
          };
        });

        return {
          success: true,
          stats: {
            totalProducts: prods.length,
            totalStock,
            totalInventoryValue,
            outOfStockCount,
            lowStockCount,
            abundantStockCount,
          },
          products: formatted,
        };
      }
      return res;
    },
    async adjustStock(productId: number, type: 'import' | 'export' | 'adjust', quantity: number, note?: string): Promise<ApiResponse> {
      return request('/admin/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({ productId, type, quantity, note }),
      });
    },
    async getLogs(productId?: number, limit = 50): Promise<ApiResponse<{ logs: InventoryLog[] }>> {
      const query = productId
        ? `?productId=${productId}&limit=${limit}`
        : `?limit=${limit}`;
      return request(`/admin/inventory/logs${query}`);
    },
  },

  // 5. Quản lý Đơn hàng
  orders: {
    async getAll(status?: string): Promise<ApiResponse<Order[]>> {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      return request(`/orders${query}`);
    },
    async getByCode(code: string): Promise<ApiResponse<Order>> {
      return request(`/orders/${encodeURIComponent(code)}`);
    },
    async updateStatus(id: number, orderStatus: string, paymentStatus?: string): Promise<ApiResponse> {
      return request(`/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ orderStatus, paymentStatus }),
      });
    },
  },

  // 6. Quản lý Danh mục
  categories: {
    async getAll(): Promise<ApiResponse<Category[]>> {
      return request('/categories');
    },
    async create(catData: Partial<Category>): Promise<ApiResponse<Category>> {
      return request('/categories', {
        method: 'POST',
        body: JSON.stringify(catData),
      });
    },
    async update(id: number, catData: Partial<Category>): Promise<ApiResponse<Category>> {
      return request(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(catData),
      });
    },
    async delete(id: number): Promise<ApiResponse> {
      return request(`/categories/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // 7. Quản lý Mã giảm giá
  coupons: {
    async getAll(): Promise<ApiResponse<Coupon[]>> {
      return request('/coupons');
    },
    async create(couponData: Partial<Coupon>): Promise<ApiResponse<Coupon>> {
      return request('/coupons', {
        method: 'POST',
        body: JSON.stringify(couponData),
      });
    },
    async update(id: number, couponData: Partial<Coupon>): Promise<ApiResponse<Coupon>> {
      return request(`/coupons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(couponData),
      });
    },
    async delete(id: number): Promise<ApiResponse> {
      return request(`/coupons/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // 8. Quản lý Bài viết
  posts: {
    async getAll(params: Record<string, any> = {}): Promise<ApiResponse<Post[]>> {
      const searchParams = new URLSearchParams(params);
      const query = searchParams.toString();
      return request(`/posts${query ? `?${query}` : ''}`);
    },
    async create(postData: Partial<Post>): Promise<ApiResponse<Post>> {
      return request('/posts', {
        method: 'POST',
        body: JSON.stringify(postData),
      });
    },
    async update(id: number, postData: Partial<Post>): Promise<ApiResponse<Post>> {
      return request(`/posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(postData),
      });
    },
    async delete(id: number): Promise<ApiResponse> {
      return request(`/posts/${id}`, {
        method: 'DELETE',
      });
    },
  },
};

// Utilities
export function formatCurrency(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '---';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
