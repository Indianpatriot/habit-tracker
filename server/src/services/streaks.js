const mongoose = require('mongoose');
const Habit = require('../../models/Habit');
const Log = require('../../models/Log');

// Helper to convert any Date or string to UTC midnight Date object
const toUTCMidnightDate = (val) => {
  if (!val) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  }
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [year, month, day] = val.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }
  const d = new Date(val);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

// Helper to format Date or string into "YYYY-MM-DD" UTC string
const toUTCString = (val) => {
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return val;
  }
  const d = toUTCMidnightDate(val);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to add days in UTC
const addDaysUTC = (date, n) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

// Helper to get Monday 00:00:00.000 UTC for a given date
const getMondayUTC = (date) => {
  const d = toUTCMidnightDate(date);
  const day = d.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  // Monday is start of week: diff from current day
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
};

/**
 * Pure function: computeStreaks(habit, checkinDates, today)
 * Evaluates current and longest streaks based on habit goalType.
 *
 * Rules:
 * - daily: consecutive calendar days with a check-in (unit: 'days').
 * - weekly_target: consecutive Monday-based weeks meeting targetPerWeek (unit: 'weeks').
 * - weekdays: consecutive scheduled weekdays with a check-in. Unscheduled days skipped (unit: 'days').
 * - "current" does not break if today or the current week is in progress and unsatisfied.
 */
function computeStreaks(habit = {}, checkinDates = [], today = new Date()) {
  const goalType = habit.goalType || 'daily';
  const unit = goalType === 'weekly_target' ? 'weeks' : 'days';

  // Normalize check-in dates to sorted distinct YYYY-MM-DD strings
  const distinctDateStrings = Array.from(
    new Set((checkinDates || []).map((d) => toUTCString(d)))
  ).sort();

  if (distinctDateStrings.length === 0) {
    return { current: 0, longest: 0, unit };
  }

  const todayDate = toUTCMidnightDate(today);
  const todayStr = toUTCString(todayDate);

  if (goalType === 'daily') {
    const datesSet = new Set(distinctDateStrings);
    const earliestDate = toUTCMidnightDate(distinctDateStrings[0]);
    const latestDate = toUTCMidnightDate(distinctDateStrings[distinctDateStrings.length - 1]);
    const maxBound = latestDate > todayDate ? latestDate : todayDate;

    let longest = 0;
    let streak = 0;
    let current = 0;

    let curr = earliestDate;
    while (curr <= maxBound) {
      const currStr = toUTCString(curr);
      const isDone = datesSet.has(currStr);
      const isBeforeToday = curr < todayDate;
      const isToday = curr.getTime() === todayDate.getTime();

      if (isBeforeToday) {
        if (isDone) {
          streak += 1;
          if (streak > longest) longest = streak;
        } else {
          streak = 0;
        }
      } else if (isToday) {
        if (isDone) {
          streak += 1;
          if (streak > longest) longest = streak;
          current = streak;
        } else {
          // Today is still in progress and not yet satisfied; keep streak from yesterday
          current = streak;
        }
      } else {
        // Future date (if check-in exists in future)
        if (isDone) {
          streak += 1;
          if (streak > longest) longest = streak;
        } else {
          streak = 0;
        }
      }

      curr = addDaysUTC(curr, 1);
    }

    if (current > longest) longest = current;
    return { current, longest, unit: 'days' };
  }

  if (goalType === 'weekly_target') {
    const target = Number(habit.targetPerWeek) || 1;
    // Group distinct check-in days by Monday-based week
    const weekCounts = {};
    distinctDateStrings.forEach((dStr) => {
      const monStr = toUTCString(getMondayUTC(dStr));
      weekCounts[monStr] = (weekCounts[monStr] || 0) + 1;
    });

    const currentWeekMon = getMondayUTC(todayDate);
    const earliestWeekMon = getMondayUTC(distinctDateStrings[0]);
    const latestWeekMon = getMondayUTC(distinctDateStrings[distinctDateStrings.length - 1]);
    const maxWeek = latestWeekMon > currentWeekMon ? latestWeekMon : currentWeekMon;

    let longest = 0;
    let streak = 0;
    let current = 0;

    let currWeek = earliestWeekMon;
    while (currWeek <= maxWeek) {
      const currWeekStr = toUTCString(currWeek);
      const count = weekCounts[currWeekStr] || 0;
      const met = count >= target;

      const isBeforeCurrent = currWeek < currentWeekMon;
      const isCurrentWeek = currWeek.getTime() === currentWeekMon.getTime();

      if (isBeforeCurrent) {
        if (met) {
          streak += 1;
          if (streak > longest) longest = streak;
        } else {
          streak = 0;
        }
      } else if (isCurrentWeek) {
        if (met) {
          streak += 1;
          if (streak > longest) longest = streak;
          current = streak;
        } else {
          // Current week in progress and not yet satisfied; keeps previous streak
          current = streak;
        }
      } else {
        // Future week
        if (met) {
          streak += 1;
          if (streak > longest) longest = streak;
        } else {
          streak = 0;
        }
      }

      currWeek = addDaysUTC(currWeek, 7);
    }

    if (current > longest) longest = current;
    return { current, longest, unit: 'weeks' };
  }

  if (goalType === 'weekdays') {
    const scheduledDays = new Set((habit.weekdays || []).map(Number));
    if (scheduledDays.size === 0) {
      return { current: 0, longest: 0, unit: 'days' };
    }

    // Filter check-ins to only those on scheduled weekdays
    const datesSet = new Set();
    distinctDateStrings.forEach((dStr) => {
      const d = toUTCMidnightDate(dStr);
      if (scheduledDays.has(d.getUTCDay())) {
        datesSet.add(dStr);
      }
    });

    if (datesSet.size === 0) {
      return { current: 0, longest: 0, unit: 'days' };
    }

    const scheduledDateList = Array.from(datesSet).sort();
    const earliestDate = toUTCMidnightDate(scheduledDateList[0]);
    const latestDate = toUTCMidnightDate(scheduledDateList[scheduledDateList.length - 1]);
    const maxBound = latestDate > todayDate ? latestDate : todayDate;

    let longest = 0;
    let streak = 0;
    let current = 0;

    let curr = earliestDate;
    while (curr <= maxBound) {
      const dayOfWeek = curr.getUTCDay();

      // Skipping unscheduled days: unscheduled days neither extend nor break the streak
      if (!scheduledDays.has(dayOfWeek)) {
        curr = addDaysUTC(curr, 1);
        continue;
      }

      const currStr = toUTCString(curr);
      const isDone = datesSet.has(currStr);
      const isBeforeToday = curr < todayDate;
      const isToday = curr.getTime() === todayDate.getTime();

      if (isBeforeToday) {
        if (isDone) {
          streak += 1;
          if (streak > longest) longest = streak;
        } else {
          // Scheduled day missed! Streak breaks.
          streak = 0;
        }
      } else if (isToday) {
        if (isDone) {
          streak += 1;
          if (streak > longest) longest = streak;
          current = streak;
        } else {
          // Today is still in progress and not yet satisfied; preserve streak from last scheduled day
          current = streak;
        }
      } else {
        if (isDone) {
          streak += 1;
          if (streak > longest) longest = streak;
        } else {
          streak = 0;
        }
      }

      curr = addDaysUTC(curr, 1);
    }

    if (current > longest) longest = current;
    return { current, longest, unit: 'days' };
  }

  return { current: 0, longest: 0, unit };
}

