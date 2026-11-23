(function () {
  const pageName = window.location.pathname.split('/').pop() || 'index.html';

  // Tự động kích hoạt LuniAI Chatbot trên toàn bộ website
  if (!document.querySelector('script[src*="ai-chat.js"]')) {
    const chatScript = document.createElement('script');
    chatScript.src = 'ai-chat.js';
    chatScript.defer = true;
    document.body.appendChild(chatScript);
  }

  // Tự động kích hoạt Bong bóng Hotline trên toàn bộ website
  if (!document.querySelector('script[src*="hotline.js"]')) {
    const hotlineScript = document.createElement('script');
    hotlineScript.src = 'hotline.js';
    hotlineScript.defer = true;
    document.body.appendChild(hotlineScript);
  }

  const formatCurrency = function (value) {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num).replace('₫', 'đ');
  };

  const getQueryParam = function (name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name) || '';
  };

  const escapeHtml = function (value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const updateHeaderUser = function () {
    const hello = document.querySelector('.hello strong');
    const user = (() => {
      try {
        return JSON.parse(localStorage.getItem('lunihome_user') || 'null');
      } catch (error) {
        return null;
      }
    })();

    if (hello) {
      hello.textContent = user && user.name ? user.name.split(' ')[0] : 'Khách hàng';
    }

    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
      const apiCart = window.LunihomeAPI && window.LunihomeAPI.cart;
      if (apiCart) {
        cartCount.textContent = String(apiCart.getCount());
      } else {
        cartCount.textContent = '0';
      }
    }
  };

  const bindHeaderDropdown = function () {
    const accountWrap = document.getElementById('accountWrap');
    const accountBtn = document.getElementById('accountBtn');
    if (accountWrap && accountBtn) {
      accountBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        accountWrap.classList.toggle('open');
        accountBtn.setAttribute('aria-expanded', String(accountWrap.classList.contains('open')));
      });
      document.addEventListener('click', function () {
        accountWrap.classList.remove('open');
        accountBtn.setAttribute('aria-expanded', 'false');
      });
    }

    const mainNav = document.getElementById('mainNav');
    const mobileToggle = document.getElementById('mobileToggle');
    if (mainNav && mobileToggle) {
      mobileToggle.addEventListener('click', function () {
        mainNav.classList.toggle('open');
      });
    }

    document.querySelectorAll('[data-mobile-dropdown]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (window.innerWidth <= 767) {
          e.preventDefault();
          const item = link.closest('.nav-item');
          if (item) item.classList.toggle('dropdown-open');
        }
      });
    });
  };

  const bindSearchForm = function () {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    if (searchForm && searchInput) {
      searchForm.addEventListener('submit', function (e) {
        if (!searchInput.value.trim()) {
          e.preventDefault();
          searchInput.focus();
          return;
        }
        searchInput.value = searchInput.value.trim();
      });
    }
  };

  let favoritesBound = false;
  const bindFavorites = function () {
    if (favoritesBound) return;
    favoritesBound = true;
    const favoriteIds = new Set();
    const updateButtons = function () {
      document.querySelectorAll('.favorite').forEach(function (btn) {
        const selected = favoriteIds.has(Number(btn.dataset.productId));
        const icon = btn.querySelector('i');
        btn.classList.toggle('is-active', selected);
        if (icon) {
          icon.classList.toggle('fa-regular', !selected);
          icon.classList.toggle('fa-solid', selected);
        }
      });
    };
    const observer = new MutationObserver(updateButtons);
    observer.observe(document.body, { childList: true, subtree: true });

    if (window.LunihomeAPI && window.LunihomeAPI.auth.isLoggedIn()) {
      window.LunihomeAPI.wishlist.getAll().then(async function (response) {
        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(response.message || 'Không thể tải sản phẩm yêu thích.');
        }
        response.data.forEach(function (item) { favoriteIds.add(Number(item.id)); });
        updateButtons();

        const legacyValue = localStorage.getItem('lunihome_favorites');
        if (legacyValue) {
          const legacyNames = JSON.parse(legacyValue);
          if (!Array.isArray(legacyNames)) {
            throw new Error('Dữ liệu yêu thích cũ không hợp lệ; dữ liệu cũ được giữ nguyên.');
          }
          for (const legacyName of new Set(legacyNames)) {
            const productName = String(legacyName || '').trim();
            if (!productName) continue;
            const products = await window.LunihomeAPI.products.getAll({ search: productName, limit: 20 });
            const product = products.success && Array.isArray(products.data)
              ? products.data.find(function (item) { return item.name === productName; })
              : null;
            if (!product) throw new Error(`Không tìm thấy sản phẩm yêu thích cũ "${productName}".`);
            const saved = await window.LunihomeAPI.wishlist.add(product.id);
            if (!saved.success) throw new Error(saved.message || `Không thể chuyển "${productName}" sang MySQL.`);
          }
          localStorage.removeItem('lunihome_favorites');
          const refreshed = await window.LunihomeAPI.wishlist.getAll();
          if (!refreshed.success || !Array.isArray(refreshed.data)) {
            throw new Error(refreshed.message || 'Không thể tải lại danh sách yêu thích.');
          }
          favoriteIds.clear();
          refreshed.data.forEach(function (item) { favoriteIds.add(Number(item.id)); });
          updateButtons();
        }
      }).catch(function (error) {
        console.error('Lỗi tải sản phẩm yêu thích:', error);
      });
    }

    document.addEventListener('click', async function (e) {
      const btn = e.target.closest('.favorite');
      if (!btn) return;
      e.preventDefault();
      if (!window.LunihomeAPI || !window.LunihomeAPI.auth.isLoggedIn()) {
        alert('Vui lòng đăng nhập để lưu sản phẩm yêu thích.');
        window.location.href = 'dang-nhap.html?redirect=' + encodeURIComponent(window.location.href);
        return;
      }

      try {
        let productId = Number(btn.dataset.productId);
        if (!Number.isSafeInteger(productId) || productId < 1) {
          const productName = btn.dataset.product || btn.closest('.product-card')?.querySelector('.product-name')?.textContent?.trim();
          const products = await window.LunihomeAPI.products.getAll({ search: productName || '', limit: 20 });
          const match = products.success && Array.isArray(products.data)
            ? products.data.find(function (item) { return item.name === productName; })
            : null;
          productId = Number(match && match.id);
        }
        if (!Number.isSafeInteger(productId) || productId < 1) {
          throw new Error('Không xác định được mã sản phẩm để lưu yêu thích.');
        }

        const response = favoriteIds.has(productId)
          ? await window.LunihomeAPI.wishlist.remove(productId)
          : await window.LunihomeAPI.wishlist.add(productId);
        if (!response.success) throw new Error(response.message || 'Không thể cập nhật sản phẩm yêu thích.');
        if (favoriteIds.has(productId)) favoriteIds.delete(productId);
        else favoriteIds.add(productId);
        updateButtons();
      } catch (error) {
        console.error('Lỗi cập nhật sản phẩm yêu thích:', error);
        alert(error.message || 'Không thể cập nhật sản phẩm yêu thích.');
      }
    });
  };

  const bindThumbnailGallery = function () {
    document.addEventListener('click', function (e) {
      const thumbItem = e.target.closest('.thumb-item');
      if (!thumbItem) return;
      const gallery = thumbItem.closest('.gallery');
      if (!gallery) return;
      gallery.querySelectorAll('.thumb-item').forEach(function (item) {
        item.classList.remove('active');
      });
      thumbItem.classList.add('active');
      const img = thumbItem.querySelector('img');
      const mainImg = gallery.querySelector('.main-image img');
      if (img && mainImg) {
        mainImg.src = img.src;
      }
    });
  };

  const bindVariantButtons = function () {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.variant-btn');
      if (!btn) return;
      const group = btn.parentElement;
      if (!group) return;
      group.querySelectorAll('.variant-btn').forEach(function (item) {
        item.classList.remove('active');
      });
      btn.classList.add('active');

      const productPrice = document.getElementById('productPrice');
      if (productPrice) {
        let basePrice = Number(productPrice.dataset.basePrice || 0);
        if (!basePrice) {
          const cleanPrice = Number(String(productPrice.textContent || '').replace(/[^\d]/g, '')) || 0;
          basePrice = cleanPrice;
          productPrice.dataset.basePrice = String(basePrice);
        }

        const sizeButtons = Array.from(document.querySelectorAll('#sizeVariantOptions .variant-btn'));
        const activeSizeIndex = sizeButtons.findIndex(function (item) {
          return item.classList.contains('active');
        });
        let multiplier = 1;
        if (activeSizeIndex === 1) multiplier = 1.15;
        else if (activeSizeIndex === 2) multiplier = 1.35;

        const newPrice = Math.round((basePrice * multiplier) / 10000) * 10000;
        productPrice.textContent = formatCurrency(newPrice);
      }
    });
  };

  const bindQtyInputs = function () {
    document.querySelectorAll('.qty-input').forEach(function (input) {
      input.addEventListener('change', function () {
        const max = Number(input.dataset.max || input.dataset.stock || input.max || 99);
        const min = Number(input.dataset.min || input.min || 1);
        let value = Number(input.value) || min;
        if (value > max) {
          alert('Số lượng không được vượt quá số lượng tồn kho!');
          value = max;
        }
        value = Math.min(Math.max(value, min), max);
        input.value = value;
      });
    });
  };

  const getCartItems = function () {
    if (window.LunihomeAPI && window.LunihomeAPI.cart) {
      return window.LunihomeAPI.cart.getItems();
    }
    return [];
  };

  const getStoredCoupon = function () {
    try {
      const raw = localStorage.getItem('lunihome_selected_coupon');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  };

  const setStoredCoupon = function (couponData) {
    if (!couponData) {
      localStorage.removeItem('lunihome_selected_coupon');
      return;
    }
    localStorage.setItem('lunihome_selected_coupon', JSON.stringify(couponData));
  };

  const getCartSummary = function (items, couponData) {
    const subtotal = items.reduce(function (sum, item) {
      return sum + (Number(item.price) || 0) * (Number(item.quantity) || 1);
    }, 0);
    const shippingFee = subtotal >= 500000 ? 0 : 30000;
    const discountAmount = Number((couponData && couponData.discount_amount) || 0);
    const total = Math.max(0, subtotal - discountAmount + shippingFee);
    return {
      subtotal,
      shippingFee,
      discountAmount,
      total
    };
  };

  const applyCoupon = async function (code, subtotal) {
    const cleanCode = String(code || '').trim();
    if (!cleanCode) {
      alert('Vui lòng nhập mã giảm giá.');
      return null;
    }

    if (!window.LunihomeAPI || !window.LunihomeAPI.coupons) {
      alert('Hệ thống mã giảm giá chưa sẵn sàng.');
      return null;
    }

    const response = await window.LunihomeAPI.coupons.apply(cleanCode, subtotal);
    if (!response || !response.success) {
      alert(response && response.message ? response.message : 'Mã giảm giá không hợp lệ.');
      return null;
    }

    const couponInfo = response.coupon || {};
    const normalizedCoupon = {
      code: String(couponInfo.code || cleanCode).toUpperCase(),
      discount_amount: Number(couponInfo.discount_amount || 0)
    };
    setStoredCoupon(normalizedCoupon);
    return normalizedCoupon;
  };

  const renderCartPage = async function () {
    const tableBody = document.getElementById('cartTableBody');
    const emptyState = document.getElementById('cartEmptyState');
    const cartTable = document.getElementById('cartTable');
    const subtotalNode = document.getElementById('cartSubtotal');
    const shippingNode = document.getElementById('cartShippingFee');
    const discountNode = document.getElementById('cartDiscount');
    const totalNode = document.getElementById('cartTotal');
    const checkoutButton = document.getElementById('checkoutButton');

    if (!tableBody) return;
    if (!window.LunihomeAPI.auth.isLoggedIn()) {
      if (emptyState) {
        emptyState.style.display = 'block';
        emptyState.innerHTML = 'Vui lòng <a href="dang-nhap.html?redirect=gio-hang.html">đăng nhập</a> để xem giỏ hàng.';
      }
      if (cartTable) cartTable.style.display = 'none';
      return;
    }

    try {
      await window.LunihomeAPI.cart.load();
    } catch (error) {
      console.error('Lỗi tải giỏ hàng:', error);
      if (emptyState) {
        emptyState.style.display = 'block';
        emptyState.innerHTML = `Không thể tải giỏ hàng: ${escapeHtml(error.message)}. <a href="dang-nhap.html">Đăng nhập lại</a>`;
      }
      if (cartTable) cartTable.style.display = 'none';
      return;
    }

    const items = getCartItems();
    const activeCoupon = getStoredCoupon();
    const summary = getCartSummary(items, activeCoupon);

    if (!items.length) {
      tableBody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (cartTable) cartTable.style.display = 'none';
      if (subtotalNode) subtotalNode.textContent = formatCurrency(0);
      if (shippingNode) shippingNode.textContent = formatCurrency(0);
      if (discountNode) discountNode.textContent = formatCurrency(0);
      if (totalNode) totalNode.textContent = formatCurrency(0);
      if (checkoutButton) {
        checkoutButton.setAttribute('href', 'gio-hang.html');
        checkoutButton.classList.add('disabled');
        checkoutButton.setAttribute('aria-disabled', 'true');
      }
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (cartTable) cartTable.style.display = 'table';

    tableBody.innerHTML = items.map(function (item) {
      const productName = item.name || 'Sản phẩm';
      const qty = Number(item.quantity) || 1;
      const stock = item.stock !== undefined && item.stock !== null ? Number(item.stock) : 0;
      const image = item.image || 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80';
      const variantLabel = [item.variantSize, item.variantColor].filter(Boolean).join(' / ') || item.variant || 'Mặc định';
      const itemTotal = (Number(item.price) || 0) * qty;
      return `
        <tr data-item-name="${escapeHtml(productName)}">
          <td>
            <div class="cart-product">
              <img src="${escapeHtml(image)}" alt="${escapeHtml(productName)}">
              <div>
                <strong>${escapeHtml(productName)}</strong>
                <div style="color:var(--muted);font-size:13px">Phân loại: ${escapeHtml(variantLabel)}</div>
              </div>
            </div>
          </td>
          <td>${formatCurrency(Number(item.price) || 0)}</td>
          <td>
            <div class="quantity-control">
              <button type="button" data-qty-action="decrease" data-name="${escapeHtml(productName)}" data-cart-item-id="${item.cartItemId}">-</button>
              <input class="qty-input" type="number" value="${qty}" min="1" max="${stock}" data-min="1" data-max="${stock}" data-name="${escapeHtml(productName)}" data-cart-item-id="${item.cartItemId}" data-stock="${stock}">
              <button type="button" data-qty-action="increase" data-name="${escapeHtml(productName)}" data-cart-item-id="${item.cartItemId}">+</button>
            </div>
          </td>
          <td>${formatCurrency(itemTotal)}</td>
          <td><button type="button" class="remove-link cart-remove-btn" data-name="${escapeHtml(productName)}" data-cart-item-id="${item.cartItemId}">Xóa</button></td>
        </tr>
      `;
    }).join('');

    if (subtotalNode) subtotalNode.textContent = formatCurrency(summary.subtotal);
    if (shippingNode) shippingNode.textContent = formatCurrency(summary.shippingFee);
    if (discountNode) discountNode.textContent = `-${formatCurrency(summary.discountAmount)}`;
    if (totalNode) totalNode.textContent = formatCurrency(summary.total);

    if (checkoutButton) {
      checkoutButton.classList.remove('disabled');
      checkoutButton.setAttribute('aria-disabled', 'false');
    }

    document.querySelectorAll('.cart-remove-btn').forEach(function (button) {
      button.addEventListener('click', async function (e) {
        e.preventDefault();
        const name = button.dataset.name;
        if (!name) return;
        if (window.LunihomeAPI && window.LunihomeAPI.cart) {
          try {
            await window.LunihomeAPI.cart.remove(Number(button.dataset.cartItemId) || name);
          } catch (error) {
            alert(error.message || 'Không thể xóa sản phẩm khỏi giỏ hàng.');
            return;
          }
        } else {
          alert('Kết nối giỏ hàng chưa sẵn sàng.');
          return;
        }
        await renderCartPage();
        updateHeaderUser();
      });
    });

    document.querySelectorAll('[data-qty-action]').forEach(function (button) {
      button.addEventListener('click', async function (e) {
        e.preventDefault();
        const input = button.parentElement.querySelector('.qty-input');
        if (!input) return;
        const itemName = input.dataset.name || '';
        const max = Number(input.dataset.max || input.dataset.stock || 99);
        const current = Number(input.value) || 1;
        const nextValue = button.dataset.qtyAction === 'increase' ? current + 1 : current - 1;
        const finalValue = Math.min(Math.max(nextValue, 1), max);
        input.value = String(finalValue);
        if (itemName) {
          const itemsList = getCartItems();
          const item = itemsList.find(function (cartItem) {
            return cartItem.cartItemId === Number(input.dataset.cartItemId);
          });
          if (item) {
            const corrected = Math.min(Math.max(finalValue, 1), Number(item.stock || max));
            if (window.LunihomeAPI && window.LunihomeAPI.cart) {
              try {
                await window.LunihomeAPI.cart.updateQty(item.cartItemId, corrected);
              } catch (error) {
                alert(error.message || 'Không thể cập nhật số lượng.');
              }
            } else {
              alert('Kết nối giỏ hàng chưa sẵn sàng.');
            }
            await renderCartPage();
          }
        }
      });
    });

    document.querySelectorAll('.qty-input').forEach(function (input) {
      input.addEventListener('change', async function () {
        const itemName = input.dataset.name || '';
        const max = Number(input.dataset.max || input.dataset.stock || 99);
        let value = Number(input.value) || 1;
        value = Math.max(1, Math.min(value, max));
        input.value = String(value);
        if (itemName) {
          const itemsList = getCartItems();
          const item = itemsList.find(function (cartItem) {
            return cartItem.cartItemId === Number(input.dataset.cartItemId);
          });
          if (item) {
            if (window.LunihomeAPI && window.LunihomeAPI.cart) {
              try {
                await window.LunihomeAPI.cart.updateQty(item.cartItemId, value);
              } catch (error) {
                alert(error.message || 'Không thể cập nhật số lượng.');
                return;
              }
            } else {
              alert('Kết nối giỏ hàng chưa sẵn sàng.');
            }
            await renderCartPage();
          }
        }
      });
    });

    const applyCouponBtn = document.getElementById('applyCouponBtn');
    if (applyCouponBtn) {
      applyCouponBtn.addEventListener('click', async function () {
        const couponInput = document.getElementById('couponCode');
        const code = couponInput ? couponInput.value : '';
        const coupon = await applyCoupon(code, summary.subtotal);
        if (coupon) {
          renderCartPage();
        }
      });
    }

    document.querySelectorAll('.coupon-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        const input = document.getElementById('couponCode');
        if (!input) return;
        input.value = chip.dataset.code || '';
      });
    });
  };

  const renderProductCard = function (product) {
    const id = product.id || '';
    const name = product.name || 'Sản phẩm';
    const image = product.thumbnail || product.image || product.images?.[0] || 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80';
    const price = Number(product.price || 0);
    const rating = Number(product.rating || 5);
    const reviewCount = Number(product.review_count || product.reviews || 0);
    const slug = encodeURIComponent(product.slug || name);

    return `
      <article class="product-card">
        <a class="product-image" href="chi-tiet-san-pham.html?slug=${slug}">
          <button class="favorite" type="button" data-product="${escapeHtml(name)}" data-product-id="${id}"><i class="fa-regular fa-heart"></i></button>
          <img src="${image}" alt="${escapeHtml(name)}" loading="lazy">
        </a>
        <div class="product-info">
          <span class="product-brand">${escapeHtml(product.brand_name || 'Lunihome')}</span>
          <a class="product-name" href="chi-tiet-san-pham.html?slug=${slug}">${escapeHtml(name)}</a>
          <div class="product-meta">
            <span class="rating">${'★'.repeat(Math.min(5, Math.round(rating)))}${'☆'.repeat(Math.max(0, 5 - Math.min(5, Math.round(rating))))}</span>
            <span>${reviewCount} đánh giá</span>
          </div>
          <div class="product-bottom">
            <span class="price">${formatCurrency(price)}</span>
            <button class="cart-btn add-to-cart-btn" data-id="${id}" data-name="${escapeHtml(name)}" data-price="${price}" data-stock="${product.stock || 99}" data-image="${escapeHtml(image)}" type="button"><i class="fa-solid fa-cart-plus"></i></button>
          </div>
        </div>
      </article>
    `;
  };

  const renderProductGrid = function (products, container) {
    if (!container) return;
    if (!products || !products.length) {
      container.innerHTML = '<div class="empty-state">Không tìm thấy sản phẩm phù hợp.</div>';
      return;
    }
    container.innerHTML = products.map(renderProductCard).join('');
  };

  const buildPagination = function (page, totalPages, baseUrl) {
    const pages = [];
    for (let i = 1; i <= totalPages; i += 1) {
      const active = i === page ? 'active' : '';
      pages.push(`<a href="${baseUrl}${i === 1 ? '' : '?page=' + i}" class="${active}">${i}</a>`);
    }
    return pages.join('');
  };

  const initProductListPage = async function () {
    const grid = document.querySelector('.product-grid');
    if (!grid) return;

    const pageQuery = Number(getQueryParam('page')) || 1;
    const params = { page: pageQuery, limit: 8 };
    const path = pageName;

    if (path === 'danh-muc.html') {
      const slug = getQueryParam('slug') || 'den-tran';
      params.category = slug;
    }
    if (path === 'tim-kiem.html') {
      const keyword = getQueryParam('q');
      if (keyword) params.search = keyword;
    }
    if (path === 'san-pham.html') {
      if (getQueryParam('sort')) params.sort = getQueryParam('sort');
    }
    if (path === 'index.html') {
      params.is_featured = 'true';
      params.limit = 4;
    }

    const api = window.LunihomeAPI;
    if (!api || !api.products) {
      return;
    }

    try {
      const res = await api.products.getAll(params);
      if (res && res.success && Array.isArray(res.data)) {
        renderProductGrid(res.data, grid);
        const paginationContainer = document.querySelector('.paging');
        if (paginationContainer && res.totalPages > 1) {
          const baseUrl = path === 'danh-muc.html' ? `danh-muc.html?slug=${encodeURIComponent(getQueryParam('slug') || 'den-tran')}&page=` : path === 'tim-kiem.html' ? `tim-kiem.html?q=${encodeURIComponent(getQueryParam('q') || '')}&page=` : `san-pham.html?page=`;
          paginationContainer.innerHTML = buildPagination(pageQuery, res.totalPages, baseUrl);
        }
      } else {
        grid.innerHTML = '<div class="empty-state">Không thể tải danh sách sản phẩm.</div>';
      }
    } catch (error) {
      console.error('Lỗi tải sản phẩm:', error);
      grid.innerHTML = '<div class="empty-state">Lỗi kết nối máy chủ sản phẩm.</div>';
    }
  };

  const initProductDetailPage = async function () {
    const slug = getQueryParam('slug');
    if (!slug || !document.querySelector('.product-detail')) return;

    const api = window.LunihomeAPI;
    if (!api || !api.products) return;

    try {
      const response = await api.products.getBySlug(slug);
      if (!response || !response.success || !response.data) {
        document.querySelector('.product-detail').innerHTML = '<div class="empty-state">Không tìm thấy sản phẩm.</div>';
        return;
      }

      const product = response.data;
      const images = Array.isArray(product.images) && product.images.length ? product.images : [product.thumbnail];
      const specs = product.specifications && typeof product.specifications === 'object' ? product.specifications : {};
      const sizeOptions = Array.isArray(product.variants_size) ? product.variants_size : ['12W', '24W', '36W'];
      const colorOptions = Array.isArray(product.variants_color) ? product.variants_color : ['Ánh sáng Vàng 3000K', 'Trung tính 4000K', 'Trắng sáng 6500K'];
      const price = Number(product.price || 0);

      document.title = `${product.name} | Lunihome`;
      const pageTitle = document.querySelector('.page-banner h1');
      if (pageTitle) pageTitle.textContent = product.name;

      const breadcrumbs = document.querySelector('.breadcrumbs');
      if (breadcrumbs) {
        breadcrumbs.innerHTML = `<a href="index.html">Trang chủ</a> / <a href="san-pham.html">Sản phẩm</a> / <span>${escapeHtml(product.name)}</span>`;
      }

      const productBrand = document.querySelector('.product-brand');
      if (productBrand) productBrand.textContent = `${escapeHtml(product.brand_name || 'LuniHome')} • ${escapeHtml(product.category_name || 'Sản phẩm')}`;

      const productNameNode = document.querySelector('.product-info-block h1');
      if (productNameNode) productNameNode.textContent = product.name;

      const priceNode = document.getElementById('productPrice');
      if (priceNode) {
        priceNode.dataset.basePrice = String(price);
        priceNode.textContent = formatCurrency(price);
      }

      const metaRow = document.querySelector('.meta-row');
      if (metaRow) {
        metaRow.innerHTML = `<span class="rating">★★★★★</span><span>${Number(product.review_count || 0)} đánh giá</span><span>${Number(product.views || 0)} lượt xem</span>`;
      }

      const stockNode = document.getElementById('productStock');
      if (stockNode) {
        stockNode.innerHTML = `<span class="rating"><i class="fa-solid fa-boxes-stacked"></i> Còn ${Number(product.stock || 0)} sản phẩm</span>`;
      }

      const mainImage = document.querySelector('.main-image img');
      if (mainImage) mainImage.src = images[0];

      const thumbList = document.querySelector('.thumb-list');
      if (thumbList) {
        thumbList.innerHTML = images.map((img, index) => `
          <div class="thumb-item ${index === 0 ? 'active' : ''}"><img src="${img}" alt="${escapeHtml(product.name)} ${index + 1}"></div>
        `).join('');
      }

      const sizeOptionsNode = document.getElementById('sizeVariantOptions');
      if (sizeOptionsNode) {
        sizeOptionsNode.innerHTML = sizeOptions.map((option, index) => `<button class="variant-btn ${index === 0 ? 'active' : ''}" type="button" data-value="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join('');
      }

      const colorOptionsNode = document.getElementById('colorVariantOptions');
      if (colorOptionsNode) {
        colorOptionsNode.innerHTML = colorOptions.map((option, index) => `<button class="variant-btn ${index === 0 ? 'active' : ''}" type="button" data-value="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join('');
      }

      const qtyInput = document.querySelector('.qty-input');
      if (qtyInput) {
        qtyInput.max = String(Number(product.stock || 1));
        qtyInput.dataset.max = String(Number(product.stock || 1));
        qtyInput.value = '1';
      }

      const specTable = document.querySelector('.spec-table');
      if (specTable) {
        const entries = Object.entries(specs);
        const rows = entries.length
          ? entries.map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`).join('')
          : `<tr><th>Mô tả</th><td>${escapeHtml(product.short_description || product.description || 'Sản phẩm đang được cập nhật chi tiết.')}</td></tr>`;
        specTable.innerHTML = rows;
      }

      const reviewList = document.querySelector('.review-list');
      if (reviewList) {
        const reviews = Array.isArray(response.reviews) ? response.reviews : [];
        reviewList.innerHTML = reviews.length
          ? reviews.map((review) => `
            <div class="review-item">
              <div class="review-header"><strong>${escapeHtml(review.user_name || 'Khách hàng')}</strong><span>${'★'.repeat(Math.max(1, Number(review.rating || 5))).padEnd(5, '☆')}</span></div>
              <p>${escapeHtml(review.comment || '')}</p>
            </div>
          `).join('')
          : '<div class="empty-state">Chưa có đánh giá nào cho sản phẩm này.</div>';
      }

      const relatedContainer = document.querySelector('.related-grid');
      if (relatedContainer && Array.isArray(response.related)) {
        relatedContainer.innerHTML = response.related.map(renderProductCard).join('');
      }
    } catch (error) {
      console.error('Lỗi tải chi tiết sản phẩm:', error);
      const panel = document.querySelector('.product-detail');
      if (panel) panel.innerHTML = '<div class="empty-state">Lỗi khi tải chi tiết sản phẩm.</div>';
    }
  };

  const initAuthForms = function () {
    const page = pageName;
    if (page === 'dang-ky.html') {
      const form = document.querySelector('form');
      if (!form) return;
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const fields = {
          name: form.querySelectorAll('input')[1]?.value || form.querySelectorAll('input')[0]?.value || '',
          email: form.querySelectorAll('input')[0]?.value || '',
          password: form.querySelectorAll('input')[2]?.value || '',
          confirmPassword: form.querySelectorAll('input')[3]?.value || '',
          address: form.querySelectorAll('input')[4]?.value || '',
          phone: form.querySelectorAll('input')[5]?.value || ''
        };

        if (!fields.name || !fields.email || !fields.password) {
          alert('Vui lòng nhập đầy đủ thông tin bắt buộc.');
          return;
        }
        if (fields.password !== fields.confirmPassword) {
          alert('Mật khẩu nhập lại không khớp.');
          return;
        }
        if (!window.LunihomeAPI || !window.LunihomeAPI.auth) return;

        const res = await window.LunihomeAPI.auth.register({
          name: fields.name,
          email: fields.email,
          password: fields.password,
          address: fields.address,
          phone: fields.phone
        });

        if (res.success) {
          alert('Đăng ký thành công!');
          window.location.href = 'dang-nhap.html';
        } else {
          alert(res.message || 'Đăng ký thất bại.');
        }
      });
    }

    if (page === 'dang-nhap.html') {
      const form = document.querySelector('form');
      if (!form) return;
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = form.querySelector('input[type="email"]')?.value.trim();
        const password = form.querySelector('input[type="password"]')?.value;
        if (!email || !password) {
          alert('Vui lòng nhập email và mật khẩu.');
          return;
        }

        const res = await window.LunihomeAPI.auth.login(email, password);
        if (res.success) {
          const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
          window.location.href = redirect;
        } else {
          alert(res.message || 'Đăng nhập thất bại.');
        }
      });
    }

    if (page === 'quen-mat-khau.html') {
      const form = document.querySelector('form');
      if (!form) return;
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = form.querySelector('input[type="email"]')?.value.trim();
        if (!email) {
          alert('Vui lòng nhập email.');
          return;
        }
        const res = await window.LunihomeAPI.auth.forgotPassword(email);
        alert(res.message || 'Yêu cầu đã được xử lý.');
      });
    }

    if (page === 'doi-pass.html') {
      const form = document.querySelector('form');
      if (!form) return;
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const currentPassword = form.querySelectorAll('input[type="password"]')[0]?.value || '';
        const newPassword = form.querySelectorAll('input[type="password"]')[1]?.value || '';
        const confirm = form.querySelectorAll('input[type="password"]')[2]?.value || '';

        if (!currentPassword || !newPassword || !confirm) {
          alert('Vui lòng điền đủ thông tin.');
          return;
        }
        if (newPassword !== confirm) {
          alert('Mật khẩu mới không khớp.');
          return;
        }
        if (!window.LunihomeAPI.auth.isLoggedIn()) {
          alert('Bạn cần đăng nhập để đổi mật khẩu.');
          window.location.href = 'dang-nhap.html';
          return;
        }
        const res = await window.LunihomeAPI.auth.changePassword(currentPassword, newPassword);
        alert(res.message || 'Đổi mật khẩu thành công.');
        if (res.success) form.reset();
      });
    }
  };

  const renderCheckoutPage = async function () {
    try {
      await window.LunihomeAPI.cart.load();
    } catch (error) {
      console.error('Lỗi tải giỏ hàng khi thanh toán:', error);
      alert(error.message || 'Không thể tải giỏ hàng.');
      window.location.href = 'gio-hang.html';
      return;
    }
    const items = getCartItems();
    if (!items.length) {
      window.location.href = 'gio-hang.html';
      return;
    }

    const user = (() => {
      try {
        return JSON.parse(localStorage.getItem('lunihome_user') || 'null');
      } catch (error) {
        return null;
      }
    })();

    const customerNameInput = document.getElementById('customerName');
    const customerPhoneInput = document.getElementById('customerPhone');
    const shippingAddressInput = document.getElementById('shippingAddress');

    if (customerNameInput && user && user.name) customerNameInput.value = user.name;
    if (customerPhoneInput && user && user.phone) customerPhoneInput.value = user.phone;
    if (shippingAddressInput && user && user.address) shippingAddressInput.value = user.address;

    const selectedCoupon = getStoredCoupon();
    const couponInput = document.getElementById('couponCode');
    if (couponInput && selectedCoupon) couponInput.value = selectedCoupon.code || '';

    const summary = getCartSummary(items, selectedCoupon);
    const checkoutItemsList = document.getElementById('checkoutItemsList');
    if (checkoutItemsList) {
      checkoutItemsList.innerHTML = items.map(function (item) {
        const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
        return `<div class="summary-item"><span>${escapeHtml(item.name || 'Sản phẩm')} x ${(Number(item.quantity) || 1)}</span><strong>${formatCurrency(lineTotal)}</strong></div>`;
      }).join('');
    }

    const checkoutSubtotal = document.getElementById('checkoutSubtotal');
    const checkoutShipping = document.getElementById('checkoutShipping');
    const checkoutDiscount = document.getElementById('checkoutDiscount');
    const checkoutTotal = document.getElementById('checkoutTotal');
    if (checkoutSubtotal) checkoutSubtotal.textContent = formatCurrency(summary.subtotal);
    if (checkoutShipping) checkoutShipping.textContent = formatCurrency(summary.shippingFee);
    if (checkoutDiscount) checkoutDiscount.textContent = `-${formatCurrency(summary.discountAmount)}`;
    if (checkoutTotal) checkoutTotal.textContent = formatCurrency(summary.total);

    document.querySelectorAll('#paymentMethodOptions .chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        document.querySelectorAll('#paymentMethodOptions .chip').forEach(function (item) {
          item.classList.remove('active');
        });
        chip.classList.add('active');
      });
    });

    const applyCouponBtn = document.getElementById('applyCouponBtn');
    if (applyCouponBtn) {
      applyCouponBtn.addEventListener('click', async function () {
        const code = couponInput ? couponInput.value : '';
        const result = await applyCoupon(code, summary.subtotal);
        if (result) {
          const refreshedSummary = getCartSummary(items, result);
          if (checkoutSubtotal) checkoutSubtotal.textContent = formatCurrency(refreshedSummary.subtotal);
          if (checkoutShipping) checkoutShipping.textContent = formatCurrency(refreshedSummary.shippingFee);
          if (checkoutDiscount) checkoutDiscount.textContent = `-${formatCurrency(refreshedSummary.discountAmount)}`;
          if (checkoutTotal) checkoutTotal.textContent = formatCurrency(refreshedSummary.total);
        }
      });
    }

    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const name = document.getElementById('customerName')?.value.trim();
        const phone = document.getElementById('customerPhone')?.value.trim();
        const shippingAddress = document.getElementById('shippingAddress')?.value.trim();
        const note = document.getElementById('note')?.value.trim() || '';
        const selectedPayment = document.querySelector('#paymentMethodOptions .chip.active')?.dataset.paymentMethod || 'COD';

        if (!name || !phone || !shippingAddress) {
          alert('Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng.');
          return;
        }

        const orderPayload = {
          customerName: name,
          customerEmail: user && user.email ? user.email : '',
          customerPhone: phone,
          shippingAddress: shippingAddress,
          paymentMethod: selectedPayment,
          note: note,
          couponCode: (getStoredCoupon() && getStoredCoupon().code) || (couponInput ? couponInput.value.trim() : ''),
          items: items.map(function (item) {
            return {
              productId: item.id || null,
              productName: item.name,
              productImage: item.image,
              price: Number(item.price) || 0,
              quantity: Number(item.quantity) || 1,
              variantSize: item.variantSize || 'Tiêu chuẩn',
              variantColor: item.variantColor || 'Mặc định'
            };
          })
        };

        const response = await window.LunihomeAPI.orders.create(orderPayload);
        if (!response || !response.success) {
          alert(response && response.message ? response.message : 'Đặt hàng thất bại.');
          return;
        }

        localStorage.removeItem('lunihome_selected_coupon');
        if (window.LunihomeAPI && window.LunihomeAPI.cart) {
          await window.LunihomeAPI.cart.clear();
        }
        const order = response.order || {};
        const params = new URLSearchParams({
          code: order.orderCode || order.order_code || 'LUNI',
          total: String(order.totalAmount || order.total_amount || summary.total || 0),
          payment: order.paymentMethod || selectedPayment
        });
        window.location.href = 'cam-on.html?' + params.toString();
      });
    }
  };

  const renderWishlistPage = async function () {
    const list = document.getElementById('wishlistItems');
    if (!list) return;
    if (!window.LunihomeAPI.auth.isLoggedIn()) {
      list.innerHTML = '<div class="empty-state">Vui lòng <a href="dang-nhap.html?redirect=yeu-thich.html">đăng nhập</a> để xem sản phẩm yêu thích.</div>';
      return;
    }

    if (!list.dataset.removeBound) {
      list.dataset.removeBound = 'true';
      list.addEventListener('click', async function (event) {
        const button = event.target.closest('.wishlist-remove-btn');
        if (!button) return;
        button.disabled = true;
        try {
          const result = await window.LunihomeAPI.wishlist.remove(button.dataset.productId);
          if (!result.success) throw new Error(result.message || 'Không thể xóa sản phẩm yêu thích.');
          await renderWishlistPage();
        } catch (error) {
          button.disabled = false;
          alert(error.message || 'Không thể xóa sản phẩm yêu thích.');
        }
      });
    }

    try {
      const response = await window.LunihomeAPI.wishlist.getAll();
      if (!response.success || !Array.isArray(response.data)) {
        throw new Error(response.message || 'Không thể tải sản phẩm yêu thích.');
      }
      if (!response.data.length) {
        list.innerHTML = '<div class="empty-state">Bạn chưa có sản phẩm yêu thích nào.</div>';
        return;
      }

      list.innerHTML = response.data.map(function (item) {
        const name = escapeHtml(item.name);
        const image = escapeHtml(item.thumbnail || '');
        const brand = escapeHtml(item.brand_name || '');
        const price = Number(item.price) || 0;
        const stock = Number(item.stock) || 0;
        return `
          <div class="wishlist-item" style="margin-top:18px">
            <img src="${image}" alt="${name}">
            <div class="wishlist-content">
              <h3>${name}</h3>
              <p style="color:var(--muted)">${brand} • ${formatCurrency(price)}</p>
            </div>
            <div class="wishlist-actions">
              <button class="btn btn-primary add-to-cart-btn" data-id="${Number(item.id)}" data-name="${name}" data-price="${price}" data-stock="${stock}" data-image="${image}" type="button" ${stock <= 0 ? 'disabled' : ''}>Thêm giỏ</button>
              <button class="btn btn-secondary wishlist-remove-btn" data-product-id="${Number(item.id)}" type="button">Xóa</button>
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('Lỗi tải trang yêu thích:', error);
      list.innerHTML = `<div class="empty-state">Không thể tải danh sách yêu thích: ${escapeHtml(error.message)}</div>`;
    }
  };

  const renderThankYouPage = function () {
    const query = new URLSearchParams(window.location.search);
    const orderCode = query.get('code') || 'LUNI';
    const total = query.get('total') || '0';
    const payment = query.get('payment') || 'COD';

    const codeNode = document.getElementById('thankOrderCode');
    const totalNode = document.getElementById('thankOrderTotal');
    const paymentNode = document.getElementById('thankOrderPayment');

    if (codeNode) codeNode.textContent = orderCode;
    if (totalNode) totalNode.textContent = formatCurrency(Number(total || 0));
    if (paymentNode) paymentNode.textContent = payment;
  };

  const renderOrderHistoryPage = async function () {
    const list = document.getElementById('orderHistoryList');
    if (!list) return;

    if (!window.LunihomeAPI || !window.LunihomeAPI.auth.isLoggedIn()) {
      list.innerHTML = '<div class="empty-state">Bạn cần đăng nhập để xem lịch sử đơn hàng. <a href="dang-nhap.html">Đăng nhập ngay</a></div>';
      return;
    }

    try {
      const res = await window.LunihomeAPI.orders.getMyOrders();
      if (!res || !res.success || !Array.isArray(res.data) || !res.data.length) {
        list.innerHTML = '<div class="empty-state">Bạn chưa có đơn hàng nào.</div>';
        return;
      }

      list.innerHTML = res.data.map(function (order) {
        const items = Array.isArray(order.items) ? order.items : [];
        const statusMap = {
          pending: 'Đang chờ',
          processing: 'Đang xử lý',
          shipping: 'Đang giao',
          completed: 'Đã hoàn thành',
          cancelled: 'Đã hủy'
        };
        const statusClass = order.order_status === 'completed' ? 'status-done' : order.order_status === 'cancelled' ? 'status-cancel' : 'status-new';
        const createdAt = order.created_at ? new Date(order.created_at).toLocaleDateString('vi-VN') : 'N/A';
        const itemRows = items.length
          ? items.map(function (item) {
              return `<tr><td>${escapeHtml(item.product_name || 'Sản phẩm')}</td><td>${formatCurrency(Number(item.price) || 0)}</td><td>${Number(item.quantity) || 0}</td><td>${formatCurrency(Number(item.total) || 0)}</td></tr>`;
            }).join('')
          : '<tr><td colspan="4">Không có sản phẩm</td></tr>';

        return `
          <div class="order-card" style="margin-bottom:20px;">
            <div class="order-header">
              <div>
                <strong>Đơn #${escapeHtml(order.order_code || order.id)}</strong>
                <div class="order-meta"><span>Ngày đặt: ${escapeHtml(createdAt)}</span><span>Người nhận: ${escapeHtml(order.customer_name || 'Khách hàng')}</span></div>
              </div>
              <span class="status-badge ${statusClass}">${statusMap[order.order_status] || order.order_status || 'Đang xử lý'}</span>
            </div>
            <table class="table-list">
              <thead><tr><th>Sản phẩm</th><th>Giá</th><th>Số lượng</th><th>Thành tiền</th></tr></thead>
              <tbody>${itemRows}</tbody>
            </table>
            <div class="order-actions">
              <span class="order-total">Tổng: <strong>${formatCurrency(Number(order.total_amount) || 0)}</strong></span>
              ${order.order_status !== 'cancelled' && order.order_status !== 'completed' ? '<button class="btn btn-danger" type="button">Hủy đơn</button>' : ''}
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('Lỗi tải lịch sử đơn hàng:', error);
      list.innerHTML = '<div class="empty-state">Không thể tải lịch sử đơn hàng.</div>';
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    bindHeaderDropdown();
    bindSearchForm();
    bindFavorites();
    bindThumbnailGallery();
    bindVariantButtons();
    bindQtyInputs();
    updateHeaderUser();

    if (pageName === 'gio-hang.html') {
      renderCartPage();
    }

    if (pageName === 'thanh-toan.html') {
      renderCheckoutPage();
    }

    if (pageName === 'cam-on.html') {
      renderThankYouPage();
    }

    if (pageName === 'lich-su-don-hang.html') {
      renderOrderHistoryPage();
    }

    if (pageName === 'yeu-thich.html') {
      renderWishlistPage();
    }

    if (window.LunihomeAPI && window.LunihomeAPI.cart && window.LunihomeAPI.auth.isLoggedIn()) {
      window.LunihomeAPI.cart.load().then(updateHeaderUser).catch(function (error) {
        console.error('Lỗi đồng bộ số lượng giỏ hàng:', error);
      });
    }

    if (pageName === 'dang-ky.html' || pageName === 'dang-nhap.html' || pageName === 'quen-mat-khau.html' || pageName === 'doi-pass.html') {
      initAuthForms();
    }

    if (pageName === 'index.html' || pageName === 'san-pham.html' || pageName === 'danh-muc.html' || pageName === 'tim-kiem.html') {
      initProductListPage();
    }

    if (pageName === 'chi-tiet-san-pham.html') {
      initProductDetailPage();
    }

    if (document.querySelector('.coupon-chip')) {
      document.querySelectorAll('.coupon-chip').forEach(function (button) {
        button.addEventListener('click', function () {
          const couponInput = document.getElementById('couponCode');
          if (couponInput) couponInput.value = button.dataset.code || '';
        });
      });
    }
  });

  window.formatCurrency = formatCurrency;
  window.increaseQty = function (button) {
    const input = button.parentElement.querySelector('.qty-input');
    if (!input) return;
    const max = Number(input.dataset.max || input.dataset.stock || input.max || 99);
    const current = Number(input.value) || 1;
    if (current >= max) {
      alert('Số lượng đã đạt giới hạn tồn kho!');
      return;
    }
    input.value = Math.min(max, current + 1);
  };
  window.decreaseQty = function (button) {
    const input = button.parentElement.querySelector('.qty-input');
    if (!input) return;
    const min = Number(input.dataset.min || input.min || 1);
    const current = Number(input.value) || 1;
    input.value = Math.max(min, current - 1);
  };
  window.addToCart = async function (productName) {
    if (!localStorage.getItem('lunihome_token')) {
      alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!');
      const currentUrl = encodeURIComponent(window.location.href);
      window.location.href = 'dang-nhap.html?redirect=' + currentUrl;
      return;
    }
    if (window.LunihomeAPI && window.LunihomeAPI.cart) {
      try {
        await window.LunihomeAPI.cart.add({ name: productName });
        updateHeaderUser();
      } catch (error) {
        console.error('Lỗi thêm sản phẩm vào giỏ hàng:', error);
        alert(error.message || 'Không thể thêm sản phẩm vào giỏ hàng.');
      }
      return;
    }
    alert('Kết nối giỏ hàng chưa sẵn sàng.');
  };
})();
