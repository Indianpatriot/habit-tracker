const mongoose = require('mongoose');
const Habit = require('../models/Habit');
const Log = require('../models/Log');
const { computeCrossInsights } = require('../analytics/crossInsights');

// @desc    Get cross-habit insights (matrix, best pair, keystone, share of effort, dropped together)
// @route   GET /api/stats/insights/cross
// @access  Private
const getCrossInsights = async (req, res, next) => {
  try {
    const userId = req.userId || req.user?._id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const habits = await Habit.find({ userId: userObjectId }).lean();
    const logs = await Log.find({ userId: userObjectId }).sort({ date: 1 }).lean();

    const result = computeCrossInsights({
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
  getCrossInsights
};
