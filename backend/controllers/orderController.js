const pool = require('../config/db');

// Helper sinh mã đơn hàng độc nhất: LUNI-YYYYMMDD-XXXX
function generateOrderCode() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `LUNI-${dateStr}-${randomSuffix}`;
}

// [POST] /api/orders - Tạo đơn hàng mới (Hỗ trợ cả khách đã đăng nhập và khách vãng lai)
exports.createOrder = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      paymentMethod = 'COD',
      note = '',
      items = [],
      couponCode = null
    } = req.body;

    if (paymentMethod !== 'COD') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Vui lòng sử dụng luồng thanh toán tương ứng với phương thức đã chọn.'
      });
    }

    if (!customerName || !customerPhone || !shippingAddress) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ tên người nhận, số điện thoại và địa chỉ giao hàng.'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Giỏ hàng của bạn đang trống, không thể tạo đơn hàng.'
      });
    }

    // Tính tổng tiền từ danh sách mặt hàng
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const qty = Math.max(1, parseInt(item.quantity) || 1);
      const price = Number(item.price) || 0;
      const total = price * qty;
      subtotal += total;

      // Kiểm tra tính hợp lệ và tồn kho của sản phẩm trong bảng products
      let validProductId = null;
      let dbProduct = null;
      try {
        if (item.productId) {
          const [pRows] = await connection.query('SELECT id, name, stock FROM products WHERE id = ?', [item.productId]);
          if (pRows.length > 0) dbProduct = pRows[0];
        }
        if (!dbProduct && (item.productName || item.name)) {
          const [pRows] = await connection.query('SELECT id, name, stock FROM products WHERE name = ?', [item.productName || item.name]);
          if (pRows.length > 0) dbProduct = pRows[0];
        }
      } catch (e) {
        dbProduct = null;
      }

      if (dbProduct) {
        validProductId = dbProduct.id;
        const currentStock = Number(dbProduct.stock) || 0;
        if (currentStock < qty) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: `Sản phẩm "${dbProduct.name}" chỉ còn ${currentStock} sản phẩm trong kho. Không thể đặt mua vượt quá số lượng tồn kho (bạn chọn ${qty}).`
          });
        }
      }

      validatedItems.push({
        productId: validProductId,
        productName: item.productName || 'Sản phẩm Lunihome',
        productImage: item.productImage || '',
        variantSize: item.variantSize || 'Tiêu chuẩn',
        variantColor: item.variantColor || 'Mặc định',
        price,
        quantity: qty,
        total
      });
    }

    // Xử lý mã giảm giá nếu có
    let discountAmount = 0;
    if (couponCode) {
      const [coupons] = await connection.query(
        'SELECT * FROM coupons WHERE code = ? AND is_active = 1',
        [couponCode.trim().toUpperCase()]
      );

      if (coupons.length > 0) {
        const coupon = coupons[0];
        if (subtotal >= Number(coupon.min_order_value)) {
          if (coupon.discount_type === 'percent') {
            discountAmount = (subtotal * Number(coupon.discount_value)) / 100;
          } else {
            discountAmount = Number(coupon.discount_value);
          }
          discountAmount = Math.min(discountAmount, subtotal);
        }
      }
    }

    // Phí ship: miễn phí với đơn >= 500k, ngược lại 30k
    const shippingFee = subtotal >= 500000 ? 0 : 30000;
    const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

    const orderCode = generateOrderCode();
    const userId = req.user ? req.user.id : null;
    const email = customerEmail || (req.user ? req.user.email : 'guest@lunihome.vn');

    // Lưu bảng orders
    const [orderResult] = await connection.query(
      `INSERT INTO orders 
      (order_code, user_id, customer_name, customer_email, customer_phone, shipping_address, payment_method, payment_status, order_status, note, subtotal, discount_amount, shipping_fee, total_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
      [
        orderCode,
        userId,
        customerName,
        email,
        customerPhone,
        shippingAddress,
        paymentMethod,
        paymentMethod === 'COD' ? 'unpaid' : 'pending',
        note,
        subtotal,
        discountAmount,
        shippingFee,
        totalAmount
      ]
    );

    const orderId = orderResult.insertId;

    // Lưu bảng order_items
    for (const item of validatedItems) {
      await connection.query(
        `INSERT INTO order_items 
        (order_id, product_id, product_name, product_image, variant_size, variant_color, price, quantity, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.productId,
          item.productName,
          item.productImage,
          item.variantSize,
          item.variantColor,
          item.price,
          item.quantity,
          item.total
        ]
      );

      // Cập nhật tồn kho (nếu có product_id)
      if (item.productId) {
        await connection.query(
          `UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?`,
          [item.quantity, item.productId]
        );
      }
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công!',
      order: {
        id: orderId,
        orderCode,
        customerName,
        customerPhone,
        shippingAddress,
        paymentMethod,
        subtotal,
        discountAmount,
        shippingFee,
        totalAmount,
        items: validatedItems
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Lỗi createOrder:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo đơn hàng.',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// [GET] /api/orders/my-orders - Lấy lịch sử đơn hàng của người dùng hiện tại
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const [orders] = await pool.query(
      `SELECT * FROM orders
       WHERE user_id = ?
       AND NOT (payment_method = 'Stripe' AND payment_status = 'pending')
       ORDER BY created_at DESC`,
      [userId]
    );

    // Lấy items cho mỗi đơn
    for (const order of orders) {
      const [items] = await pool.query(
        `SELECT * FROM order_items WHERE order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    return res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Lỗi getMyOrders:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy lịch sử đơn hàng.',
      error: error.message
    });
  }
};

// [GET] /api/orders/:code - Lấy chi tiết đơn hàng theo order_code hoặc id
exports.getOrderDetail = async (req, res) => {
  try {
    const { code } = req.params;

    const query = isNaN(code)
      ? 'SELECT * FROM orders WHERE order_code = ?'
      : 'SELECT * FROM orders WHERE id = ? OR order_code = ?';
    const params = isNaN(code) ? [code] : [Number(code), code];

    const [orders] = await pool.query(query, params);
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng này.'
      });
    }

    const order = orders[0];

    // Kiểm tra quyền: nếu là user thường thì chỉ xem được đơn của mình
    if (req.user && req.user.role !== 'admin' && order.user_id && order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem đơn hàng này.'
      });
    }

    const [items] = await pool.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [order.id]
    );
    order.items = items;

    return res.json({
      success: true,
      data: order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy chi tiết đơn hàng.',
      error: error.message
    });
  }
};

// [PUT] /api/orders/:id/cancel - Hủy đơn hàng
exports.cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng.'
      });
    }

    const order = orders[0];

    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy đơn hàng này.'
      });
    }

    if (order.order_status === 'completed' || order.order_status === 'shipping') {
      return res.status(400).json({
        success: false,
        message: 'Không thể hủy đơn hàng đã đang giao hoặc đã hoàn thành.'
      });
    }

    if (order.order_status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng này đã bị hủy trước đó.'
      });
    }

    await pool.query(
      'UPDATE orders SET order_status = "cancelled" WHERE id = ?',
      [orderId]
    );

    return res.json({
      success: true,
      message: 'Đã hủy đơn hàng thành công!'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi hủy đơn hàng.',
      error: error.message
    });
  }
};

// [GET] /api/orders - Dành cho Quản trị viên (Admin) xem tất cả đơn hàng
exports.getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT * FROM orders
      WHERE NOT (payment_method = 'Stripe' AND payment_status = 'pending')`;
    const params = [];

    if (status) {
      query += ' AND order_status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const [orders] = await pool.query(query, params);

    return res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách đơn hàng.',
      error: error.message
    });
  }
};

