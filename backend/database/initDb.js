const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

const DB_NAME = process.env.DB_NAME || 'lunihome';

async function initDatabase() {
  console.log('--- KHỞI TẠO CƠ SỞ DỮ LIỆU LUNIHOME (MYSQL) ---');
  let connection;

  try {
    // 1. Kết nối tới MySQL Server (chưa chọn database)
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('[1/4] Đã kết nối MySQL Server thành công.');

    // 2. Tạo Database nếu chưa có
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`[2/4] Đã kiểm tra/tạo database: ${DB_NAME}`);

    // Chuyển sang database vừa tạo
    await connection.changeUser({ database: DB_NAME });

    // 3. Tạo các bảng
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20) DEFAULT NULL,
        address VARCHAR(255) DEFAULT NULL,
        role ENUM('customer', 'admin') DEFAULT 'customer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT DEFAULT NULL,
        icon VARCHAR(100) DEFAULT NULL,
        image VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS brands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT DEFAULT NULL,
        logo VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT DEFAULT NULL,
        brand_id INT DEFAULT NULL,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        sku VARCHAR(50) DEFAULT NULL,
        original_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        price DECIMAL(12,2) NOT NULL DEFAULT 0,
        stock INT NOT NULL DEFAULT 10,
        badge VARCHAR(50) DEFAULT NULL,
        rating DECIMAL(2,1) DEFAULT 5.0,
        review_count INT DEFAULT 0,
        thumbnail VARCHAR(500) NOT NULL,
        images TEXT DEFAULT NULL,
        variants_size VARCHAR(255) DEFAULT '["12W","24W","36W"]',
        variants_color VARCHAR(255) DEFAULT '["Ánh sáng Vàng 3000K","Trung tính 4000K","Trắng sáng 6500K"]',
        short_description VARCHAR(500) DEFAULT NULL,
        description TEXT DEFAULT NULL,
        specifications TEXT DEFAULT NULL,
        is_featured TINYINT(1) DEFAULT 0,
        is_hot TINYINT(1) DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
        CONSTRAINT fk_product_brand FOREIGN KEY (brand_id) REFERENCES brands (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS product_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        user_id INT DEFAULT NULL,
        user_name VARCHAR(100) NOT NULL,
        rating INT NOT NULL DEFAULT 5,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_review_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
        CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS coupons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        discount_type ENUM('fixed', 'percent') DEFAULT 'fixed',
        discount_value DECIMAL(12,2) NOT NULL,
        min_order_value DECIMAL(12,2) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_code VARCHAR(50) NOT NULL UNIQUE,
        user_id INT DEFAULT NULL,
        customer_name VARCHAR(100) NOT NULL,
        customer_email VARCHAR(150) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        shipping_address VARCHAR(255) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'COD',
        payment_status VARCHAR(50) DEFAULT 'unpaid',
        order_status ENUM('pending', 'processing', 'shipping', 'completed', 'cancelled') DEFAULT 'pending',
        note TEXT DEFAULT NULL,
        subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
        discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        shipping_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT DEFAULT NULL,
        product_name VARCHAR(255) NOT NULL,
        product_image VARCHAR(500) DEFAULT NULL,
        variant_size VARCHAR(50) DEFAULT NULL,
        variant_color VARCHAR(50) DEFAULT NULL,
        price DECIMAL(12,2) NOT NULL DEFAULT 0,
        quantity INT NOT NULL DEFAULT 1,
        total DECIMAL(12,2) NOT NULL DEFAULT 0,
        CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
        CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        excerpt TEXT DEFAULT NULL,
        content LONGTEXT DEFAULT NULL,
        thumbnail VARCHAR(500) DEFAULT NULL,
        author VARCHAR(100) DEFAULT 'Ban biên tập',
        category VARCHAR(100) DEFAULT 'Mẹo bài trí',
        views INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS wishlists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_product (user_id, product_id),
        CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_wishlist_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS cart_items (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT UNSIGNED NOT NULL DEFAULT 1,
        variant_size VARCHAR(50) NOT NULL DEFAULT '',
        variant_color VARCHAR(50) NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_cart_user_product_variant (user_id, product_id, variant_size, variant_color),
        KEY idx_cart_items_product_id (product_id),
        CONSTRAINT fk_cart_item_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_cart_item_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS inventory_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        change_type ENUM('import', 'export', 'adjust', 'order_deduct') DEFAULT 'adjust',
        quantity_change INT NOT NULL,
        old_stock INT NOT NULL,
        new_stock INT NOT NULL,
        note VARCHAR(255) DEFAULT NULL,
        created_by VARCHAR(100) DEFAULT 'Admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS banner (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ten_banner VARCHAR(200) NOT NULL,
        hinh_anh VARCHAR(500) NOT NULL,
        lien_ket VARCHAR(500) DEFAULT NULL,
        trang_thai ENUM('hien', 'an') NOT NULL DEFAULT 'hien',
        thu_tu INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_banner_trang_thai (trang_thai),
        KEY idx_banner_thu_tu (thu_tu)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS cua_hang (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ten_cua_hang VARCHAR(200) NOT NULL,
        dia_chi VARCHAR(500) NOT NULL,
        so_dien_thoai VARCHAR(20) DEFAULT NULL,
        email VARCHAR(150) DEFAULT NULL,
        gio_mo_cua VARCHAR(100) DEFAULT NULL,
        toa_do_vi_do DECIMAL(10,7) DEFAULT NULL,
        toa_do_kinh_do DECIMAL(10,7) DEFAULT NULL,
        lien_ket_ban_do VARCHAR(500) DEFAULT NULL,
        trang_thai ENUM('hien', 'an') NOT NULL DEFAULT 'hien',
        thu_tu INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_cua_hang_trang_thai (trang_thai),
        KEY idx_cua_hang_thu_tu (thu_tu)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    ];

    for (const sql of tables) {
      await connection.query(sql);
    }
    console.log('[3/4] Đã tạo toàn bộ các bảng trong CSDL.');

    const [defaultAdmin] = await connection.query(
      'SELECT id, password FROM users WHERE email = ? AND role = ?',
      ['admin@lunihome.vn', 'admin']
    );
    if (
      defaultAdmin.length &&
      !String(defaultAdmin[0].password).startsWith('$2')
    ) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await connection.query(
        'UPDATE users SET password = ? WHERE id = ?',
        [passwordHash, defaultAdmin[0].id]
      );
      console.log('-> Đã chuẩn hóa mật khẩu admin mặc định sang bcrypt.');
    }

    await connection.query(
      "UPDATE brands SET logo = NULL WHERE logo LIKE '%unsplash.com%'"
    );

    await connection.query(`
      INSERT INTO banner (ten_banner, hinh_anh, lien_ket, trang_thai, thu_tu)
      SELECT 'Bộ sưu tập đèn trần hiện đại',
             'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80',
             '/danh-muc/den-tran', 'hien', 1
      WHERE NOT EXISTS (
        SELECT 1 FROM banner WHERE ten_banner = 'Bộ sưu tập đèn trần hiện đại'
      )
    `);
    await connection.query(`
      INSERT INTO banner (ten_banner, hinh_anh, lien_ket, trang_thai, thu_tu)
      SELECT 'Không gian sống cùng ánh sáng ấm',
             'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80',
             '/danh-muc/den-tha', 'hien', 2
      WHERE NOT EXISTS (
        SELECT 1 FROM banner WHERE ten_banner = 'Không gian sống cùng ánh sáng ấm'
      )
    `);
    await connection.query(`
      INSERT INTO cua_hang (
        ten_cua_hang, dia_chi, so_dien_thoai, email, gio_mo_cua,
        lien_ket_ban_do, trang_thai, thu_tu
      )
      SELECT 'LumiHome - Quận 7', '123 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
             '0901234567', 'hello@lunihome.vn', '09:00 - 21:00',
             'https://maps.google.com/?q=123+Nguyen+Van+Linh+Quan+7', 'hien', 1
      WHERE NOT EXISTS (
        SELECT 1 FROM cua_hang WHERE ten_cua_hang = 'LumiHome - Quận 7'
      )
    `);

    // 4. Seed dữ liệu mẫu (nếu bảng users còn trống)
    const [existingUsers] = await connection.query('SELECT COUNT(*) as count FROM users');
    if (existingUsers[0].count === 0) {
      console.log('-> Đang nạp dữ liệu mẫu ban đầu (Seeding)...');

      // 4.1 Người dùng
      const salt = await bcrypt.genSalt(10);
      const hashAdmin = await bcrypt.hash('admin123', salt);
      const hashCustomer = await bcrypt.hash('123456', salt);

      await connection.query(
        `INSERT INTO users (name, email, password, phone, address, role) VALUES 
        ('Quản trị viên Lunihome', 'admin@lunihome.vn', ?, '0901234567', '123 Nguyễn Văn Linh, Quận 7, TP.HCM', 'admin'),
        ('Nguyễn Thị Lan', 'customer@gmail.com', ?, '0902134678', '123 Nguyễn Văn Linh, Quận 7, TP.HCM', 'customer');`,
        [hashAdmin, hashCustomer]
      );

      // 4.2 Danh mục
      await connection.query(`
        INSERT INTO categories (name, slug, description, icon, image) VALUES
        ('Đèn trần', 'den-tran', 'Đèn ốp trần, đèn trần phòng khách hiện đại', 'fa-solid fa-lightbulb', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80'),
        ('Đèn thả', 'den-tha', 'Đèn thả trang trí phòng ăn, quầy bar, quán cafe', 'fa-solid fa-gem', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80'),
        ('Đèn bàn', 'den-ban', 'Đèn làm việc, đèn bàn học chống cận thị', 'fa-solid fa-desktop', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=600&q=80'),
        ('Đèn tường', 'den-tuong', 'Đèn hắt tường, đèn trang trí hành lang và phòng ngủ', 'fa-solid fa-cubes', 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=600&q=80'),
        ('Đèn ngủ', 'den-ngu', 'Đèn ngủ dịu êm, ánh sáng ấm áp bảo vệ giấc ngủ', 'fa-solid fa-moon', 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=600&q=80'),
        ('Đèn decor', 'den-decor', 'Đèn decor nghệ thuật, chiếu sáng điểm nhấn', 'fa-solid fa-wand-magic-sparkles', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80');
      `);

      // 4.3 Thương hiệu
      await connection.query(`
        INSERT INTO brands (name, slug, description, logo) VALUES
        ('LumiHome', 'lumihome', 'Thương hiệu đèn thiết kế cao cấp độc quyền', NULL),
        ('Philips', 'philips', 'Tập đoàn chiếu sáng thông minh toàn cầu', NULL),
        ('Rạng Đông', 'rang-dong', 'Thương hiệu chiếu sáng quốc dân Việt Nam', NULL),
        ('Panasonic', 'panasonic', 'Công nghệ Nhật Bản, bền bỉ và tiết kiệm năng lượng', NULL),
        ('Duhal', 'duhal', 'Giải pháp chiếu sáng LED hiện đại', NULL);
      `);

      // 4.4 Sản phẩm
      const productsData = [
        {
          catId: 1, brandId: 1,
          name: 'Đèn trần hiện đại LumiHome Aurora',
          slug: 'den-tran-hien-dai-lumihome-aurora',
          sku: 'LH-TR-01',
          orig: 1590000, price: 1290000, stock: 15, badge: 'Mới', rating: 5.0, reviews: 48,
          thumb: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
          desc: 'Đèn trần LumiHome Aurora với thiết kế vòng tròn tối giản Bắc Âu, ánh sáng mềm mại lan tỏa đều không gian.',
          spec: JSON.stringify({ 'Thương hiệu': 'LumiHome', 'Loại': 'Đèn trần', 'Chất liệu': 'Thép không gỉ + kính mờ', 'Công suất': '40W', 'Điện áp': '220V', 'Bảo hành': '24 tháng' }),
          feat: 1, hot: 1
        },
        {
          catId: 2, brandId: 2,
          name: 'Đèn thả trang trí Philips Modern',
          slug: 'den-tha-trang-tri-philips-modern',
          sku: 'PH-TH-02',
          orig: 1200000, price: 990000, stock: 20, badge: 'Hot', rating: 4.9, reviews: 36,
          thumb: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80',
          desc: 'Thiết kế thả chao nhôm sơn tĩnh điện cao cấp, thích hợp bàn ăn và quầy đảo bếp hiện đại.',
          spec: JSON.stringify({ 'Thương hiệu': 'Philips', 'Loại': 'Đèn thả', 'Chất liệu': 'Hợp kim nhôm', 'Công suất': '25W', 'Bảo hành': '24 tháng' }),
          feat: 1, hot: 1
        },
        {
          catId: 3, brandId: 3,
          name: 'Đèn bàn LED Rạng Đông Cozy',
          slug: 'den-ban-led-rang-dong-cozy',
          sku: 'RD-BA-03',
          orig: 499000, price: 399000, stock: 35, badge: null, rating: 4.8, reviews: 29,
          thumb: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
          desc: 'Đèn bàn học công nghệ LED bảo vệ mắt, không nhấp nháy, hỗ trợ 3 mức sáng và cổng sạc USB.',
          spec: JSON.stringify({ 'Thương hiệu': 'Rạng Đông', 'Loại': 'Đèn bàn', 'Chất liệu': 'Nhựa ABS cao cấp', 'Công suất': '9W', 'Bảo hành': '12 tháng' }),
          feat: 0, hot: 0
        },
        {
          catId: 4, brandId: 4,
          name: 'Đèn tường Panasonic Classic',
          slug: 'den-tuong-panasonic-classic',
          sku: 'PA-TU-04',
          orig: 650000, price: 549000, stock: 18, badge: null, rating: 4.7, reviews: 22,
          thumb: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80',
          desc: 'Ánh sáng hắt tường 2 đầu ấm áp, chuẩn chống nước IP54 phù hợp cả nội thất lẫn ban công có mái che.',
          spec: JSON.stringify({ 'Thương hiệu': 'Panasonic', 'Loại': 'Đèn tường', 'Chất liệu': 'Nhôm đúc', 'Công suất': '12W', 'Bảo hành': '24 tháng' }),
          feat: 0, hot: 0
        },
        {
          catId: 5, brandId: 5,
          name: 'Đèn ngủ Duhal Moon Light',
          slug: 'den-ngu-duhal-moon-light',
          sku: 'DH-NG-05',
          orig: 450000, price: 349000, stock: 40, badge: 'Sale', rating: 4.9, reviews: 65,
          thumb: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80',
          desc: 'Mô phỏng ánh trăng dịu nhẹ, điều khiển cảm ứng chạm đổi màu và điều chỉnh độ sáng linh hoạt.',
          spec: JSON.stringify({ 'Thương hiệu': 'Duhal', 'Loại': 'Đèn ngủ', 'Chất liệu': 'Silicone & gỗ tự nhiên', 'Công suất': '5W', 'Bảo hành': '12 tháng' }),
          feat: 1, hot: 1
        },
        {
          catId: 1, brandId: 2,
          name: 'Đèn trần LED Philips Elegant',
          slug: 'den-tran-led-philips-elegant',
          sku: 'PH-TR-06',
          orig: 1150000, price: 899000, stock: 25, badge: 'Hot', rating: 5.0, reviews: 58,
          thumb: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
          desc: 'Đèn ốp trần mỏng nhẹ siêu sáng, tiết kiệm 80% điện năng so với bóng đèn truyền thống.',
          spec: JSON.stringify({ 'Thương hiệu': 'Philips', 'Loại': 'Đèn trần', 'Chất liệu': 'Acrylic mờ', 'Công suất': '36W', 'Bảo hành': '24 tháng' }),
          feat: 1, hot: 0
        },
        {
          catId: 2, brandId: 3,
          name: 'Đèn thả Rạng Đông Crystal',
          slug: 'den-tha-rang-dong-crystal',
          sku: 'RD-TH-07',
          orig: 1450000, price: 1190000, stock: 12, badge: null, rating: 4.8, reviews: 41,
          thumb: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80',
          desc: 'Hạt pha lê K9 khúc xạ ánh sáng lấp lánh sang trọng, nâng tầm vẻ đẹp cho bàn ăn gia đình.',
          spec: JSON.stringify({ 'Thương hiệu': 'Rạng Đông', 'Loại': 'Đèn thả', 'Chất liệu': 'Pha lê K9 + Thép mạ', 'Công suất': '30W', 'Bảo hành': '24 tháng' }),
          feat: 0, hot: 1
        },
        {
          catId: 3, brandId: 4,
          name: 'Đèn bàn Panasonic Study Pro',
          slug: 'den-ban-panasonic-study-pro',
          sku: 'PA-BA-08',
          orig: 590000, price: 459000, stock: 22, badge: null, rating: 4.9, reviews: 33,
          thumb: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80',
          desc: 'Trang bị cảm biến ánh sáng tự động điều chỉnh độ sáng theo môi trường, xoay gập 180 độ.',
          spec: JSON.stringify({ 'Thương hiệu': 'Panasonic', 'Loại': 'Đèn bàn', 'Chất liệu': 'Nhựa cao cấp', 'Công suất': '13W', 'Bảo hành': '24 tháng' }),
          feat: 0, hot: 0
        }
      ];

      for (const p of productsData) {
        await connection.query(
          `INSERT INTO products 
          (category_id, brand_id, name, slug, sku, original_price, price, stock, badge, rating, review_count, thumbnail, description, specifications, is_featured, is_hot)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.catId, p.brandId, p.name, p.slug, p.sku, p.orig, p.price, p.stock, p.badge, p.rating, p.reviews, p.thumb, p.desc, p.spec, p.feat, p.hot]
        );
      }

      // 4.5 Đánh giá mẫu
      await connection.query(`
        INSERT INTO product_reviews (product_id, user_name, rating, comment) VALUES
        (1, 'Nguyễn Hạnh', 5, 'Đèn rất đẹp, ánh sáng êm dịu, lắp ráp lên trần nhìn sang hẳn phòng khách.'),
        (1, 'Trần Minh Tuấn', 5, 'Chất lượng hoàn thiện tuyệt vời, đóng gói rất cẩn thận, giao hàng nhanh.'),
        (2, 'Lê Hoàng Oanh', 5, 'Rất ưng ý với đèn thả này, màu sắc trang nhã, đúng như hình quảng cáo.');
      `);

      // 4.6 Mã giảm giá
      await connection.query(`
        INSERT INTO coupons (code, discount_type, discount_value, min_order_value, is_active) VALUES
        ('LUNI10', 'percent', 10.00, 500000, 1),
        ('GIAM100K', 'fixed', 100000.00, 1000000, 1),
        ('FREESHIP', 'fixed', 30000.00, 300000, 1);
      `);

      // 4.7 Đơn hàng mẫu
      await connection.query(`
        INSERT INTO orders 
        (order_code, user_id, customer_name, customer_email, customer_phone, shipping_address, payment_method, payment_status, order_status, note, subtotal, discount_amount, shipping_fee, total_amount)
        VALUES 
        ('LUNI-20261014', 2, 'Nguyễn Thị Lan', 'customer@gmail.com', '0902134678', '123 Nguyễn Văn Linh, Quận 7, TP.HCM', 'COD', 'unpaid', 'processing', 'Giao trong giờ hành chính', 1988000, 100000, 0, 1888000),
        ('LUNI-20260921', 2, 'Nguyễn Thị Lan', 'customer@gmail.com', '0902134678', '123 Nguyễn Văn Linh, Quận 7, TP.HCM', 'COD', 'paid', 'completed', 'Gọi trước khi giao', 459000, 0, 0, 459000);
      `);

      await connection.query(`
        INSERT INTO order_items (order_id, product_id, product_name, product_image, variant_size, variant_color, price, quantity, total) VALUES
        (1, 1, 'Đèn trần hiện đại LumiHome Aurora', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80', '24W (Ø40cm)', 'Vàng ấm (3000K)', 1290000, 1, 1290000),
        (1, 5, 'Đèn ngủ Duhal Moon Light', 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80', '5W', 'Ánh trăng 4000K', 349000, 2, 698000),
        (2, 8, 'Đèn bàn Panasonic Study Pro', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80', '13W (Bảo vệ mắt)', 'Đen nhám', 459000, 1, 459000);
      `);

      // 4.8 Bài viết mẫu
      await connection.query(`
        INSERT INTO posts (title, slug, excerpt, content, thumbnail, author, category, views) VALUES
        ('5 xu hướng chiếu sáng nội thất nổi bật 2026', '5-xu-huong-chieu-sang-noi-that-2026', 
         'Khám phá những phong cách thiết kế đèn trang trí đang định hình không gian sống hiện đại trong năm nay.',
         '<p>Chiếu sáng không chỉ là nguồn sáng đơn thuần mà đã trở thành linh hồn của thiết kế nội thất hiện đại. Xu hướng 2026 hướng tới sự tối giản, đường nét tinh tế kết hợp công nghệ điều chỉnh nhiệt độ màu thông minh...</p>',
         'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80',
         'Kiến trúc sư Minh Khang', 'Mẹo bài trí', 245),
        ('Bí quyết chọn đèn trần phù hợp với từng diện tích phòng', 'bi-quyet-chon-den-tran-phu-hop-dien-tich',
         'Cách đo đạc chiều cao trần và lựa chọn kích thước đèn cân đối, mang lại cảm giác rộng rãi và ấm cúng.',
         '<p>Đối với trần nhà cao dưới 2.8m, đèn ốp trần áp sát là giải pháp lý tưởng. Ngược lại, trần trên 3m cho phép bạn tự do sử dụng các mẫu đèn thả hoặc đèn chùm nghệ thuật...</p>',
         'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
         'Ban biên tập', 'Cẩm nang mua sắm', 180);
      `);

      console.log('[4/4] Seed dữ liệu hoàn tất! (Đã nạp Users, Categories, Brands, Products, Reviews, Coupons, Orders, Posts)');
    } else {
      console.log('[4/4] CSDL đã có sẵn dữ liệu, bỏ qua bước seed.');
    }

    console.log('\n======================================================');
    console.log('✅ KHỞI TẠO CSDL THÀNH CÔNG VĨ ĐẠI!');
    console.log(`Database name: ${DB_NAME}`);
    console.log('Tài khoản test:');
    console.log('  - Quản trị viên: admin@lunihome.vn  /  admin123');
    console.log('  - Khách hàng:    customer@gmail.com /  123456');
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Lỗi trong quá trình khởi tạo CSDL:');
    console.error(error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n--> LÝ DO: Không thể kết nối tới MySQL trên cổng 3306.');
      console.error('--> KHẮC PHỤC: Mở "XAMPP Control Panel" và bấm "Start" ở dòng MySQL.\n');
    }
  } finally {
    if (connection) await connection.end();
  }
}

initDatabase();
