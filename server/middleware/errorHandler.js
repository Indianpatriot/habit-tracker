// Central error-handling middleware for Express
// Ensures consistent error response shape: { message: string }
// Never exposes internal stack traces to the client
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose Bad ObjectId (CastError) -> 400
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ID format: ${err.value}`;
  }

  // Handle Mongoose Validation Error -> 400
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((val) => val.message).join(', ');
  }

  // Handle MongoDB Duplicate Key (E11000) -> 409
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field}, must be unique`;
  }

  // Handle JWT errors -> 401
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Not authorized, token failed or expired';
  }

  // Handle JSON payload size limit exceeded -> 413
  if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Payload too large';
  }

  // Handle rate limit errors -> 429
  if (err.status === 429) {
    statusCode = 429;
    message = 'Too many requests, please try again later.';
  }

  // Log 500 internal errors server-side only
  if (statusCode === 500) {
    console.error('Server Internal Error:', err);
  }

  // Never send stack traces when NODE_ENV is production (and clean JSON in all environments)
  res.status(statusCode).json({ message });
};

module.exports = errorHandler;
