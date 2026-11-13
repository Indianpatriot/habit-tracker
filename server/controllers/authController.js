const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to sign JWT token with payload { userId }, expiring in 7 days
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'supersecretphase2jwtkey12345',
    { expiresIn: '7d' }
  );
};

// Email format regex validation
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validate name (required, min 1 char non-whitespace)
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400);
      throw new Error('Name is required');
    }

    // Validate email format
    if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
      res.status(400);
      throw new Error('Please provide a valid email address');
    }

    // Validate password (min 6 characters)
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for duplicate email -> 409 Conflict
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      res.status(409);
      throw new Error('Email already registered');
    }

    // Create user (password is hashed by User schema pre-save hook using bcryptjs)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password
    });

    const token = generateToken(user._id);

    // Return token and sanitized user object (never return password)
    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Both email and password must be provided
    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide email and password');
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Same generic error message for both wrong email and wrong password
    const genericErrorMessage = 'Invalid email or password';

    if (!user) {
      res.status(401);
      throw new Error(genericErrorMessage);
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error(genericErrorMessage);
    }

    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    // req.user attached by protect middleware, password excluded
    res.status(200).json(req.user);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe
};
