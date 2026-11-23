const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'lunihome_secret_key_graduation_project_2026';

// Middleware xác thực người dùng đã đăng nhập (JWT)
async function protect(req, res, next) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Bạn chưa đăng nhập hoặc token không hợp lệ. Vui lòng đăng nhập để tiếp tục.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Lấy thông tin user mới nhất từ CSDL
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, address, role, created_at FROM users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản liên kết với token này không còn tồn tại.'
      });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Phiên đăng nhập đã hết hạn hoặc token không hợp lệ.',
      error: error.message
    });
  }
}

// Middleware tùy chọn (nếu có token thì lấy user, không có thì vẫn cho qua dưới dạng khách)
async function optionalAuth(req, res, next) {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const [rows] = await pool.query(
        'SELECT id, name, email, phone, address, role FROM users WHERE id = ?',
        [decoded.id]
      );
      if (rows.length > 0) {
        req.user = rows[0];
      }
    } catch (e) {
      // Bỏ qua lỗi nếu token khách vãng lai không hợp lệ
    }
  }
  next();
}

// Middleware chỉ cho phép quản trị viên (Admin)
function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Quyền truy cập bị từ chối. Chỉ quản trị viên mới có quyền thực hiện thao tác này.'
    });
  }
}

module.exports = {
  protect,
  optionalAuth,
  adminOnly
};
