const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  registerValidator,
  loginValidator,
  handleValidationErrors,
} = require('../utils/validators');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth requests. Try again later.' },
});

router.get('/auth/register', authController.getSignup);
router.get('/auth/login', authController.getLogin);
router.get('/auth/verify-email/:token', authController.verifyEmail);

router.post('/register', authLimiter, registerValidator, handleValidationErrors, authController.register);
router.post('/login', authLimiter, loginValidator, handleValidationErrors, authController.login);
router.post('/auth/login', authLimiter, loginValidator, handleValidationErrors, authController.login);

router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
