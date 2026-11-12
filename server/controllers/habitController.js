const Habit = require('../models/Habit');
const Log = require('../models/Log');
const { computeStreaksFromDB } = require('../services/streaks');

// Helper to get today's UTC midnight date
const getTodayUTCMidnight = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
};

// Validation helper for goal types and corresponding parameters
const validateHabitGoal = (goalType, targetPerWeek, weekdays) => {
  const validGoalTypes = ['daily', 'weekly_target', 'weekdays'];
  if (goalType && !validGoalTypes.includes(goalType)) {
    return 'Invalid goalType. Must be daily, weekly_target, or weekdays';
  }

  const effectiveGoalType = goalType || 'daily';

  if (effectiveGoalType === 'weekly_target') {
    const target = Number(targetPerWeek);
    if (!Number.isInteger(target) || target < 1 || target > 7) {
      return 'targetPerWeek must be an integer between 1 and 7 when goalType is weekly_target';
    }
  }

  if (effectiveGoalType === 'weekdays') {
    if (
      !Array.isArray(weekdays) ||
      weekdays.length === 0 ||
      !weekdays.every((d) => Number.isInteger(Number(d)) && Number(d) >= 0 && Number(d) <= 6)
    ) {
      return 'weekdays must be a non-empty array with days 0-6 (0=Sunday) when goalType is weekdays';
    }
  }

  return null;
};

// @desc    Get all habits for logged-in user (supports ?q= search filter)
// @route   GET /api/habits
// @access  Private
const getHabits = async (req, res, next) => {
  try {
    const { q } = req.query;
    const filter = { userId: req.user._id };

    // Case-insensitive name filter if query string provided
    if (q && q.trim()) {
      filter.name = { $regex: q.trim(), $options: 'i' };
    }

    const habits = await Habit.find(filter).sort({ createdAt: -1 }).lean();

    // Attach completion state for today derived from Log collection
    const todayUTC = getTodayUTCMidnight();
    const todayLogs = await Log.find({
      userId: req.user._id,
      date: todayUTC
    });
    const completedSet = new Set(todayLogs.map((l) => l.habitId.toString()));

    const result = habits.map((h) => ({
      ...h,
      completedToday: completedSet.has(h._id.toString())
    }));

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single habit by ID
// @route   GET /api/habits/:id
// @access  Private
const getHabitById = async (req, res, next) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).lean();

    if (!habit) {
      res.status(404);
      throw new Error('Habit not found');
    }

    // Attach today completion status derived from Log collection
    const todayUTC = getTodayUTCMidnight();
    const todayLog = await Log.findOne({
      habitId: habit._id,
      userId: req.user._id,
      date: todayUTC
    });

    res.status(200).json({
      ...habit,
      completedToday: Boolean(todayLog)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new habit with goal settings
// @route   POST /api/habits
// @access  Private
const createHabit = async (req, res, next) => {
  try {
    const { name, goalType = 'daily', targetPerWeek, weekdays } = req.body;

    if (!name || !name.trim()) {
      res.status(400);
      throw new Error('Habit name is required');
    }

    if (name.trim().length < 2) {
      res.status(400);
      throw new Error('Habit name must be at least 2 characters');
    }

    const goalError = validateHabitGoal(goalType, targetPerWeek, weekdays);
    if (goalError) {
      res.status(400);
      throw new Error(goalError);
    }

    const habitData = {
      userId: req.user._id,
      name: name.trim(),
      goalType
    };

    if (goalType === 'weekly_target') {
      habitData.targetPerWeek = Number(targetPerWeek);
    } else if (goalType === 'weekdays') {
      habitData.weekdays = weekdays.map(Number);
    }

    const habit = await Habit.create(habitData);
    res.status(201).json(habit);
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing habit
// @route   PUT /api/habits/:id
// @access  Private
const updateHabit = async (req, res, next) => {
  try {
    const { name, goalType, targetPerWeek, weekdays } = req.body;

    if (!name || !name.trim()) {
      res.status(400);
      throw new Error('Habit name is required');
    }

    if (name.trim().length < 2) {
      res.status(400);
      throw new Error('Habit name must be at least 2 characters');
    }

    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!habit) {
      res.status(404);
      throw new Error('Habit not found');
    }

    const effectiveGoalType = goalType !== undefined ? goalType : habit.goalType;
    const effectiveTarget = targetPerWeek !== undefined ? targetPerWeek : habit.targetPerWeek;
    const effectiveWeekdays = weekdays !== undefined ? weekdays : habit.weekdays;

    const goalError = validateHabitGoal(effectiveGoalType, effectiveTarget, effectiveWeekdays);
    if (goalError) {
      res.status(400);
      throw new Error(goalError);
    }

    habit.name = name.trim();
    if (goalType !== undefined) {
      habit.goalType = goalType;
    }

    if (effectiveGoalType === 'weekly_target') {
      habit.targetPerWeek = Number(effectiveTarget);
      habit.weekdays = undefined;
    } else if (effectiveGoalType === 'weekdays') {
      habit.weekdays = effectiveWeekdays.map(Number);
      habit.targetPerWeek = undefined;
    } else {
      habit.targetPerWeek = undefined;
      habit.weekdays = undefined;
    }

    const updated = await habit.save();
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a habit & cascade delete its logs
// @route   DELETE /api/habits/:id
// @access  Private
const deleteHabit = async (req, res, next) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!habit) {
      res.status(404);
      throw new Error('Habit not found');
    }

    // Delete habit
    await Habit.deleteOne({ _id: habit._id });

    // Cascade delete: remove all completion logs associated with this habit
    await Log.deleteMany({ habitId: habit._id });

    res.status(200).json({ success: true, id: req.params.id });
  } catch (error) {
    next(error);
  }
};

// @desc    Get streaks for a habit using MongoDB aggregation engine
// @route   GET /api/habits/:id/streaks
// @access  Private
const getHabitStreaks = async (req, res, next) => {
  try {
    const streaks = await computeStreaksFromDB(req.params.id, req.user._id);
    res.status(200).json(streaks);
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode);
    }
    next(error);
  }
};

module.exports = {
  getHabits,
  getHabitById,
  createHabit,
  updateHabit,
  deleteHabit,
  getHabitStreaks,
  validateHabitGoal
};
