/**
 * Pure helper and aggregation pipeline for This Week vs Last Week comparison
 * All dates in UTC "YYYY-MM-DD", Monday to Sunday.
 */

// Helper to format Date into YYYY-MM-DD UTC
const formatUTCDate = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculates fair week date ranges based on today UTC
 * THIS WEEK = Monday of the current week through today
 * LAST WEEK = Monday of the previous week through the same weekday
 * @param {Date|string} todayInput
 * @returns {{ thisWeekStart: string, thisWeekEnd: string, lastWeekStart: string, lastWeekEnd: string }}
 */
const getWeekCompareRanges = (todayInput = new Date()) => {
  const refDate = todayInput instanceof Date ? todayInput : new Date(todayInput);
  const todayUTC = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate()));

  // 1 = Monday, ..., 7 = Sunday
  const dayOfWeekISO = todayUTC.getUTCDay() === 0 ? 7 : todayUTC.getUTCDay();

  // Current week Monday is (dayOfWeekISO - 1) days before today
  const thisWeekStartDate = new Date(todayUTC);
  thisWeekStartDate.setUTCDate(todayUTC.getUTCDate() - (dayOfWeekISO - 1));

  // Previous week Monday is 7 days before current Monday
  const lastWeekStartDate = new Date(thisWeekStartDate);
  lastWeekStartDate.setUTCDate(thisWeekStartDate.getUTCDate() - 7);

  // Previous week matching weekday is 7 days before today
  const lastWeekEndDate = new Date(todayUTC);
  lastWeekEndDate.setUTCDate(todayUTC.getUTCDate() - 7);

  return {
    thisWeekStart: formatUTCDate(thisWeekStartDate),
    thisWeekEnd: formatUTCDate(todayUTC),
    lastWeekStart: formatUTCDate(lastWeekStartDate),
    lastWeekEnd: formatUTCDate(lastWeekEndDate)
  };
};

/**
 * Pure helper: Computes this week vs last week stats
 * @param {Object} params
 * @param {Date|string} params.today
 * @param {Array<{ _id: string, name: string }>} params.habits
 * @param {Array<{ habitId: string, date: string|Date }>} params.logs
 * @returns {{ thisWeek: Object, lastWeek: Object, delta: Object }}
 */
const computeWeekCompare = ({ today = new Date(), habits = [], logs = [] }) => {
  const { thisWeekStart, thisWeekEnd, lastWeekStart, lastWeekEnd } = getWeekCompareRanges(today);

  // Create habit name lookup map
  const habitMap = {};
  habits.forEach((h) => {
    const id = String(h._id || h.id);
    habitMap[id] = h.name || 'Habit';
  });

  const thisWeekLogs = [];
  const lastWeekLogs = [];

  logs.forEach((log) => {
    const dateStr = typeof log.date === 'string' ? log.date.slice(0, 10) : formatUTCDate(log.date);
    const habitId = String(log.habitId);

    if (dateStr >= thisWeekStart && dateStr <= thisWeekEnd) {
      thisWeekLogs.push({ habitId, date: dateStr });
    }
    if (dateStr >= lastWeekStart && dateStr <= lastWeekEnd) {
      lastWeekLogs.push({ habitId, date: dateStr });
    }
  });

  // Helper to compute stats for a single period
  const computePeriodStats = (periodLogs, start, end) => {
    const total = periodLogs.length;
    const activeDates = new Set(periodLogs.map((l) => l.date));
    const activeDays = activeDates.size;

    if (total === 0) {
      return {
        start,
        end,
        total: 0,
        activeDays: 0,
        bestHabit: null
      };
    }

    // Count per habit
    const counts = {};
    periodLogs.forEach((l) => {
      counts[l.habitId] = (counts[l.habitId] || 0) + 1;
    });

    // Candidates with count > 0, tie break alphabetically by habit name
    const candidates = Object.keys(counts).map((hId) => ({
      habitId: hId,
      name: habitMap[hId] || 'Unknown',
      count: counts[hId]
    }));

    candidates.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return {
      start,
      end,
      total,
      activeDays,
      bestHabit: candidates[0] || null
    };
  };

  const thisWeek = computePeriodStats(thisWeekLogs, thisWeekStart, thisWeekEnd);
  const lastWeek = computePeriodStats(lastWeekLogs, lastWeekStart, lastWeekEnd);

  const deltaTotal = thisWeek.total - lastWeek.total;
  const deltaPercent =
    lastWeek.total === 0
      ? null
      : Math.round(((thisWeek.total - lastWeek.total) / lastWeek.total) * 100);

  return {
    thisWeek,
    lastWeek,
    delta: {
      total: deltaTotal,
      percent: deltaPercent
    }
  };
};

module.exports = {
  getWeekCompareRanges,
  computeWeekCompare,
  formatUTCDate
};
