const pool = require('../config/db');

// [GET] /api/brands - Lấy tất cả thương hiệu kèm số lượng sản phẩm
exports.getAllBrands = async (req, res) => {
  try {
    const query = `
      SELECT b.*, COUNT(p.id) as product_count
      FROM brands b
      LEFT JOIN products p ON b.id = p.brand_id
      GROUP BY b.id
      ORDER BY b.name ASC
    `;
    const [rows] = await pool.query(query);

    return res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Lỗi getAllBrands:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thương hiệu.',
      error: error.message
    });
  }
};
