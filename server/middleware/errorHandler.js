// Central error-handling middleware for Express
// Ensures consistent error response shape: { message: string }
const errorHandler = (err, req, res, next) => {
  // Use existing response status code if set, otherwise default to 500
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    message: err.message || 'Internal Server Error'
  });
};

module.exports = errorHandler;

