const { body, validationResult } = require('express-validator');

const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const loginValidator = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Middleware to catch and return validation errors
const handleValidationErrors = (req, res, next) => {
  console.log("Next function check:", typeof next);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// module.exports = {
//   registerValidator,
//   loginValidator,
//   handleValidationErrors
// };

// validators.js
module.exports = {
  registerValidator,
  loginValidator,
  handleValidationErrors
};
