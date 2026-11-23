const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// [GET] /api/admin/stats - Thống kê tổng quan Dashboard
exports.getStats = async (req, res) => {
  try {
    // 1. Doanh thu tổng (các đơn hoàn thành hoặc đã thanh toán)
    const [revResult] = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total_revenue 
       FROM orders 
       WHERE order_status = 'completed' OR payment_status = 'paid'`
    );
    const totalRevenue = Number(revResult[0]?.total_revenue || 0);

    // 2. Thống kê đơn hàng
    const [orderCountResult] = await pool.query(
      `SELECT COUNT(*) AS total_orders FROM orders
       WHERE NOT (payment_method = 'Stripe' AND payment_status = 'pending')`
    );
    const totalOrders = orderCountResult[0]?.total_orders || 0;

    const [pendingCountResult] = await pool.query(
      `SELECT COUNT(*) AS pending_orders FROM orders
       WHERE order_status = 'pending'
       AND NOT (payment_method = 'Stripe' AND payment_status = 'pending')`
    );
    const pendingOrders = pendingCountResult[0]?.pending_orders || 0;

    // 3. Thống kê sản phẩm & tồn kho thấp
    const [prodCountResult] = await pool.query(`SELECT COUNT(*) AS total_products FROM products`);
    const totalProducts = prodCountResult[0]?.total_products || 0;

    const [lowStockResult] = await pool.query(
      `SELECT COUNT(*) AS low_stock FROM products WHERE stock <= 5`
    );
    const lowStock = lowStockResult[0]?.low_stock || 0;

    // 4. Thống kê người dùng
    const [userCountResult] = await pool.query(`SELECT COUNT(*) AS total_users FROM users WHERE role = 'customer'`);
    const totalUsers = userCountResult[0]?.total_users || 0;

    // 5. Thống kê bài viết
    const [postCountResult] = await pool.query(`SELECT COUNT(*) AS total_posts FROM posts`);
    const totalPosts = postCountResult[0]?.total_posts || 0;

    // 6. Đơn hàng gần đây
    const [recentOrders] = await pool.query(
      `SELECT id, order_code, customer_name, customer_phone, total_amount, payment_method, payment_status, order_status, created_at 
       FROM orders 
       WHERE NOT (payment_method = 'Stripe' AND payment_status = 'pending')
       ORDER BY created_at DESC 
       LIMIT 8`
    );

    // 7. Cơ cấu trạng thái đơn hàng
    const [statusBreakdown] = await pool.query(
      `SELECT order_status, COUNT(*) as count FROM orders
       WHERE NOT (payment_method = 'Stripe' AND payment_status = 'pending')
       GROUP BY order_status`
    );

    return res.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        pendingOrders,
        totalProducts,
        lowStock,
        totalUsers,
        totalPosts,
        recentOrders,
        statusBreakdown
      }
    });
  } catch (error) {
    console.error('Lỗi getStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy dữ liệu thống kê.',
      error: error.message
    });
  }
};

// [GET] /api/admin/users - Danh sách người dùng
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, name, email, phone, address, role, created_at 
       FROM users 
       ORDER BY id DESC`
    );

    return res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Lỗi getAllUsers:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách người dùng.',
      error: error.message
    });
  }
};

