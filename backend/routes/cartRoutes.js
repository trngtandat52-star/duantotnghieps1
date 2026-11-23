const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);
router.get('/', cartController.getCart);
router.post('/items', cartController.addItem);
router.put('/items/:cartItemId', cartController.updateItem);
router.delete('/items/:cartItemId', cartController.removeItem);
router.delete('/', cartController.clearCart);

module.exports = router;
