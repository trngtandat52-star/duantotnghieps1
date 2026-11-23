const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// Áp dụng mã giảm giá (Khách hàng)
router.post('/apply', couponController.applyCoupon);

// Quản lý mã giảm giá (Admin)
router.get('/', protect, adminOnly, couponController.getAllCoupons);
router.post('/', protect, adminOnly, couponController.createCoupon);
router.put('/:id', protect, adminOnly, couponController.updateCoupon);
router.delete('/:id', protect, adminOnly, couponController.deleteCoupon);

module.exports = router;

