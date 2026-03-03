
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/emailService');

// Render Signup Page
exports.getSignup = (req, res) => {
    if (req.user) return res.redirect('/dashboard');
    res.render('authpage/register', { title: 'Create Account - WhatsApp SaaS', error: null });
};

// Render Login Page
exports.getLogin = (req, res) => {
    if (req.user) return res.redirect('/dashboard');
    res.render('authpage/login', { title: 'Login - WhatsApp SaaS', error: null });
};

// User Registration
exports.register = async (req, res) => {
    console.log('Register Request Body:', req.body); // Debugging line
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'Email already registered' });
        console.log('No existing user found, proceeding with registration'); // Debugging line
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const user = new User({
            name, email, password,
            isActive: false, 
            verificationToken,
            authMethod: 'local'
        });
        console.log('User object1111 created:', user); // Debugging line
        await user.save();
        console.log('User saved to database'); // Debugging line
        const verificationUrl = `${process.env.APP_URL}/auth/verify-email/${verificationToken}`;
        await emailService.sendVerificationEmail(email, name, verificationUrl);

        res.status(201).render('authpage/check-email', { 
            email: email,
            title: 'Verify Your Email'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Email Verification
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({ verificationToken: token });
        if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

        user.isActive = true;
        user.verificationToken = undefined;
        await user.save();
        await emailService.sendWelcomeEmail(user.email, user.name);

        res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// User Login (Missing in original file)
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.isActive) return res.status(403).json({ error: 'Verify your email first' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.getVerifyEmailPage = (req, res) => {
    res.render('authpage/verify-email');
};


// Logout
exports.logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
};

// Current User Details
exports.me = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};