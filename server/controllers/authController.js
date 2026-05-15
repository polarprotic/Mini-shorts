const User = require('../models/User');
const nodemailer = require('nodemailer');
const { redisClient } = require('../config/redis');

// 1. Set up the Email Transporter (Your App's "Post Office")
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // The 16-letter app password
    }
});

// @desc    Step 1: Generate OTP, Save to Redis, and Email it
// @route   POST /api/auth/send-otp
exports.sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        // Generate a random 6-digit code
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save to Redis for 5 minutes (300 seconds)
        await redisClient.set(`otp:${email}`, otp, { EX: 300 });

        // Send the real email
        await transporter.sendMail({
            from: `"ReelStream Auth" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your ReelStream Login Code',
            html: `
                <div style="font-family: sans-serif; padding: 20px; background: #f9f9f9;">
                    <h2>Welcome to ReelStream 🎬</h2>
                    <p>Your 6-digit login code is:</p>
                    <h1 style="color: #7c3aed; letter-spacing: 5px;">${otp}</h1>
                    <p>This code expires in 5 minutes.</p>
                </div>`
        });

        console.log(`📧 OTP sent successfully to: ${email}`);
        res.status(200).json({ message: "OTP sent" });

    } catch (error) {
        console.error("Send OTP Error:", error);
        res.status(500).json({ message: "Failed to send email", error: error.message });
    }
};

// @desc    Step 2: Check Redis for OTP and Log In/Register
// @route   POST /api/auth/verify-otp
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Fetch the code from your Redis Cloud cache
        const cachedOtp = await redisClient.get(`otp:${email}`);
        
        if (!cachedOtp || cachedOtp !== otp) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // Code matched! Remove it from Redis so it can't be used again
        await redisClient.del(`otp:${email}`);

        // Handle MongoDB User (Login or Signup)
        let user = await User.findOne({ phoneNumber: email }); 
        
        if (!user) {
            user = await User.create({
                phoneNumber: email, // Storing email in phoneNumber field for now
                name: `User ${email.split('@')[0]}`, 
                avatar: "👤"
            });
            console.log("🌟 New user created via Email:", email);
        }

        res.status(200).json(user);

    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};