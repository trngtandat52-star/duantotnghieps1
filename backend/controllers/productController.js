const pool = require('../config/db');

// Helper parse JSON an toàn
function safeJsonParse(data, fallback = null) {
  if (!data) return fallback;
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return fallback;
  }
}

// [GET] /api/products - Lấy danh sách sản phẩm (có lọc, tìm kiếm, phân trang, sắp xếp)
exports.getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const {
      q,
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      priceRange,
      sort,
      is_featured,
      is_hot,
      include_hidden,
      is_active,
      status
    } = req.query;

    let query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug, b.name as brand_name, b.slug as brand_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE 1=1
    `;
    const params = [];

    // Lọc theo trạng thái hiển thị (is_active)
    // Mặc định cho khách hàng là chỉ xem sản phẩm đang hiển thị (is_active = 1)
    const showAll = include_hidden === 'true' || include_hidden === true || status === 'all';
    if (status === 'hidden' || is_active === '0' || is_active === 0) {
      query += ` AND COALESCE(p.is_active, 1) = 0`;
    } else if (status === 'active' || is_active === '1' || is_active === 1) {
      query += ` AND COALESCE(p.is_active, 1) = 1`;
    } else if (!showAll) {
      query += ` AND COALESCE(p.is_active, 1) = 1`;
    }

    // Tìm kiếm từ khóa
    const keyword = search || q;
    if (keyword && keyword.trim()) {
      query += ` AND (p.name LIKE ? OR p.short_description LIKE ? OR p.description LIKE ?)`;
      const term = `%${keyword.trim()}%`;
      params.push(term, term, term);
    }

    // Lọc theo danh mục
    if (category) {
      if (isNaN(category)) {
        query += ` AND (c.slug = ? OR c.name = ? OR c.name LIKE ?)`;
        params.push(category, category, `%${category}%`);
      } else {
        query += ` AND p.category_id = ?`;
        params.push(category);
      }
    }

    // Lọc theo thương hiệu (hỗ trợ cả slug, tên thương hiệu tiếng Việt hoặc tên trong sản phẩm)
    if (brand) {
      if (isNaN(brand)) {
        query += ` AND (b.slug = ? OR b.name = ? OR b.name LIKE ? OR p.name LIKE ?)`;
        params.push(brand, brand, `%${brand}%`, `%${brand}%`);
      } else {
        query += ` AND p.brand_id = ?`;
        params.push(brand);
      }
    }

    // Lọc theo khoảng giá
    if (minPrice) {
      query += ` AND p.price >= ?`;
      params.push(Number(minPrice));
    }
    if (maxPrice) {
      query += ` AND p.price <= ?`;
      params.push(Number(maxPrice));
    }

    // Tiện ích bộ lọc nhanh theo giao diện website LuniHome (hỗ trợ cả tiếng Việt và mã)
    if (priceRange) {
      const pr = String(priceRange).toLowerCase().trim();
      if (pr === 'under500' || pr.includes('dưới 500k') || pr.includes('duoi 500k') || pr.includes('<500k')) {
        query += ` AND p.price < 500000`;
      } else if (pr === '500to1000' || pr.includes('500k - 1m') || pr.includes('500k-1m')) {
        query += ` AND p.price >= 500000 AND p.price <= 1000000`;
      } else if (pr === '1000to2000' || pr.includes('1m - 2m') || pr.includes('1m-2m')) {
        query += ` AND p.price >= 1000000 AND p.price <= 2000000`;
      } else if (pr === 'above2000' || pr.includes('trên 2m') || pr.includes('tren 2m') || pr.includes('>2m')) {
        query += ` AND p.price > 2000000`;
      }
    }

    // Lọc theo phong cách (Hiện đại, Scandinavian, Vintage, Industrial)
    const { style } = req.query;
    if (style) {
      const s = String(style).toLowerCase().trim();
      let keywords = [style.trim()];
      if (s === 'hiện đại' || s === 'hien-dai' || s === 'hien dai') {
        keywords = ['hiện đại', 'modern', 'tối giản', 'led', 'thông minh'];
      } else if (s === 'scandinavian' || s === 'bắc âu') {
        keywords = ['scandinavian', 'bắc âu', 'tối giản', 'gỗ', 'đơn giản'];
      } else if (s === 'vintage' || s === 'cổ điển') {
        keywords = ['vintage', 'classic', 'cổ điển', 'retro', 'pha lê'];
      } else if (s === 'industrial' || s === 'công nghiệp') {
        keywords = ['industrial', 'công nghiệp', 'kim loại', 'nhôm', 'sơn tĩnh điện'];
      }
      const clauses = keywords.map(() => `(p.name LIKE ? OR p.short_description LIKE ? OR p.description LIKE ? OR p.specifications LIKE ?)`).join(' OR ');
      query += ` AND (${clauses})`;
      keywords.forEach(kw => {
        const term = `%${kw}%`;
        params.push(term, term, term, term);
      });
    }

    // Lọc theo không gian (Phòng khách, Phòng ngủ, Bếp, Văn phòng)
    const { space } = req.query;
    if (space) {
      const sp = String(space).toLowerCase().trim();
      let keywords = [space.trim()];
      if (sp === 'phòng khách') keywords = ['phòng khách', 'trần', 'pha lê', 'chùm'];
      else if (sp === 'phòng ngủ') keywords = ['phòng ngủ', 'ngủ', 'ấm áp', 'dịu'];
      else if (sp === 'bếp' || sp === 'phòng ăn') keywords = ['bếp', 'ăn', 'thả', 'quầy bar'];
      else if (sp === 'văn phòng' || sp === 'làm việc') keywords = ['văn phòng', 'làm việc', 'bàn', 'chống cận'];
      const clauses = keywords.map(() => `(p.name LIKE ? OR p.short_description LIKE ? OR p.description LIKE ? OR p.specifications LIKE ?)`).join(' OR ');
      query += ` AND (${clauses})`;
      keywords.forEach(kw => {
        const term = `%${kw}%`;
        params.push(term, term, term, term);
      });
    }

    // Lọc sản phẩm nổi bật / hot
    if (is_featured !== undefined) {
      query += ` AND p.is_featured = ?`;
      params.push(is_featured === 'true' || is_featured === '1' ? 1 : 0);
    }
    if (is_hot !== undefined) {
      query += ` AND p.is_hot = ?`;
      params.push(is_hot === 'true' || is_hot === '1' ? 1 : 0);
    }

    // Đếm tổng số kết quả khớp
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered_table`;
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // Sắp xếp
    if (sort === 'price_asc') {
      query += ` ORDER BY p.price ASC`;
    } else if (sort === 'price_desc') {
      query += ` ORDER BY p.price DESC`;
    } else if (sort === 'rating') {
      query += ` ORDER BY p.rating DESC, p.review_count DESC`;
    } else if (sort === 'popular') {
      query += ` ORDER BY p.review_count DESC, p.rating DESC`;
    } else {
      // Mặc định hoặc newest
      query += ` ORDER BY p.created_at DESC, p.id DESC`;
    }

    // Phân trang
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);

    // Chuẩn hóa định dạng variants & specifications
    const formattedProducts = rows.map(item => ({
      ...item,
      variants_size: safeJsonParse(item.variants_size, ['12W', '24W', '36W']),
      variants_color: safeJsonParse(item.variants_color, ['Ánh sáng Vàng 3000K', 'Trung tính 4000K', 'Trắng sáng 6500K']),
      specifications: safeJsonParse(item.specifications, {}),
      images: safeJsonParse(item.images, [item.thumbnail])
    }));

    return res.json({
      success: true,
      count: formattedProducts.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      data: formattedProducts
    });
  } catch (error) {
    console.error('Lỗi getProducts:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách sản phẩm.',
      error: error.message
    });
  }
};

