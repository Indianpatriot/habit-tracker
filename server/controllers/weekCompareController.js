const mongoose = require('mongoose');
const Habit = require('../models/Habit');
const Log = require('../models/Log');
const { getWeekCompareRanges, computeWeekCompare } = require('../analytics/weekCompare');

// Helper to get today UTC midnight
const getTodayUTCMidnight = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
};

/**
 * @desc    Get this week vs last week comparison
 * @route   GET /api/stats/week-compare
 * @access  Private
 */
const getWeekCompareStats = async (req, res, next) => {
  try {
    const userId = req.userId || req.user._id;
    const todayUTC = getTodayUTCMidnight();
    const { lastWeekStart } = getWeekCompareRanges(todayUTC);
    const [y, m, d] = lastWeekStart.split('-').map(Number);
    const minDateUTC = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

    // Fetch user's habits
    const habits = await Habit.find({ userId }).select('_id name').lean();

    // Match logs from lastWeekStart to today
    const logs = await Log.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: minDateUTC, $lte: todayUTC }
        }
      },
      {
        $project: {
          habitId: 1,
          date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }
        }
      }
    ]);

    const result = computeWeekCompare({
      today: todayUTC,
      habits,
      logs
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWeekCompareStats
};
