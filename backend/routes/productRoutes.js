const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { optionalAuth, protect, adminOnly } = require('../middlewares/authMiddleware');

router.get('/', productController.getProducts);
router.get('/:slug', productController.getProductDetail);
router.post('/:id/reviews', optionalAuth, productController.addReview);

// Tuyến đường cho Quản trị viên
router.post('/', protect, adminOnly, productController.createProduct);
router.put('/:id', protect, adminOnly, productController.updateProduct);
router.patch('/:id/toggle-status', protect, adminOnly, productController.toggleVisibility);
router.post('/:id/toggle-status', protect, adminOnly, productController.toggleVisibility);
router.delete('/:id', protect, adminOnly, productController.deleteProduct);

module.exports = router;

