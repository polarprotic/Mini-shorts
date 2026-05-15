require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');

// Import Routes
const reelRoutes = require('./routes/reelRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// 1. Connect to Databases
connectDB();
connectRedis();

// 2. Middleware
app.use(cors());
app.use(express.json());

// 3. Register Routes
// This line connects your Auth logic to the URL: http://localhost:5000/api/auth
app.use('/api/auth', authRoutes);
app.use('/api/reels', reelRoutes);

// Health Check
app.get('/', (req, res) => res.send('API is Running...'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));