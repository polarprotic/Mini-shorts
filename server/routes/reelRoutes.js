const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary'); 
const { uploadReel, getReels, likeReel, commentReel, deleteReel } = require('../controllers/reelController');

router.post('/', upload.single('video'), uploadReel); 
router.get('/', getReels);
router.put('/:id/like', likeReel);
router.post('/:id/comment', commentReel);
router.delete('/:id', deleteReel); // 👈 The new Delete route!

module.exports = router;