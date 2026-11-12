const { getBadgesForUser } = require('../services/badges');

// @desc    Get achievement badges computed from user check-in data
// @route   GET /api/badges
// @access  Private
const getBadges = async (req, res, next) => {
  try {
    const badges = await getBadgesForUser(req.user._id);
    res.status(200).json(badges);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBadges
};

