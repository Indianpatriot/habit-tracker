const express = require('express');
const router = express.Router();
const { getHeatmap, getActivitySummary } = require('../controllers/logController');
const { getAchievements } = require('../controllers/achievementsController');
const { getInsightsOverview } = require('../controllers/insightsOverviewController');
const { getCrossInsights } = require('../controllers/crossInsightsController');
const { getWeekCompareStats } = require('../controllers/weekCompareController');
const { protect } = require('../middleware/auth');

// All analytics stats endpoints require authentication
router.use(protect);

router.get('/heatmap', getHeatmap);
router.get('/activity', getActivitySummary);
router.get('/week-compare', getWeekCompareStats);
router.get('/achievements', getAchievements);
router.get('/insights/overview', getInsightsOverview);
router.get('/insights/cross', getCrossInsights);

module.exports = router;

