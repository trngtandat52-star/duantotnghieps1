const pool = require('../config/db');

exports.getActiveBanners = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, ten_banner, hinh_anh, lien_ket, thu_tu
       FROM banner
       WHERE trang_thai = 'hien'
       ORDER BY thu_tu ASC, id ASC`
    );

    return res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Lỗi getActiveBanners:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy banner.'
    });
  }
};
