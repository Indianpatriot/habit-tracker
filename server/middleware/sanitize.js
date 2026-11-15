/**
 * Pure helper to recursively detect keys starting with '$' or containing '.'
 * Protects MongoDB against NoSQL injection via operators (e.g. $gt, $ne, $where) or field traversal.
 *
 * @param {any} val - The object, array, or primitive to inspect
 * @returns {boolean} - True if any key starts with '$' or contains '.'
 */
function hasDangerousKeys(val) {
  if (!val || typeof val !== 'object') {
    return false;
  }

  if (Array.isArray(val)) {
    return val.some(hasDangerousKeys);
  }

  for (const key of Object.keys(val)) {
    if (key.startsWith('$') || key.includes('.')) {
      return true;
    }
    if (hasDangerousKeys(val[key])) {
      return true;
    }
  }

  return false;
}

/**
 * Express middleware to sanitize incoming request body, query, and params
 */
function sanitizeInput(req, res, next) {
  if (
    hasDangerousKeys(req.body) ||
    hasDangerousKeys(req.query) ||
    hasDangerousKeys(req.params)
  ) {
    return res.status(400).json({
      message: 'Invalid characters in request input. Keys cannot start with "$" or contain "."'
    });
  }
  next();
}

module.exports = {
  hasDangerousKeys,
  sanitizeInput
};
