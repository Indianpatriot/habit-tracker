const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect private routes using JWT Bearer token
// Reads "Authorization: Bearer <token>", verifies with JWT_SECRET, and sets req.userId
const protect = async (req, res, next) => {
  let token;

  // Check for Bearer token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify signed JWT token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'supersecretphase2jwtkey12345'
      );

      // Set req.userId from token payload { userId }
      req.userId = decoded.userId || decoded.id;

      // Attach user document (excluding password) for routes that need user details
      req.user = await User.findById(req.userId).select('-password');

      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      return next();
    } catch (error) {
      res.status(401);
      return next(new Error('Not authorized, token failed'));
    }
  }

  res.status(401);
  return next(new Error('Not authorized, no token provided'));
};

module.exports = { protect };
