const { body, validationResult } = require('express-validator');

const registerValidator = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Name must be between 2 and 80 characters')
    .escape(),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be at least 8 characters'),
  body('confirmPassword')
    .optional()
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Password and confirm password do not match'),
  body('countryCode')
    .optional()
    .trim()
    .matches(/^\+[1-9]\d{0,3}$/)
    .withMessage('Invalid country code'),
  body('mobileNumber')
    .optional()
    .trim()
    .matches(/^\d{7,15}$/)
    .withMessage('Invalid mobile number'),
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
};

module.exports = {
  registerValidator,
  loginValidator,
  handleValidationErrors,
};
