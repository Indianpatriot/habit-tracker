const mongoose = require('mongoose');
const Log = require('../models/Log');
const Habit = require('../models/Habit');
const {
  getHeatmapPipeline,
  fillZeroDays,
  formatUTCDate,
  validateHeatmapDays
} = require('../analytics/heatmap');
const {
  getStreakAggregationPipeline,
  computeStreaksFromRuns
} = require('../analytics/streaks');
const {
  getActivityAggregationPipeline,
  pickMostLeast
} = require('../analytics/activity');
const {
  parsePagination,
  computeTotalPages
} = require('../analytics/pagination');

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

    const note = req.body && req.body.note;
    if (note !== undefined && note !== null) {
      if (typeof note !== 'string') {
        res.status(400);
        throw new Error('Note must be a string');
      }
      if (note.trim().length > 200) {
        res.status(400);
        throw new Error('Note cannot exceed 200 characters');
      }
    }

    // Build updateDoc: $setOnInsert sets required fields on creation.
    // If note is provided, $set updates the note; if not provided, existing note is kept untouched.
    const updateDoc = {
      $setOnInsert: { habitId: habit._id, userId, date: targetDateObj }
    };
    if (note !== undefined && note !== null && typeof note === 'string') {
      updateDoc.$set = { note: note.trim() };
    }

    // Idempotent upsert: updateOne with $setOnInsert and upsert: true
    await Log.updateOne(
      { habitId: habit._id, userId, date: targetDateObj },
      updateDoc,
      { upsert: true }
    );

    const savedLog = await Log.findOne({ habitId: habit._id, userId, date: targetDateObj }).lean();

    res.status(200).json({
      habitId: String(habit._id),
      date: targetDateStr,
      done: true,
      note: savedLog ? (savedLog.note || '') : (note ? note.trim() : '')
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

// @desc    Get heatmap data derived from MongoDB aggregation (30, 90, 365 days)
// @route   GET /api/stats/heatmap?habitId=&days= (also GET /api/logs/heatmap)
// @access  Private
const getHeatmap = async (req, res, next) => {
  try {
    const { habitId, days } = req.query;
    const userId = req.userId || req.user._id;

    if (habitId && !mongoose.isValidObjectId(habitId)) {
      res.status(400);
      throw new Error('Invalid habit ID');
    }

    const validatedDays = validateHeatmapDays(days);
    if (!validatedDays) {
      res.status(400);
      throw new Error('Invalid days parameter. Allowed values: 30, 90, 365');
    }

    const todayUTC = getTodayUTCMidnight();
    const startDateUTC = new Date(todayUTC);
    startDateUTC.setUTCDate(todayUTC.getUTCDate() - (validatedDays - 1));

    const pipeline = getHeatmapPipeline(userId, habitId, startDateUTC, todayUTC);
    const rawItems = await Log.aggregate(pipeline);

    // Pure helper: guarantees exactly `validatedDays` items ending today UTC with 0 for missing days
    const result = fillZeroDays(rawItems, todayUTC, validatedDays);

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

// @desc    Get most and least active habit summary over last N days from MongoDB aggregation
// @route   GET /api/stats/activity (also GET /api/logs/activity-summary)
// @access  Private
const getActivitySummary = async (req, res, next) => {
  try {
    const userId = req.userId || req.user._id;
    const { days } = req.query;

    const validatedDays = validateHeatmapDays(days);
    if (!validatedDays) {
      res.status(400);
      throw new Error('Invalid days parameter. Allowed values: 30, 90, 365');
    }

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
    startDateUTC.setUTCDate(todayUTC.getUTCDate() - (validatedDays - 1));

    const pipeline = getActivityAggregationPipeline(userId, startDateUTC, todayUTC);
    const counts = await Log.aggregate(pipeline);

    // Pure helper: merges habits with counts and applies Phase 1 tie-breaking rules
    const result = pickMostLeast(counts, habits, validatedDays);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Edit or clear the note on an existing habit log
// @route   PATCH /api/habits/:id/logs/:date
// @access  Private
const patchLogNote = async (req, res, next) => {
  try {
    const habitId = req.params.id;
    const dateStr = req.params.date;
    const userId = req.userId || req.user._id;

    if (!habitId || !mongoose.isValidObjectId(habitId)) {
      res.status(400);
      throw new Error('Valid habit ID is required');
    }

    if (!isValidDateString(dateStr)) {
      res.status(400);
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }

    const note = req.body && req.body.note;
    if (note === undefined || typeof note !== 'string') {
      res.status(400);
      throw new Error('Note must be a string');
    }

    const trimmedNote = note.trim();
    if (trimmedNote.length > 200) {
      res.status(400);
      throw new Error('Note cannot exceed 200 characters');
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    const log = await Log.findOne({ habitId, userId, date: dateObj });
    if (!log) {
      res.status(404);
      throw new Error('Log not found for this date');
    }

    log.note = trimmedNote;
    await log.save();

    res.status(200).json({
      habitId,
      date: dateStr,
      done: true,
      note: log.note
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get paginated history of check-ins and notes for a habit (newest first)
// @route   GET /api/habits/:id/history?page=1&limit=10
// @access  Private
const getHabitHistory = async (req, res, next) => {
  try {
    const habitId = req.params.id;
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

    const { page, limit } = parsePagination({
      page: req.query.page,
      limit: req.query.limit
    });

    const total = await Log.countDocuments({ habitId, userId });
    const totalPages = computeTotalPages(total, limit);

    const logs = await Log.find({ habitId, userId })
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const items = logs.map((l) => ({
      date: formatUTCDate(l.date),
      note: l.note || ''
    }));

    res.status(200).json({
      items,
      page,
      limit,
      total,
      totalPages
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  markDone,
  undoDone,
  patchLogNote,
  getHabitHistory,
  getHabitLogs,
  getHeatmap,
  getHabitStats,
  getActivitySummary
};
