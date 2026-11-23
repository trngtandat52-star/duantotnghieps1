const pool = require('../config/db');

exports.getWishlist = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.slug, p.thumbnail, p.price, p.stock,
              b.name AS brand_name
       FROM wishlists w
       JOIN products p ON p.id = w.product_id
       LEFT JOIN brands b ON b.id = p.brand_id
       WHERE w.user_id = ? AND p.is_active = 1
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Lỗi getWishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy sản phẩm yêu thích.'
    });
  }
};

exports.addItem = async (req, res) => {
  const productId = Number(req.body.productId);
  if (!Number.isSafeInteger(productId) || productId < 1) {
    return res.status(400).json({ success: false, message: 'Sản phẩm không hợp lệ.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT IGNORE INTO wishlists (user_id, product_id)
       SELECT ?, id FROM products WHERE id = ? AND is_active = 1`,
      [req.user.id, productId]
    );
    if (!result.affectedRows) {
      const [products] = await pool.query(
        'SELECT id FROM products WHERE id = ? AND is_active = 1',
        [productId]
      );
      if (!products.length) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
      }
    }

    return res.json({ success: true, message: 'Đã lưu sản phẩm yêu thích.' });
  } catch (error) {
    console.error('Lỗi addWishlistItem:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lưu sản phẩm yêu thích.'
    });
  }
};

exports.removeItem = async (req, res) => {
  const productId = Number(req.params.productId);
  if (!Number.isSafeInteger(productId) || productId < 1) {
    return res.status(400).json({ success: false, message: 'Sản phẩm không hợp lệ.' });
  }

  try {
    await pool.query(
      'DELETE FROM wishlists WHERE user_id = ? AND product_id = ?',
      [req.user.id, productId]
    );
    return res.json({ success: true, message: 'Đã xóa sản phẩm yêu thích.' });
  } catch (error) {
    console.error('Lỗi removeWishlistItem:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa sản phẩm yêu thích.'
    });
  }
};
