const mongoose = require('mongoose');

/**
 * Aggregation pipeline for habit activity counts over a given window (default 90 days)
 * Pipeline: $match { userId, date >= today-89 days } -> $group { _id: "$habitId", count: { $sum: 1 } }
 */
const getActivityAggregationPipeline = (userId, startDateUTC, todayUTC) => {
  const match = {
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: startDateUTC }
  };
  if (todayUTC) {
    match.date.$lte = todayUTC;
  }
  return [
    { $match: match },
    {
      $group: {
        _id: '$habitId',
        count: { $sum: 1 }
      }
    }
  ];
};

/**
 * Pure helper: Merges user habits with completion counts and determines most and least active
 * Following Phase 1 rules:
 * - 0 habits: { most: null, least: null, message: 'No habits yet' }
 * - 1 habit: { most: item, least: null, message: 'Add more habits to compare' }
 * - All habits equal count: { most: alphabeticalFirst, least: null, message: 'All habits are equally active' }
 * - Otherwise: { most, least, message: null } (ties broken alphabetically)
 *
 * @param {Array<{ _id: string|ObjectId, count: number }> | Object} countsByHabit
 * @param {Array<{ _id: string|ObjectId, name: string }>} userHabits
 * @returns {{ most: Object|null, least: Object|null, message: string|null }}
 */
const pickMostLeast = (countsByHabit = [], userHabits = []) => {
  if (!userHabits || userHabits.length === 0) {
    return {
      most: null,
      least: null,
      message: 'No habits yet'
    };
  }

  // Build count lookup map
  const countMap = {};
  if (Array.isArray(countsByHabit)) {
    countsByHabit.forEach((item) => {
      if (item && item._id) {
        countMap[String(item._id)] = item.count || 0;
      }
    });
  } else if (countsByHabit && typeof countsByHabit === 'object') {
    Object.keys(countsByHabit).forEach((k) => {
      countMap[String(k)] = countsByHabit[k] || 0;
    });
  }

  const items = userHabits.map((h) => {
    const habitId = String(h._id);
    const count = countMap[habitId] || 0;
    return {
      habitId,
      name: h.name,
      count,
      percent: Math.round((count / 90) * 100)
    };
  });

  if (items.length === 1) {
    return {
      most: items[0],
      least: null,
      message: 'Add more habits to compare'
    };
  }

  const allSame = items.every((h) => h.count === items[0].count);
  if (allSame) {
    const sortedAlpha = [...items].sort((a, b) => a.name.localeCompare(b.name));
    return {
      most: sortedAlpha[0],
      least: null,
      message: 'All habits are equally active'
    };
  }

  // Most active: count descending, then name ascending
  const sortedForMost = [...items].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  // Least active: count ascending, then name ascending
  const sortedForLeast = [...items].sort((a, b) => a.count - b.count || a.name.localeCompare(b.name));

  return {
    most: sortedForMost[0],
    least: sortedForLeast[0],
    message: null
  };
};

module.exports = {
  getActivityAggregationPipeline,
  pickMostLeast
};

