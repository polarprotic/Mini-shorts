const express = require('express');
const router = express.Router();
const { getConversation, sendMessage, getInboxUsers } = require('../controllers/chatController');
const authBouncer = require('../middleware/auth');

// All chat routes require the user to be logged in
router.get('/inbox/list', authBouncer, getInboxUsers);
router.get('/:userId', authBouncer, getConversation);
router.post('/send', authBouncer, sendMessage);

module.exports = router;