// [PUT] /api/orders/:id/status - Admin cập nhật trạng thái đơn hàng
exports.updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { orderStatus, paymentStatus } = req.body;

    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng.'
      });
    }

    const currentOrder = orders[0];
    const currentStatus = currentOrder.order_status;

    // Quy tắc: Đơn đã hoàn thành hoặc đã hủy thì KHÔNG thể đổi trạng thái
    if (currentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã hoàn thành, không thể thay đổi hoặc lùi lại trạng thái!'
      });
    }

    if (currentStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã bị hủy, không thể thay đổi trạng thái!'
      });
    }

    // Quy tắc thứ bậc: Chỉ được TIẾN, KHÔNG được LÙI
    const statusLevels = {
      pending: 1,     // Chờ xác nhận
      processing: 2,  // Đang đóng gói
      shipping: 3,    // Đang giao hàng
      completed: 4    // Đã hoàn thành
    };

    if (orderStatus && orderStatus !== 'cancelled') {
      const curLvl = statusLevels[currentStatus] || 1;
      const newLvl = statusLevels[orderStatus] || 1;
      if (newLvl < curLvl) {
        return res.status(400).json({
          success: false,
          message: 'Quy trình đơn hàng chỉ được phép tiến về phía trước, không thể lùi lại trạng thái trước đó!'
        });
      }
    }

    let finalOrderStatus = orderStatus || currentStatus;
    let finalPaymentStatus = paymentStatus || currentOrder.payment_status;

    // Logic nghiệp vụ: Nếu đơn hàng hoàn thành (completed) -> Bắt buộc trạng thái thanh toán là Đã thanh toán (paid)
    if (finalOrderStatus === 'completed') {
      finalPaymentStatus = 'paid';
    }

    await pool.query(
      `UPDATE orders 
       SET order_status = ?, payment_status = ? 
       WHERE id = ?`,
      [finalOrderStatus, finalPaymentStatus, orderId]
    );

    return res.json({
      success: true,
      message: 'Cập nhật trạng thái đơn hàng thành công!',
      orderStatus: finalOrderStatus,
      paymentStatus: finalPaymentStatus
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server.',
      error: error.message
    });
  }
};
