const express = require('express');
const router = express.Router();
const {
  getHabits,
  getHabitById,
  createHabit,
  updateHabit,
  deleteHabit,
  getHabitStreaks
} = require('../controllers/habitController');
const {
  markDone,
  undoDone,
  getHabitLogs,
  getHabitStats
} = require('../controllers/logController');
const { protect } = require('../middleware/auth');

// All habit endpoints require user authentication
router.use(protect);

router.route('/')
  .get(getHabits)
  .post(createHabit);

router.route('/:id')
  .get(getHabitById)
  .put(updateHabit)
  .delete(deleteHabit);

// Step 3: Habit completions and log history
router.route('/:id/logs')
  .post(markDone)
  .get(getHabitLogs);

router.delete('/:id/logs/:date', undoDone);

// Habit streaks endpoint ({ current, longest, unit: 'days'|'weeks' })
router.get('/:id/streaks', getHabitStreaks);

// Step 4: Habit streak and 30-day stats endpoint
router.get('/:id/stats', getHabitStats);

module.exports = router;