// [POST] /api/admin/users - Tạo tài khoản mới (bởi Admin)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, phone, address, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu.'
      });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã tồn tại trong hệ thống.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const assignedRole = role === 'admin' ? 'admin' : 'customer';

    const [result] = await pool.query(
      `INSERT INTO users (name, email, password, phone, address, role) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, phone || null, address || null, assignedRole]
    );

    return res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công!',
      data: {
        id: result.insertId,
        name,
        email,
        phone,
        address,
        role: assignedRole
      }
    });
  } catch (error) {
    console.error('Lỗi createUser:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo người dùng.',
      error: error.message
    });
  }
};

// [PUT] /api/admin/users/:id - Cập nhật người dùng
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, phone, address, role, password } = req.body;

    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng này.'
      });
    }

    let updateQuery = 'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address), role = COALESCE(?, role)';
    const params = [name, phone, address, role];

    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password.trim(), salt);
      updateQuery += ', password = ?';
      params.push(hashedPassword);
    }

    updateQuery += ' WHERE id = ?';
    params.push(userId);

    await pool.query(updateQuery, params);

    return res.json({
      success: true,
      message: 'Cập nhật thông tin người dùng thành công!'
    });
  } catch (error) {
    console.error('Lỗi updateUser:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật người dùng.',
      error: error.message
    });
  }
};

// [DELETE] /api/admin/users/:id - Xóa người dùng
exports.deleteUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (req.user.id === userId) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể tự xóa tài khoản của chính mình!'
      });
    }

    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng.'
      });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    return res.json({
      success: true,
      message: 'Đã xóa người dùng thành công!'
    });
  } catch (error) {
    console.error('Lỗi deleteUser:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa người dùng.',
      error: error.message
    });
  }
};

// [DELETE] /api/admin/orders/:id - Xóa đơn hàng (dành riêng cho Admin dọn dẹp)
exports.deleteOrder = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const [orders] = await pool.query('SELECT id FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng.'
      });
    }

    await pool.query('DELETE FROM orders WHERE id = ?', [orderId]);

    return res.json({
      success: true,
      message: 'Đã xóa đơn hàng thành công!'
    });
  } catch (error) {
    console.error('Lỗi deleteOrder:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa đơn hàng.',
      error: error.message
    });
  }
};

// ========================================================
// 4. QUẢN LÝ TỒN KHO (INVENTORY MANAGEMENT)
// ========================================================

// [GET] /api/admin/inventory - Lấy tổng quan tồn kho & danh sách
exports.getInventoryOverview = async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT 
        p.id, 
        p.name, 
        p.slug, 
        p.sku, 
        p.price, 
        p.original_price, 
        p.stock, 
        p.thumbnail,
        p.variants_size,
        p.variants_color,
        p.is_active,
        c.name AS category_name, 
        c.id AS category_id
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.stock ASC, p.id DESC
    `);

    let totalStock = 0;
    let totalInventoryValue = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let abundantStockCount = 0;

    const formattedProducts = products.map(p => {
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
        status
      };
    });

    return res.json({
      success: true,
      stats: {
        totalProducts: products.length,
        totalStock,
        totalInventoryValue,
        outOfStockCount,
        lowStockCount,
        abundantStockCount
      },
      products: formattedProducts
    });
  } catch (error) {
    console.error('Lỗi getInventoryOverview:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy dữ liệu tồn kho.',
      error: error.message
    });
  }
};

// [POST] /api/admin/inventory/adjust - Nhập kho / Xuất kho / Điều chỉnh tồn
exports.adjustStock = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { productId, type, quantity, note } = req.body;
    const prodId = Number(productId);
    const qty = Number(quantity);

    if (!prodId || isNaN(qty) || qty < 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ. Vui lòng nhập số lượng hợp lệ.'
      });
    }

    const [rows] = await connection.query('SELECT id, name, stock FROM products WHERE id = ? FOR UPDATE', [prodId]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm.'
      });
    }

    const product = rows[0];
    const oldStock = Number(product.stock) || 0;
    let newStock = oldStock;
    let changeType = type || 'adjust';
    let qtyChange = 0;

    if (changeType === 'import') {
      newStock = oldStock + qty;
      qtyChange = qty;
    } else if (changeType === 'export') {
      if (oldStock < qty) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Số lượng xuất kho (${qty}) vượt quá số lượng tồn hiện có (${oldStock})!`
        });
      }
      newStock = oldStock - qty;
      qtyChange = -qty;
    } else { // 'adjust' hoặc 'set'
      newStock = qty;
      qtyChange = newStock - oldStock;
      changeType = 'adjust';
    }

    // Cập nhật stock bảng products
    await connection.query('UPDATE products SET stock = ? WHERE id = ?', [newStock, prodId]);

    // Ghi log biến động kho
    const adminUser = req.user?.name || req.user?.email || 'Quản trị viên';
    await connection.query(
      `INSERT INTO inventory_logs (product_id, change_type, quantity_change, old_stock, new_stock, note, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [prodId, changeType, qtyChange, oldStock, newStock, note || 'Điều chỉnh tồn kho', adminUser]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: changeType === 'import' 
        ? `Đã nhập thêm +${qty} sản phẩm vào kho thành công!` 
        : changeType === 'export' 
        ? `Đã xuất -${qty} sản phẩm khỏi kho thành công!` 
        : `Đã cập nhật số lượng tồn thành ${newStock}!`,
      data: {
        productId: prodId,
        productName: product.name,
        oldStock,
        newStock,
        change: qtyChange
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Lỗi adjustStock:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi điều chỉnh tồn kho.',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// [GET] /api/admin/inventory/logs - Lịch sử biến động xuất nhập tồn
exports.getInventoryLogs = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const productId = req.query.productId ? Number(req.query.productId) : null;

    let query = `
      SELECT 
        l.id,
        l.product_id,
        l.change_type,
        l.quantity_change,
        l.old_stock,
        l.new_stock,
        l.note,
        l.created_by,
        l.created_at,
        p.name AS product_name,
        p.sku,
        p.thumbnail,
        c.name AS category_name
      FROM inventory_logs l
      JOIN products p ON l.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
    `;
    const params = [];

    if (productId) {
      query += ` WHERE l.product_id = ? `;
      params.push(productId);
    }

    query += ` ORDER BY l.created_at DESC LIMIT ?`;
    params.push(limit);

    const [logs] = await pool.query(query, params);

    return res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('Lỗi getInventoryLogs:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy lịch sử tồn kho.',
      error: error.message
    });
  }
};

