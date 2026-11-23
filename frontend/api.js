/**
 * LuniHome Frontend API Client & Auto-Integration SDK
 * Kết nối giao diện HTML với RESTful API Node.js/Express & MySQL
 */

const API_BASE_URL = 'http://localhost:5000/api';

// Hiệu ứng dấu tích xanh và thông báo Toast sinh động khi thêm vào giỏ hàng
window.showAddToCartSuccess = function (item, buttonEl) {
  // 1. Hiệu ứng biến đổi nút bấm thành dấu tích xanh
  if (!buttonEl && item && item.name) {
    const escaped = CSS.escape ? CSS.escape(item.name) : item.name;
    buttonEl = document.querySelector(`.add-to-cart-btn[data-name="${escaped}"]`) ||
      document.querySelector('.action-row .add-to-cart-btn') ||
      document.querySelector('.product-info-block .add-to-cart-btn') ||
      document.querySelector('.add-to-cart-btn');
  }

  if (buttonEl && !buttonEl.dataset.isAnimating) {
    buttonEl.dataset.isAnimating = 'true';
    const originalContent = buttonEl.innerHTML;
    const hasText = buttonEl.textContent.trim().length > 0;
    buttonEl.classList.add('btn-added-check');
    if (hasText) {
      buttonEl.innerHTML = '<i class="fa-solid fa-check"></i> Đã thêm vào giỏ!';
    } else {
      buttonEl.innerHTML = '<i class="fa-solid fa-check"></i>';
    }
    setTimeout(() => {
      buttonEl.innerHTML = originalContent;
      buttonEl.classList.remove('btn-added-check');
      delete buttonEl.dataset.isAnimating;
    }, 2200);
  }

  // 2. Rung nhẹ badge giỏ hàng trên Header
  const badge = document.getElementById('cartCount');
  if (badge) {
    badge.classList.remove('cart-bounce');
    void badge.offsetWidth; // trigger reflow
    badge.classList.add('cart-bounce');
    setTimeout(() => {
      badge.classList.remove('cart-bounce');
    }, 600);
  }

  // 3. Hiển thị Toast thông báo có dấu tích hoạt họa (checkmark)
  let toast = document.getElementById('cartSuccessToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cartSuccessToast';
    toast.className = 'cart-toast';
    document.body.appendChild(toast);
  }

  const productName = (item && item.name) ? item.name : 'Sản phẩm';
  toast.innerHTML = `
    <div class="checkmark-circle">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </div>
    <div class="cart-toast-body">
      <div class="cart-toast-title">
        <span>Đã thêm vào giỏ hàng!</span>
      </div>
      <div class="cart-toast-name">${productName}</div>
      <a href="gio-hang.html" class="cart-toast-link">Xem giỏ hàng <i class="fa-solid fa-arrow-right"></i></a>
    </div>
    <button type="button" class="cart-toast-close" style="background:none;border:none;color:#9ca3af;font-size:18px;cursor:pointer;padding:4px;line-height:1;margin-left:4px;" title="Đóng">&times;</button>
  `;

  const closeBtn = toast.querySelector('.cart-toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      toast.classList.remove('show');
    });
  }

  if (window._cartToastTimeout) clearTimeout(window._cartToastTimeout);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  window._cartToastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
};

