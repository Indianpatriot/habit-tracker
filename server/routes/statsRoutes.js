const express = require('express');
const router = express.Router();
const { getHeatmap, getActivitySummary } = require('../controllers/logController');
const { protect } = require('../middleware/auth');

// All analytics stats endpoints require authentication
router.use(protect);

router.get('/heatmap', getHeatmap);
router.get('/activity', getActivitySummary);

module.exports = router;
