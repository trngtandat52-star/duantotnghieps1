const pool = require('../config/db');

exports.getActiveStores = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, ten_cua_hang, dia_chi, so_dien_thoai, email,
              gio_mo_cua, lien_ket_ban_do, thu_tu
       FROM cua_hang
       WHERE trang_thai = 'hien'
       ORDER BY thu_tu ASC, id ASC`
    );

    return res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Lỗi getActiveStores:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách cửa hàng.'
    });
  }
};
