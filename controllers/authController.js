// const User = require('../models/User');
// const jwt = require('jsonwebtoken');
// const crypto = require('crypto');
// const emailService = require('../services/emailService');


// // Render Signup Page
// exports.getSignup = (req, res) => {
//     // If user is already logged in, redirect to dashboard
//     if (req.user) {
//         return res.redirect('/dashboard');
//     }
//     res.render('pages/signup', { 
//         title: 'Create Account - WhatsApp SaaS',
//         error: null 
//     });
// };

// // Render Login Page
// exports.getLogin = (req, res) => {
//     // If user is already logged in, redirect to dashboard
//     if (req.user) {
//         return res.redirect('/dashboard');
//     }
//     res.render('pages/login', { 
//         title: 'Login - WhatsApp SaaS',
//         error: null 
//     });
// };


// exports.register = async (req, res) => {
//     try {
//         const { name, email, password } = req.body;

//         // 1. Check if user already exists
//         const existingUser = await User.findOne({ email });
//         if (existingUser) {
//             return res.status(400).json({ error: 'Email already registered' });
//         }

//         // 2. Generate Verification Token
//         const verificationToken = crypto.randomBytes(32).toString('hex');

//         // 3. Create User (Set isActive to false until verified)
//         const user = new User({
//             name,
//             email,
//             password,
//             isActive: false, 
//             verificationToken,
//             authMethod: 'local'
//         });

//         await user.save();

//         // 4. Send Verification Email
//         const verificationUrl = `${process.env.APP_URL}/api/auth/verify-email/${verificationToken}`;
//         await emailService.sendVerificationEmail(email, name, verificationUrl);

//         res.status(201).json({ 
//             message: 'Registration successful. Please check your email to verify your account.' 
//         });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };

// exports.verifyEmail = async (req, res) => {
//     try {
//         const { token } = req.params;

//         const user = await User.findOne({ verificationToken: token });
//         if (!user) {
//             return res.status(400).json({ error: 'Invalid or expired verification token' });
//         }

//         // Update user status
//         user.isActive = true;
//         user.verificationToken = undefined; // Clear the token
//         await user.save();

//         // Send Welcome Email after verification
//         await emailService.sendWelcomeEmail(user.email, user.name);

//         // Redirect to login or send success message
//         res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };

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

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const user = new User({
            name, email, password,
            isActive: false, 
            verificationToken,
            authMethod: 'local'
        });

        await user.save();
        const verificationUrl = `${process.env.APP_URL}/auth/verify-email/${verificationToken}`;
        await emailService.sendVerificationEmail(email, name, verificationUrl);

        res.status(201).json({ message: 'Registration successful. Check email to verify.' });
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