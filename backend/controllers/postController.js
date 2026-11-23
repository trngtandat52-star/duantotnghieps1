const pool = require('../config/db');

// [GET] /api/posts - Lấy danh sách bài viết / tin tức
exports.getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { category, search } = req.query;

    let query = 'SELECT * FROM posts WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search && search.trim()) {
      query += ' AND (title LIKE ? OR excerpt LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered_posts`;
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0]?.total || 0;

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);

    return res.json({
      success: true,
      count: rows.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      data: rows
    });
  } catch (error) {
    console.error('Lỗi getPosts:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy bài viết.',
      error: error.message
    });
  }
};

// [GET] /api/posts/:slug - Lấy chi tiết bài viết (tự động tăng lượt xem)
exports.getPostDetail = async (req, res) => {
  try {
    const { slug } = req.params;

    const query = isNaN(slug)
      ? 'SELECT * FROM posts WHERE slug = ?'
      : 'SELECT * FROM posts WHERE id = ? OR slug = ?';
    const params = isNaN(slug) ? [slug] : [Number(slug), slug];

    const [rows] = await pool.query(query, params);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết.'
      });
    }

    const post = rows[0];

    // Tăng lượt xem
    await pool.query('UPDATE posts SET views = views + 1 WHERE id = ?', [post.id]);
    post.views += 1;

    // Lấy 3 bài viết liên quan
    const [related] = await pool.query(
      'SELECT id, title, slug, excerpt, thumbnail, created_at FROM posts WHERE id != ? LIMIT 3',
      [post.id]
    );

    return res.json({
      success: true,
      data: post,
      related
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy chi tiết bài viết.',
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

// [POST] /api/posts - Tạo bài viết mới (Admin)
exports.createPost = async (req, res) => {
  try {
    const { title, slug, excerpt, content, thumbnail, author, category } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Tiêu đề bài viết.'
      });
    }

    const finalSlug = (slug && slug.trim()) ? slugify(slug) : `${slugify(title)}-${Date.now()}`;
    const finalThumbnail = thumbnail || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80';

    const [result] = await pool.query(
      `INSERT INTO posts (title, slug, excerpt, content, thumbnail, author, category) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        finalSlug,
        excerpt || null,
        content || null,
        finalThumbnail,
        author || 'Ban biên tập',
        category || 'Mẹo bài trí'
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Tạo bài viết mới thành công!',
      postId: result.insertId
    });
  } catch (error) {
    console.error('Lỗi createPost:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo bài viết.',
      error: error.message
    });
  }
};

// [PUT] /api/posts/:id - Cập nhật bài viết (Admin)
exports.updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const { title, slug, excerpt, content, thumbnail, author, category } = req.body;

    const [existing] = await pool.query('SELECT * FROM posts WHERE id = ?', [postId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết.'
      });
    }

    const finalSlug = slug ? slugify(slug) : (title ? slugify(title) : existing[0].slug);

    await pool.query(
      `UPDATE posts SET 
        title = COALESCE(?, title),
        slug = COALESCE(?, slug),
        excerpt = COALESCE(?, excerpt),
        content = COALESCE(?, content),
        thumbnail = COALESCE(?, thumbnail),
        author = COALESCE(?, author),
        category = COALESCE(?, category)
      WHERE id = ?`,
      [title, finalSlug, excerpt, content, thumbnail, author, category, postId]
    );

    return res.json({
      success: true,
      message: 'Cập nhật bài viết thành công!'
    });
  } catch (error) {
    console.error('Lỗi updatePost:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật bài viết.',
      error: error.message
    });
  }
};

// [DELETE] /api/posts/:id - Xóa bài viết (Admin)
exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const [existing] = await pool.query('SELECT id FROM posts WHERE id = ?', [postId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết.'
      });
    }

    await pool.query('DELETE FROM posts WHERE id = ?', [postId]);

    return res.json({
      success: true,
      message: 'Đã xóa bài viết thành công!'
    });
  } catch (error) {
    console.error('Lỗi deletePost:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa bài viết.',
      error: error.message
    });
  }
};

