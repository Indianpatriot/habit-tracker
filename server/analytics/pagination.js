/**
 * Pure helper to parse and validate pagination parameters (page and limit).
 *
 * Rules:
 * - page: integer >= 1 (default 1)
 * - limit: integer 1 to 50 (default 10)
 * - throws 400 on invalid input
 *
 * @param {object} params - { page, limit }
 * @returns {{ page: number, limit: number }}
 */
function parsePagination({ page = 1, limit = 10 } = {}) {
  const parsedPage = Number(page === undefined ? 1 : page);
  const parsedLimit = Number(limit === undefined ? 10 : limit);

  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    const err = new Error('Page must be an integer greater than or equal to 1');
    err.statusCode = 400;
    throw err;
  }

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
    const err = new Error('Limit must be an integer between 1 and 50');
    err.statusCode = 400;
    throw err;
  }

  return {
    page: parsedPage,
    limit: parsedLimit
  };
}

/**
 * Pure helper to compute total pages from total count and limit.
 *
 * @param {number} total - Total count of items
 * @param {number} limit - Limit per page
 * @returns {number} - Total pages
 */
function computeTotalPages(total, limit) {
  const safeTotal = Math.max(Number(total) || 0, 0);
  const safeLimit = Math.max(Number(limit) || 1, 1);
  if (safeTotal === 0) return 0;
  return Math.ceil(safeTotal / safeLimit);
}

module.exports = {
  parsePagination,
  computeTotalPages
};

