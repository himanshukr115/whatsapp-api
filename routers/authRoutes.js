const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
router.use(express.urlencoded({ extended: true }));

// Import the validators from the utils folder
// Ensure the path correctly points to your utils directory
// const { 
//   registerValidator, 
//   loginValidator, 
//   handleValidationErrors 
// } = require('../utils/validators'); 

const { 
  registerValidator, 
  loginValidator, 
  handleValidationErrors 
} = require('../utils/validators');




router.get('/auth/register', authController.getSignup);
router.get('/auth/login', authController.getLogin);

// Routes with validation middleware applied
// router.post(
//   '/register', 
//   registerValidator, 
//   handleValidationErrors, 
//   authController.register
// );

router.post('/register', registerValidator, handleValidationErrors, authController.register);


router.post(
  '/login', 
  ...loginValidator,
  handleValidationErrors, 
  authController.login
);

router.post('/logout', authController.logout);

router.get('/me', authMiddleware, authController.me);

module.exports = router;