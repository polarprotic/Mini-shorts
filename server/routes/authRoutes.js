const express = require('express');
const router = express.Router();
// We are now importing sendOtp and verifyOtp instead of otpLogin
const { sendOtp, verifyOtp } = require('../controllers/authController');

// Route 1: Ask the server to generate and email the code
router.post('/send-otp', sendOtp);

// Route 2: Send the code back to the server to check against Redis
router.post('/verify-otp', verifyOtp);

module.exports = router;