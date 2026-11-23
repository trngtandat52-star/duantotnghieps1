const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// Tất cả các route bên dưới đều bắt buộc phải đăng nhập và là Quản trị viên (admin)
router.use(protect, adminOnly);

// 1. Thống kê tổng quan
router.get('/stats', adminController.getStats);

// 2. Quản lý người dùng (hỗ trợ cả /users và /user)
router.get(['/users', '/user'], adminController.getAllUsers);
router.post(['/users', '/user'], adminController.createUser);
router.put(['/users/:id', '/user/:id'], adminController.updateUser);
router.delete(['/users/:id', '/user/:id'], adminController.deleteUser);

// 3. Xóa đơn hàng
router.delete('/orders/:id', adminController.deleteOrder);

// 4. Quản lý tồn kho (Inventory Management)
router.get('/inventory', adminController.getInventoryOverview);
router.post('/inventory/adjust', adminController.adjustStock);
router.get('/inventory/logs', adminController.getInventoryLogs);

module.exports = router;
