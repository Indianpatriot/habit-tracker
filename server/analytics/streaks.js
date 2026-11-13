const mongoose = require('mongoose');

// Helper to format Date or string to YYYY-MM-DD
const toUTCDateString = (d) => {
  if (!d) return '';
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * MongoDB Aggregation Pipeline for Habit Streaks using Gaps-and-Islands pattern
 * Steps:
 * 1. $match { userId, habitId }
 * 2. $sort { date: 1 }
 * 3. $setWindowFields: shift previous date
 * 4. $project: determine if current log starts a new consecutive run
 * 5. $setWindowFields: cumulative sum of newRun flags to assign unique runId
 * 6. $group by runId: calculate streak length, start date, and end date
 */
const getStreakAggregationPipeline = (userId, habitId) => {
  return [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        habitId: new mongoose.Types.ObjectId(habitId)
      }
    },
    {
      $sort: { date: 1 }
    },
    {
      $setWindowFields: {
        sortBy: { date: 1 },
        output: {
          prevDate: {
            $shift: {
              output: '$date',
              by: -1,
              default: null
            }
          }
        }
      }
    },
    {
      $project: {
        date: 1,
        prevDate: 1,
        isNewRun: {
          $cond: [
            { $eq: ['$prevDate', null] },
            0,
            {
              $cond: [
                {
                  $eq: [
                    {
                      $dateDiff: {
                        startDate: '$prevDate',
                        endDate: '$date',
                        unit: 'day'
                      }
                    },
                    1
                  ]
                },
                0,
                1
              ]
            }
          ]
        }
      }
    },
    {
      $setWindowFields: {
        sortBy: { date: 1 },
        output: {
          runId: {
            $sum: '$isNewRun',
            window: { documents: ['unbounded', 'current'] }
          }
        }
      }
    },
    {
      $group: {
        _id: '$runId',
        length: { $sum: 1 },
        start: { $min: '$date' },
        end: { $max: '$date' }
      }
    },
    {
      $sort: { end: 1 }
    }
  ];
};

/**
 * Pure helper: Computes currentStreak and longestStreak from streak runs
 * @param {Array<{ length: number, start: Date|string, end: Date|string }>} runs
 * @param {Date|string} todayInput - Reference today date in UTC
 * @param {Date|string} yesterdayInput - Reference yesterday date in UTC
 * @returns {{ currentStreak: number, longestStreak: number }}
 */
const computeStreaksFromRuns = (runs = [], todayInput = new Date(), yesterdayInput = null) => {
  if (!runs || !Array.isArray(runs) || runs.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Longest streak is max length across all runs
  const longestStreak = Math.max(...runs.map((r) => r.length || 0), 0);

  // Compute reference UTC strings
  const todayStr = toUTCDateString(todayInput);
  let yesterdayStr = '';
  if (yesterdayInput) {
    yesterdayStr = toUTCDateString(yesterdayInput);
  } else {
    const ref = todayInput instanceof Date ? todayInput : new Date(todayInput);
    const y = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate() - 1));
    yesterdayStr = toUTCDateString(y);
  }

  // Find run with latest end date
  const sortedRuns = [...runs].sort((a, b) => {
    const dateA = new Date(a.end).getTime();
    const dateB = new Date(b.end).getTime();
    return dateA - dateB;
  });

  const latestRun = sortedRuns[sortedRuns.length - 1];
  const latestEndStr = toUTCDateString(latestRun.end);

  // Streak is alive if completed today or yesterday UTC
  const currentStreak =
    latestEndStr === todayStr || latestEndStr === yesterdayStr ? latestRun.length : 0;

  return {
    currentStreak,
    longestStreak
  };
};

module.exports = {
  getStreakAggregationPipeline,
  computeStreaksFromRuns,
  toUTCDateString
};
