const mongoose = require('mongoose');

// Helper to format Date object into YYYY-MM-DD (UTC)
const formatUTCDate = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Builds the MongoDB aggregation pipeline for 90-day completion heatmap
 * Pipeline: $match { userId, [habitId], date >= today-89 } -> $group -> $sort
 */
const getHeatmapPipeline = (userId, habitId, startDateUTC, todayUTC) => {
  const match = {
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: startDateUTC }
  };

  if (todayUTC) {
    match.date.$lte = todayUTC;
  }

  if (habitId) {
    match.habitId = new mongoose.Types.ObjectId(habitId);
  }

  return [
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ];
};

/**
 * Validates days parameter for heatmap and activity summary (30, 90, 365)
 * Defaults to 90 if omitted. Returns null if invalid.
 * @param {string|number|undefined} daysParam
 * @returns {number|null}
 */
const validateHeatmapDays = (daysParam) => {
  if (daysParam === undefined || daysParam === null || daysParam === '') {
    return 90;
  }
  const parsed = Number(daysParam);
  if ([30, 90, 365].includes(parsed)) {
    return parsed;
  }
  return null;
};

/**
 * Pure helper: Fills in missing days with count 0 to guarantee exactly `days` items ending today UTC
 * @param {Array} items - Array of { _id: "YYYY-MM-DD", count } or { date: "YYYY-MM-DD", count }
 * @param {Date|string} todayInput - Reference today date in UTC
 * @param {number} days - Number of days in window (default 90)
 * @returns {Array<{ date: string, count: number }>} Array of exactly `days` items
 */
const fillZeroDays = (items = [], todayInput = new Date(), days = 90) => {
  const refDate = todayInput instanceof Date ? todayInput : new Date(todayInput);
  const todayUTC = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate()));

  // Map existing counts by YYYY-MM-DD
  const countMap = {};
  items.forEach((item) => {
    const key = item.date || item._id;
    if (key) {
      countMap[key] = item.count || 0;
    }
  });

  const result = [];
  // `days` items: from (days - 1) days ago up to 0 days ago (today)
  for (let i = days - 1; i >= 0; i--) {
    const current = new Date(todayUTC);
    current.setUTCDate(todayUTC.getUTCDate() - i);
    const dateStr = formatUTCDate(current);
    result.push({
      date: dateStr,
      count: countMap[dateStr] || 0
    });
  }

  return result;
};

module.exports = {
  getHeatmapPipeline,
  fillZeroDays,
  formatUTCDate,
  validateHeatmapDays
};

