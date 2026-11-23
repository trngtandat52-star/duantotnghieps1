const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);
router.get('/', wishlistController.getWishlist);
router.post('/', wishlistController.addItem);
router.delete('/:productId', wishlistController.removeItem);

module.exports = router;
