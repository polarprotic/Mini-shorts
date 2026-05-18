const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Get chat history between two users
// @route   GET /api/chat/:userId
exports.getConversation = async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const currentUserId = req.query.currentUserId;

        // Find all messages where these two users are the sender/receiver
        const messages = await Message.find({
            $or: [
                { sender: currentUserId, receiver: targetUserId },
                { sender: targetUserId, receiver: currentUserId }
            ]
        }).sort({ createdAt: 1 }); // Sort oldest to newest (top to bottom)

        res.status(200).json(messages);
    } catch (error) {
        console.error("Chat fetch error:", error);
        res.status(500).json({ message: "Could not load messages" });
    }
};

// @desc    Send a new message
// @route   POST /api/chat/send
exports.sendMessage = async (req, res) => {
    try {
        const { senderId, receiverId, text } = req.body;
        
        if (!text || !text.trim()) {
            return res.status(400).json({ message: "Message cannot be empty" });
        }

        const newMessage = await Message.create({
            sender: senderId,
            receiver: receiverId,
            text: text.trim()
        });

        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Send message error:", error);
        res.status(500).json({ message: "Could not send message" });
    }
};

// @desc    Get a list of users to chat with (People you follow)
// @route   GET /api/chat/inbox/list
exports.getInboxUsers = async (req, res) => {
    try {
        const currentUserId = req.query.currentUserId;
        const user = await User.findById(currentUserId).populate('following', 'name username avatar');
        
        res.status(200).json(user.following);
    } catch (error) {
        console.error("Inbox fetch error:", error);
        res.status(500).json({ message: "Could not load inbox" });
    }
};