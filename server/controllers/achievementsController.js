const mongoose = require('mongoose');
const Habit = require('../models/Habit');
const Log = require('../models/Log');
const { computeAchievements } = require('../analytics/achievements');

// @desc    Get 25 achievement badges computed from user check-in data
// @route   GET /api/stats/achievements
// @access  Private
const getAchievements = async (req, res, next) => {
  try {
    const userId = req.userId || req.user?._id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const habits = await Habit.find({ userId: userObjectId }).lean();
    const logs = await Log.find({ userId: userObjectId }).sort({ date: 1 }).lean();

    const result = computeAchievements({
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
  getAchievements
};
