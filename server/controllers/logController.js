const Log = require('../models/Log');
const Habit = require('../models/Habit');

// Helper to format a Date into "YYYY-MM-DD" in UTC terms
const formatUTCDateString = (d) => {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// @desc    Mark a habit as completed for a given date
// @route   POST /api/logs
// @access  Private
const markDone = async (req, res, next) => {
  try {
    const { habitId, date } = req.body;

    if (!habitId) {
      res.status(400);
      throw new Error('Habit ID is required');
    }

    // Verify habit belongs to user
    const habit = await Habit.findOne({ _id: habitId, userId: req.user._id });
    if (!habit) {
      res.status(404);
      throw new Error('Habit not found');
    }

    const targetDate = date || formatUTCDateString(new Date());

    // Upsert or create log (schema unique index prevents duplicates)
    let log = await Log.findOne({
      habitId,
      userId: req.user._id,
      date: targetDate
    });

    if (!log) {
      log = await Log.create({
        habitId,
        userId: req.user._id,
        date: targetDate
      });
    }

    res.status(201).json({ success: true, log });
  } catch (error) {
    next(error);
  }
};

// @desc    Undo habit completion for a given date
// @route   DELETE /api/logs/:habitId
// @access  Private
const undoDone = async (req, res, next) => {
  try {
    const { habitId } = req.params;
    const targetDate = req.query.date || req.body.date || formatUTCDateString(new Date());

    await Log.deleteOne({
      habitId,
      userId: req.user._id,
      date: targetDate
    });

    res.status(200).json({ success: true, habitId, date: targetDate });
  } catch (error) {
    next(error);
  }
};

// @desc    Get 90-day heatmap data (overall or habit-specific)
// @route   GET /api/logs/heatmap
// @access  Private
const getHeatmap = async (req, res, next) => {
  try {
    const { habitId } = req.query;

    // Generate 90-day date range ending today
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    const startDateUTC = new Date(todayUTC);
    startDateUTC.setUTCDate(todayUTC.getUTCDate() - 89);

    const filter = {
      userId: req.user._id,
      date: { $gte: startDateUTC, $lte: todayUTC }
    };

    if (habitId) {
      filter.habitId = habitId;
    }

    const logs = await Log.find(filter);

    // Group logs by YYYY-MM-DD
    const countsByDate = {};
    logs.forEach((log) => {
      // log.date getter returns "YYYY-MM-DD"
      const dateStr = log.date;
      countsByDate[dateStr] = (countsByDate[dateStr] || 0) + 1;
    });

    // Build exactly 90 entries
    const items = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(todayUTC);
      d.setUTCDate(todayUTC.getUTCDate() - i);
      const dateStr = formatUTCDateString(d);
      const rawCount = countsByDate[dateStr] || 0;

      items.push({
        date: dateStr,
        // For habit-specific, binary 0 or 1; for overall, capped at 4
        count: habitId ? (rawCount > 0 ? 1 : 0) : Math.min(rawCount, 4)
      });
    }

    res.status(200).json(items);
  } catch (error) {
    next(error);
  }
};

// @desc    Get streak and 30-day stats for a habit
// @route   GET /api/habits/:id/stats
// @access  Private
const getHabitStats = async (req, res, next) => {
  try {
    const habitId = req.params.id;

    const habit = await Habit.findOne({ _id: habitId, userId: req.user._id });
    if (!habit) {
      res.status(404);
      throw new Error('Habit not found');
    }

    // Fetch all logs for this habit sorted by date ascending
    const logs = await Log.find({ habitId, userId: req.user._id }).sort({ date: 1 });
    const logDatesSet = new Set(logs.map((l) => l.date));

    // Calculate current streak
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayStr = formatUTCDateString(todayUTC);

    const yesterdayUTC = new Date(todayUTC);
    yesterdayUTC.setUTCDate(todayUTC.getUTCDate() - 1);
    const yesterdayStr = formatUTCDateString(yesterdayUTC);

    let currentStreak = 0;
    let checkDate = new Date(todayUTC);

    // If today is completed, start from today; if not but yesterday was completed, start from yesterday
    if (logDatesSet.has(todayStr)) {
      while (logDatesSet.has(formatUTCDateString(checkDate))) {
        currentStreak++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      }
    } else if (logDatesSet.has(yesterdayStr)) {
      checkDate = new Date(yesterdayUTC);
      while (logDatesSet.has(formatUTCDateString(checkDate))) {
        currentStreak++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      }
    }

    // Calculate longest streak in history
    let longestStreak = 0;
    let currentRun = 0;
    let previousDate = null;

    // Convert set of dates to sorted list of timestamp values
    const sortedUniqueDays = Array.from(logDatesSet)
      .map((dStr) => {
        const [y, m, d] = dStr.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d)).getTime();
      })
      .sort((a, b) => a - b);

    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    for (const time of sortedUniqueDays) {
      if (previousDate === null) {
        currentRun = 1;
      } else {
        const diffDays = Math.round((time - previousDate) / MS_PER_DAY);
        if (diffDays === 1) {
          currentRun++;
        } else if (diffDays > 1) {
          currentRun = 1;
        }
      }
      previousDate = time;
      if (currentRun > longestStreak) {
        longestStreak = currentRun;
      }
    }

    // Calculate last 30 days completion rate
    let last30Done = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(todayUTC);
      d.setUTCDate(todayUTC.getUTCDate() - i);
      if (logDatesSet.has(formatUTCDateString(d))) {
        last30Done++;
      }
    }

    const percent = Math.round((last30Done / 30) * 100);

    res.status(200).json({
      currentStreak,
      longestStreak,
      last30: {
        done: last30Done,
        percent
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  markDone,
  undoDone,
  getHeatmap,
  getHabitStats
};

