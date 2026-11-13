const mongoose = require('mongoose');
const Log = require('../models/Log');
const Habit = require('../models/Habit');
const {
  getHeatmapPipeline,
  fillZeroDays,
  formatUTCDate
} = require('../analytics/heatmap');
const {
  getStreakAggregationPipeline,
  computeStreaksFromRuns
} = require('../analytics/streaks');
const {
  getActivityAggregationPipeline,
  pickMostLeast
} = require('../analytics/activity');

// Helper to get today UTC midnight date
const getTodayUTCMidnight = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
};

// Date validation helper for YYYY-MM-DD
const isValidDateString = (str) => {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return false;
  }
  const [year, month, day] = str.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
};

// @desc    Record completion for a habit (idempotent upsert)
// @route   POST /api/habits/:id/logs (also POST /api/logs)
// @access  Private
const markDone = async (req, res, next) => {
  try {
    const habitId = req.params.id || req.body.habitId;
    const userId = req.userId || req.user._id;

    if (!habitId || !mongoose.isValidObjectId(habitId)) {
      res.status(400);
      throw new Error('Valid habit ID is required');
    }

    const habit = await Habit.findOne({ _id: habitId, userId });
    if (!habit) {
      res.status(404);
      throw new Error('Habit not found');
    }

    const todayUTC = getTodayUTCMidnight();
    let targetDateStr = req.body && req.body.date;

    if (targetDateStr) {
      if (!isValidDateString(targetDateStr)) {
        res.status(400);
        throw new Error('Invalid date format. Expected YYYY-MM-DD');
      }

      const [year, month, day] = targetDateStr.split('-').map(Number);
      const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

      if (targetDate.getTime() > todayUTC.getTime()) {
        res.status(400);
        throw new Error('Cannot log completions for future dates');
      }
    } else {
      targetDateStr = formatUTCDate(todayUTC);
    }

    const [year, month, day] = targetDateStr.split('-').map(Number);
    const targetDateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    // Idempotent upsert: updateOne with $setOnInsert and upsert: true
    await Log.updateOne(
      { habitId: habit._id, userId, date: targetDateObj },
      { $setOnInsert: { habitId: habit._id, userId, date: targetDateObj } },
      { upsert: true }
    );

    res.status(200).json({
      habitId: String(habit._id),
      date: targetDateStr,
      done: true
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Undo completion for a habit date (idempotent delete)
// @route   DELETE /api/habits/:id/logs/:date (also DELETE /api/logs/:habitId)
// @access  Private
const undoDone = async (req, res, next) => {
  try {
    const habitId = req.params.id || req.params.habitId;
    const userId = req.userId || req.user._id;

    if (!habitId || !mongoose.isValidObjectId(habitId)) {
      res.status(400);
      throw new Error('Valid habit ID is required');
    }

    const habit = await Habit.findOne({ _id: habitId, userId });
    if (!habit) {
      res.status(404);
      throw new Error('Habit not found');
    }

    const dateParam = req.params.date || (req.query && req.query.date) || (req.body && req.body.date);
    const targetDateStr = dateParam || formatUTCDate(getTodayUTCMidnight());

    if (!isValidDateString(targetDateStr)) {
      res.status(400);
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }

    const [year, month, day] = targetDateStr.split('-').map(Number);
    const targetDateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    await Log.deleteOne({
      habitId: habit._id,
      userId,
      date: targetDateObj
    });

    res.status(200).json({
      habitId: String(habit._id),
      date: targetDateStr,
      done: false
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get log dates for a habit within an optional date range
// @route   GET /api/habits/:id/logs?from=&to=
// @access  Private
const getHabitLogs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId || req.user._id;

    if (!id || !mongoose.isValidObjectId(id)) {
      res.status(400);
      throw new Error('Valid habit ID is required');
    }

    const habit = await Habit.findOne({ _id: id, userId });
    if (!habit) {
      res.status(404);
      throw new Error('Habit not found');
    }

    const filter = { habitId: habit._id, userId };

    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) {
        if (!isValidDateString(req.query.from)) {
          res.status(400);
          throw new Error('Invalid from date format. Expected YYYY-MM-DD');
        }
        const [y, m, d] = req.query.from.split('-').map(Number);
        filter.date.$gte = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      }
      if (req.query.to) {
        if (!isValidDateString(req.query.to)) {
          res.status(400);
          throw new Error('Invalid to date format. Expected YYYY-MM-DD');
        }
        const [y, m, d] = req.query.to.split('-').map(Number);
        filter.date.$lte = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      }
    }

    const logs = await Log.find(filter).sort({ date: 1 });
    const dates = logs.map((l) => formatUTCDate(l.date));

    res.status(200).json(dates);
  } catch (error) {
    next(error);
  }
};

// @desc    Get 90-day heatmap data derived from MongoDB aggregation
// @route   GET /api/stats/heatmap?habitId= (also GET /api/logs/heatmap)
// @access  Private
const getHeatmap = async (req, res, next) => {
  try {
    const { habitId } = req.query;
    const userId = req.userId || req.user._id;

    if (habitId && !mongoose.isValidObjectId(habitId)) {
      res.status(400);
      throw new Error('Invalid habit ID');
    }

    const todayUTC = getTodayUTCMidnight();
    const startDateUTC = new Date(todayUTC);
    startDateUTC.setUTCDate(todayUTC.getUTCDate() - 89);

    const pipeline = getHeatmapPipeline(userId, habitId, startDateUTC, todayUTC);
    const rawItems = await Log.aggregate(pipeline);

    // Pure helper: guarantees exactly 90 days ending today UTC with 0 for missing days
    const result = fillZeroDays(rawItems, todayUTC);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Get habit streaks and last 30-day stats using MongoDB window fields aggregation
// @route   GET /api/habits/:id/stats
// @access  Private
const getHabitStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId || req.user._id;

    if (!id || !mongoose.isValidObjectId(id)) {
      res.status(400);
      throw new Error('Invalid habit ID');
    }

    const habit = await Habit.findOne({ _id: id, userId });
    if (!habit) {
      res.status(404);
      throw new Error('Habit not found');
    }

    // Run gaps-and-islands streak aggregation
    const pipeline = getStreakAggregationPipeline(userId, id);
    const runs = await Log.aggregate(pipeline);

    const todayUTC = getTodayUTCMidnight();
    const yesterdayUTC = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), todayUTC.getUTCDate() - 1));

    const { currentStreak, longestStreak } = computeStreaksFromRuns(runs, todayUTC, yesterdayUTC);

    // Last 30 days stats: date >= today-29 days
    const thirtyDaysAgo = new Date(todayUTC);
    thirtyDaysAgo.setUTCDate(todayUTC.getUTCDate() - 29);

    const done = await Log.countDocuments({
      habitId: habit._id,
      userId,
      date: { $gte: thirtyDaysAgo, $lte: todayUTC }
    });

    const percent = Math.round((done / 30) * 100);

    res.status(200).json({
      currentStreak,
      longestStreak,
      last30: {
        done,
        percent
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get most and least active habit summary over last 90 days from MongoDB aggregation
// @route   GET /api/stats/activity (also GET /api/logs/activity-summary)
// @access  Private
const getActivitySummary = async (req, res, next) => {
  try {
    const userId = req.userId || req.user._id;

    // Fetch user's habits
    const habits = await Habit.find({ userId }).lean();
    if (!habits || habits.length === 0) {
      return res.status(200).json({
        most: null,
        least: null,
        message: 'No habits yet'
      });
    }

    const todayUTC = getTodayUTCMidnight();
    const startDateUTC = new Date(todayUTC);
    startDateUTC.setUTCDate(todayUTC.getUTCDate() - 89);

    const pipeline = getActivityAggregationPipeline(userId, startDateUTC, todayUTC);
    const counts = await Log.aggregate(pipeline);

    // Pure helper: merges habits with counts and applies Phase 1 tie-breaking rules
    const result = pickMostLeast(counts, habits);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  markDone,
  undoDone,
  getHabitLogs,
  getHeatmap,
  getHabitStats,
  getActivitySummary
};
