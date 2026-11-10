const express = require('express');
const router = express.Router();
const {
  getHabits,
  getHabitById,
  createHabit,
  updateHabit,
  deleteHabit
} = require('../controllers/habitController');
const { getHabitStats } = require('../controllers/logController');
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

// Habit streak and 30-day stats endpoint
router.get('/:id/stats', getHabitStats);

module.exports = router;
