const { createClient } = require('redis');

// Initialize the Redis client using the URL from your .env
const redisClient = createClient({
    url: process.env.REDIS_URL
});

// Event listeners so we know exactly what Redis is doing
redisClient.on('error', (err) => console.log('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis Cache Connected Successfully'));

const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
    }
};

// We export the client so we can use it in our middleware later
module.exports = { redisClient, connectRedis };