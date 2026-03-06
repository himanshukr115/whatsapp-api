const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        let token;

        // 1. Get token from header
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
        // 2. Or from cookies (EJS/browser)
        else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        const isApiRequest = req.originalUrl.startsWith('/api');

        // ❌ No Token
        if (!token) {
            if (isApiRequest) {
                return res.status(401).json({ error: 'Access denied. Please login.' });
            }

            req.flash('error', 'Please login to continue.');
            return res.redirect('/login');
        }

        // 3. Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Check user in DB
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            if (isApiRequest) {
                return res.status(401).json({ error: 'User no longer exists.' });
            }

            res.clearCookie('token');
            req.flash('error', 'Account not found. Please login again.');
            return res.redirect('/login');
        }

        if (!user.isActive) {
            if (isApiRequest) {
                return res.status(403).json({ error: 'Please verify your email first.' });
            }

            req.flash('error', 'Please verify your email address first.');
            return res.redirect('/login');
        }

        // 5. Attach user
        req.user = user;
        next();

    } catch (error) {
        console.error('Auth Middleware Error:', error.message);

        const isApiRequest = req.originalUrl.startsWith('/api');

        if (isApiRequest) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }

        res.clearCookie('token');
        req.flash('error', 'Session expired. Please login again.');
        return res.redirect('/login');
    }
};

module.exports = authMiddleware;