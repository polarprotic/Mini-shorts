const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },
    name: { type: String, default: 'New Creator' },
    avatar: { type: String, default: 'https://via.placeholder.com/150' },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);