/**
 * MongoDB Aggregation Streak Engine
 * Gaps-and-islands approach for daily and weekly_target goals,
 * distinct dates with JS reduction for weekdays.
 */
async function computeStreaksFromDB(habitId, userId, today = new Date()) {
  const habit = await Habit.findOne({
    _id: new mongoose.Types.ObjectId(habitId),
    userId: new mongoose.Types.ObjectId(userId)
  });

  if (!habit) {
    const error = new Error('Habit not found');
    error.statusCode = 404;
    throw error;
  }

  const todayDate = toUTCMidnightDate(today);
  const goalType = habit.goalType || 'daily';

  if (goalType === 'daily') {
    // Gaps-and-islands aggregation for daily habit
    const pipeline = [
      {
        $match: {
          habitId: new mongoose.Types.ObjectId(habitId),
          userId: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        // Ensure distinct dates formatted as YYYY-MM-DD
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' } },
          date: { $first: '$date' }
        }
      },
      {
        $sort: { date: 1 }
      },
      {
        // Assign continuous document sequence rank
        $setWindowFields: {
          sortBy: { date: 1 },
          output: {
            rank: { $documentNumber: {} }
          }
        }
      },
      {
        $project: {
          date: 1,
          rank: 1,
          // Convert date to days since epoch
          periodIndex: { $floor: { $divide: [{ $toLong: '$date' }, 86400000] } }
        }
      },
      {
        $project: {
          date: 1,
          rank: 1,
          // Grouping key for contiguous streak islands
          island: { $subtract: ['$periodIndex', '$rank'] }
        }
      },
      {
        $group: {
          _id: '$island',
          length: { $count: {} },
          startDate: { $min: '$date' },
          endDate: { $max: '$date' }
        }
      },
      {
        $sort: { endDate: 1 }
      }
    ];

    const islands = await Log.aggregate(pipeline);
    if (!islands || islands.length === 0) {
      return { current: 0, longest: 0, unit: 'days' };
    }

    const longest = Math.max(...islands.map((i) => i.length), 0);
    const lastIsland = islands[islands.length - 1];

    const lastIslandEndDate = toUTCMidnightDate(lastIsland.endDate);
    const yesterdayDate = addDaysUTC(todayDate, -1);

    let current = 0;
    // Current streak holds if completed today or completed yesterday (today in progress)
    if (
      lastIslandEndDate.getTime() === todayDate.getTime() ||
      lastIslandEndDate.getTime() === yesterdayDate.getTime()
    ) {
      current = lastIsland.length;
    }

    return { current, longest, unit: 'days' };
  }

  if (goalType === 'weekly_target') {
    const target = Number(habit.targetPerWeek) || 1;
    // Gaps-and-islands aggregation for weekly target habit
    const pipeline = [
      {
        $match: {
          habitId: new mongoose.Types.ObjectId(habitId),
          userId: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        // Group by Monday-based week and distinct day string
        $group: {
          _id: {
            week: { $dateTrunc: { date: '$date', unit: 'week', startOfWeek: 'monday', timezone: 'UTC' } },
            dayStr: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' } }
          }
        }
      },
      {
        // Count distinct check-in days within each week
        $group: {
          _id: '$_id.week',
          distinctDays: { $count: {} }
        }
      },
      {
        // Filter to weeks satisfying targetPerWeek
        $match: {
          distinctDays: { $gte: target }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        // Assign continuous sequence rank
        $setWindowFields: {
          sortBy: { _id: 1 },
          output: {
            rank: { $documentNumber: {} }
          }
        }
      },
      {
        $project: {
          week: '$_id',
          rank: 1,
          // Convert week to 7-day week index since epoch
          periodIndex: { $floor: { $divide: [{ $toLong: '$_id' }, 604800000] } }
        }
      },
      {
        $project: {
          week: 1,
          rank: 1,
          island: { $subtract: ['$periodIndex', '$rank'] }
        }
      },
      {
        $group: {
          _id: '$island',
          length: { $count: {} },
          startWeek: { $min: '$week' },
          endWeek: { $max: '$week' }
        }
      },
      {
        $sort: { endWeek: 1 }
      }
    ];

    const islands = await Log.aggregate(pipeline);
    if (!islands || islands.length === 0) {
      return { current: 0, longest: 0, unit: 'weeks' };
    }

    const longest = Math.max(...islands.map((i) => i.length), 0);
    const lastIsland = islands[islands.length - 1];

    const lastIslandEndWeek = toUTCMidnightDate(lastIsland.endWeek);
    const currentWeekMon = getMondayUTC(todayDate);
    const lastWeekMon = addDaysUTC(currentWeekMon, -7);

    let current = 0;
    // Current streak holds if met this week or met last week (current week in progress)
    if (
      lastIslandEndWeek.getTime() === currentWeekMon.getTime() ||
      lastIslandEndWeek.getTime() === lastWeekMon.getTime()
    ) {
      current = lastIsland.length;
    }

    return { current, longest, unit: 'weeks' };
  }

  // For weekdays: aggregation to get distinct check-in dates, then reduce in JS.
  // Code comment explanation: SQL/MongoDB gaps-and-islands assumes contiguous day indices.
  // For custom scheduled weekdays (e.g. Mon/Wed/Fri), unscheduled days (Tue/Thu/Sat/Sun)
  // must be skipped so they neither extend nor break the streak. Reducing in JS cleanly
  // handles this schedule filtering logic.
  const distinctLogs = await Log.aggregate([
    {
      $match: {
        habitId: new mongoose.Types.ObjectId(habitId),
        userId: new mongoose.Types.ObjectId(userId)
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' } },
        date: { $first: '$date' }
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);

  const checkinDates = distinctLogs.map((l) => l._id);
  return computeStreaks(habit, checkinDates, today);
}

module.exports = {
  computeStreaks,
  computeStreaksFromDB,
  toUTCString,
  toUTCMidnightDate,
  getMondayUTC
};