// [GET] /api/products/:slug - Lấy chi tiết sản phẩm theo slug hoặc id
exports.getProductDetail = async (req, res) => {
  try {
    const { slug } = req.params;

    const query = isNaN(slug)
      ? `SELECT p.*, c.name as category_name, c.slug as category_slug, b.name as brand_name, b.slug as brand_slug
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         LEFT JOIN brands b ON p.brand_id = b.id
         WHERE p.slug = ?`
      : `SELECT p.*, c.name as category_name, c.slug as category_slug, b.name as brand_name, b.slug as brand_slug
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         LEFT JOIN brands b ON p.brand_id = b.id
         WHERE p.id = ? OR p.slug = ?`;

    const params = isNaN(slug) ? [slug] : [Number(slug), slug];
    const [rows] = await pool.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm yêu cầu.'
      });
    }

    const product = rows[0];
    product.variants_size = safeJsonParse(product.variants_size, ['12W', '24W', '36W']);
    product.variants_color = safeJsonParse(product.variants_color, ['Ánh sáng Vàng 3000K', 'Trung tính 4000K', 'Trắng sáng 6500K']);
    product.specifications = safeJsonParse(product.specifications, {});
    product.images = safeJsonParse(product.images, [product.thumbnail]);

    // Lấy đánh giá của sản phẩm này
    const [reviews] = await pool.query(
      `SELECT id, user_name, rating, comment, created_at 
       FROM product_reviews 
       WHERE product_id = ? 
       ORDER BY created_at DESC`,
      [product.id]
    );

    // Lấy 4 sản phẩm liên quan cùng danh mục (chỉ lấy sản phẩm đang hiển thị)
    const [related] = await pool.query(
      `SELECT id, name, slug, price, original_price, rating, review_count, thumbnail, badge 
       FROM products 
       WHERE category_id = ? AND id != ? AND COALESCE(is_active, 1) = 1
       LIMIT 4`,
      [product.category_id, product.id]
    );

    return res.json({
      success: true,
      data: product,
      reviews,
      related
    });
  } catch (error) {
    console.error('Lỗi getProductDetail:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy chi tiết sản phẩm.',
      error: error.message
    });
  }
};

