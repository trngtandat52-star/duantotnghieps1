/**
 * LuniHome Floating Hotline Slide-Out Widget
 * Ẩn mặc định - Nhấn vào nút điện thoại sẽ trượt thanh số hotline ra mượt mà
 */

(function () {
  'use strict';

  if (window.__LuniHotline_Initialized) return;
  window.__LuniHotline_Initialized = true;

  // 1. Tự động nạp CSS nếu chưa có
  if (!document.querySelector('link[href*="hotline.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'hotline.css';
    document.head.appendChild(link);
  }

  const PHONE_NUMBER = '0901234567';
  const DISPLAY_PHONE = '0901 234 567';
  const ZALO_URL = `https://zalo.me/${PHONE_NUMBER}`;

  function injectHotlineWidget() {
    // Xóa bản cũ nếu có
    const existing = document.getElementById('luniHotlineRoot');
    if (existing) existing.remove();

    const html = `
      <div class="luni-hotline-wrap" id="luniHotlineWrap">
        <!-- 1. Nút gọi tròn rung chuông chính -->
        <div class="luni-hotline-btn-wrap">
          <div class="luni-hotline-ripple"></div>
          <div class="luni-hotline-ripple"></div>
          <button type="button" class="luni-hotline-circle" id="luniHotlineCircle" title="Hotline Lunihome (Nhấn để trượt số ra)">
            <i class="fa-solid fa-phone luni-phone-vibrate" id="luniHotlinePhoneIcon"></i>
          </button>
        </div>

        <!-- 2. Thanh thông tin trượt ra khi click (Slide-out Drawer) -->
        <div class="luni-hotline-slider" id="luniHotlineSlider">
          <!-- Bấm số để gọi -->
          <a href="tel:${PHONE_NUMBER}" class="luni-hotline-info" title="Bấm để gọi ${DISPLAY_PHONE}">
            <span class="luni-hotline-label">
              <span class="luni-live-dot"></span>
              Hotline 24/7
            </span>
            <span class="luni-hotline-number">${DISPLAY_PHONE}</span>
          </a>

          <!-- Các nút hành động nhanh -->
          <div class="luni-hotline-actions">
            <a href="tel:${PHONE_NUMBER}" class="luni-hotline-btn-action btn-call" title="Gọi ngay">
              <i class="fa-solid fa-phone"></i>
              <span>Gọi</span>
            </a>
            <a href="${ZALO_URL}" target="_blank" rel="noopener noreferrer" class="luni-hotline-btn-action btn-zalo" title="Chat qua Zalo">
              <i class="fa-solid fa-comment-dots"></i>
              <span>Zalo</span>
            </a>
            <button type="button" class="luni-hotline-close-btn" id="luniHotlineClose" title="Thu gọn">&times;</button>
          </div>
        </div>
      </div>
    `;

    const div = document.createElement('div');
    div.id = 'luniHotlineRoot';
    div.innerHTML = html;
    document.body.appendChild(div);

    bindEvents();
  }

  function bindEvents() {
    const wrap = document.getElementById('luniHotlineWrap');
    const circle = document.getElementById('luniHotlineCircle');
    const closeBtn = document.getElementById('luniHotlineClose');

    // Chuyển đổi trạng thái Trượt ra / Thu vào khi bấm nút tròn
    function toggleSlider(e) {
      if (e) e.stopPropagation();
      wrap.classList.toggle('luni-open');
    }

    // Đóng thu gọn lại
    function closeSlider(e) {
      if (e) e.stopPropagation();
      wrap.classList.remove('luni-open');
    }

    circle.addEventListener('click', toggleSlider);

    if (closeBtn) {
      closeBtn.addEventListener('click', closeSlider);
    }

    // Tự động thu gọn khi click ra ngoài vùng hotline
    document.addEventListener('click', (e) => {
      if (wrap && !wrap.contains(e.target)) {
        wrap.classList.remove('luni-open');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectHotlineWidget);
  } else {
    injectHotlineWidget();
  }
})();
