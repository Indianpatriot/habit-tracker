const express = require('express');
const router = express.Router();
const { getBadges } = require('../controllers/badgeController');
const { protect } = require('../middleware/auth');

// All badge endpoints require user authentication
router.use(protect);

router.get('/', getBadges);

module.exports = router;
