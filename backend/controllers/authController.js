const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'lunihome_secret_key_graduation_project_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Tạo token JWT
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// [POST] /api/auth/register - Đăng ký tài khoản mới
exports.register = async (req, res) => {
  try {
    const name = req.body.name || req.body.fullName || req.body.fullname;
    const phone = req.body.phone || req.body.phoneNumber || req.body.sdt || null;
    const { email, password, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ họ tên (name hoặc fullName), email và mật khẩu.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải chứa ít nhất 6 ký tự.'
      });
    }

    // Kiểm tra email đã tồn tại chưa
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã được đăng ký tài khoản. Vui lòng sử dụng email khác hoặc đăng nhập.'
      });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Lưu vào database
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password, phone, address, role) 
       VALUES (?, ?, ?, ?, ?, 'customer')`,
      [name, email, hashedPassword, phone || null, address || null]
    );

    const newUser = {
      id: result.insertId,
      name,
      email,
      phone: phone || null,
      address: address || null,
      role: 'customer'
    };

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Lỗi register:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã có lỗi xảy ra phía máy chủ.',
      error: error.message
    });
  }
};

// [POST] /api/auth/login - Đăng nhập tài khoản
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mật khẩu.'
      });
    }

    // Tìm người dùng theo email
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác.'
      });
    }

    const user = rows[0];

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác.'
      });
    }

    const token = generateToken(user);

    // Ẩn mật khẩu khi trả về client
    delete user.password;

    return res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      user
    });
  } catch (error) {
    console.error('Lỗi login:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã có lỗi xảy ra phía máy chủ.',
      error: error.message
    });
  }
};

// [GET] /api/auth/me - Lấy thông tin tài khoản hiện tại
exports.getMe = async (req, res) => {
  try {
    return res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server.',
      error: error.message
    });
  }
};

// [PUT] /api/auth/profile - Cập nhật thông tin cá nhân
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const userId = req.user.id;

    await pool.query(
      'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?',
      [name, phone, address, userId]
    );

    const [rows] = await pool.query(
      'SELECT id, name, email, phone, address, role FROM users WHERE id = ?',
      [userId]
    );

    return res.json({
      success: true,
      message: 'Cập nhật thông tin thành công!',
      user: rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật thông tin.',
      error: error.message
    });
  }
};

// [POST] /api/auth/change-password - Đổi mật khẩu
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.'
      });
    }

    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
    const user = rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);

    return res.json({
      success: true,
      message: 'Đổi mật khẩu thành công!'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi đổi mật khẩu.',
      error: error.message
    });
  }
};

// [POST] /api/auth/forgot-password - Quên mật khẩu
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email của bạn.'
      });
    }

    const [rows] = await pool.query('SELECT id, name FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản với email này.'
      });
    }

    // Thiết lập mật khẩu mặc định mới (123456) cho demo đồ án
    const salt = await bcrypt.genSalt(10);
    const defaultPassword = 'Luni' + Math.floor(100000 + Math.random() * 900000);
    const hashed = await bcrypt.hash(defaultPassword, salt);

    await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashed, email]);

    return res.json({
      success: true,
      message: `Hệ thống đã cấp lại mật khẩu tạm thời mới: ${defaultPassword} (Bạn có thể đăng nhập và đổi lại sau).`,
      tempPassword: defaultPassword
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi khôi phục mật khẩu.',
      error: error.message
    });
  }
};
