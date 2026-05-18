const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true }, // You are using this for email
    name: { type: String, required: true },
    username: { type: String, unique: true },
    avatar: { type: String, default: "👤" },
    bio: { type: String, default: "New to ReelStream! 🎬" },
    
    // The Social Graph: Arrays holding the IDs of other users
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);