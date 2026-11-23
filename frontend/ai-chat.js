/**
 * LuniAI - Trợ lý Chiếu Sáng & Tư Vấn Khách Hàng Thông Minh
 * Hệ thống Chatbot AI Hỗ Trợ Trực Tuyến cho Cửa Hàng Lunihome
 */

(function () {
  'use strict';

  // Tránh khởi tạo nhiều lần
  if (window.__LuniAI_Initialized) return;
  window.__LuniAI_Initialized = true;

  // 1. Tự động nạp CSS nếu chưa có
  if (!document.querySelector('link[href*="ai-chat.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'ai-chat.css';
    document.head.appendChild(link);
  }

  // 2. Âm thanh thông báo nhẹ nhàng bằng Web Audio API (không cần file âm thanh ngoài)
  let soundEnabled = true;
  function playChime() {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Bỏ qua nếu bị giới hạn autoplay
    }
  }

  // 3. Cơ sở dữ liệu mẫu đèn đặc sắc của Lunihome
  const DEFAULT_PRODUCTS = [
    {
      name: 'Đèn chùm pha lê cao cấp Aurora',
      slug: 'den-chum-pha-le-cao-cap-aurora',
      price: 1290000,
      original_price: 1590000,
      thumbnail: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500',
      category: 'Phòng khách / Đèn chùm'
    },
    {
      name: 'Đèn thả Minimalist Bắc Âu',
      slug: 'den-tha-minimalist-bac-au',
      price: 850000,
      original_price: 1100000,
      thumbnail: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500',
      category: 'Bàn ăn / Phòng khách'
    },
    {
      name: 'Đèn ngủ Vintage ấm áp Lunihome',
      slug: 'den-ngu-vintage-am-ap-lunihome',
      price: 490000,
      original_price: 650000,
      thumbnail: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=500',
      category: 'Phòng ngủ / Đèn bàn'
    },
    {
      name: 'Đèn tường nghệ thuật Geometric',
      slug: 'den-tuong-nghe-thuat-geometric',
      price: 680000,
      original_price: 890000,
      thumbnail: 'https://images.unsplash.com/photo-1494526585095-c41746248156?w=500',
      category: 'Hành lang / Cầu thang'
    }
  ];

  // 4. Các câu hỏi gợi ý nhanh
  const QUICK_PROMPTS = [
    '💡 Tư vấn đèn phòng khách',
    '🌙 Đèn phòng ngủ ấm cúng',
    '🍽️ Đèn thả bàn ăn hiện đại',
    '💰 Mẫu đèn dưới 1 triệu',
    '🏷️ Mã giảm giá hôm nay',
    '🚚 Chính sách bảo hành & ship',
    '📞 Kết nối nhân viên tư vấn'
  ];

  // 5. Khởi tạo giao diện HTML của Chat Widget
  function injectChatWidget() {
    const html = `
      <div class="luni-chat-fab-wrap" id="luniChatFabWrap">
        <!-- Tooltip chào mừng -->
        <div class="luni-chat-tooltip" id="luniChatTooltip">
          <i class="fa-solid fa-wand-magic-sparkles" style="color: #c99c42;"></i>
          <span>Cần tư vấn mẫu đèn đẹp? Chat với <strong>LuniAI</strong> ngay!</span>
          <button class="luni-chat-tooltip-close" id="luniChatTooltipClose" title="Đóng">&times;</button>
        </div>

        <!-- Nút tròn nổi kích hoạt -->
        <button class="luni-chat-fab" id="luniChatToggle" aria-label="Mở cửa sổ chat hỗ trợ">
          <i class="fa-solid fa-comments" id="luniFabIcon"></i>
          <span class="luni-chat-status-pulse"></span>
        </button>
      </div>

      <!-- Cửa sổ Chat LuniAI -->
      <div class="luni-chat-window luni-hidden" id="luniChatWindow" role="dialog" aria-labelledby="luniChatHeaderTitle">
        <!-- Header -->
        <div class="luni-chat-header">
          <div class="luni-chat-header-info">
            <div class="luni-chat-avatar">
              <i class="fa-solid fa-robot"></i>
              <span class="luni-chat-avatar-status"></span>
            </div>
            <div>
              <div class="luni-chat-title" id="luniChatHeaderTitle">
                LuniAI <span class="luni-badge">PRO</span>
              </div>
              <div class="luni-chat-subtitle">
                <i class="fa-solid fa-circle" style="font-size: 7px; color: #10b981;"></i>
                Trợ lý tư vấn đèn thông minh
              </div>
            </div>
          </div>
          <div class="luni-chat-header-actions">
            <button class="luni-chat-btn-icon" id="luniChatClear" title="Xóa đoạn chat làm mới">
              <i class="fa-solid fa-rotate-right"></i>
            </button>
            <button class="luni-chat-btn-icon" id="luniChatSound" title="Bật/tắt âm thanh">
              <i class="fa-solid fa-volume-high" id="luniSoundIcon"></i>
            </button>
            <button class="luni-chat-btn-icon" id="luniChatClose" title="Thu nhỏ">
              <i class="fa-solid fa-chevron-down"></i>
            </button>
          </div>
        </div>

        <!-- Khung tin nhắn -->
        <div class="luni-chat-body" id="luniChatBody">
          <!-- Tin nhắn mặc định ban đầu -->
          <div class="luni-msg-row luni-bot">
            <div class="luni-msg-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="luni-msg-bubble">
              Xin chào quý khách! 👋 Tôi là <strong>LuniAI</strong> – Trợ lý tư vấn đèn trang trí của <strong>Lunihome</strong>.
              <br><br>
              Bạn đang cần tìm mẫu đèn cho <strong>phòng khách, phòng ngủ</strong> hay muốn nhận <strong>mã giảm giá hôm nay</strong>? Cứ thoải mái hỏi tôi nhé!
              <span class="luni-msg-time">Vừa xong</span>
            </div>
          </div>
        </div>

        <!-- Gợi ý câu hỏi nhanh -->
        <div class="luni-chat-suggestions" id="luniChatSuggestions">
          ${QUICK_PROMPTS.map(p => `<button type="button" class="luni-chip" data-prompt="${p}">${p}</button>`).join('')}
        </div>

        <!-- Khung nhập tin nhắn -->
        <form class="luni-chat-input-box" id="luniChatForm">
          <input
            type="text"
            id="luniChatInput"
            class="luni-chat-input"
            placeholder="Hỏi LuniAI về mẫu đèn, phong cách, giá cả..."
            autocomplete="off"
          />
          <button type="submit" class="luni-chat-send-btn" id="luniChatSend" aria-label="Gửi tin nhắn">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </form>
      </div>
    `;

    const div = document.createElement('div');
    div.id = 'luniChatRoot';
    div.innerHTML = html;
    document.body.appendChild(div);

    bindChatEvents();
  }

  // 6. Định dạng giá tiền VNĐ
  function formatMoney(amount) {
    return Number(amount || 0).toLocaleString('vi-VN') + 'đ';
  }

  // Lấy thời gian hiện tại HH:mm
  function getCurrentTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // 7. Gắn sự kiện tương tác
  function bindChatEvents() {
    const toggleBtn = document.getElementById('luniChatToggle');
    const fabIcon = document.getElementById('luniFabIcon');
    const chatWindow = document.getElementById('luniChatWindow');
    const closeBtn = document.getElementById('luniChatClose');
    const tooltip = document.getElementById('luniChatTooltip');
    const tooltipClose = document.getElementById('luniChatTooltipClose');
    const form = document.getElementById('luniChatForm');
    const input = document.getElementById('luniChatInput');
    const clearBtn = document.getElementById('luniChatClear');
    const soundBtn = document.getElementById('luniChatSound');
    const soundIcon = document.getElementById('luniSoundIcon');
    const suggestions = document.getElementById('luniChatSuggestions');

    // Bật/tắt cửa sổ chat
    function toggleChat() {
      const isHidden = chatWindow.classList.contains('luni-hidden');
      if (isHidden) {
        chatWindow.classList.remove('luni-hidden');
        fabIcon.className = 'fa-solid fa-xmark';
        if (tooltip) tooltip.style.display = 'none';
        setTimeout(() => input.focus(), 200);
      } else {
        chatWindow.classList.add('luni-hidden');
        fabIcon.className = 'fa-solid fa-comments';
      }
    }

    toggleBtn.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

    if (tooltip) {
      tooltip.addEventListener('click', (e) => {
        if (e.target !== tooltipClose) toggleChat();
      });
    }
    if (tooltipClose) {
      tooltipClose.addEventListener('click', (e) => {
        e.stopPropagation();
        tooltip.style.display = 'none';
      });
    }

    // Nút làm mới đoạn chat
    clearBtn.addEventListener('click', () => {
      const body = document.getElementById('luniChatBody');
      body.innerHTML = `
        <div class="luni-msg-row luni-bot">
          <div class="luni-msg-avatar"><i class="fa-solid fa-robot"></i></div>
          <div class="luni-msg-bubble">
            Đã làm mới cuộc trò chuyện. Tôi có thể giúp gì cho bạn hôm nay? ✨
            <span class="luni-msg-time">${getCurrentTime()}</span>
          </div>
        </div>
      `;
    });

    // Nút bật/tắt âm thanh
    soundBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      soundIcon.className = soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
      soundBtn.title = soundEnabled ? 'Đang bật âm thanh' : 'Đã tắt âm thanh';
    });

    // Chọn câu hỏi nhanh từ chip
    suggestions.addEventListener('click', (e) => {
      const chip = e.target.closest('.luni-chip');
      if (chip) {
        const text = chip.dataset.prompt;
        sendUserMessage(text);
      }
    });

    // Submit form gửi tin nhắn
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      sendUserMessage(text);
    });

    // Tự động ẩn tooltip sau 12 giây nếu chưa bấm
    setTimeout(() => {
      if (tooltip && !chatWindow.classList.contains('luni-hidden')) {
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.5s ease';
        setTimeout(() => { tooltip.style.display = 'none'; }, 500);
      }
    }, 12000);
  }

  // 8. Thêm tin nhắn vào khung chat
  function appendMessage(sender, htmlContent) {
    const body = document.getElementById('luniChatBody');
    const row = document.createElement('div');
    row.className = `luni-msg-row luni-${sender}`;

    if (sender === 'bot') {
      row.innerHTML = `
        <div class="luni-msg-avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="luni-msg-bubble">
          ${htmlContent}
          <span class="luni-msg-time">${getCurrentTime()}</span>
        </div>
      `;
      playChime();
    } else {
      row.innerHTML = `
        <div class="luni-msg-bubble">
          ${escapeHtml(htmlContent)}
          <span class="luni-msg-time">${getCurrentTime()}</span>
        </div>
      `;
    }

    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  }

  // Escape HTML cho tin nhắn người dùng
  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Hiển thị hiệu ứng AI đang gõ
  function showTypingIndicator() {
    const body = document.getElementById('luniChatBody');
    const typing = document.createElement('div');
    typing.id = 'luniTypingIndicator';
    typing.className = 'luni-msg-row luni-bot';
    typing.innerHTML = `
      <div class="luni-msg-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="luni-typing-indicator">
        <span class="luni-typing-dot"></span>
        <span class="luni-typing-dot"></span>
        <span class="luni-typing-dot"></span>
      </div>
    `;
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;
  }

  function removeTypingIndicator() {
    const el = document.getElementById('luniTypingIndicator');
    if (el) el.remove();
  }

  // 9. Xử lý tin nhắn người dùng & Trí tuệ phản hồi thông minh (LuniAI Brain)
  async function sendUserMessage(text) {
    appendMessage('user', text);
    showTypingIndicator();

    // Giả lập thời gian suy nghĩ của AI (600ms - 900ms)
    setTimeout(async () => {
      removeTypingIndicator();
      const responseHtml = await generateBotResponse(text);
      appendMessage('bot', responseHtml);
    }, 700);
  }

  // Tạo card hiển thị sản phẩm trong chat
  function renderProductCard(p) {
    const link = `chi-tiet-san-pham.html?slug=${encodeURIComponent(p.slug || '')}`;
    return `
      <a href="${link}" class="luni-chat-product-card" target="_blank" rel="noopener">
        <img src="${p.thumbnail || 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500'}" alt="${p.name}" class="luni-chat-product-img" onerror="this.src='https://placehold.co/100x100?text=Den'">
        <div class="luni-chat-product-info">
          <div class="luni-chat-product-name">${p.name}</div>
          <div class="luni-chat-product-price">${formatMoney(p.price)}</div>
          <span class="luni-chat-product-btn">Xem chi tiết <i class="fa-solid fa-arrow-right"></i></span>
        </div>
      </a>
    `;
  }

  // 10. Bộ não xử lý ngôn ngữ tự nhiên (NLP) Tiếng Việt
  async function generateBotResponse(input) {
    const q = input.toLowerCase().trim();

    // A. Tư vấn đèn phòng khách
    if (q.includes('phòng khách') || q.includes('khach') || q.includes('đèn chùm') || q.includes('chum')) {
      return `
        <strong>Gợi ý chiếu sáng Phòng Khách:</strong><br>
        Với phòng khách, Lunihome khuyến khích bạn chọn <strong>Đèn chùm pha lê</strong> hoặc <strong>Đèn thả trần hiện đại</strong> với ánh sáng trung tính (4000K) giúp không gian sáng thoáng, sang trọng và tôn trọn vẻ đẹp nội thất.<br>
        ${renderProductCard(DEFAULT_PRODUCTS[0])}
        ${renderProductCard(DEFAULT_PRODUCTS[1])}
        <small style="color:#72675f; display:block; margin-top:6px;">💡 <em>Mẹo: Bạn có thể kết hợp thêm đèn hắt tường để tạo chiều sâu ánh sáng vào buổi tối.</em></small>
      `;
    }

    // B. Tư vấn đèn phòng ngủ
    if (q.includes('phòng ngủ') || q.includes('ngu') || q.includes('đèn ngủ') || q.includes('ấm áp')) {
      return `
        <strong>Gợi ý chiếu sáng Phòng Ngủ:</strong><br>
        Phòng ngủ cần ánh sáng <strong>vàng ấm (2700K - 3000K)</strong> dịu mắt, tránh chiếu trực diện vào mắt khi nằm để giúp cơ thể dễ dàng thư giãn và có giấc ngủ sâu hơn.<br>
        ${renderProductCard(DEFAULT_PRODUCTS[2])}
        ${renderProductCard(DEFAULT_PRODUCTS[3])}
        <small style="color:#72675f; display:block; margin-top:6px;">🌙 Các mẫu đèn này đều hỗ trợ công tắc điều chỉnh hoặc ánh sáng vàng dịu êm!</small>
      `;
    }

    // C. Tư vấn đèn bàn ăn / Bếp
    if (q.includes('bàn ăn') || q.includes('bep') || q.includes('thả') || q.includes('bếp')) {
      return `
        <strong>Gợi ý đèn cho Bàn Ăn & Bếp:</strong><br>
        Khu vực bàn ăn rất thích hợp với <strong>Đèn thả bàn ăn hiện đại</strong>. Khoảng cách lý tưởng từ mặt bàn tới chao đèn là <strong>75cm - 85cm</strong>, ánh sáng vàng giúp các món ăn trông ngon miệng và gắn kết gia đình ấm cúng.<br>
        ${renderProductCard(DEFAULT_PRODUCTS[1])}
      `;
    }

    // D. Khoảng giá / Dưới 1 triệu / Dưới 500k / Giá rẻ
    if (q.includes('dưới 1 triệu') || q.includes('duoi 1tr') || q.includes('1 triệu') || q.includes('giá rẻ') || q.includes('rẻ') || q.includes('dưới 500')) {
      const budgetItems = DEFAULT_PRODUCTS.filter(p => p.price <= 1000000);
      return `
        <strong>Các mẫu đèn đẹp giá dưới 1.000.000đ tại Lunihome:</strong><br>
        Dù ở phân khúc tiết kiệm, các sản phẩm của Lunihome vẫn đảm bảo khung kim loại sơn tĩnh điện chống gỉ và chip LED tiết kiệm điện 80%:<br>
        ${budgetItems.map(renderProductCard).join('')}
      `;
    }

    // E. Mã giảm giá / Voucher / Khuyến mãi
    if (q.includes('mã giảm giá') || q.includes('voucher') || q.includes('coupon') || q.includes('khuyến mãi') || q.includes('giam gia') || q.includes('sale')) {
      return `
        🎉 <strong>Lunihome gửi tặng bạn 3 mã giảm giá độc quyền:</strong><br><br>
        1. <span class="luni-chat-coupon" onclick="navigator.clipboard.writeText('LUNI10'); this.innerHTML='<i class=\\'fa-solid fa-check\\'></i> Đã sao chép: LUNI10';">
          <i class="fa-solid fa-tag"></i> LUNI10 (Giảm 10% đơn đầu tiên)
        </span><br>
        2. <span class="luni-chat-coupon" onclick="navigator.clipboard.writeText('FREESHIP'); this.innerHTML='<i class=\\'fa-solid fa-check\\'></i> Đã sao chép: FREESHIP';">
          <i class="fa-solid fa-truck-fast"></i> FREESHIP (Miễn phí ship đơn từ 500k)
        </span><br>
        3. <span class="luni-chat-coupon" onclick="navigator.clipboard.writeText('GIAM100K'); this.innerHTML='<i class=\\'fa-solid fa-check\\'></i> Đã sao chép: GIAM100K';">
          <i class="fa-solid fa-coins"></i> GIAM100K (Giảm ngay 100.000đ cho đơn từ 1.5tr)
        </span><br><br>
        <small style="color:#72675f;">👉 Bấm vào từng mã để sao chép nhanh và dán vào bước Thanh toán nhé!</small>
      `;
    }

    // F. Chính sách bảo hành & Giao hàng
    if (q.includes('bảo hành') || q.includes('giao hàng') || q.includes('ship') || q.includes('đổi trả') || q.includes('lắp đặt') || q.includes('vận chuyển')) {
      return `
        🛡️ <strong>Chính sách cam kết vàng tại Lunihome:</strong><br>
        • <strong>Bảo hành chính hãng:</strong> 12 - 24 tháng cho toàn bộ thân đèn và bóng LED.<br>
        • <strong>Đổi trả 1-1:</strong> Trong vòng 30 ngày nếu có lỗi từ nhà sản xuất.<br>
        • <strong>Vận chuyển an toàn:</strong> Giao hàng toàn quốc 2-4 ngày, đóng thùng xốp chống va đập và được <strong>đồng kiểm mở xem trước khi thanh toán</strong>.<br>
        • <strong>Hỗ trợ lắp đặt:</strong> Lunihome có đội ngũ thợ lành nghề hỗ trợ lắp đặt tại nhà ở khu vực TP.HCM và Hà Nội.
      `;
    }

    // G. Liên hệ nhân viên tư vấn / Hotline / Địa chỉ
    if (q.includes('liên hệ') || q.includes('nhân viên') || q.includes('hotline') || q.includes('số điện thoại') || q.includes('địa chỉ') || q.includes('sdt') || q.includes('cửa hàng')) {
      return `
        📞 <strong>Thông tin liên hệ trực tiếp Lunihome:</strong><br><br>
        • <strong>Hotline / Zalo:</strong> <a href="tel:0901234567" style="color:#b58636; font-weight:700;">0901 234 567</a> (08:00 - 21:00 hàng ngày)<br>
        • <strong>Email tư vấn:</strong> <a href="mailto:hello@lunihome.vn" style="color:#b58636;">hello@lunihome.vn</a><br>
        • <strong>Showroom trưng bày:</strong> 123 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh.<br><br>
        Bạn có thể để lại số điện thoại ngay tại đây, chuyên viên tư vấn của Lunihome sẽ gọi lại hỗ trợ bạn ngay lập tức!
      `;
    }

    // H. Nếu hỏi tìm kiếm tên sản phẩm cụ thể
    if (window.LunihomeAPI && window.LunihomeAPI.products) {
      try {
        const res = await window.LunihomeAPI.products.getAll({ search: input.trim(), limit: 3 });
        if (res && res.success && res.data && res.data.length > 0) {
          return `
            🔍 <strong>Tìm thấy ${res.data.length} mẫu đèn phù hợp với yêu cầu "${escapeHtml(input)}":</strong><br>
            ${res.data.map(renderProductCard).join('')}
          `;
        }
      } catch (e) {
        // Fallback tiếp tục bên dưới
      }
    }

    // I. Phản hồi chung / Mặc định
    return `
      Cảm ơn bạn đã nhắn tin cho Lunihome! ✨<br><br>
      Tôi đã ghi nhận câu hỏi của bạn. Để tư vấn chính xác nhất, bạn có thể cho tôi biết thêm:
      <ul style="margin: 6px 0 6px 18px; padding: 0;">
        <li>Bạn đang tìm đèn cho <strong>không gian nào</strong> (phòng khách, phòng ngủ, quán cafe...)?</li>
        <li>Bạn thích phong cách nào (<strong>Hiện đại, Bắc Âu, Cổ điển</strong>)?</li>
        <li>Ngân sách dự kiến của bạn khoảng bao nhiêu?</li>
      </ul>
      Hoặc bạn có thể bấm vào các câu hỏi gợi ý nhanh phía dưới để xem tư vấn ngay nhé!
    `;
  }

  // 11. Tự động kích hoạt khi trang tải xong
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectChatWidget);
  } else {
    injectChatWidget();
  }
})();
