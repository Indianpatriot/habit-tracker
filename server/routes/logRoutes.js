const express = require('express');
const router = express.Router();
const {
  markDone,
  undoDone,
  getHeatmap,
  getActivitySummary
} = require('../controllers/logController');
const { protect } = require('../middleware/auth');

// All log endpoints require authentication
router.use(protect);

router.post('/', markDone);
router.delete('/:habitId', undoDone);
router.get('/heatmap', getHeatmap);
router.get('/activity-summary', getActivitySummary);

module.exports = router;
