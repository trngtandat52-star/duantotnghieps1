const pool = require('../config/db');

// [GET] /api/categories - Lấy tất cả danh mục kèm số lượng sản phẩm
exports.getAllCategories = async (req, res) => {
  try {
    const query = `
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.id ASC
    `;
    const [rows] = await pool.query(query);

    return res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Lỗi getAllCategories:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh mục.',
      error: error.message
    });
  }
};

// [GET] /api/categories/:slug - Lấy thông tin chi tiết một danh mục
exports.getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const [rows] = await pool.query('SELECT * FROM categories WHERE slug = ?', [slug]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục này.'
      });
    }

    return res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server.',
      error: error.message
    });
  }
};

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// [POST] /api/categories - Thêm danh mục mới (Admin)
exports.createCategory = async (req, res) => {
  try {
    const { name, slug, description, icon, image, status } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Tên danh mục.'
      });
    }

    const finalSlug = (slug && slug.trim()) ? slugify(slug) : slugify(name);

    const [existing] = await pool.query('SELECT id FROM categories WHERE slug = ?', [finalSlug]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Đường dẫn (slug) của danh mục này đã tồn tại.'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO categories (name, slug, description, icon, image, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [name.trim(), finalSlug, description || null, icon || null, image || null, status || 'hien']
    );

    return res.status(201).json({
      success: true,
      message: 'Thêm danh mục mới thành công!',
      categoryId: result.insertId
    });
  } catch (error) {
    console.error('Lỗi createCategory:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi thêm danh mục.',
      error: error.message
    });
  }
};

// [PUT] /api/categories/:id - Cập nhật danh mục (Admin)
exports.updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, slug, description, icon, image, status } = req.body;

    const [existing] = await pool.query('SELECT * FROM categories WHERE id = ?', [categoryId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục.'
      });
    }

    const finalSlug = slug ? slugify(slug) : (name ? slugify(name) : existing[0].slug);

    await pool.query(
      `UPDATE categories SET 
        name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        description = COALESCE(?, description),
        icon = COALESCE(?, icon),
        image = COALESCE(?, image),
        status = COALESCE(?, status)
      WHERE id = ?`,
      [name, finalSlug, description, icon, image, status || existing[0].status || 'hien', categoryId]
    );

    return res.json({
      success: true,
      message: 'Cập nhật danh mục thành công!'
    });
  } catch (error) {
    console.error('Lỗi updateCategory:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật danh mục.',
      error: error.message
    });
  }
};

// [DELETE] /api/categories/:id - Xóa danh mục (Admin) - Đã vô hiệu hóa theo yêu cầu
exports.deleteCategory = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Chức năng xóa danh mục đã bị vô hiệu hóa để bảo vệ tính toàn vẹn dữ liệu hệ thống.'
  });
};

