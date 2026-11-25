const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  validateName,
  validateAge,
  validateEmail,
  validatePicture
} = require('../analytics/profileValidation');

// Helper to sign JWT token with payload { userId }, expiring in 7 days
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
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

    // Both email and password must be provided as strings
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
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
    const user = req.user;
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      age: user.age !== undefined && user.age !== null ? user.age : null,
      picture: user.picture || '',
      createdAt: user.createdAt
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile (name, age, email, picture)
// @route   PUT /api/auth/me
// @access  Private
const updateMe = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { name, age, email, picture } = req.body || {};

    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (name !== undefined) {
      const v = validateName(name);
      if (!v.valid) {
        res.status(400);
        throw new Error(v.error);
      }
      user.name = v.value;
    }

    if (age !== undefined) {
      const v = validateAge(age);
      if (!v.valid) {
        res.status(400);
        throw new Error(v.error);
      }
      user.age = v.value;
    }

    if (email !== undefined) {
      const v = validateEmail(email);
      if (!v.valid) {
        res.status(400);
        throw new Error(v.error);
      }
      // Check if email already in use by another user
      const existingUser = await User.findOne({ email: v.value, _id: { $ne: userId } });
      if (existingUser) {
        res.status(409);
        throw new Error('Email is already registered to another account');
      }
      user.email = v.value;
    }

    if (picture !== undefined) {
      const v = validatePicture(picture);
      if (!v.valid) {
        res.status(400);
        throw new Error(v.error);
      }
      user.picture = v.value;
    }

    await user.save();

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      age: user.age !== undefined && user.age !== null ? user.age : null,
      picture: user.picture || '',
      createdAt: user.createdAt
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateMe
};
