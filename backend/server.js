const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

// Import Routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const brandRoutes = require('./routes/brandRoutes');
const orderRoutes = require('./routes/orderRoutes');
const couponRoutes = require('./routes/couponRoutes');
const postRoutes = require('./routes/postRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const storeRoutes = require('./routes/storeRoutes');
const cartRoutes = require('./routes/cartRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const adminRoutes = require('./routes/adminRoutes');
const stripeController = require('./controllers/stripeController');

const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(morgan('dev'));

// Stripe needs the unparsed request body to verify webhook signatures.
app.post('/api/orders/stripe/webhook', express.raw({ type: 'application/json' }), stripeController.webhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ giao diện cửa hàng Frontend tĩnh
app.use('/shop', express.static(path.join(__dirname, '../frontend')));
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

// Route trang chủ API & /api: Trả về danh sách endpoints JSON
const getApiDocs = (req, res) => {
  res.json({
    success: true,
    message: 'LuniHome RESTful API Server đang hoạt động',
    endpoints: {
      admin: 'http://localhost:5000/api/admin',
      products: 'http://localhost:5000/api/products',
      categories: 'http://localhost:5000/api/categories',
      brands: 'http://localhost:5000/api/brands',
      banners: 'http://localhost:5000/api/banners',
      stores: 'http://localhost:5000/api/stores',
      cart: 'http://localhost:5000/api/cart',
      wishlist: 'http://localhost:5000/api/wishlist',
      posts: 'http://localhost:5000/api/posts',
      orders: 'http://localhost:5000/api/orders',
      coupons: 'http://localhost:5000/api/coupons',
      auth: 'http://localhost:5000/api/auth'
    }
  });
};

app.get('/', getApiDocs);
app.get('/api', getApiDocs);

// Gắn các Routes API
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/posts', postRoutes);

// Xử lý route không tồn tại (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy tài nguyên: ${req.method} ${req.originalUrl}`
  });
});

// Xử lý lỗi hệ thống
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Khởi chạy máy chủ
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 LuniHome API Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🛍️ Frontend Cửa hàng: http://localhost:${PORT}/shop`);
  console.log(`======================================================\n`);
});
