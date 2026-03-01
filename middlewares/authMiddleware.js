const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Production-grade Auth Middleware
 * Verifies JWT and attaches the user object to the request
 */
const authMiddleware = async (req, res, next) => {
    try {
        // 1. Get token from header (Format: Bearer <token>)
        const authHeader = req.headers.authorization;
        let token;

        if (authHeader && authHeader.startsWith('Bearer')) {
            token = authHeader.split(' ')[1];
        } 
        // Optional: Support token in cookies for EJS/browser sessions
        else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        // 2. Verify Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. Check if user still exists in DB
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({ error: 'User no longer exists.' });
        }

        // 4. Check if user is active (Email must be verified)
        if (!user.isActive) {
            return res.status(403).json({ error: 'Please verify your email address first.' });
        }

        // 5. Attach user to request object
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error.message);
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = authMiddleware;