const LunihomeAPI = {
  // Quản lý Token & Session
  auth: {
    getToken() {
      return localStorage.getItem('lunihome_token') || null;
    },
    getUser() {
      try {
        const u = localStorage.getItem('lunihome_user');
        return u ? JSON.parse(u) : null;
      } catch (e) {
        return null;
      }
    },
    setSession(token, user) {
      if (token) localStorage.setItem('lunihome_token', token);
      if (user) localStorage.setItem('lunihome_user', JSON.stringify(user));
    },
    clearSession() {
      localStorage.removeItem('lunihome_token');
      localStorage.removeItem('lunihome_user');
    },
    isLoggedIn() {
      return !!this.getToken();
    },

    // Gọi API Đăng ký
    async register(data) {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.success && json.token) {
        LunihomeAPI.auth.setSession(json.token, json.user);
      }
      return json;
    },

    // Gọi API Đăng nhập
    async login(email, password) {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();
      if (json.success && json.token) {
        LunihomeAPI.auth.setSession(json.token, json.user);
      }
      return json;
    },

    // Lấy thông tin cá nhân hiện tại
    async getMe() {
      const token = this.getToken();
      if (!token) return null;
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await res.json();
    },

    // Đổi mật khẩu
    async changePassword(currentPassword, newPassword) {
      const token = this.getToken();
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      return await res.json();
    },

    // Quên mật khẩu
    async forgotPassword(email) {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return await res.json();
    },

    // Đăng xuất
    logout() {
      LunihomeAPI.cart.reset();
      this.clearSession();
      alert('Đã đăng xuất thành công.');
      window.location.href = 'dang-nhap.html';
    }
  },

  // Quản lý Giỏ hàng (Cart)
  cart: {
    _items: [],
    _loadedFor: null,
    _loading: null,

    _formatItems(items) {
      return items.map(item => ({
        cartItemId: Number(item.cartItemId),
        id: Number(item.id),
        name: item.name,
        slug: item.slug,
        price: Number(item.price) || 0,
        image: item.thumbnail || '',
        quantity: Number(item.quantity) || 1,
        variantSize: item.variantSize || '',
        variantColor: item.variantColor || '',
        variant: [item.variantSize, item.variantColor].filter(Boolean).join(' • ') || 'Mặc định',
        stock: Number(item.stock) || 0
      }));
    },

    async _request(path, method = 'GET', body) {
      const token = LunihomeAPI.auth.getToken();
      const headers = { 'Authorization': 'Bearer ' + token };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      const response = await fetch(`${API_BASE_URL}/cart${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không thể cập nhật giỏ hàng.');
      }
      return result;
    },

    async load(force = false) {
      if (!LunihomeAPI.auth.isLoggedIn()) {
        this.reset();
        return [];
      }
      const user = LunihomeAPI.auth.getUser();
      if (!user || !user.id) throw new Error('Không xác định được tài khoản để tải giỏ hàng.');
      const userId = String(user.id);
      if (!force && this._loadedFor === userId) return this._items;
      if (this._loading) return this._loading;

      this._loading = (async () => {
        const result = await this._request('');
        this._items = this._formatItems(result.data || []);
        const legacyKey = `lunihome_cart_${userId}`;
        const legacyValue = localStorage.getItem(legacyKey);
        if (legacyValue) {
          let legacyItems;
          try {
            legacyItems = JSON.parse(legacyValue);
          } catch (error) {
            throw new Error('Giỏ hàng cũ không đọc được; dữ liệu cũ được giữ nguyên để khôi phục.');
          }

          if (Array.isArray(legacyItems) && legacyItems.length) {
            const remainingItems = legacyItems.slice();
            for (const item of legacyItems) {
              let productId = Number(item.id);
              if (!Number.isSafeInteger(productId) || productId < 1 || productId > 1000000) {
                const products = await LunihomeAPI.products.getAll({ search: item.name || '', limit: 20 });
                const match = products.success && Array.isArray(products.data)
                  ? products.data.find(product => product.name === item.name)
                  : null;
                productId = Number(match && match.id);
              }
              if (!Number.isSafeInteger(productId) || productId < 1) {
                throw new Error(`Không thể chuyển sản phẩm "${item.name || 'không rõ tên'}" vào giỏ hàng MySQL.`);
              }
              const migrated = await this._request('/items', 'POST', {
                productId,
                quantity: Number(item.quantity) || 1,
                variantSize: item.variantSize || '',
                variantColor: item.variantColor || ''
              });
              this._items = this._formatItems(migrated.data || []);
              remainingItems.shift();
              if (remainingItems.length) {
                localStorage.setItem(legacyKey, JSON.stringify(remainingItems));
              } else {
                localStorage.removeItem(legacyKey);
              }
            }
            localStorage.removeItem('lunihome_cart');
            localStorage.removeItem('lunihome_cart_count');
            const refreshed = await this._request('');
            this._items = this._formatItems(refreshed.data || []);
          }
        }

        this._loadedFor = userId;
        this.updateHeaderBadge();
        return this._items;
      })();

      try {
        return await this._loading;
      } finally {
        this._loading = null;
      }
    },

    getItems() {
      return LunihomeAPI.auth.isLoggedIn() ? this._items : [];
    },

    async syncStock() {
      await this.load(true);
      return this._items;
    },

    async add(item, clickedBtn) {
      if (!LunihomeAPI.auth.isLoggedIn()) {
        alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!');
        const currentUrl = encodeURIComponent(window.location.href);
        window.location.href = 'dang-nhap.html?redirect=' + currentUrl;
        return false;
      }

      await this.load();
      let productId = Number(item.id);
      if (!Number.isSafeInteger(productId) || productId < 1 || productId > 1000000) {
        const products = await LunihomeAPI.products.getAll({ search: item.name || '', limit: 20 });
        const match = products.success && Array.isArray(products.data)
          ? products.data.find(product => product.name === item.name)
          : null;
        productId = Number(match && match.id);
      }
      if (!Number.isSafeInteger(productId) || productId < 1) {
        throw new Error(`Không thể xác định mã MySQL của sản phẩm "${item.name || ''}".`);
      }

      const result = await this._request('/items', 'POST', {
        productId,
        quantity: Number(item.quantity) || 1,
        variantSize: item.variantSize || '',
        variantColor: item.variantColor || ''
      });
      this._items = this._formatItems(result.data || []);
      this.updateHeaderBadge();
      if (typeof window.showAddToCartSuccess === 'function') {
        window.showAddToCartSuccess(item, clickedBtn || item.clickedBtn);
      }
      return true;
    },

    async remove(itemIdOrName) {
      await this.load();
      const item = this._items.find(i => i.cartItemId === Number(itemIdOrName)) ||
        this._items.find(i => i.name === itemIdOrName);
      if (!item) return;
      const result = await this._request(`/items/${item.cartItemId}`, 'DELETE');
      this._items = this._formatItems(result.data || []);
      this.updateHeaderBadge();
    },

    async updateQty(itemIdOrName, qty) {
      await this.load();
      const item = this._items.find(i => i.cartItemId === Number(itemIdOrName)) ||
        this._items.find(i => i.name === itemIdOrName);
      if (!item) return;
      const quantity = Math.min(Math.max(Number(qty) || 1, 1), item.stock);
      const result = await this._request(`/items/${item.cartItemId}`, 'PUT', { quantity });
      this._items = this._formatItems(result.data || []);
      this.updateHeaderBadge();
    },

    async clear() {
      if (LunihomeAPI.auth.isLoggedIn()) {
        const result = await this._request('', 'DELETE');
        this._items = this._formatItems(result.data || []);
      } else {
        this._items = [];
      }
      this._loadedFor = null;
      this.updateHeaderBadge();
    },

    reset() {
      this._items = [];
      this._loadedFor = null;
      this._loading = null;
      this.updateHeaderBadge();
    },

    getTotal() {
      return this.getItems().reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0);
    },
    getCount() {
      if (!LunihomeAPI.auth.isLoggedIn()) return 0;
      return this.getItems().reduce((sum, i) => sum + Number(i.quantity), 0);
    },
    updateHeaderBadge() {
      const el = document.getElementById('cartCount');
      if (el) el.textContent = this.getCount();
    }
  },

  // API Sản phẩm
  products: {
    async getAll(params = {}) {
      const query = new URLSearchParams(params).toString();
      const url = `${API_BASE_URL}/products${query ? `?${query}` : ''}`;
      const res = await fetch(url);
      return await res.json();
    },

    async getBySlug(slug) {
      const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(slug)}`);
      return await res.json();
    },

    async addReview(productId, reviewData) {
      const token = LunihomeAPI.auth.getToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/products/${productId}/reviews`, {
        method: 'POST',
        headers,
        body: JSON.stringify(reviewData)
      });
      return await res.json();
    },

    async create(data) {
      const token = LunihomeAPI.auth.getToken();
      const res = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      return await res.json();
    },

    async update(id, data) {
      const token = LunihomeAPI.auth.getToken();
      const res = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      return await res.json();
    },

    async toggleVisibility(id, isActive) {
      const token = LunihomeAPI.auth.getToken();
      const res = await fetch(`${API_BASE_URL}/products/${id}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(isActive !== undefined ? { is_active: isActive ? 1 : 0 } : {})
      });
      return await res.json();
    },

    async hide(id) {
      return await this.toggleVisibility(id, 0);
    },

    async show(id) {
      return await this.toggleVisibility(id, 1);
    },

    async delete(id) {
      // Backend được cấu hình nghiêm ngặt chỉ ẩn sản phẩm (is_active = 0) chứ không xóa khỏi database
      const token = LunihomeAPI.auth.getToken();
      const res = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await res.json();
    }
  },

  // API Danh mục
  categories: {
    async getAll() {
      const res = await fetch(`${API_BASE_URL}/categories`);
      return await res.json();
    },
    async getBySlug(slug) {
      const res = await fetch(`${API_BASE_URL}/categories/${encodeURIComponent(slug)}`);
      return await res.json();
    },
    async create(data) {
      const token = LunihomeAPI.auth.getToken();
      const res = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      return await res.json();
    },
    async update(id, data) {
      const token = LunihomeAPI.auth.getToken();
      const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      return await res.json();
    },
    async delete(id) {
      const token = LunihomeAPI.auth.getToken();
      const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await res.json();
    }
  },

  // API Thương hiệu
  brands: {
    async getAll() {
      const res = await fetch(`${API_BASE_URL}/brands`);
      return await res.json();
    }
  },

  // API Banner trang chủ
  banners: {
    async getAll() {
      const res = await fetch(`${API_BASE_URL}/banners`);
      return await res.json();
    }
  },

  posts: {
    async getAll(params = {}) {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE_URL}/posts${query ? `?${query}` : ''}`);
      return await res.json();
    },
    async getBySlug(slug) {
      const res = await fetch(`${API_BASE_URL}/posts/${encodeURIComponent(slug)}`);
      return await res.json();
    }
  },

  stores: {
    async getAll() {
      const res = await fetch(`${API_BASE_URL}/stores`);
      return await res.json();
    }
  },

  wishlist: {
    async getAll() {
      const token = LunihomeAPI.auth.getToken();
      const res = await fetch(`${API_BASE_URL}/wishlist`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      return await res.json();
    },
    async add(productId) {
      const token = LunihomeAPI.auth.getToken();
      const res = await fetch(`${API_BASE_URL}/wishlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ productId })
      });
      return await res.json();
    },
    async remove(productId) {
      const token = LunihomeAPI.auth.getToken();
      const res = await fetch(`${API_BASE_URL}/wishlist/${encodeURIComponent(productId)}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      return await res.json();
    }
  },

  // API Đơn hàng
  orders: {
    async getAll(status) {
      const token = LunihomeAPI.auth.getToken();
      const url = status ? `${API_BASE_URL}/orders?status=${encodeURIComponent(status)}` : `${API_BASE_URL}/orders`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await res.json();
    },

    async updateStatus(id, orderStatus, paymentStatus) {
      const token = LunihomeAPI.auth.getToken();
      const res = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderStatus, paymentStatus })
      });
      return await res.json();
    },

    async create(orderData) {
      const token = LunihomeAPI.auth.getToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(orderData)
      });
      return await res.json();
    },

    async getMyOrders() {
      const token = LunihomeAPI.auth.getToken();
      if (!token) return { success: false, message: 'Chưa đăng nhập' };

      const res = await fetch(`${API_BASE_URL}/orders/my-orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await res.json();
    },

    async getByCode(code) {
      const token = LunihomeAPI.auth.getToken();
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(code)}`, { headers });
      return await res.json();
    },

    async cancel(id) {
      const token = LunihomeAPI.auth.getToken();
      const res = await fetch(`${API_BASE_URL}/orders/${id}/cancel`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await res.json();
    }
  },

  // API Mã giảm giá
  coupons: {
    async getAll() {
      const token = LunihomeAPI.auth.getToken();
      const res = await fetch(`${API_BASE_URL}/coupons`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await res.json();
    },
    async create(data) {
      const token = LunihomeAPI.auth.getToken();
      const res = await fetch(`${API_BASE_URL}/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      return await res.json();
    },
    async update(id, data) {
      const token = LunihomeAPI.auth.getToken();
      const res = await fetch(`${API_BASE_URL}/coupons/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      return await res.json();
    },
    async delete(id) {
      const token = LunihomeAPI.auth.getToken();
      const res = await fetch(`${API_BASE_URL}/coupons/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await res.json();
    },
    async apply(code, subtotal) {
      const res = await fetch(`${API_BASE_URL}/coupons/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal })
      });
      return await res.json();
    }
  },

  // API Quản lý tồn kho (Inventory Management)
  inventory: {
    async getOverview() {
      const token = LunihomeAPI.auth.getToken();
      try {
        const res = await fetch(`${API_BASE_URL}/admin/inventory`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) return data;
      } catch (e) {
        console.warn('Endpoint /admin/inventory chưa sẵn sàng, dùng fallback qua products.getAll');
      }

      // Fallback nếu server chưa có route
      const prodRes = await LunihomeAPI.products.getAll({ limit: 200 });
      if (prodRes.success && prodRes.data) {
        const prods = prodRes.data;
        let totalStock = 0;
        let totalInventoryValue = 0;
        let outOfStockCount = 0;
        let lowStockCount = 0;
        let abundantStockCount = 0;

        const formatted = prods.map(p => {
          const stock = Number(p.stock) || 0;
          const price = Number(p.price) || 0;
          const totalValue = stock * price;
          totalStock += stock;
          totalInventoryValue += totalValue;

          let status = 'abundant';
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
            totalValue,
            status,
            category_name: p.category_name || (p.category ? p.category.name : 'Chung')
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
            abundantStockCount
          },
          products: formatted
        };
      }
      return { success: false, message: 'Không thể tải dữ liệu tồn kho' };
    },

    async adjustStock(productId, type, quantity, note) {
      const token = LunihomeAPI.auth.getToken();
      try {
        const res = await fetch(`${API_BASE_URL}/admin/inventory/adjust`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ productId, type, quantity, note })
        });
        const data = await res.json();
        if (data.success) return data;
      } catch (e) {
        console.warn('Fallback update stock qua products.update');
      }

      // Fallback
      let newStock = Number(quantity);
      if (type === 'import' || type === 'export') {
        const prodDetail = await LunihomeAPI.products.getById(productId);
        if (prodDetail && prodDetail.success && prodDetail.data) {
          const cur = Number(prodDetail.data.stock) || 0;
          newStock = type === 'import' ? cur + Number(quantity) : Math.max(0, cur - Number(quantity));
        }
      }
      return await LunihomeAPI.products.update(productId, { stock: newStock });
    },

    async getLogs(productId = null, limit = 50) {
      const token = LunihomeAPI.auth.getToken();
      try {
        const url = productId
          ? `${API_BASE_URL}/admin/inventory/logs?productId=${productId}&limit=${limit}`
          : `${API_BASE_URL}/admin/inventory/logs?limit=${limit}`;
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        return await res.json();
      } catch (e) {
        return { success: false, logs: [] };
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', function () {
  // 1. Cập nhật trạng thái đăng nhập trên Header
  const user = LunihomeAPI.auth.getUser();
  const helloWrap = document.querySelector('.hello');
  const accountMenu = document.querySelector('.account-menu');

  if (user && helloWrap) {
    const strongName = helloWrap.querySelector('strong');
    if (strongName) {
      strongName.textContent = user.name || user.email;
    }

    if (accountMenu) {
      if (user.role === 'admin' && !accountMenu.querySelector('.admin-panel-link')) {
        const adminLink = document.createElement('a');
        adminLink.className = 'admin-panel-link';
        adminLink.href = 'http://localhost:3001';
        adminLink.target = '_blank';
        adminLink.style.color = '#c99c42';
        adminLink.style.fontWeight = '700';
        adminLink.innerHTML = '<i class="fa-solid fa-gauge-high"></i> Trang Quản trị (Admin)';
        accountMenu.insertBefore(adminLink, accountMenu.firstChild);
      }

      const oldLogin = accountMenu.querySelector('a[href="dang-nhap.html"]');
      const oldReg = accountMenu.querySelector('a[href="dang-ky.html"]');
      if (oldLogin) {
        oldLogin.innerHTML = '<i class="fa-solid fa-key"></i> Đổi mật khẩu';
        oldLogin.setAttribute('href', 'doi-pass.html');
      }
      if (oldReg) {
        oldReg.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Đăng xuất';
        oldReg.setAttribute('href', '#');
        oldReg.addEventListener('click', function (e) {
          e.preventDefault();
          LunihomeAPI.auth.logout();
        });
      }
    }
  }

  // 1.1 Tự động đồng bộ Danh mục từ Database MySQL lên Menu Header & Grid Trang chủ
  if (LunihomeAPI.categories && typeof LunihomeAPI.categories.getAll === 'function') {
    LunihomeAPI.categories.getAll().then(res => {
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        // Cập nhật dropdown Menu Danh mục ở tất cả các trang
        document.querySelectorAll('.nav-item .dropdown').forEach(dd => {
          const parentLink = dd.parentElement ? dd.parentElement.querySelector('a') : null;
          if (parentLink && (parentLink.textContent.includes('Danh mục') || parentLink.dataset.mobileDropdown !== undefined)) {
            dd.innerHTML = res.data.map(c => `<a href="danh-muc.html?slug=${encodeURIComponent(c.slug)}">${c.name}</a>`).join('');
          }
        });

        // Cập nhật Grid danh mục trên trang chủ
        const catGrid = document.querySelector('.category-grid');
        if (catGrid) {
          catGrid.innerHTML = res.data.map(c => `
            <a class="category-card" href="danh-muc.html?slug=${encodeURIComponent(c.slug)}">
              <div class="category-image">
                <img src="${c.image || 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80'}" alt="${c.name}" loading="lazy">
              </div>
              <h3>${c.name}</h3>
            </a>
          `).join('');
        }
      }
    }).catch(() => {
      // Giữ nguyên HTML tĩnh dự phòng nếu backend offline
    });
  }

  const brandGrids = document.querySelectorAll('.brand-grid');
  if (brandGrids.length) {
    LunihomeAPI.brands.getAll().then(result => {
      if (!result.success || !Array.isArray(result.data) || result.data.length === 0) return;

      brandGrids.forEach(grid => {
        grid.replaceChildren(...result.data.map(brand => {
          const card = document.createElement('a');
          card.className = 'brand-card';
          card.href = `san-pham.html?brand=${encodeURIComponent(brand.slug || '')}`;

          if (brand.logo) {
            const image = document.createElement('img');
            image.src = brand.logo;
            image.alt = brand.name || 'Thương hiệu';
            image.loading = 'lazy';
            image.addEventListener('error', () => {
              card.replaceChildren(document.createTextNode(brand.name || 'Thương hiệu'));
            }, { once: true });
            card.appendChild(image);
          } else {
            card.textContent = brand.name || 'Thương hiệu';
          }

          return card;
        }));
      });
    }).catch(error => {
      console.error('Không thể tải thương hiệu từ MySQL:', error);
    });
  }

  function createPostCard(post) {
    const card = document.createElement('article');
    card.className = 'post-card';
    const postUrl = `chi-tiet-bai-viet.html?slug=${encodeURIComponent(post.slug || post.id)}`;

    const imageLink = document.createElement('a');
    imageLink.className = 'post-image';
    imageLink.href = postUrl;

    const image = document.createElement('img');
    image.src = post.thumbnail || 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80';
    image.alt = post.title || 'Bài viết Lunihome';
    image.loading = 'lazy';
    imageLink.appendChild(image);

    const content = document.createElement('div');
    content.className = 'post-content';
    const category = document.createElement('small');
    category.textContent = post.category || 'Lunihome';

    const heading = document.createElement('h3');
    const title = document.createElement('a');
    title.href = postUrl;
    title.textContent = post.title || 'Bài viết Lunihome';
    heading.appendChild(title);

    const excerpt = document.createElement('p');
    excerpt.textContent = post.excerpt || '';
    content.append(category, heading, excerpt);
    card.append(imageLink, content);
    return card;
  }

  const postGrid = document.querySelector('.post-grid');
  if (postGrid) {
    const postLimit = document.body.classList.contains('home-page') ? 3 : 12;
    LunihomeAPI.posts.getAll({ limit: postLimit }).then(result => {
      if (!result.success || !Array.isArray(result.data) || result.data.length === 0) return;
      postGrid.replaceChildren(...result.data.map(createPostCard));
    }).catch(error => {
      console.error('Không thể tải bài viết từ MySQL:', error);
    });
  }

  const postDetail = document.querySelector('.detail-panel');
  if (postDetail) {
    const slug = new URLSearchParams(window.location.search).get('slug');
    if (slug) {
      LunihomeAPI.posts.getBySlug(slug).then(result => {
        if (!result.success || !result.data) return;

        const post = result.data;
        const title = document.querySelector('.page-banner h1');
        const breadcrumbTitle = document.querySelector('.breadcrumbs span');
        if (title) title.textContent = post.title || 'Bài viết Lunihome';
        if (breadcrumbTitle) breadcrumbTitle.textContent = post.title || 'Bài viết Lunihome';
        document.title = `${post.title || 'Bài viết'} | Lunihome`;

        postDetail.replaceChildren();
        if (post.thumbnail) {
          const image = document.createElement('img');
          image.src = post.thumbnail;
          image.alt = post.title || 'Bài viết Lunihome';
          image.style.cssText = 'border-radius:18px;margin-bottom:20px;';
          postDetail.appendChild(image);
        }

        const metadata = document.createElement('div');
        metadata.style.cssText = 'color:var(--muted);font-size:13px;margin-bottom:18px;';
        const date = new Date(post.created_at);
        metadata.textContent = [post.category, Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN')]
          .filter(Boolean)
          .join(' • ');
        postDetail.appendChild(metadata);

        const parsedContent = new DOMParser().parseFromString(post.content || post.excerpt || '', 'text/html');
        const allowedTags = new Set(['A', 'BLOCKQUOTE', 'BR', 'EM', 'H2', 'H3', 'H4', 'LI', 'OL', 'P', 'STRONG', 'UL']);
        function copySafeContent(node) {
          if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || '');
          if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();

          const fragment = document.createDocumentFragment();
          const tagName = node.tagName.toUpperCase();
          const element = allowedTags.has(tagName)
            ? document.createElement(tagName.toLowerCase())
            : fragment;

          if (tagName === 'A') {
            const href = node.getAttribute('href');
            if (href) {
              try {
                const url = new URL(href, window.location.href);
                if (url.protocol === 'http:' || url.protocol === 'https:') element.href = url.href;
              } catch (error) {
                console.warn('Đường dẫn trong bài viết không hợp lệ:', error);
              }
            }
          }

          Array.from(node.childNodes).forEach(child => element.appendChild(copySafeContent(child)));
          return element;
        }
        Array.from(parsedContent.body.childNodes).forEach(node => {
          postDetail.appendChild(copySafeContent(node));
        });

        const relatedList = document.querySelector('.summary-list');
        if (relatedList && Array.isArray(result.related)) {
          relatedList.replaceChildren(...result.related.map(relatedPost => {
            const item = document.createElement('div');
            item.className = 'summary-item';
            const link = document.createElement('a');
            link.href = `chi-tiet-bai-viet.html?slug=${encodeURIComponent(relatedPost.slug || relatedPost.id)}`;
            link.textContent = relatedPost.title || 'Bài viết Lunihome';
            item.appendChild(link);
            return item;
          }));
        }
      }).catch(error => {
        console.error('Không thể tải chi tiết bài viết từ MySQL:', error);
      });
    }
  }

  const storeList = document.querySelector('.store-list');
  if (storeList) {
    LunihomeAPI.stores.getAll().then(result => {
      if (!result.success || !Array.isArray(result.data) || result.data.length === 0) return;

      storeList.replaceChildren(...result.data.map(store => {
        const card = document.createElement('article');
        card.className = 'info-box';

        const name = document.createElement('h3');
        name.textContent = store.ten_cua_hang || 'Lunihome';
        const address = document.createElement('p');
        address.textContent = store.dia_chi || '';
        card.append(name, address);

        if (store.gio_mo_cua) {
          const hours = document.createElement('p');
          hours.textContent = `Giờ mở cửa: ${store.gio_mo_cua}`;
          card.appendChild(hours);
        }
        if (store.so_dien_thoai) {
          const phone = document.createElement('p');
          phone.textContent = `Điện thoại: ${store.so_dien_thoai}`;
          card.appendChild(phone);
        }
        if (store.lien_ket_ban_do) {
          try {
            const mapUrl = new URL(store.lien_ket_ban_do, window.location.href);
            if (mapUrl.protocol === 'http:' || mapUrl.protocol === 'https:') {
              const mapLink = document.createElement('a');
              mapLink.href = mapUrl.href;
              mapLink.target = '_blank';
              mapLink.rel = 'noopener noreferrer';
              mapLink.textContent = 'Xem bản đồ';
              card.appendChild(mapLink);
            }
          } catch (error) {
            console.warn('Đường dẫn bản đồ cửa hàng không hợp lệ:', error);
          }
        }

        return card;
      }));
    }).catch(error => {
      console.error('Không thể tải cửa hàng từ MySQL:', error);
    });
  }

  // 2. Tự động xử lý Form Đăng nhập (dang-nhap.html)
  if (window.location.pathname.includes('dang-nhap.html')) {
    const loginForm = document.querySelector('.auth-card form');
    if (loginForm) {
      loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const emailInput = loginForm.querySelector('input[type="email"]');
        const passInput = loginForm.querySelector('input[type="password"]');
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        if (!emailInput?.value || !passInput?.value) {
          alert('Vui lòng nhập đầy đủ Email và Mật khẩu!');
          return;
        }

        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang xử lý...';

        try {
          const res = await LunihomeAPI.auth.login(emailInput.value, passInput.value);
          if (res.success) {
            alert('Đăng nhập thành công! Chào mừng ' + (res.user.name || 'bạn'));
            const redirectParam = new URLSearchParams(window.location.search).get('redirect');
            let targetUrl = 'index.html';
            if (redirectParam) {
              try {
                targetUrl = decodeURIComponent(redirectParam);
              } catch (err) {
                targetUrl = redirectParam;
              }
            }
            window.location.href = targetUrl;
          } else {
            alert('Đăng nhập thất bại: ' + res.message);
          }
        } catch (err) {
          alert('Lỗi kết nối máy chủ API! Hãy đảm bảo Backend đã chạy (npm start).');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      });
    }
  }

  // 3. Tự động xử lý Form Đăng ký (dang-ky.html)
  if (window.location.pathname.includes('dang-ky.html')) {
    const regForm = document.querySelector('.auth-card form');
    if (regForm) {
      regForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const inputs = regForm.querySelectorAll('input');
        const email = inputs[0]?.value;
        const name = inputs[1]?.value;
        const pass = inputs[2]?.value;
        const rePass = inputs[3]?.value;
        const address = inputs[4]?.value;
        const phone = inputs[5]?.value;
        const submitBtn = regForm.querySelector('button[type="submit"]');

        if (!email || !name || !pass) {
          alert('Vui lòng nhập Họ tên, Email và Mật khẩu!');
          return;
        }

        if (pass !== rePass) {
          alert('Mật khẩu nhập lại không khớp!');
          return;
        }

        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang tạo tài khoản...';

        try {
          const res = await LunihomeAPI.auth.register({ name, email, password: pass, phone, address });
          if (res.success) {
            alert('Đăng ký thành công! Bạn đã được đăng nhập tự động.');
            const redirectParam = new URLSearchParams(window.location.search).get('redirect');
            let targetUrl = 'index.html';
            if (redirectParam) {
              try {
                targetUrl = decodeURIComponent(redirectParam);
              } catch (err) {
                targetUrl = redirectParam;
              }
            }
            window.location.href = targetUrl;
          } else {
            alert('Đăng ký thất bại: ' + res.message);
          }
        } catch (err) {
          alert('Lỗi kết nối máy chủ API!');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      });
    }
  }

  // 4. Tự động xử lý Đổi mật khẩu (doi-pass.html)
  if (window.location.pathname.includes('doi-pass.html')) {
    const user = LunihomeAPI.auth.getUser();
    const changeForm = document.querySelector('.auth-card form');
    if (user && changeForm) {
      const emailInput = changeForm.querySelector('input[type="email"]');
      if (emailInput) emailInput.value = user.email;
    }

    if (changeForm) {
      changeForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const passInputs = changeForm.querySelectorAll('input[type="password"]');
        const currentPass = passInputs[0]?.value;
        const newPass = passInputs[1]?.value;
        const confirmPass = passInputs[2]?.value;

        if (!currentPass || !newPass) {
          alert('Vui lòng nhập đầy đủ mật khẩu cũ và mới!');
          return;
        }

        if (newPass !== confirmPass) {
          alert('Mật khẩu xác nhận không khớp!');
          return;
        }

        try {
          const res = await LunihomeAPI.auth.changePassword(currentPass, newPass);
          if (res.success) {
            alert('Đổi mật khẩu thành công!');
            changeForm.reset();
          } else {
            alert('Lỗi: ' + res.message);
          }
        } catch (err) {
          alert('Lỗi kết nối API!');
        }
      });
    }
  }

  // 5. Tự động xử lý Quên mật khẩu (quen-mat-khau.html)
  if (window.location.pathname.includes('quen-mat-khau.html')) {
    const forgotForm = document.querySelector('.auth-card form');
    if (forgotForm) {
      forgotForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const emailInput = forgotForm.querySelector('input[type="email"]');
        if (!emailInput?.value) {
          alert('Vui lòng nhập email của bạn!');
          return;
        }

        try {
          const res = await LunihomeAPI.auth.forgotPassword(emailInput.value);
          alert(res.message);
          if (res.success) {
            window.location.href = 'dang-nhap.html';
          }
        } catch (err) {
          alert('Lỗi kết nối API!');
        }
      });
    }
  }

  // 6. Tự động tải sản phẩm từ API lên Trang chủ (index.html)
  const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
  if (isHomePage) {
    const productGrids = document.querySelectorAll('.product-grid');
    const carousel = document.querySelector('[data-banner-carousel]');

    if (carousel) {
      const track = carousel.querySelector('.hero-track');
      const previousButton = carousel.querySelector('.hero-prev');
      const nextButton = carousel.querySelector('.hero-next');
      const dots = carousel.querySelector('.hero-dots');
      const fallbackImage = track.querySelector('.hero-image').src;
      const description = 'Khám phá bộ sưu tập đèn trang trí hiện đại cho phòng khách, phòng ngủ, bàn làm việc và những góc decor yêu thích.';
      let activeIndex = 0;
      let autoplay;

      function getBannerLink(link) {
        const value = typeof link === 'string' ? link.trim() : '';
        const categoryMatch = value.match(/^\/danh-muc\/([^/?#]+)/);
        if (categoryMatch) return `danh-muc.html?slug=${encodeURIComponent(categoryMatch[1])}`;
        if (!value) return 'san-pham.html';

        try {
          const url = new URL(value, window.location.href);
          if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
        } catch (error) {
          console.warn('Đường dẫn banner không hợp lệ:', error);
        }

        return 'san-pham.html';
      }

      function createSlide(banner) {
        const slide = document.createElement('article');
        slide.className = 'hero-slide';

        const image = document.createElement('img');
        image.className = 'hero-image';
        image.src = banner.hinh_anh || fallbackImage;
        image.alt = banner.ten_banner || 'Banner Lunihome';

        const content = document.createElement('div');
        content.className = 'hero-content';

        const tag = document.createElement('div');
        tag.className = 'hero-tag';
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-sparkles';
        icon.setAttribute('aria-hidden', 'true');
        tag.append(icon, document.createTextNode(' Lunihome Collection'));

        const title = document.createElement('h1');
        title.textContent = banner.ten_banner || 'Thắp sáng không gian, nâng tầm phong cách.';

        const text = document.createElement('p');
        text.textContent = description;

        const link = document.createElement('a');
        link.className = 'btn btn-primary';
        link.href = getBannerLink(banner.lien_ket);
        link.append(
          document.createTextNode('Khám phá sản phẩm '),
          Object.assign(document.createElement('i'), {
            className: 'fa-solid fa-arrow-right'
          })
        );

        content.append(tag, title, text, link);
        slide.append(image, content);
        return slide;
      }

      function showSlide(index) {
        activeIndex = (index + track.children.length) % track.children.length;
        track.style.transform = `translateX(-${activeIndex * 100}%)`;
        dots.querySelectorAll('.hero-dot').forEach((dot, dotIndex) => {
          dot.setAttribute('aria-current', dotIndex === activeIndex ? 'true' : 'false');
        });
      }

      function renderBanners(banners) {
        track.replaceChildren(...banners.map(createSlide));
        previousButton.hidden = banners.length < 2;
        nextButton.hidden = banners.length < 2;
        dots.hidden = banners.length < 2;
        dots.replaceChildren(...banners.map((banner, index) => {
          const dot = document.createElement('button');
          dot.className = 'hero-dot';
          dot.type = 'button';
          dot.setAttribute('aria-label', `Chuyển đến banner ${index + 1}`);
          dot.setAttribute('aria-current', index === 0 ? 'true' : 'false');
          dot.addEventListener('click', () => {
            showSlide(index);
            startAutoplay();
          });
          return dot;
        }));
        showSlide(0);
      }

      function stopAutoplay() {
        if (autoplay) clearInterval(autoplay);
        autoplay = null;
      }

      function startAutoplay() {
        stopAutoplay();
        if (track.children.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        autoplay = setInterval(() => showSlide(activeIndex + 1), 5000);
      }

      async function loadBanners() {
        try {
          const result = await LunihomeAPI.banners.getAll();
          if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
            console.warn('Không có banner trong MySQL; đang dùng banner mẫu.');
            return;
          }

          renderBanners(result.data);
          startAutoplay();
        } catch (error) {
          console.error('Không thể tải banner từ MySQL; đang dùng banner mẫu:', error);
        }
      }

      renderBanners([
        {
          ten_banner: 'Thắp sáng không gian, nâng tầm phong cách.',
          hinh_anh: fallbackImage,
          lien_ket: 'san-pham.html'
        },
        {
          ten_banner: 'Không gian sống cùng ánh sáng ấm',
          hinh_anh: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80',
          lien_ket: 'danh-muc.html?slug=den-tha'
        }
      ]);
      previousButton.addEventListener('click', () => {
        showSlide(activeIndex - 1);
        startAutoplay();
      });
      nextButton.addEventListener('click', () => {
        showSlide(activeIndex + 1);
        startAutoplay();
      });
      carousel.addEventListener('mouseenter', stopAutoplay);
      carousel.addEventListener('mouseleave', startAutoplay);
      carousel.addEventListener('focusin', stopAutoplay);
      carousel.addEventListener('focusout', event => {
        if (!carousel.contains(event.relatedTarget)) startAutoplay();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAutoplay();
        else startAutoplay();
      });

      startAutoplay();
      loadBanners();
    }

    function renderDbError(msg = 'Không thể kết nối cơ sở dữ liệu MySQL!') {
      return `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px; background: rgba(239, 68, 68, 0.06); border: 2px dashed #ef4444; border-radius: 12px; color: #ef4444;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 32px; margin-bottom: 10px; display: inline-block;"></i>
          <div style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">${msg}</div>
          <p style="color: var(--muted); font-size: 13px;">Không có dữ liệu từ Database 'lunihome'. Vui lòng khởi động Backend (port 5000) & MySQL.</p>
        </div>
      `;
    }

    function renderCard(p) {
      return `
        <article class="product-card">
          <a class="product-image" href="chi-tiet-san-pham.html?slug=${encodeURIComponent(p.slug)}">
            ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
            <button class="favorite" type="button" data-product="${p.name}" data-product-id="${p.id}"><i class="fa-regular fa-heart"></i></button>
            <img src="${p.thumbnail || ''}" alt="${p.name}" loading="lazy">
          </a>
          <div class="product-info">
            <span class="product-brand">${p.brand_name || 'LumiHome'}</span>
            <a class="product-name" href="chi-tiet-san-pham.html?slug=${encodeURIComponent(p.slug)}">${p.name}</a>
            <div class="product-meta">
              <span class="rating">★★★★★</span>
              <span>${p.review_count || 0} đánh giá</span>
            </div>
            <div class="product-bottom">
              <span class="price">${Number(p.price).toLocaleString('vi-VN')}đ</span>
              <button class="cart-btn add-to-cart-btn" type="button" data-id="${p.id}" data-name="${p.name}" data-stock="${p.stock}" ${Number(p.stock) <= 0 ? 'disabled style="opacity:0.4;cursor:not-allowed;" title="Hết hàng"' : ''}><i class="fa-solid fa-cart-plus"></i></button>
            </div>
          </div>
        </article>
      `;
    }

    // Tải Sản phẩm mới (Grid 1)
    if (productGrids[0]) {
      LunihomeAPI.products.getAll({ limit: 4, sort: 'newest' }).then(res => {
        if (res && res.success && res.data && res.data.length > 0) {
          productGrids[0].innerHTML = res.data.map(renderCard).join('');
        } else {
          productGrids[0].innerHTML = renderDbError('Không tìm thấy sản phẩm trong Database lunihome');
        }
      }).catch(err => {
        productGrids[0].innerHTML = renderDbError('Mất kết nối CSDL MySQL (Backend offline)!');
      });
    }

    // Tải Sản phẩm xem nhiều / nổi bật (Grid 2)
    if (productGrids[1]) {
      LunihomeAPI.products.getAll({ limit: 4, sort: 'popular' }).then(res => {
        if (res && res.success && res.data && res.data.length > 0) {
          productGrids[1].innerHTML = res.data.map(renderCard).join('');
        } else {
          productGrids[1].innerHTML = renderDbError('Không tìm thấy sản phẩm trong Database lunihome');
        }
      }).catch(err => {
        productGrids[1].innerHTML = renderDbError('Mất kết nối CSDL MySQL (Backend offline)!');
      });
    }
  }

  // ============================================================
  // 7 & 8. BỘ LỌC TƯƠNG TÁC SẢN PHẨM (san-pham.html & danh-muc.html)
  // Cho phép click chọn Giá, Thương hiệu, Phong cách, v.v. và hiển thị sản phẩm tức thì
  // ============================================================
  function setupCatalogFiltering(isCategoryPage = false) {
    const urlParams = new URLSearchParams(window.location.search);
    const categorySlug = isCategoryPage ? (urlParams.get('slug') || 'den-tran') : null;

    const productGrid = document.querySelector('.product-grid');
    const toolbarCount = document.querySelector('.product-toolbar strong');
    const sortSelect = document.querySelector('.sort-box select');
    const pageTitle = document.querySelector('h1');
    const filterPanel = document.querySelector('.filter-panel');
    const pagingEl = document.querySelector('.paging');

    if (!productGrid || !filterPanel) return;

    // Tạo nút xóa tất cả bộ lọc trong panel
    let resetWrap = filterPanel.querySelector('.filter-reset-wrap');
    if (!resetWrap) {
      resetWrap = document.createElement('div');
      resetWrap.className = 'filter-reset-wrap';
      resetWrap.style.display = 'none';
      resetWrap.innerHTML = `
        <button class="filter-reset-btn" type="button" title="Xóa các lựa chọn lọc">
          <i class="fa-solid fa-rotate-left"></i> Xóa tất cả bộ lọc
        </button>
      `;
      filterPanel.appendChild(resetWrap);
    }
    const resetBtn = resetWrap.querySelector('.filter-reset-btn');

    function updateResetBtn() {
      const activeChips = filterPanel.querySelectorAll('.chip.active');
      if (resetWrap) {
        resetWrap.style.display = activeChips.length > 0 ? 'flex' : 'none';
      }
    }

    function renderProductCard(p) {
      const safeName = (p.name || '').replace(/'/g, "\\'");
      return `
        <article class="product-card">
          <a class="product-image" href="chi-tiet-san-pham.html?slug=${encodeURIComponent(p.slug || '')}">
            ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
            <button class="favorite" type="button" data-product="${p.name}" data-product-id="${p.id}"><i class="fa-regular fa-heart"></i></button>
            <img src="${p.thumbnail || 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80'}" alt="${p.name}" loading="lazy">
          </a>
          <div class="product-info">
            <span class="product-brand">${p.brand_name || 'LumiHome'}</span>
            <a class="product-name" href="chi-tiet-san-pham.html?slug=${encodeURIComponent(p.slug || '')}">${p.name}</a>
            <div class="product-meta">
              <span class="rating">★★★★★</span>
              <span>${p.review_count || 0} đánh giá</span>
            </div>
            <div class="product-bottom">
              <span class="price">${Number(p.price || 0).toLocaleString('vi-VN')}đ</span>
              <button class="cart-btn add-to-cart-btn" type="button" data-id="${p.id}" data-name="${p.name}" data-stock="${p.stock}" ${Number(p.stock) <= 0 ? 'disabled style="opacity:0.4;cursor:not-allowed;" title="Hết hàng"' : ''}><i class="fa-solid fa-cart-plus"></i></button>
            </div>
          </div>
        </article>
      `;
    }

    // Gắn sự kiện click cho từng chip lọc
    filterPanel.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', function (e) {
        e.preventDefault();
        const block = chip.closest('.filter-block');
        const wasActive = chip.classList.contains('active');

        // Bỏ chọn các chip cùng nhóm
        if (block) {
          block.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        }

        // Bật/tắt chip vừa chọn
        if (!wasActive) {
          chip.classList.add('active');
        }

        updateResetBtn();
        applyFilterLogic();
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        filterPanel.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        updateResetBtn();
        applyFilterLogic();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        applyFilterLogic();
      });
    }

    function getSelectedFilters() {
      const filters = {
        price: '',
        brand: '',
        style: '',
        category: '',
        space: ''
      };

      filterPanel.querySelectorAll('.filter-block').forEach(block => {
        const titleEl = block.querySelector('h3');
        if (!titleEl) return;
        const title = titleEl.textContent.trim().toLowerCase();
        const activeChip = block.querySelector('.chip.active');
        if (!activeChip) return;

        const val = activeChip.textContent.trim();
        if (title.includes('giá')) filters.price = val;
        else if (title.includes('thương hiệu')) filters.brand = val;
        else if (title.includes('phong cách')) filters.style = val;
        else if (title.includes('loại đèn')) filters.category = val;
        else if (title.includes('không gian')) filters.space = val;
      });

      return filters;
    }

    async function applyFilterLogic() {
      const filters = getSelectedFilters();
      const sortVal = sortSelect ? sortSelect.value : '';

      productGrid.style.opacity = '0.6';

      try {
        const params = { limit: 100 };
        if (categorySlug) params.category = categorySlug;
        if (filters.price) params.priceRange = filters.price;
        if (filters.brand) params.brand = filters.brand;
        if (filters.style) params.style = filters.style;
        if (filters.category) params.category = filters.category;
        if (filters.space) params.space = filters.space;

        if (sortVal === 'Giá tăng dần') params.sort = 'price_asc';
        else if (sortVal === 'Giá giảm dần') params.sort = 'price_desc';
        else params.sort = 'newest';

        const res = await LunihomeAPI.products.getAll(params);
        let products = (res && res.success && res.data) ? res.data : [];

        // Lọc đối chiếu thêm phía client để kết quả hiển thị tức thì chuẩn xác
        if (filters.price) {
          const pStr = filters.price.toLowerCase();
          products = products.filter(p => {
            const price = Number(p.price) || 0;
            if (pStr.includes('dưới 500k')) return price < 500000;
            if (pStr.includes('500k - 1m')) return price >= 500000 && price <= 1000000;
            if (pStr.includes('1m - 2m')) return price >= 1000000 && price <= 2000000;
            if (pStr.includes('trên 2m')) return price > 2000000;
            return true;
          });
        }

        if (filters.brand) {
          const bStr = filters.brand.toLowerCase();
          products = products.filter(p => {
            const bName = (p.brand_name || '').toLowerCase();
            const pName = (p.name || '').toLowerCase();
            return bName.includes(bStr) || pName.includes(bStr);
          });
        }

        if (filters.category) {
          const cStr = filters.category.toLowerCase();
          products = products.filter(p => {
            const cName = (p.category_name || '').toLowerCase();
            const pName = (p.name || '').toLowerCase();
            return cName.includes(cStr) || pName.includes(cStr);
          });
        }

        if (filters.style) {
          const sStr = filters.style.toLowerCase();
          let kws = [sStr];
          if (sStr.includes('hiện đại')) kws = ['hiện đại', 'modern', 'tối giản', 'led', 'aurora', 'elegant'];
          else if (sStr.includes('scandinavian')) kws = ['scandinavian', 'bắc âu', 'tối giản', 'gỗ', 'moon', 'cozy'];
          else if (sStr.includes('vintage')) kws = ['vintage', 'classic', 'cổ điển', 'pha lê', 'crystal'];
          else if (sStr.includes('industrial')) kws = ['industrial', 'công nghiệp', 'nhôm', 'thép', 'classic', 'study'];

          products = products.filter(p => {
            const text = `${p.name || ''} ${p.short_description || ''} ${p.description || ''}`.toLowerCase();
            return kws.some(k => text.includes(k));
          });
        }

        if (filters.space) {
          const spStr = filters.space.toLowerCase();
          let kws = [spStr];
          if (spStr.includes('phòng khách')) kws = ['phòng khách', 'trần', 'pha lê', 'chùm', 'aurora', 'elegant'];
          else if (spStr.includes('phòng ngủ')) kws = ['phòng ngủ', 'ngủ', 'ấm áp', 'dịu', 'moon'];
          else if (spStr.includes('bếp')) kws = ['bếp', 'ăn', 'thả', 'quầy bar', 'modern', 'crystal'];
          else if (spStr.includes('văn phòng')) kws = ['văn phòng', 'làm việc', 'bàn', 'chống cận', 'cozy', 'study'];

          products = products.filter(p => {
            const text = `${p.name || ''} ${p.short_description || ''} ${p.description || ''} ${p.category_name || ''}`.toLowerCase();
            return kws.some(k => text.includes(k));
          });
        }

        // Cập nhật tên danh mục
        if (isCategoryPage && pageTitle) {
          if (products.length > 0 && products[0].category_name) {
            pageTitle.textContent = products[0].category_name;
          } else if (categorySlug) {
            const catMap = {
              'den-tran': 'Đèn trần',
              'den-tha': 'Đèn thả',
              'den-ban': 'Đèn bàn',
              'den-tuong': 'Đèn tường',
              'den-ngu': 'Đèn ngủ',
              'den-decor': 'Đèn decor'
            };
            if (catMap[categorySlug]) pageTitle.textContent = catMap[categorySlug];
          }
        }

        if (toolbarCount) {
          toolbarCount.textContent = `${products.length} sản phẩm`;
        }

        if (products.length > 0) {
          productGrid.innerHTML = products.map(renderProductCard).join('');
          if (pagingEl) pagingEl.style.display = products.length > 12 ? 'flex' : 'none';
        } else {
          productGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px 20px; background: #fffdfa; border: 1.5px dashed #eedfca; border-radius: 16px;">
              <i class="fa-solid fa-filter-circle-xmark" style="font-size: 38px; color: #d6a963; margin-bottom: 12px; display: inline-block;"></i>
              <div style="font-size: 17px; font-weight: 700; color: #2b251f; margin-bottom: 6px;">Không tìm thấy sản phẩm phù hợp</div>
              <p style="color: #72675f; font-size: 13px; margin-bottom: 16px;">Không có sản phẩm nào đáp ứng tất cả bộ lọc bạn vừa chọn.</p>
              <button class="filter-reset-btn" type="button" id="btnEmptyReset"><i class="fa-solid fa-rotate-left"></i> Xóa tất cả bộ lọc</button>
            </div>
          `;
          const emptyBtn = document.getElementById('btnEmptyReset');
          if (emptyBtn) {
            emptyBtn.addEventListener('click', function () {
              filterPanel.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
              updateResetBtn();
              applyFilterLogic();
            });
          }
          if (pagingEl) pagingEl.style.display = 'none';
        }

        // Kích hoạt lại yêu thích nếu có hàm
        if (typeof attachFavoriteEvents === 'function') {
          attachFavoriteEvents();
        }
      } catch (err) {
        console.error('Lỗi khi lọc sản phẩm:', err);
      } finally {
        productGrid.style.opacity = '1';
      }
    }

    updateResetBtn();
    applyFilterLogic();
  }

  // 7. Khởi tạo bộ lọc cho Trang tất cả sản phẩm (san-pham.html)
  if (window.location.pathname.includes('san-pham.html')) {
    setupCatalogFiltering(false);
  }

  // 8. Khởi tạo bộ lọc cho Trang danh mục (danh-muc.html)
  if (window.location.pathname.includes('danh-muc.html')) {
    setupCatalogFiltering(true);
  }

  // 9. Tự động tải Chi tiết sản phẩm từ API (chi-tiet-san-pham.html)
  if (window.location.pathname.includes('chi-tiet-san-pham.html')) {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    if (slug) {
      LunihomeAPI.products.getBySlug(slug).then(res => {
        if (res && res.success && res.data) {
          const p = res.data;

          // Cập nhật cả tiêu đề Banner và tiêu đề Sản phẩm
          document.querySelectorAll('h1').forEach(h1 => {
            h1.textContent = p.name;
          });
          const breadcrumbSpan = document.querySelector('.breadcrumbs span:last-child');
          if (breadcrumbSpan) breadcrumbSpan.textContent = p.name;
          document.title = `${p.name} | Lunihome`;

          const brandEl = document.querySelector('.product-brand');
          const priceEl = document.getElementById('productPrice');
          const stockEl = document.getElementById('productStock');
          const mainImg = document.querySelector('.main-image img');
          const descEl = document.querySelector('.feature-list');

          if (brandEl) brandEl.textContent = `${p.brand_name || 'LumiHome'} • ${p.category_name || 'Đèn trang trí'}`;
          if (priceEl) {
            priceEl.textContent = Number(p.price).toLocaleString('vi-VN') + 'đ';
            priceEl.dataset.basePrice = p.price;
          }
          const pStock = Number(p.stock !== undefined ? p.stock : 10);
          window.currentDetailProduct = p;
          const qtyInput = document.querySelector('.qty-input');
          const addBtn = document.querySelector('.add-to-cart-btn');
          const buyBtn = document.querySelector('.buy-now-btn');

          if (qtyInput) {
            qtyInput.max = pStock;
            qtyInput.dataset.max = pStock;
            qtyInput.dataset.stock = pStock;
            qtyInput.dataset.productId = p.id;
          }

          if (addBtn) {
            addBtn.dataset.productId = p.id;
            addBtn.dataset.stock = pStock;
            addBtn.dataset.name = p.name;
          }
          if (buyBtn) {
            buyBtn.dataset.productId = p.id;
            buyBtn.dataset.stock = pStock;
            buyBtn.dataset.name = p.name;
          }

          if (stockEl) {
            if (pStock <= 0) {
              stockEl.innerHTML = `<span style="color:#e11d48;font-weight:700;"><i class="fa-solid fa-circle-xmark"></i> Tạm hết hàng</span>`;
              if (addBtn) {
                addBtn.disabled = true;
                addBtn.style.opacity = '0.5';
                addBtn.style.cursor = 'not-allowed';
                addBtn.innerHTML = '<i class="fa-solid fa-ban"></i> Hết hàng';
              }
              if (buyBtn) {
                buyBtn.disabled = true;
                buyBtn.style.opacity = '0.5';
                buyBtn.style.cursor = 'not-allowed';
                buyBtn.innerHTML = '<i class="fa-solid fa-ban"></i> Hết hàng';
              }
              if (qtyInput) {
                qtyInput.value = 0;
                qtyInput.disabled = true;
              }
            } else {
              stockEl.innerHTML = `<span class="rating"><i class="fa-solid fa-boxes-stacked"></i> Còn <strong>${pStock}</strong> sản phẩm trong kho</span>`;
            }
          }
          if (mainImg && p.thumbnail) mainImg.src = p.thumbnail;

          // Hiển thị biến thể Công suất / Kích thước (thay vì size M/L/XL)
          const sizeOptionsContainer = document.getElementById('sizeVariantOptions');
          const sizeLabel = document.getElementById('sizeVariantLabel');
          if (sizeOptionsContainer) {
            const sizes = Array.isArray(p.variants_size) ? p.variants_size : (p.variants_size ? JSON.parse(p.variants_size) : ['12W', '24W', '36W']);
            if (sizeLabel) sizeLabel.textContent = 'Chọn công suất / Kích thước';
            if (sizes && sizes.length > 0) {
              sizeOptionsContainer.innerHTML = sizes.map((s, idx) => `
                <button class="variant-btn ${idx === 0 ? 'active' : ''}" type="button" data-value="${s}">${s}</button>
              `).join('');
            }
          }

          // Hiển thị biến thể Màu ánh sáng / Màu sắc
          const colorOptionsContainer = document.getElementById('colorVariantOptions');
          const colorLabel = document.getElementById('colorVariantLabel');
          if (colorOptionsContainer) {
            const colors = Array.isArray(p.variants_color) ? p.variants_color : (p.variants_color ? JSON.parse(p.variants_color) : ['Vàng ấm (3000K)', 'Trung tính (4000K)', 'Trắng sáng (6500K)']);
            if (colorLabel) colorLabel.textContent = 'Màu ánh sáng / Màu sắc';
            if (colors && colors.length > 0) {
              colorOptionsContainer.innerHTML = colors.map((c, idx) => `
                <button class="variant-btn ${idx === 0 ? 'active' : ''}" type="button" data-value="${c}">${c}</button>
              `).join('');
            }
          }

          // Cập nhật thông số kỹ thuật nếu có bảng
          const specTable = document.querySelector('.spec-table');
          if (specTable && p.specifications) {
            let specs = p.specifications;
            if (typeof specs === 'string') {
              try { specs = JSON.parse(specs); } catch (e) { }
            }
            if (typeof specs === 'object') {
              specTable.innerHTML = Object.entries(specs).map(([key, val]) => `
                <tr><th>${key}</th><td>${val}</td></tr>
              `).join('');
            }
          }
        }
      }).catch(e => console.log('Không thể lấy chi tiết từ API'));
    }
  }

  // Đồng bộ số lượng giỏ hàng trên Header ngay khi tải trang
  if (LunihomeAPI.cart) {
    if (LunihomeAPI.auth.isLoggedIn()) {
      LunihomeAPI.cart.load().catch(error => console.error('Không thể tải giỏ hàng:', error));
    } else {
      LunihomeAPI.cart.updateHeaderBadge();
    }
  }

  // Lắng nghe sự kiện bấm nút Thêm vào giỏ hàng và Mua ngay trên toàn trang
  document.addEventListener('click', async function (e) {
    if (e.defaultPrevented) return;
    const btn = e.target.closest('.add-to-cart-btn');
    if (btn) {
      e.preventDefault();
      if (!LunihomeAPI.auth.isLoggedIn()) {
        alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!');
        const currentUrl = encodeURIComponent(window.location.href);
        window.location.href = 'dang-nhap.html?redirect=' + currentUrl;
        return;
      }
      const card = btn.closest('.product-card');
      const name = btn.dataset.name || card?.querySelector('.product-name')?.textContent?.trim() || document.querySelector('.product-info-block h1')?.textContent?.trim() || document.querySelector('h1')?.textContent?.trim() || 'Sản phẩm';
      const priceText = card?.querySelector('.price')?.textContent?.replace(/[^\d]/g, '') || document.getElementById('productPrice')?.textContent?.replace(/[^\d]/g, '') || '1290000';
      const img = card?.querySelector('img')?.src || document.querySelector('.main-image img')?.src || '';
      const qtyInput = document.querySelector('.qty-input');
      const qty = qtyInput ? (Number(qtyInput.value) || 1) : 1;

      // Lấy công suất và màu sắc đã chọn (nếu có trên trang)
      const activeSizeBtn = document.querySelector('#sizeVariantOptions .variant-btn.active');
      const activeColorBtn = document.querySelector('#colorVariantOptions .variant-btn.active');
      let activeSize = activeSizeBtn ? (activeSizeBtn.dataset.value || activeSizeBtn.textContent.trim()) : '';
      let activeColor = activeColorBtn ? (activeColorBtn.dataset.value || activeColorBtn.textContent.trim()) : '';

      // Nếu thêm nhanh từ danh sách (không có nút variant), tự động gán thông số chuẩn đèn
      if (!activeSize || !activeColor) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('bàn') || lowerName.includes('học')) {
          activeSize = activeSize || '9W (Chống cận)';
          activeColor = activeColor || 'Trắng tinh tế';
        } else if (lowerName.includes('ngủ')) {
          activeSize = activeSize || '5W';
          activeColor = activeColor || 'Vàng ấm dịu mắt';
        } else if (lowerName.includes('tường')) {
          activeSize = activeSize || '12W';
          activeColor = activeColor || 'Vàng đồng';
        } else if (lowerName.includes('thả')) {
          activeSize = activeSize || '25W (Ø40cm)';
          activeColor = activeColor || 'Vàng đồng';
        } else {
          activeSize = activeSize || '24W (Ø40cm)';
          activeColor = activeColor || 'Vàng ấm (3000K)';
        }
      }

      const prodStock = btn.dataset.stock !== undefined
        ? Number(btn.dataset.stock)
        : (window.currentDetailProduct?.name === name ? Number(window.currentDetailProduct.stock) : 99);
      const prodId = btn.dataset.id || btn.dataset.productId || (window.currentDetailProduct?.name === name ? window.currentDetailProduct.id : null);

      const itemVariant = [activeSize, activeColor].filter(Boolean).join(' • ') || 'Mặc định';
      try {
        await LunihomeAPI.cart.add({
          id: prodId,
          name,
          price: Number(priceText) || 1290000,
          image: img,
          quantity: qty,
          stock: prodStock,
          variant: itemVariant,
          variantSize: activeSize,
          variantColor: activeColor,
          clickedBtn: btn
        }, btn);
      } catch (error) {
        console.error('Lỗi thêm sản phẩm vào giỏ hàng:', error);
        alert(error.message || 'Không thể thêm sản phẩm vào giỏ hàng.');
      }
      return;
    }

    // Lắng nghe nút Mua ngay trên trang chi tiết sản phẩm
    const buyNowBtn = e.target.closest('.buy-now-btn, .action-row .btn-secondary');
    if (buyNowBtn && buyNowBtn.textContent.includes('Mua ngay')) {
      e.preventDefault();
      if (!LunihomeAPI.auth.isLoggedIn()) {
        alert('Vui lòng đăng nhập để mua hàng!');
        const currentUrl = encodeURIComponent(window.location.href);
        window.location.href = 'dang-nhap.html?redirect=' + currentUrl;
        return;
      }
      const name = document.querySelector('.product-info-block h1')?.textContent?.trim() || document.querySelector('h1')?.textContent?.trim() || 'Sản phẩm';
      const priceText = document.getElementById('productPrice')?.textContent?.replace(/[^\d]/g, '') || '1290000';
      const img = document.querySelector('.main-image img')?.src || '';
      const qtyInput = document.querySelector('.qty-input');
      const qty = qtyInput ? (Number(qtyInput.value) || 1) : 1;

      // Lấy công suất và màu sắc đã chọn
      const activeSizeBtn = document.querySelector('#sizeVariantOptions .variant-btn.active');
      const activeColorBtn = document.querySelector('#colorVariantOptions .variant-btn.active');
      let activeSize = activeSizeBtn ? (activeSizeBtn.dataset.value || activeSizeBtn.textContent.trim()) : '24W (Ø40cm)';
      let activeColor = activeColorBtn ? (activeColorBtn.dataset.value || activeColorBtn.textContent.trim()) : 'Vàng ấm (3000K)';

      const variant = `${activeSize} • ${activeColor}`;
      const prodStock = buyNowBtn.dataset.stock !== undefined
        ? Number(buyNowBtn.dataset.stock)
        : (window.currentDetailProduct?.name === name ? Number(window.currentDetailProduct.stock) : 99);
      const prodId = buyNowBtn.dataset.id || buyNowBtn.dataset.productId || (window.currentDetailProduct?.name === name ? window.currentDetailProduct.id : null);

      try {
        await LunihomeAPI.cart.add({
        id: prodId,
        name,
        price: Number(priceText) || 1290000,
        image: img,
        quantity: qty,
        stock: prodStock,
        variant: variant,
        variantSize: activeSize,
        variantColor: activeColor
        });
        window.location.href = 'thanh-toan.html';
      } catch (error) {
        console.error('Lỗi thêm sản phẩm vào giỏ hàng:', error);
        alert(error.message || 'Không thể thêm sản phẩm vào giỏ hàng.');
      }
    }
  });

  // 10. Tự động liên kết và đồng bộ Giỏ hàng (gio-hang.html)
  if (window.location.pathname.includes('gio-hang.html') && !document.getElementById('cartTableBody')) {
    const cartTbody = document.querySelector('.cart-table tbody');
    const subtotalEl = document.querySelector('.summary-list .summary-item:first-child strong');
    const discountEl = document.querySelector('.summary-list .summary-item:nth-child(3) strong');
    const totalEl = document.querySelector('.summary-total span:last-child');
    const couponInput = document.getElementById('couponCode');
    const couponBtn = document.querySelector('.coupon-box button');
    let currentDiscount = 0;

    function renderCart() {
      const items = LunihomeAPI.cart.getItems();
      if (!cartTbody) return;

      if (items.length === 0) {
        cartTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--muted);">Giỏ hàng của bạn đang trống.<br><a href="san-pham.html" class="btn btn-primary" style="margin-top:12px; display:inline-block;">Tiếp tục mua sắm</a></td></tr>`;
        if (subtotalEl) subtotalEl.textContent = '0đ';
        if (totalEl) totalEl.textContent = '0đ';
        return;
      }

      cartTbody.innerHTML = items.map((item, index) => {
        const maxStock = Number(item.stock !== undefined ? item.stock : 99);
        const isMax = item.quantity >= maxStock;
        return `
        <tr data-cart-item-id="${item.cartItemId}">
          <td>
            <div class="cart-product">
              <img src="${item.image}" alt="${item.name}">
              <div>
                <strong>${item.name}</strong>
                <div style="color:var(--muted);font-size:13px">Phân loại: ${item.variant || 'Mặc định'}</div>
                <div style="color:${isMax ? '#e11d48' : 'var(--muted)'};font-size:12px;margin-top:3px;">
                  <i class="fa-solid fa-boxes-stacked"></i> Tồn kho: <strong>${maxStock}</strong>
                  ${isMax ? '<span style="color:#e11d48;font-weight:600;margin-left:4px;">(Đạt giới hạn tồn kho)</span>' : ''}
                </div>
              </div>
            </div>
          </td>
          <td>${Number(item.price).toLocaleString('vi-VN')}đ</td>
          <td>
            <div class="quantity-control">
              <button type="button" class="cart-minus" data-cart-item-id="${item.cartItemId}">-</button>
              <input class="qty-input" type="number" value="${item.quantity}" min="1" max="${maxStock}" data-cart-item-id="${item.cartItemId}" data-stock="${maxStock}">
              <button type="button" class="cart-plus ${isMax ? 'disabled' : ''}" data-cart-item-id="${item.cartItemId}" ${isMax ? 'disabled style="opacity:0.35;cursor:not-allowed;" title="Đã đạt số lượng tồn kho tối đa"' : ''}>+</button>
            </div>
          </td>
          <td><strong>${Number(item.price * item.quantity).toLocaleString('vi-VN')}đ</strong></td>
          <td><a class="remove-link cart-remove" href="#" data-cart-item-id="${item.cartItemId}">Xóa</a></td>
        </tr>
      `}).join('');

      updateTotals();
    }

    function updateTotals() {
      const subtotal = LunihomeAPI.cart.getTotal();
      if (subtotalEl) subtotalEl.textContent = Number(subtotal).toLocaleString('vi-VN') + 'đ';
      if (discountEl) discountEl.textContent = '-' + Number(currentDiscount).toLocaleString('vi-VN') + 'đ';
      const finalTotal = Math.max(0, subtotal - currentDiscount);
      if (totalEl) totalEl.textContent = Number(finalTotal).toLocaleString('vi-VN') + 'đ';
    }

    // Đồng bộ tồn kho mới nhất từ Database trước khi hiển thị
    LunihomeAPI.cart.syncStock().then(renderCart).catch(error => {
      console.error('Không thể tải giỏ hàng:', error);
    });

    // Xử lý tăng / giảm / xóa trong bảng giỏ hàng
    if (cartTbody) {
      cartTbody.addEventListener('click', async function (e) {
        const plusBtn = e.target.closest('.cart-plus');
        const minusBtn = e.target.closest('.cart-minus');
        const removeBtn = e.target.closest('.cart-remove');

        if (plusBtn) {
          const cartItemId = Number(plusBtn.dataset.cartItemId);
          const items = LunihomeAPI.cart.getItems();
          const item = items.find(i => i.cartItemId === cartItemId);
          if (item) {
            const maxStock = Number(item.stock !== undefined ? item.stock : 99);
            if (item.quantity >= maxStock) {
              alert(`Sản phẩm "${item.name}" trong kho chỉ còn tối đa ${maxStock} sản phẩm! Không thể thêm tiếp.`);
              return;
            }
            await LunihomeAPI.cart.updateQty(item.cartItemId, item.quantity + 1);
            renderCart();
          }
        } else if (minusBtn) {
          const cartItemId = Number(minusBtn.dataset.cartItemId);
          const items = LunihomeAPI.cart.getItems();
          const item = items.find(i => i.cartItemId === cartItemId);
          if (item && item.quantity > 1) {
            await LunihomeAPI.cart.updateQty(item.cartItemId, item.quantity - 1);
            renderCart();
          }
        } else if (removeBtn) {
          e.preventDefault();
          const cartItemId = Number(removeBtn.dataset.cartItemId);
          const item = LunihomeAPI.cart.getItems().find(i => i.cartItemId === cartItemId);
          if (item && confirm(`Bạn có chắc muốn xóa "${item.name}" khỏi giỏ hàng?`)) {
            await LunihomeAPI.cart.remove(cartItemId);
            renderCart();
          }
        }
      });

      // Bắt sự kiện khi người dùng tự gõ số lượng vào ô input
      cartTbody.addEventListener('change', async function (e) {
        const input = e.target.closest('.qty-input');
        if (!input) return;
        const cartItemId = Number(input.dataset.cartItemId);
        const item = LunihomeAPI.cart.getItems().find(cartItem => cartItem.cartItemId === cartItemId);
        const maxStock = Number(input.dataset.stock || 99);
        let val = parseInt(input.value) || 1;
        if (val > maxStock) {
          alert(`Sản phẩm "${item ? item.name : 'Sản phẩm'}" trong kho chỉ còn tối đa ${maxStock} sản phẩm! Không thể mua vượt quá tồn kho.`);
          val = maxStock;
          input.value = val;
        } else if (val < 1) {
          val = 1;
          input.value = val;
        }
        await LunihomeAPI.cart.updateQty(cartItemId, val);
        renderCart();
      });
    }

    // Xử lý áp dụng mã giảm giá qua API Backend
    if (couponBtn && couponInput) {
      couponBtn.addEventListener('click', async function (e) {
        e.preventDefault();
        const code = couponInput.value.trim();
        const subtotal = LunihomeAPI.cart.getTotal();

        if (!code) {
          alert('Vui lòng nhập mã giảm giá (VD: LUNI10, GIAM100K)!');
          return;
        }

        try {
          const res = await LunihomeAPI.coupons.apply(code, subtotal);
          if (res.success) {
            currentDiscount = Number(res.discountAmount) || 0;
            alert(`Áp dụng thành công mã "${code}"! Giảm ${Number(currentDiscount).toLocaleString('vi-VN')}đ.`);
            updateTotals();
          } else {
            alert('Mã không hợp lệ: ' + res.message);
          }
        } catch (err) {
          alert('Lỗi kết nối kiểm tra mã giảm giá!');
        }
      });
    }
  }

  // 11. Tự động xử lý Thanh toán đặt hàng (thanh-toan.html)
  if (window.location.pathname.includes('thanh-toan.html')) {
    if (!LunihomeAPI.auth.isLoggedIn()) {
      alert('Vui lòng đăng nhập để tiến hành thanh toán!');
      window.location.href = 'dang-nhap.html?redirect=thanh-toan.html';
      return;
    }
    const user = LunihomeAPI.auth.getUser();
    const nameInput = document.querySelector('input[value="Nguyễn Thị Lan"]');
    const phoneInput = document.querySelector('input[type="tel"]');
    const addressInput = document.querySelector('input[value="123 Nguyễn Văn Linh, Quận 7, TP.HCM"]');
    const submitBtn = document.querySelector('.auth-card a.btn-primary');
    const couponInput = document.getElementById('couponCode');
    const couponBtn = document.querySelector('.coupon-box button');
    const summaryList = document.querySelector('.summary-list');
    let checkoutDiscount = 0;

    // Tự điền thông tin người dùng nếu đã đăng nhập
    if (user) {
      if (nameInput && user.name) nameInput.value = user.name;
      if (phoneInput && user.phone) phoneInput.value = user.phone;
      if (addressInput && user.address) addressInput.value = user.address;
    }

    // Hiển thị danh sách sản phẩm thực tế từ Giỏ hàng sang Thanh toán
    function renderCheckoutSummary() {
      const items = LunihomeAPI.cart.getItems();
      if (summaryList && items.length > 0) {
        summaryList.innerHTML = items.map(i => `
          <div class="summary-item">
            <span>${i.name} (x${i.quantity})</span>
            <strong>${Number(i.price * i.quantity).toLocaleString('vi-VN')}đ</strong>
          </div>
        `).join('');
      }

      updateCheckoutTotals();
    }

    function updateCheckoutTotals() {
      const subtotal = LunihomeAPI.cart.getTotal();
      const totals = document.querySelectorAll('.summary-total');
      if (totals.length >= 3) {
        totals[0].innerHTML = `<span>Tổng cộng</span><span>${Number(subtotal).toLocaleString('vi-VN')}đ</span>`;
        totals[1].innerHTML = `<span>Giảm giá</span><span>-${Number(checkoutDiscount).toLocaleString('vi-VN')}đ</span>`;
        totals[2].innerHTML = `<span>Thành tiền</span><span>${Number(Math.max(0, subtotal - checkoutDiscount)).toLocaleString('vi-VN')}đ</span>`;
      }
    }

    renderCheckoutSummary();

    // Xử lý áp dụng mã giảm giá
    if (couponBtn && couponInput) {
      couponBtn.addEventListener('click', async function (e) {
        e.preventDefault();
        const code = couponInput.value.trim();
        const subtotal = LunihomeAPI.cart.getTotal();
        if (!code) {
          alert('Vui lòng nhập mã giảm giá (VD: LUNI10, GIAM100K)!');
          return;
        }

        try {
          const res = await LunihomeAPI.coupons.apply(code, subtotal);
          if (res.success) {
            checkoutDiscount = Number(res.discountAmount) || 0;
            alert(`Áp dụng thành công mã "${code}"! Giảm ${Number(checkoutDiscount).toLocaleString('vi-VN')}đ.`);
            updateCheckoutTotals();
          } else {
            alert('Mã không hợp lệ: ' + res.message);
          }
        } catch (err) {
          alert('Lỗi kiểm tra mã giảm giá!');
        }
      });
    }

    // Xử lý gửi đơn hàng thực tế lên CSDL MySQL qua API
    if (submitBtn) {
      submitBtn.addEventListener('click', async function (e) {
        e.preventDefault();
        const customerName = (nameInput ? nameInput.value : '') || 'Khách hàng';
        const customerPhone = (phoneInput ? phoneInput.value : '') || '0901234567';
        const shippingAddress = (addressInput ? addressInput.value : '') || 'TP. Hồ Chí Minh';
        const note = document.querySelector('.textarea-field')?.value || '';
        const cartItems = LunihomeAPI.cart.getItems();

        if (cartItems.length === 0) {
          alert('Giỏ hàng của bạn đang trống! Vui lòng chọn sản phẩm trước khi thanh toán.');
          return;
        }

        // Kiểm tra tồn kho trước khi thanh toán
        for (const item of cartItems) {
          const maxStock = Number(item.stock !== undefined ? item.stock : 99);
          if (Number(item.quantity) > maxStock) {
            alert(`Sản phẩm "${item.name}" trong kho chỉ còn ${maxStock} sản phẩm (bạn đang đặt ${item.quantity}). Vui lòng quay lại giỏ hàng để điều chỉnh số lượng!`);
            window.location.href = 'gio-hang.html';
            return;
          }
        }

        const orderData = {
          customerName,
          customerPhone,
          shippingAddress,
          note,
          paymentMethod: 'COD',
          items: cartItems.map(i => ({
            productId: (i.id && Number(i.id) < 1000000) ? Number(i.id) : null,
            productName: i.name,
            productImage: i.image || '',
            variantSize: i.variantSize || (i.variant ? i.variant.split('•')[0].trim() : 'Tiêu chuẩn'),
            variantColor: i.variantColor || (i.variant && i.variant.includes('•') ? i.variant.split('•')[1].trim() : 'Mặc định'),
            price: Number(i.price) || 0,
            quantity: Number(i.quantity) || 1
          }))
        };

        submitBtn.textContent = 'Đang xử lý đơn...';
        try {
          const res = await LunihomeAPI.orders.create(orderData);
          if (res.success) {
            alert(`Đặt hàng thành công! Mã đơn của bạn là: ${res.orderCode}`);
            await LunihomeAPI.cart.clear();
            window.location.href = 'cam-on.html';
          } else {
            alert('Đặt hàng thất bại: ' + res.message);
            submitBtn.textContent = 'Xác nhận thanh toán';
          }
        } catch (err) {
          alert('Lỗi kết nối API khi tạo đơn hàng!');
          submitBtn.textContent = 'Xác nhận thanh toán';
        }
      });
    }
  }

  // 12. Tự động tải Lịch sử đơn hàng (lich-su-don-hang.html)
  if (window.location.pathname.includes('lich-su-don-hang.html')) {
    if (LunihomeAPI.auth.isLoggedIn()) {
      LunihomeAPI.orders.getMyOrders().then(res => {
        if (res && res.success && res.data && res.data.length > 0) {
          const container = document.querySelector('.container.section');
          if (container) {
            const heading = container.querySelector('h1');
            const breadcrumb = container.querySelector('.breadcrumbs');
            const oldCards = container.querySelectorAll('.order-card');
            oldCards.forEach(c => c.remove());

            res.data.forEach(order => {
              const card = document.createElement('div');
              card.className = 'order-card';
              card.style.marginTop = '20px';
              card.innerHTML = `
                <div class="order-header">
                  <div>
                    <strong>Đơn #${order.order_code}</strong>
                    <div class="order-meta">
                      <span>Ngày đặt: ${new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
                      <span>Người nhận: ${order.customer_name}</span>
                    </div>
                  </div>
                  <span class="status-badge ${order.order_status === 'completed' ? 'status-done' : 'status-pending'}">
                    ${order.order_status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}
                  </span>
                </div>
                <div style="padding: 16px; border-bottom: 1px solid var(--border);">
                  <p><strong>Địa chỉ:</strong> ${order.shipping_address}</p>
                  <p><strong>Tổng tiền:</strong> <span style="color:var(--primary); font-weight:700;">${Number(order.total_amount).toLocaleString('vi-VN')}đ</span></p>
                </div>
              `;
              container.appendChild(card);
            });
          }
        }
      }).catch(e => console.log('Chưa có lịch sử đơn'));
    }
  }
});

// Xuất biến toàn cục cho các trang dùng
window.LunihomeAPI = LunihomeAPI;
