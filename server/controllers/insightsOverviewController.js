const mongoose = require('mongoose');
const Habit = require('../models/Habit');
const Log = require('../models/Log');
const { computeInsightsOverview } = require('../analytics/insights');

// @desc    Get data and takeaways for all 6 SVG visual insight charts
// @route   GET /api/stats/insights/overview
// @access  Private
const getInsightsOverview = async (req, res, next) => {
  try {
    const userId = req.userId || req.user?._id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const habits = await Habit.find({ userId: userObjectId }).lean();
    const logs = await Log.find({ userId: userObjectId }).sort({ date: 1 }).lean();

    const result = computeInsightsOverview({
      today: new Date(),
      habits,
      logs
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInsightsOverview
};

