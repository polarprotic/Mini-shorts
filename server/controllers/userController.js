const User = require('../models/User');
const Reel = require('../models/Reel');

// @desc    Get a user's profile and all their uploaded reels
// @route   GET /api/users/:id
exports.getUserProfile = async (req, res) => {
    try {
        // 1. Find the user and count their followers/following
        const user = await User.findById(req.params.id)
            .select('-__v') // Hide internal mongoose fields
            .populate('followers', 'name avatar') // Get names of followers
            .populate('following', 'name avatar');

        if (!user) return res.status(404).json({ message: "User not found" });

        // 2. Find all reels created by this exact user
        const userReels = await Reel.find({ creator: req.params.id })
            .sort({ createdAt: -1 });

        // 3. Send both back to the frontend
        res.status(200).json({
            profile: user,
            reels: userReels,
            totalReels: userReels.length
        });
    } catch (error) {
        console.error("Profile Error:", error);
        res.status(500).json({ message: "Could not load profile" });
    }
};

// @desc    Follow or Unfollow a user
// @route   POST /api/users/:id/follow
exports.toggleFollow = async (req, res) => {
    try {
        const targetUserId = req.params.id; // The person being followed
        const currentUserId = req.body.currentUserId; // The person clicking the button

        if (targetUserId === currentUserId) {
            return res.status(400).json({ message: "You cannot follow yourself" });
        }

        const targetUser = await User.findById(targetUserId);
        const currentUser = await User.findById(currentUserId);

        if (!targetUser || !currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if already following
        const isFollowing = currentUser.following.includes(targetUserId);

        if (isFollowing) {
            // UNFOLLOW LOGIC
            currentUser.following.pull(targetUserId);
            targetUser.followers.pull(currentUserId);
        } else {
            // FOLLOW LOGIC
            currentUser.following.push(targetUserId);
            targetUser.followers.push(currentUserId);
        }

        await currentUser.save();
        await targetUser.save();

        res.status(200).json({ 
            message: isFollowing ? "Unfollowed successfully" : "Followed successfully",
            isFollowing: !isFollowing // Send the new state back to React
        });
    } catch (error) {
        console.error("Follow Error:", error);
        res.status(500).json({ message: "Could not complete follow action" });
    }
};

// @desc    Update User Profile (Username, Bio, Name)
// @route   PUT /api/users/profile
exports.updateProfile = async (req, res) => {
    try {
        const { username, name, bio } = req.body;
        // The bouncer (auth middleware) will eventually tell us who is logged in
        // But for now, we find the user by the email in the keycard
        const user = await User.findOne({ phoneNumber: req.headers.useremail });

        if (!user) return res.status(404).json({ message: "User not found" });

        // If they provided a new username, check if someone else already took it
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username });
            if (existingUser) return res.status(400).json({ message: "Username already taken!" });
            user.username = username;
        }

        if (name) user.name = name;
        if (bio) user.bio = bio;

        await user.save();
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: "Could not update profile", error: error.message });
    }
};
// @desc    Update User Profile (Username, Bio, Name)
// @route   PUT /api/users/profile
exports.updateProfile = async (req, res) => {
    try {
        const { username, name, bio } = req.body;
        // The bouncer (auth middleware) will eventually tell us who is logged in
        // But for now, we find the user by the email in the keycard
        const user = await User.findOne({ phoneNumber: req.headers.useremail });

        if (!user) return res.status(404).json({ message: "User not found" });

        // If they provided a new username, check if someone else already took it
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username });
            if (existingUser) return res.status(400).json({ message: "Username already taken!" });
            user.username = username;
        }

        if (name) user.name = name;
        if (bio) user.bio = bio;

        await user.save();
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: "Could not update profile", error: error.message });
    }
};

// @desc    Search users by name or username
// @route   GET /api/users/search?q=...
exports.searchUsers = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(200).json([]);
        
        // Find users matching the name or username (case-insensitive)
        const users = await User.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { username: { $regex: query, $options: 'i' } }
            ]
        }).select('name username avatar').limit(15);

        res.status(200).json(users);
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ message: "Search failed" });
    }
};