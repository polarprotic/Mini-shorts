const Reel = require('../models/Reel');
const redisClient = require('../config/redis');

// 💡 HELPER: Safely wipe the cache so everyone sees new likes/videos instantly
const clearFeedCache = async () => {
    try {
        if (typeof redisClient.del === 'function') {
            await redisClient.del('reels:feed');
        } else if (redisClient.client && typeof redisClient.client.del === 'function') {
            await redisClient.client.del('reels:feed');
        } else if (typeof redisClient.setEx === 'function') {
            await redisClient.setEx('reels:feed', 1, "[]"); // Fallback overwrite
        }
        console.log("🧹 Redis Cache Cleared!");
    } catch (err) {
        console.log("⚠️ Minor cache clear error (non-critical)");
    }
};

// @desc    Upload a new Reel
// @route   POST /api/reels
exports.uploadReel = async (req, res) => {
    try {
        console.log("📥 Catching file...");
        if (!req.file) {
            console.log("❌ No file was caught by multer!");
            return res.status(400).json({ message: "Please upload a video file" });
        }

        const cloudVideoUrl = req.file.path; 
        console.log("☁️ Success! Cloudinary URL:", cloudVideoUrl);

        const newReel = await Reel.create({
            creator: req.body.creatorId,
            videoUrl: cloudVideoUrl,
            caption: req.body.caption
        });

        const populatedReel = await Reel.findById(newReel._id).populate('creator', 'phoneNumber name avatar');
        
        await clearFeedCache(); // ⚡ Wipe cache so the new video shows up!

        res.status(201).json(populatedReel);
    } catch (error) {
        console.error("❌ Backend Upload Error:", error.message || error);
        res.status(500).json({ message: "Upload failed", error: error.message || "Unknown error" });
    }
};

// @desc    Get all Reels (The Feed)
// @route   GET /api/reels
exports.getReels = async (req, res) => {
    try {
        // 1. 🛡️ SAFE REDIS FETCH: Try to check cache, but don't crash if it fails
        let cachedFeed = null;
        try {
            if (typeof redisClient.get === 'function') {
                cachedFeed = await redisClient.get('reels:feed');
            } else if (redisClient.client && typeof redisClient.client.get === 'function') {
                cachedFeed = await redisClient.client.get('reels:feed');
            }
        } catch (redisErr) {
            console.log("⚠️ Redis read failed, ignoring cache...");
        }

        if (cachedFeed && cachedFeed !== "[]") {
            console.log("⚡ REDIS CACHE HIT: Sent feed in 2ms!");
            return res.status(200).json(JSON.parse(cachedFeed)); 
        }

        console.log("🐢 MONGODB MISS: Fetching fresh database records...");
        
        // 2. Fetch fresh from DB
        const reels = await Reel.find()
            .populate('creator', 'phoneNumber name avatar')
            .populate('comments.userId', 'phoneNumber name avatar')
            .sort({ createdAt: -1 });

        // 3. 🛡️ SAFE REDIS SAVE
        try {
            if (typeof redisClient.setEx === 'function') {
                await redisClient.setEx('reels:feed', 3600, JSON.stringify(reels));
            } else if (redisClient.client && typeof redisClient.client.setEx === 'function') {
                await redisClient.client.setEx('reels:feed', 3600, JSON.stringify(reels));
            }
        } catch (redisErr) {
            console.log("⚠️ Redis save failed, but videos will still load.");
        }

        res.status(200).json(reels);
    } catch (error) {
        console.error("Backend Fetch Error:", error);
        res.status(500).json({ message: "Could not fetch feed", error: error.message });
    }
};

// @desc    Like or Unlike a Reel
// @route   PUT /api/reels/:id/like
exports.likeReel = async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.id);
        if (!reel) return res.status(404).json({ message: "Reel not found" });

        // Check the action sent by React
        if (req.body.action === 'unlike') {
            reel.likes = Math.max(0, reel.likes - 1); // Subtract 1 (but never go below 0)
        } else {
            reel.likes += 1; // Add 1
        }

        await reel.save();
        await clearFeedCache(); // ⚡ Wipe cache to update like counts!

        res.status(200).json(reel);
    } catch (error) {
        res.status(500).json({ message: "Could not toggle like", error: error.message });
    }
};

// @desc    Add a Comment
// @route   POST /api/reels/:id/comment
exports.commentReel = async (req, res) => {
    try {
        const { userId, text } = req.body;
        const reel = await Reel.findById(req.params.id);
        if (!reel) return res.status(404).json({ message: "Reel not found" });

        reel.comments.push({ userId, text });
        await reel.save();

        await clearFeedCache(); // ⚡ Wipe cache to show the new comment!

        res.status(200).json(reel);
    } catch (error) {
        res.status(500).json({ message: "Could not add comment", error: error.message });
    }
};

// @desc    Delete a Reel
// @route   DELETE /api/reels/:id
exports.deleteReel = async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.id);
        if (!reel) return res.status(404).json({ message: "Reel not found" });

        await reel.deleteOne();

        await clearFeedCache(); // ⚡ Wipe cache so it disappears for everyone!

        res.status(200).json({ message: "Reel deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Could not delete reel", error: error.message });
    }
};