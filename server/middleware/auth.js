const { redisClient } = require('../config/redis');

module.exports = async (req, res, next) => {
    const token = req.headers.authorization;
    const email = req.headers.useremail;

    if (!token || !email) {
        return res.status(401).json({ message: "No keycard provided! Access denied." });
    }

    const activeToken = await redisClient.get(`session:${email}`);

    if (activeToken !== token) {
        return res.status(403).json({ message: "Session expired. You logged in somewhere else!" });
    }

    next(); 
};