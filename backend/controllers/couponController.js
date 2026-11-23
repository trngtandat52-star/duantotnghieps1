const pool = require('../config/db');

// [POST] /api/coupons/apply - Áp dụng mã giảm giá
exports.applyCoupon = async (req, res) => {
  try {
    const { code, subtotal } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã giảm giá.'
      });
    }

    const orderAmount = Number(subtotal) || 0;

    const [rows] = await pool.query(
      'SELECT * FROM coupons WHERE code = ? AND is_active = 1',
      [code.trim().toUpperCase()]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mã giảm giá không tồn tại hoặc đã hết hạn.'
      });
    }

    const coupon = rows[0];

    if (orderAmount < Number(coupon.min_order_value)) {
      return res.status(400).json({
        success: false,
        message: `Đơn hàng tối thiểu phải từ ${new Intl.NumberFormat('vi-VN').format(coupon.min_order_value)}đ mới áp dụng được mã này.`
      });
    }

    let discountAmount = 0;
    if (coupon.discount_type === 'percent') {
      discountAmount = (orderAmount * Number(coupon.discount_value)) / 100;
    } else {
      discountAmount = Number(coupon.discount_value);
    }

    // Không giảm quá tổng tiền
    discountAmount = Math.min(discountAmount, orderAmount);

    return res.json({
      success: true,
      message: 'Áp dụng mã giảm giá thành công!',
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discount_amount: discountAmount
      }
    });
  } catch (error) {
    console.error('Lỗi applyCoupon:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi kiểm tra mã giảm giá.',
      error: error.message
    });
  }
};

// [GET] /api/coupons - Danh sách tất cả mã giảm giá (Admin)
exports.getAllCoupons = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM coupons ORDER BY id DESC');
    return res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Lỗi getAllCoupons:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách mã giảm giá.',
      error: error.message
    });
  }
};

// [POST] /api/coupons - Tạo mã giảm giá mới (Admin)
exports.createCoupon = async (req, res) => {
  try {
    const { code, discount_type, discount_value, min_order_value, is_active } = req.body;

    if (!code || discount_value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Mã giảm giá và Giá trị giảm.'
      });
    }

    const cleanCode = code.trim().toUpperCase();

    const [existing] = await pool.query('SELECT id FROM coupons WHERE code = ?', [cleanCode]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã giảm giá này đã tồn tại.'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO coupons (code, discount_type, discount_value, min_order_value, is_active) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        cleanCode,
        discount_type === 'percent' ? 'percent' : 'fixed',
        Number(discount_value) || 0,
        Number(min_order_value) || 0,
        is_active !== undefined ? (is_active ? 1 : 0) : 1
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Tạo mã giảm giá thành công!',
      couponId: result.insertId
    });
  } catch (error) {
    console.error('Lỗi createCoupon:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo mã giảm giá.',
      error: error.message
    });
  }
};

// [PUT] /api/coupons/:id - Cập nhật mã giảm giá (Admin)
exports.updateCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    const { code, discount_type, discount_value, min_order_value, is_active } = req.body;

    const [existing] = await pool.query('SELECT * FROM coupons WHERE id = ?', [couponId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mã giảm giá.'
      });
    }

    const cleanCode = code ? code.trim().toUpperCase() : existing[0].code;

    await pool.query(
      `UPDATE coupons SET 
        code = ?,
        discount_type = COALESCE(?, discount_type),
        discount_value = COALESCE(?, discount_value),
        min_order_value = COALESCE(?, min_order_value),
        is_active = COALESCE(?, is_active)
      WHERE id = ?`,
      [
        cleanCode,
        discount_type,
        discount_value !== undefined ? Number(discount_value) : existing[0].discount_value,
        min_order_value !== undefined ? Number(min_order_value) : existing[0].min_order_value,
        is_active !== undefined ? (is_active ? 1 : 0) : existing[0].is_active,
        couponId
      ]
    );

    return res.json({
      success: true,
      message: 'Cập nhật mã giảm giá thành công!'
    });
  } catch (error) {
    console.error('Lỗi updateCoupon:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật mã giảm giá.',
      error: error.message
    });
  }
};

// [DELETE] /api/coupons/:id - Xóa mã giảm giá (Admin)
exports.deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    const [existing] = await pool.query('SELECT id FROM coupons WHERE id = ?', [couponId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy mã giảm giá.'
      });
    }

    await pool.query('DELETE FROM coupons WHERE id = ?', [couponId]);

    return res.json({
      success: true,
      message: 'Đã xóa mã giảm giá thành công!'
    });
  } catch (error) {
    console.error('Lỗi deleteCoupon:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa mã giảm giá.',
      error: error.message
    });
  }
};

