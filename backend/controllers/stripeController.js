const Stripe = require('stripe');
const pool = require('../config/db');
const getVariantPrice = require('../utils/productPricing');

let stripeClient;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error('Stripe chưa được cấu hình. Hãy đặt STRIPE_SECRET_KEY ở backend.');
    error.status = 503;
    throw error;
  }

  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

function generateOrderCode() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `LUNI-${date}-${suffix}`;
}

function getFrontendUrl() {
  return (process.env.FRONTEND_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

async function markOrderPaid(orderCode) {
  if (!orderCode) throw new Error('Stripe session không có mã đơn hàng.');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.query(
      'SELECT id, payment_status, order_status FROM orders WHERE order_code = ? FOR UPDATE',
      [orderCode]
    );

    if (orders.length === 0) throw new Error(`Không tìm thấy đơn hàng ${orderCode}.`);

    const order = orders[0];
    if (order.payment_status !== 'paid') {
      await connection.query(
        `UPDATE orders SET payment_status = 'paid',
         order_status = IF(order_status = 'pending', 'processing', order_status)
         WHERE id = ?`,
        [order.id]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function cancelPendingOrder(orderCode) {
  if (!orderCode) throw new Error('Stripe session không có mã đơn hàng.');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.query(
      'SELECT id, order_status, payment_status FROM orders WHERE order_code = ? FOR UPDATE',
      [orderCode]
    );

    if (orders.length === 0) throw new Error(`Không tìm thấy đơn hàng ${orderCode}.`);

    const order = orders[0];
    if (order.order_status === 'pending' && order.payment_status !== 'paid') {
      const [items] = await connection.query(
        `SELECT product_id, SUM(quantity) AS quantity
         FROM order_items WHERE order_id = ? AND product_id IS NOT NULL
         GROUP BY product_id`,
        [order.id]
      );

      for (const item of items) {
        await connection.query(
          'UPDATE products SET stock = stock + ? WHERE id = ?',
          [Number(item.quantity), item.product_id]
        );
      }

      await connection.query(
        `UPDATE orders SET order_status = 'cancelled', payment_status = 'failed'
         WHERE id = ?`,
        [order.id]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

exports.createCheckoutSession = async (req, res) => {
  let connection;
  let checkoutSession;
  try {
    const stripe = getStripe();
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      note = '',
      items = [],
      couponCode = null
    } = req.body || {};

    if (!customerName || !customerPhone || !shippingAddress) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp tên người nhận, số điện thoại và địa chỉ giao hàng.'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng của bạn đang trống.' });
    }

    const mergedItems = new Map();
    for (const item of items) {
      if (!item || typeof item !== 'object') {
        return res.status(400).json({ success: false, message: 'Dữ liệu sản phẩm không hợp lệ.' });
      }

      const productId = Number(item.productId);
      const quantity = Number(item.quantity);
      if (!Number.isSafeInteger(productId) || productId <= 0 ||
          !Number.isSafeInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Sản phẩm hoặc số lượng không hợp lệ.' });
      }

      const variantSize = String(item.variantSize || 'Tiêu chuẩn').slice(0, 50);
      const variantColor = String(item.variantColor || 'Mặc định').slice(0, 50);
      const key = `${productId}:${variantSize}:${variantColor}`;
      const current = mergedItems.get(key);
      const mergedQuantity = quantity + (current ? current.quantity : 0);
      if (!Number.isSafeInteger(mergedQuantity)) {
        return res.status(400).json({ success: false, message: 'Số lượng sản phẩm không hợp lệ.' });
      }
      mergedItems.set(key, {
        productId,
        quantity: mergedQuantity,
        variantSize,
        variantColor
      });
    }

    const quantityByProduct = new Map();
    for (const item of mergedItems.values()) {
      quantityByProduct.set(
        item.productId,
        (quantityByProduct.get(item.productId) || 0) + item.quantity
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const validatedItems = [];
    const inventory = new Map();
    let subtotal = 0;
    for (const item of mergedItems.values()) {
      let product = inventory.get(item.productId);
      if (!product) {
        const [products] = await connection.query(
          'SELECT id, name, price, stock, thumbnail, variants_size FROM products WHERE id = ? FOR UPDATE',
          [item.productId]
        );
        if (products.length === 0) {
          await connection.rollback();
          return res.status(400).json({ success: false, message: 'Một sản phẩm trong giỏ không còn tồn tại.' });
        }
        product = products[0];
        inventory.set(item.productId, product);
      }

      const productQuantity = quantityByProduct.get(item.productId);
      if (Number(product.stock) < productQuantity) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${product.name}" chỉ còn ${product.stock} sản phẩm trong kho.`
        });
      }

      const basePrice = Number(product.price);
      if (!Number.isFinite(basePrice) || basePrice < 0) {
        throw new Error(`Giá sản phẩm "${product.name}" không hợp lệ.`);
      }

      const price = getVariantPrice(basePrice, product.variants_size, item.variantSize);
      const total = price * item.quantity;
      subtotal += total;
      validatedItems.push({
        ...item,
        productName: product.name,
        productImage: product.thumbnail || '',
        price,
        total
      });
    }

    let discountAmount = 0;
    if (couponCode) {
      const [coupons] = await connection.query(
        'SELECT discount_type, discount_value, min_order_value FROM coupons WHERE code = ? AND is_active = 1',
        [String(couponCode).trim().toUpperCase()]
      );
      if (coupons.length > 0 && subtotal >= Number(coupons[0].min_order_value)) {
        const coupon = coupons[0];
        discountAmount = coupon.discount_type === 'percent'
          ? subtotal * Number(coupon.discount_value) / 100
          : Number(coupon.discount_value);
        discountAmount = Math.round(Math.min(discountAmount, subtotal));
      }
    }

    const shippingFee = subtotal >= 500000 ? 0 : 30000;
    const totalAmount = Math.max(0, Math.round(subtotal - discountAmount + shippingFee));
    if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Tổng tiền đơn hàng không hợp lệ.' });
    }

    const orderCode = generateOrderCode();
    const email = String(customerEmail || (req.user && req.user.email) || '').trim().slice(0, 150);
    const [orderResult] = await connection.query(
      `INSERT INTO orders
       (order_code, user_id, customer_name, customer_email, customer_phone, shipping_address,
        payment_method, payment_status, order_status, note, subtotal, discount_amount, shipping_fee, total_amount)
       VALUES (?, ?, ?, ?, ?, ?, 'Stripe', 'pending', 'pending', ?, ?, ?, ?, ?)`,
      [
        orderCode,
        req.user ? req.user.id : null,
        String(customerName).slice(0, 100),
        String(email).slice(0, 150),
        String(customerPhone).slice(0, 20),
        String(shippingAddress).slice(0, 255),
        String(note).slice(0, 2000),
        subtotal,
        discountAmount,
        shippingFee,
        totalAmount
      ]
    );

    for (const item of validatedItems) {
      await connection.query(
        `INSERT INTO order_items
         (order_id, product_id, product_name, product_image, variant_size, variant_color, price, quantity, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderResult.insertId,
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
    }

    for (const [productId, product] of inventory) {
      const quantity = validatedItems
        .filter((item) => item.productId === productId)
        .reduce((sum, item) => sum + item.quantity, 0);
      if (Number(product.stock) < quantity) throw new Error('Tồn kho đã thay đổi, vui lòng thử lại.');
      await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [quantity, productId]
      );
    }

    const frontendUrl = getFrontendUrl();
    checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'vnd',
          unit_amount: totalAmount,
          product_data: {
            name: `Đơn hàng ${orderCode}`,
            description: 'Thanh toán đơn hàng LuniHome'
          }
        },
        quantity: 1
      }],
      metadata: { order_code: orderCode },
      payment_intent_data: { metadata: { order_code: orderCode } },
      ...(email.includes('@') ? { customer_email: email } : {}),
      success_url: `${frontendUrl}/cam-on.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/thanh-toan.html?payment=cancelled&session_id={CHECKOUT_SESSION_ID}`
    });

    await connection.commit();
    return res.status(201).json({
      success: true,
      checkoutUrl: checkoutSession.url,
      orderCode
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    if (checkoutSession && connection) {
      try {
        await getStripe().checkout.sessions.expire(checkoutSession.id);
      } catch (expireError) {
        console.error('Không thể hết hạn Stripe session sau lỗi tạo đơn:', expireError);
      }
    }

    console.error('Lỗi createCheckoutSession:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.status === 503 ? error.message : 'Không thể khởi tạo thanh toán. Vui lòng thử lại.'
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.getCheckoutStatus = async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
      return res.status(400).json({ success: false, message: 'Mã thanh toán không hợp lệ.' });
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const orderCode = session.metadata && session.metadata.order_code;
    if (!orderCode) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    if (session.payment_status === 'paid') await markOrderPaid(orderCode);
    if (session.status === 'expired' && session.payment_status !== 'paid') {
      await cancelPendingOrder(orderCode);
    }

    const [orders] = await pool.query(
      'SELECT order_code, total_amount, payment_status FROM orders WHERE order_code = ? AND payment_method = ?',
      [orderCode, 'Stripe']
    );
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    return res.json({
      success: true,
      orderCode: orders[0].order_code,
      totalAmount: Number(orders[0].total_amount),
      paymentStatus: orders[0].payment_status
    });
  } catch (error) {
    console.error('Lỗi getCheckoutStatus:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.status === 503 ? error.message : 'Không thể xác nhận trạng thái thanh toán.'
    });
  }
};

exports.webhook = async (req, res) => {
  let event;
  try {
    const stripe = getStripe();
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(503).send('Stripe webhook chưa được cấu hình.');
    }
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Stripe webhook signature error:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    const session = event.data.object;
    const orderCode = session.metadata && session.metadata.order_code;
    if (event.type === 'checkout.session.completed' ||
        event.type === 'checkout.session.async_payment_succeeded') {
      if (session.payment_status === 'paid') await markOrderPaid(orderCode);
    } else if (event.type === 'checkout.session.expired' ||
               event.type === 'checkout.session.async_payment_failed') {
      await cancelPendingOrder(orderCode);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing error:', error);
    return res.status(500).send('Webhook processing failed.');
  }
};
