const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

router.get('/', postController.getPosts);
router.get('/:slug', postController.getPostDetail);

// Quản trị viên
router.post('/', protect, adminOnly, postController.createPost);
router.put('/:id', protect, adminOnly, postController.updatePost);
router.delete('/:id', protect, adminOnly, postController.deletePost);

module.exports = router;

