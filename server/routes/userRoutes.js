const express = require('express');
const router = express.Router();
const { getUserProfile, toggleFollow, updateProfile, searchUsers } = require('../controllers/userController');
const authBouncer = require('../middleware/auth'); 

// 🚨 MUST GO FIRST: Search users 
router.get('/search', authBouncer, searchUsers);

// Public route: Anyone can view a profile
router.get('/:id', getUserProfile);

// Protected routes: You must be logged in
router.post('/:id/follow', authBouncer, toggleFollow);
router.put('/profile', authBouncer, updateProfile); 

module.exports = router;