const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  updateMe
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public authentication routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected user profile routes
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

module.exports = router;