// [POST] /api/products/:id/reviews - Thêm đánh giá cho sản phẩm
exports.addReview = async (req, res) => {
  try {
    const productId = req.params.id;
    const { rating, comment, userName } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp số sao đánh giá (1-5) và nội dung nhận xét.'
      });
    }

    const reviewerName = req.user?.name || userName || 'Khách hàng';
    const userId = req.user?.id || null;

    await pool.query(
      `INSERT INTO product_reviews (product_id, user_id, user_name, rating, comment) 
       VALUES (?, ?, ?, ?, ?)`,
      [productId, userId, reviewerName, Number(rating), comment]
    );

    // Tính lại rating trung bình và số lượng review
    const [agg] = await pool.query(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM product_reviews WHERE product_id = ?`,
      [productId]
    );

    const newRating = Number(agg[0].avg_rating || 5).toFixed(1);
    const newCount = agg[0].count || 0;

    await pool.query(
      `UPDATE products SET rating = ?, review_count = ? WHERE id = ?`,
      [newRating, newCount, productId]
    );

    return res.status(201).json({
      success: true,
      message: 'Cảm ơn bạn đã gửi đánh giá cho sản phẩm!',
      rating: Number(newRating),
      reviewCount: newCount
    });
  } catch (error) {
    console.error('Lỗi addReview:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi thêm đánh giá.',
      error: error.message
    });
  }
};

// Helper tạo slug tiếng Việt
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

// [POST] /api/products - Thêm sản phẩm mới (Admin)
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      slug,
      category_id,
      brand_id,
      sku,
      price,
      original_price,
      stock,
      badge,
      thumbnail,
      images,
      short_description,
      description,
      variants_size,
      variants_color,
      is_featured,
      is_hot,
      is_active
    } = req.body;

    if (!name || price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Tên sản phẩm và Giá bán.'
      });
    }

    const finalSlug = (slug && slug.trim()) ? slugify(slug) : `${slugify(name)}-${Date.now()}`;
    const finalThumbnail = thumbnail || 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80';
    const finalImages = typeof images === 'string' ? images : JSON.stringify(images || [finalThumbnail]);
    const finalVariantsSize = typeof variants_size === 'string' ? variants_size : JSON.stringify(variants_size || ['12W', '24W', '36W']);
    const finalVariantsColor = typeof variants_color === 'string' ? variants_color : JSON.stringify(variants_color || ['Ánh sáng Vàng 3000K', 'Trung tính 4000K', 'Trắng sáng 6500K']);
    const finalIsActive = is_active !== undefined ? (is_active ? 1 : 0) : 1;

    const [result] = await pool.query(
      `INSERT INTO products (
        name, slug, category_id, brand_id, sku, price, original_price, 
        stock, badge, thumbnail, images, variants_size, variants_color, 
        short_description, description, is_featured, is_hot, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        finalSlug,
        category_id ? Number(category_id) : null,
        brand_id ? Number(brand_id) : null,
        sku || null,
        Number(price) || 0,
        Number(original_price) || Number(price) || 0,
        stock !== undefined ? Number(stock) : 10,
        badge || null,
        finalThumbnail,
        finalImages,
        finalVariantsSize,
        finalVariantsColor,
        short_description || null,
        description || null,
        is_featured ? 1 : 0,
        is_hot ? 1 : 0,
        finalIsActive
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm mới thành công!',
      productId: result.insertId
    });
  } catch (error) {
    console.error('Lỗi createProduct:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi thêm sản phẩm.',
      error: error.message
    });
  }
};

