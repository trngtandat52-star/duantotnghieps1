const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, optionalAuth, adminOnly } = require('../middlewares/authMiddleware');

// Tạo đơn hàng (cho phép cả khách vãng lai và thành viên)
router.post('/', optionalAuth, orderController.createOrder);

// Lịch sử đơn hàng của tôi (yêu cầu đăng nhập)
router.get('/my-orders', protect, orderController.getMyOrders);

// Chi tiết đơn hàng
router.get('/:code', optionalAuth, orderController.getOrderDetail);

// Hủy đơn hàng
router.put('/:id/cancel', protect, orderController.cancelOrder);

// Admin: Quản lý toàn bộ đơn hàng
router.get('/', protect, adminOnly, orderController.getAllOrders);
router.put('/:id/status', protect, adminOnly, orderController.updateOrderStatus);

module.exports = router;
