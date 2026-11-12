const mongoose = require('mongoose');
const Habit = require('../../models/Habit');
const Log = require('../../models/Log');
const { toUTCString } = require('./streaks');

/**
 * Pure function: computeCorrelationFromDates
 * Computes cross-habit correlation statistics given dates for habits A and B and total window days.
 *
 * Definitions:
 * - daysA = days A done; daysB = days B done; both = days both done
 * - pBgivenA = both / daysA
 * - pBgivenNotA = (daysB - both) / (totalDays - daysA)
 * - lift = pBgivenA / pBgivenNotA (null if denominator is 0)
 * - enough = daysA >= 10 && (totalDays - daysA) >= 10
 */
function computeCorrelationFromDates(datesA = [], datesB = [], totalDays = 90) {
  const setA = new Set((datesA || []).map(toUTCString));
  const setB = new Set((datesB || []).map(toUTCString));

  let both = 0;
  setA.forEach((d) => {
    if (setB.has(d)) both += 1;
  });

  const daysA = setA.size;
  const daysB = setB.size;

  const notDaysA = totalDays - daysA;

  const pBgivenA = daysA > 0 ? both / daysA : 0;
  const pBgivenNotA = notDaysA > 0 ? (daysB - both) / notDaysA : 0;

  let lift = null;
  if (pBgivenNotA > 0 && pBgivenA > 0) {
    lift = pBgivenA / pBgivenNotA;
  } else if (pBgivenA === 0) {
    lift = 0;
  }

  const enough = daysA >= 10 && notDaysA >= 10;

  return {
    days: totalDays,
    daysA,
    daysB,
    both,
    pBgivenA,
    pBgivenNotA,
    lift,
    enough
  };
}

/**
 * MongoDB Aggregation Pipeline for Cross-Habit Correlation
 * Uses ONE aggregation over check-ins in the window:
 * $group by day with $addToSet of habitIds, derive doneA/doneB flags, and $group by doneA to count days.
 */
async function getCorrelationForHabits(habitAId, habitBId, userId, totalDays = 90) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const aObjId = new mongoose.Types.ObjectId(habitAId);
  const bObjId = new mongoose.Types.ObjectId(habitBId);

  const [habitA, habitB] = await Promise.all([
    Habit.findOne({ _id: aObjId, userId: userObjId }).lean(),
    Habit.findOne({ _id: bObjId, userId: userObjId }).lean()
  ]);

  if (!habitA || !habitB) {
    const error = new Error('One or both habits not found');
    error.statusCode = 404;
    throw error;
  }

  // Calculate window start and end dates (UTC midnight)
  const now = new Date();
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const startDate = new Date(endDate);
  startDate.setUTCDate(endDate.getUTCDate() - (totalDays - 1));

  // Single aggregation over check-ins in the window
  const aggregationPipeline = [
    {
      $match: {
        userId: userObjId,
        habitId: { $in: [aObjId, bObjId] },
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      // Group by calendar day with $addToSet of habitIds
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' } },
        habitsOnDay: { $addToSet: '$habitId' }
      }
    },
    {
      // Derive doneA and doneB boolean flags
      $project: {
        doneA: { $in: [aObjId, '$habitsOnDay'] },
        doneB: { $in: [bObjId, '$habitsOnDay'] }
      }
    },
    {
      // Group by doneA to count active days and days where B was also done
      $group: {
        _id: '$doneA',
        daysCount: { $count: {} },
        daysBCount: { $sum: { $cond: ['$doneB', 1, 0] } }
      }
    }
  ];

  const results = await Log.aggregate(aggregationPipeline);

  // Group _id: true represents days where A was completed
  const aGroup = results.find((r) => r._id === true);
  // Group _id: false represents days where A was not completed (but B was, since day was matched)
  const notAGroup = results.find((r) => r._id === false);

  const daysA = aGroup ? aGroup.daysCount : 0;
  const both = aGroup ? aGroup.daysBCount : 0;
  const daysBWithoutA = notAGroup ? notAGroup.daysBCount : 0;
  const daysB = both + daysBWithoutA;

  const notDaysA = totalDays - daysA;
  const pBgivenA = daysA > 0 ? both / daysA : 0;
  const pBgivenNotA = notDaysA > 0 ? (daysB - both) / notDaysA : 0;

  let lift = null;
  if (pBgivenNotA > 0 && pBgivenA > 0) {
    lift = pBgivenA / pBgivenNotA;
  } else if (pBgivenA === 0) {
    lift = 0;
  }

  const enough = daysA >= 10 && notDaysA >= 10;

  return {
    a: habitA,
    b: habitB,
    days: totalDays,
    daysA,
    daysB,
    both,
    pBgivenA,
    pBgivenNotA,
    lift,
    enough
  };
}

/**
 * Top correlations across all habits for user (limit 10 habits, top 5 pairs by lift)
 */
async function getTopCorrelations(userId, totalDays = 90) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const habits = await Habit.find({ userId: userObjId }).limit(10).lean();

  if (habits.length < 2) {
    return [];
  }

  const pairs = [];
  for (let i = 0; i < habits.length; i++) {
    for (let j = 0; j < habits.length; j++) {
      if (i === j) continue;
      pairs.push([habits[i]._id, habits[j]._id]);
    }
  }

  const correlationResults = await Promise.all(
    pairs.map(async ([aId, bId]) => {
      try {
        return await getCorrelationForHabits(aId, bId, userId, totalDays);
      } catch {
        return null;
      }
    })
  );

  const validCorrelations = correlationResults.filter(
    (c) => c !== null && c.lift !== null && !isNaN(c.lift) && c.lift > 0
  );

  // Sort by lift descending and return top 5
  validCorrelations.sort((x, y) => y.lift - x.lift);
  return validCorrelations.slice(0, 5);
}

module.exports = {
  computeCorrelationFromDates,
  getCorrelationForHabits,
  getTopCorrelations
};