// [PUT] /api/products/:id - Cập nhật sản phẩm (Admin)
exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      name,
      slug,
      category_id,
      brand_id,
      sku,
      price,
      original_price,
      stock,
      badge,
      thumbnail,
      images,
      variants_size,
      variants_color,
      short_description,
      description,
      is_featured,
      is_hot,
      is_active
    } = req.body;

    const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [productId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm.'
      });
    }

    const current = existing[0];
    const finalSlug = slug ? slugify(slug) : (name ? slugify(name) : current.slug);
    const finalImages = images ? (typeof images === 'string' ? images : JSON.stringify(images)) : current.images;
    const finalVariantsSize = variants_size !== undefined ? (typeof variants_size === 'string' ? variants_size : JSON.stringify(variants_size)) : current.variants_size;
    const finalVariantsColor = variants_color !== undefined ? (typeof variants_color === 'string' ? variants_color : JSON.stringify(variants_color)) : current.variants_color;
    const finalIsActive = is_active !== undefined ? (is_active ? 1 : 0) : current.is_active;

    await pool.query(
      `UPDATE products SET 
        name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        category_id = ?,
        brand_id = ?,
        sku = COALESCE(?, sku),
        price = COALESCE(?, price),
        original_price = COALESCE(?, original_price),
        stock = COALESCE(?, stock),
        badge = ?,
        thumbnail = COALESCE(?, thumbnail),
        images = COALESCE(?, images),
        variants_size = COALESCE(?, variants_size),
        variants_color = COALESCE(?, variants_color),
        short_description = COALESCE(?, short_description),
        description = COALESCE(?, description),
        is_featured = COALESCE(?, is_featured),
        is_hot = COALESCE(?, is_hot),
        is_active = ?
      WHERE id = ?`,
      [
        name,
        finalSlug,
        category_id !== undefined ? (category_id ? Number(category_id) : null) : current.category_id,
        brand_id !== undefined ? (brand_id ? Number(brand_id) : null) : current.brand_id,
        sku,
        price !== undefined ? Number(price) : current.price,
        original_price !== undefined ? Number(original_price) : current.original_price,
        stock !== undefined ? Number(stock) : current.stock,
        badge !== undefined ? badge : current.badge,
        thumbnail,
        finalImages,
        finalVariantsSize,
        finalVariantsColor,
        short_description,
        description,
        is_featured !== undefined ? (is_featured ? 1 : 0) : current.is_featured,
        is_hot !== undefined ? (is_hot ? 1 : 0) : current.is_hot,
        finalIsActive,
        productId
      ]
    );

    return res.json({
      success: true,
      message: 'Cập nhật sản phẩm thành công!'
    });
  } catch (error) {
    console.error('Lỗi updateProduct:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật sản phẩm.',
      error: error.message
    });
  }
};

// [DELETE] /api/products/:id - Ẩn sản phẩm (Tuyệt đối KHÔNG xóa vật lý khỏi database)
// Thực hiện yêu cầu nghiệp vụ: "Chỉ được ẩn sp chứ ko được xoá"
exports.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const [existing] = await pool.query('SELECT id, name, is_active FROM products WHERE id = ?', [productId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm.'
      });
    }

    // Nghiệp vụ bảo toàn dữ liệu: chuyển is_active = 0 thay vì DELETE
    await pool.query('UPDATE products SET is_active = 0 WHERE id = ?', [productId]);

    return res.json({
      success: true,
      message: `Hệ thống không xóa sản phẩm để bảo toàn dữ liệu đơn hàng. Sản phẩm "${existing[0].name}" đã được chuyển sang trạng thái Đã Ẩn!`,
      is_active: 0
    });
  } catch (error) {
    console.error('Lỗi deleteProduct (chuyển sang ẩn):', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi ẩn sản phẩm.',
      error: error.message
    });
  }
};

// [PATCH/POST] /api/products/:id/toggle-status - Thay đổi trạng thái Ẩn / Hiển thị
exports.toggleVisibility = async (req, res) => {
  try {
    const productId = req.params.id;
    const [existing] = await pool.query('SELECT id, name, is_active FROM products WHERE id = ?', [productId]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm.'
      });
    }

    const current = existing[0];
    let newStatus;
    if (req.body && req.body.is_active !== undefined) {
      newStatus = Number(req.body.is_active) ? 1 : 0;
    } else {
      // Toggle đảo trạng thái hiện tại
      newStatus = (current.is_active === 0) ? 1 : 0;
    }

    await pool.query('UPDATE products SET is_active = ? WHERE id = ?', [newStatus, productId]);

    return res.json({
      success: true,
      message: newStatus === 1 
        ? `Đã mở hiển thị sản phẩm "${current.name}" trên website.`
        : `Đã ẩn sản phẩm "${current.name}" khỏi website.`,
      is_active: newStatus
    });
  } catch (error) {
    console.error('Lỗi toggleVisibility:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi đổi trạng thái hiển thị sản phẩm.',
      error: error.message
    });
  }
};

