require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');

// Import Routes
const reelRoutes = require('./routes/reelRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes'); // 👈 Added Chat Routes

const app = express();

// 1. Connect to Databases
connectDB();
connectRedis();

// 2. Middleware
app.use(cors());
app.use(express.json());

// 3. Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes); // 👈 Added Chat API

// Health Check
app.get('/', (req, res) => res.send('API is Running...'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));