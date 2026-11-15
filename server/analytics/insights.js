const {
  computeStreaks,
  toUTCString,
  toUTCMidnightDate,
  getMondayUTC
} = require('../src/services/streaks');

// Helper to add days in UTC
const addDaysUTC = (date, n) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

// Helper to format date as "MMM D" in UTC
const formatMonthDayUTC = (date) => {
  const d = toUTCMidnightDate(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

/**
 * Normalizes input habits and logs for analytics
 */
function normalizeInputs({ today = new Date(), habits = [], logs = [] }) {
  const refToday = today instanceof Date ? today : new Date(today);
  const refTodayMidnight = new Date(
    Date.UTC(refToday.getUTCFullYear(), refToday.getUTCMonth(), refToday.getUTCDate(), 0, 0, 0, 0)
  );

  const normalizedHabits = (habits || []).map((h) => ({
    id: String(h._id || h.id),
    name: h.name || 'Habit',
    goalType: h.goalType || 'daily',
    weekdays: h.weekdays || [],
    targetPerWeek: h.targetPerWeek || 1,
    createdAt: h.createdAt ? toUTCMidnightDate(h.createdAt) : null
  }));

  const seen = new Set();
  const normalizedLogs = [];
  (logs || []).forEach((l) => {
    const habitId = String(l.habitId?._id || l.habitId);
    const dateStr = toUTCString(l.date);
    if (!habitId || !dateStr) return;
    const key = `${habitId}_${dateStr}`;
    if (!seen.has(key)) {
      seen.add(key);
      normalizedLogs.push({
        habitId,
        dateStr,
        date: toUTCMidnightDate(dateStr)
      });
    }
  });

  normalizedLogs.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    refToday: refTodayMidnight,
    habits: normalizedHabits,
    logs: normalizedLogs
  };
}

/**
 * 1. Today's progress ring data & takeaway
 */
function computeTodayProgress(input) {
  const { refToday, habits, logs } = normalizeInputs(input);
  const todayStr = toUTCString(refToday);

  const doneTodayHabitIds = new Set(
    logs.filter((l) => l.dateStr === todayStr).map((l) => l.habitId)
  );

  const totalHabits = habits.length;
  const todayDone = habits.filter((h) => doneTodayHabitIds.has(h.id)).length;
  const percent = totalHabits > 0 ? Math.round((todayDone / totalHabits) * 100) : 0;

  let takeaway = 'No habits created yet. Create a habit to start tracking.';
  if (totalHabits > 0) {
    if (todayDone === totalHabits) {
      takeaway = `All ${totalHabits} habits completed today! Fantastic consistency.`;
    } else if (todayDone === 0) {
      takeaway = `No habits checked in yet today (${totalHabits} pending).`;
    } else {
      takeaway = `You've completed ${todayDone} of ${totalHabits} habits today (${percent}% done).`;
    }
  }

  return {
    todayDone,
    totalHabits,
    percent,
    takeaway
  };
}

/**
 * 2. Weekly trend (12 weeks, Monday to Sunday)
 */
function computeWeeklyTrend(input) {
  const { refToday, logs } = normalizeInputs(input);
  const currentMonday = getMondayUTC(refToday);

  // 12 weeks: 11 weeks ago through current week
  const weekly = [];
  for (let i = 0; i < 12; i++) {
    const weekMon = addDaysUTC(currentMonday, (i - 11) * 7);
    const weekSun = addDaysUTC(weekMon, 6);
    const monMs = weekMon.getTime();
    const sunMs = weekSun.getTime();

    const count = logs.filter((l) => {
      const t = l.date.getTime();
      return t >= monMs && t <= sunMs;
    }).length;

    weekly.push({
      weekStart: toUTCString(weekMon),
      label: formatMonthDayUTC(weekMon),
      count,
      isCurrent: i === 11
    });
  }

  const currentCount = weekly[11].count;
  const prevCount = weekly[10].count;
  const maxWeek = weekly.reduce((max, w) => (w.count > max.count ? w : max), weekly[0]);

  let takeaway = 'No completions recorded in the last 12 weeks.';
  if (maxWeek.count > 0) {
    if (currentCount > prevCount) {
      takeaway = `Current week has ${currentCount} check-ins, tracking ahead of last week's ${prevCount}.`;
    } else if (currentCount === prevCount && currentCount > 0) {
      takeaway = `Steady pace: ${currentCount} check-ins so far this week, matching last week.`;
    } else {
      takeaway = `Your strongest week was ${maxWeek.label} with ${maxWeek.count} completions.`;
    }
  }

  return {
    weekly,
    takeaway
  };
}

/**
 * 3. Day-of-week pattern (Mon to Sun over last 90 days)
 */
function computeWeekdayCounts(input) {
  const { refToday, logs } = normalizeInputs(input);

  const start90 = addDaysUTC(refToday, -89);
  const start90Ms = start90.getTime();
  const end90Ms = refToday.getTime();

  const logs90 = logs.filter((l) => {
    const t = l.date.getTime();
    return t >= start90Ms && t <= end90Ms;
  });

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // JS getUTCDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
  // Map index: 0->Mon (1), 1->Tue (2), ..., 5->Sat (6), 6->Sun (0)
  const utcDayMapping = [1, 2, 3, 4, 5, 6, 0];

  const counts = [0, 0, 0, 0, 0, 0, 0];
  logs90.forEach((l) => {
    const day = l.date.getUTCDay();
    const idx = utcDayMapping.indexOf(day);
    if (idx !== -1) {
      counts[idx] += 1;
    }
  });

  const maxCount = Math.max(...counts, 0);

  const weekdayCounts = dayNames.map((name, i) => ({
    day: name,
    dayIndex: i,
    count: counts[i],
    isBest: counts[i] === maxCount && maxCount > 0
  }));

  // Identify best and weakest day (break ties by day order)
  let bestDay = weekdayCounts[0];
  let weakestDay = weekdayCounts[0];
  weekdayCounts.forEach((d) => {
    if (d.count > bestDay.count) bestDay = d;
    if (d.count < weakestDay.count) weakestDay = d;
  });

  let takeaway = 'No activity recorded over the last 90 days.';
  if (logs90.length > 0) {
    takeaway = `Most active on ${bestDay.day} (${bestDay.count} check-ins); quietest on ${weakestDay.day} (${weakestDay.count} check-ins).`;
  }

  return {
    weekdayCounts,
    takeaway
  };
}

/**
 * 4. Streak race (horizontal bars per habit)
 */
function computeStreakRace(input) {
  const { refToday, habits, logs } = normalizeInputs(input);

  const streaks = habits.map((habit) => {
    const habitLogs = logs.filter((l) => l.habitId === habit.id);
    const dateStrings = Array.from(new Set(habitLogs.map((l) => l.dateStr))).sort();
    const res = computeStreaks(habit, dateStrings, refToday);
    return {
      habitId: habit.id,
      name: habit.name,
      currentStreak: res.current || 0,
      longestStreak: res.longest || 0
    };
  });

  streaks.sort((a, b) => b.currentStreak - a.currentStreak || b.longestStreak - a.longestStreak);

  let takeaway = 'No habits created yet.';
  if (streaks.length > 0) {
    const topActive = streaks.find((s) => s.currentStreak > 0);
    const topLongest = [...streaks].sort((a, b) => b.longestStreak - a.longestStreak)[0];

    if (topActive) {
      takeaway = `"${topActive.name}" is leading the streak race with ${topActive.currentStreak} consecutive days.`;
    } else if (topLongest && topLongest.longestStreak > 0) {
      takeaway = `Longest streak record is ${topLongest.longestStreak} days on "${topLongest.name}".`;
    } else {
      takeaway = 'Start checking in daily to build up streaks!';
    }
  }

  return {
    streaks,
    takeaway
  };
}

/**
 * 5. 30-day completion rings (percent of last 30 days per habit)
 */
function computeLast30(input) {
  const { refToday, habits, logs } = normalizeInputs(input);

  const start30 = addDaysUTC(refToday, -29);
  const start30Ms = start30.getTime();
  const todayMs = refToday.getTime();

  const last30 = habits.map((habit) => {
    const habitLogs = logs.filter((l) => {
      if (l.habitId !== habit.id) return false;
      const t = l.date.getTime();
      return t >= start30Ms && t <= todayMs;
    });

    const doneCount = new Set(habitLogs.map((l) => l.dateStr)).size;
    const percent = Math.round((doneCount / 30) * 100);

    return {
      habitId: habit.id,
      name: habit.name,
      doneCount,
      totalDays: 30,
      percent
    };
  });

  let takeaway = 'No habits tracked in the last 30 days.';
  if (last30.length > 0) {
    const avgPercent = Math.round(
      last30.reduce((sum, h) => sum + h.percent, 0) / last30.length
    );
    const topHabit = [...last30].sort((a, b) => b.percent - a.percent)[0];
    takeaway = `"${topHabit.name}" leads 30-day consistency at ${topHabit.percent}% (average: ${avgPercent}%).`;
  }

  return {
    last30,
    takeaway
  };
}

/**
 * 6. Momentum line (90-day rolling 7-day average of daily completions)
 */
function computeRolling7(input) {
  const { refToday, logs } = normalizeInputs(input);

  // Group log counts by date string
  const countsByDate = {};
  logs.forEach((l) => {
    countsByDate[l.dateStr] = (countsByDate[l.dateStr] || 0) + 1;
  });

  const rolling7 = [];
  const start90 = addDaysUTC(refToday, -89);

  let peakValue = 0;
  let peakDateLabel = '';

  for (let d = 0; d < 90; d++) {
    const currentDate = addDaysUTC(start90, d);
    const currentDateStr = toUTCString(currentDate);

    // Sum completions in [currentDate - 6 days, currentDate] (7 days)
    let sum7 = 0;
    for (let offset = 0; offset < 7; offset++) {
      const windowDate = addDaysUTC(currentDate, -offset);
      const wStr = toUTCString(windowDate);
      sum7 += countsByDate[wStr] || 0;
    }

    const value = Number((sum7 / 7).toFixed(1));
    if (value > peakValue) {
      peakValue = value;
      peakDateLabel = formatMonthDayUTC(currentDate);
    }

    rolling7.push({
      date: currentDateStr,
      value,
      isToday: d === 89
    });
  }

  const todayValue = rolling7[89].value;
  let takeaway = 'No completions recorded in the last 90 days.';
  if (peakValue > 0) {
    takeaway = `Current 7-day momentum is ${todayValue} check-ins/day (peak: ${peakValue} on ${peakDateLabel}).`;
  }

  return {
    rolling7,
    takeaway
  };
}

/**
 * Complete insights overview containing all 6 visualizations
 */
function computeInsightsOverview(input) {
  const todayProgress = computeTodayProgress(input);
  const weeklyTrend = computeWeeklyTrend(input);
  const weekdayPattern = computeWeekdayCounts(input);
  const streakRace = computeStreakRace(input);
  const last30Days = computeLast30(input);
  const momentum = computeRolling7(input);

  return {
    todayDone: todayProgress.todayDone,
    totalHabits: todayProgress.totalHabits,
    weekly: weeklyTrend.weekly,
    weekdayCounts: weekdayPattern.weekdayCounts,
    streaks: streakRace.streaks,
    last30: last30Days.last30,
    rolling7: momentum.rolling7,
    takeaways: {
      today: todayProgress.takeaway,
      weekly: weeklyTrend.takeaway,
      weekday: weekdayPattern.takeaway,
      streaks: streakRace.takeaway,
      last30: last30Days.takeaway,
      momentum: momentum.takeaway
    }
  };
}

module.exports = {
  computeTodayProgress,
  computeWeeklyTrend,
  computeWeekdayCounts,
  computeStreakRace,
  computeLast30,
  computeRolling7,
  computeInsightsOverview
};

