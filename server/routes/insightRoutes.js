const express = require('express');
const router = express.Router();
const {
  getCorrelation,
  getCorrelations
} = require('../controllers/insightController');
const { protect } = require('../middleware/auth');

// All insight endpoints require user authentication
router.use(protect);

router.get('/correlation', getCorrelation);
router.get('/correlations', getCorrelations);

module.exports = router;

