const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary'); 
const { uploadReel, getReels, likeReel, commentReel, deleteReel } = require('../controllers/reelController');

const authBouncer = require('../middleware/auth');

// Public route - anyone can watch
router.get('/', getReels);

// Protected routes - bouncer checks keycard first
router.post('/', authBouncer, upload.single('video'), uploadReel); 
router.put('/:id/like', authBouncer, likeReel);
router.post('/:id/comment', authBouncer, commentReel);
router.delete('/:id', authBouncer, deleteReel);

module.exports = router;