const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/emailService');

const buildVerificationToken = () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    return {
        rawToken,
        hashedToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
};

// Render Signup Page
exports.getSignup = (req, res) => {
    if (req.user) return res.redirect('/dashboard');
    return res.render('authpage/register', { title: 'Create Account - WhatsApp SaaS', error: null });
};

// Render Login Page
exports.getLogin = (req, res) => {
    if (req.user) return res.redirect('/dashboard');
    return res.render('authpage/login', { title: 'Login - WhatsApp SaaS', error: null });
};

// User Registration
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) return res.status(400).json({ error: 'Email already registered' });

        const { rawToken, hashedToken, expiresAt } = buildVerificationToken();

        const user = new User({
            name,
            email: normalizedEmail,
            password,
            isActive: false,
            verificationToken: hashedToken,
            verificationTokenExpires: expiresAt,
            authMethod: 'local',
        });

        await user.save();

        const verificationUrl = `${process.env.APP_URL}/auth/verify-email/${rawToken}`;
        await emailService.sendVerificationEmail(normalizedEmail, name, verificationUrl);

        return res.status(201).json({ message: 'Registration successful. Check email to verify.' });
    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Email Verification
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            verificationToken: hashedToken,
            verificationTokenExpires: { $gt: new Date() },
        });

        if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

        user.isActive = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        await emailService.sendWelcomeEmail(user.email, user.name);

        return res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
    } catch (error) {
        console.error('Verify email error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// User Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({ email: normalizedEmail });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.isActive) return res.status(403).json({ error: 'Verify your email first' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.json({
            token,
            user: { id: user._id, name: user.name, email: user.email },
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Logout
exports.logout = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    });
    return res.json({ message: 'Logged out successfully' });
};

// Current User Details
exports.me = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        return res.json(user);
    } catch (error) {
        console.error('Me error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
