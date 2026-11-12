const {
  getCorrelationForHabits,
  getTopCorrelations
} = require('../services/insights');

// @desc    Get cross-habit correlation for a specific pair of habits
// @route   GET /api/insights/correlation
// @access  Private
const getCorrelation = async (req, res, next) => {
  try {
    const { a, b, days = 90 } = req.query;

    if (!a || !b) {
      res.status(400);
      throw new Error('Both habit IDs "a" and "b" are required in query params');
    }

    const windowDays = Math.min(Math.max(parseInt(days, 10) || 90, 1), 365);
    const result = await getCorrelationForHabits(a, b, req.user._id, windowDays);

    res.status(200).json(result);
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode);
    }
    next(error);
  }
};

// @desc    Get top 5 cross-habit correlations by lift (limit 10 habits)
// @route   GET /api/insights/correlations
// @access  Private
const getCorrelations = async (req, res, next) => {
  try {
    const { days = 90 } = req.query;
    const windowDays = Math.min(Math.max(parseInt(days, 10) || 90, 1), 365);
    const results = await getTopCorrelations(req.user._id, windowDays);

    res.status(200).json(results);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCorrelation,
  getCorrelations
};

