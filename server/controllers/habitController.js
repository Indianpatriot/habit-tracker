const Habit = require('../models/Habit');
const Log = require('../models/Log');

// Helper to get today's UTC midnight date
const getTodayUTCMidnight = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
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

// @desc    Create a new habit
// @route   POST /api/habits
// @access  Private
const createHabit = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400);
      throw new Error('Habit name is required');
    }

    if (name.trim().length < 2) {
      res.status(400);
      throw new Error('Habit name must be at least 2 characters');
    }

    const habit = await Habit.create({
      userId: req.user._id,
      name: name.trim()
    });

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
    const { name } = req.body;

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

    habit.name = name.trim();
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

module.exports = {
  getHabits,
  getHabitById,
  createHabit,
  updateHabit,
  deleteHabit
};

