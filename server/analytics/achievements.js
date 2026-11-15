const { computeStreaks, toUTCString, toUTCMidnightDate } = require('../src/services/streaks');

/**
 * Pure helper to compute exactly 25 achievement badges.
 *
 * Input:
 *   { today, habits: [{ id, name, createdAt, goalType, weekdays, targetPerWeek }], logs: [{ habitId, date }] }
 *
 * Output:
 *   {
 *     unlockedCount: number,
 *     total: 25,
 *     badges: [
 *       { id, name, description, category, tier, emoji, unlocked, progress: { current, target } }
 *     ]
 *   }
 */
function computeAchievements({ today = new Date(), habits = [], logs = [] }) {
  // 1. Normalize today to UTC midnight
  const refToday = today instanceof Date ? today : new Date(today);
  const refTodayMidnight = new Date(
    Date.UTC(refToday.getUTCFullYear(), refToday.getUTCMonth(), refToday.getUTCDate(), 0, 0, 0, 0)
  );
  const refTodayStr = toUTCString(refTodayMidnight);

  // 2. Normalize habits
  const normalizedHabits = (habits || []).map((h) => ({
    id: String(h._id || h.id),
    name: h.name || 'Habit',
    goalType: h.goalType || 'daily',
    weekdays: h.weekdays || [],
    targetPerWeek: h.targetPerWeek || 1,
    createdAt: h.createdAt ? toUTCMidnightDate(h.createdAt) : null
  }));

  // 3. Normalize logs and deduplicate by habitId + dateStr
  const seenLogKey = new Set();
  const normalizedLogs = [];
  (logs || []).forEach((l) => {
    const habitId = String(l.habitId?._id || l.habitId);
    const dateStr = toUTCString(l.date);
    if (!habitId || !dateStr) return;
    const key = `${habitId}_${dateStr}`;
    if (!seenLogKey.has(key)) {
      seenLogKey.add(key);
      normalizedLogs.push({
        habitId,
        dateStr,
        date: toUTCMidnightDate(dateStr)
      });
    }
  });

  normalizedLogs.sort((a, b) => a.date.getTime() - b.date.getTime());

  const totalCompletions = normalizedLogs.length;

  // 4. Index logs by habitId and by dateStr
  const logsByHabit = {};
  const habitsByDate = {};

  normalizedLogs.forEach((l) => {
    if (!logsByHabit[l.habitId]) logsByHabit[l.habitId] = [];
    logsByHabit[l.habitId].push(l);

    if (!habitsByDate[l.dateStr]) habitsByDate[l.dateStr] = new Set();
    habitsByDate[l.dateStr].add(l.habitId);
  });

  // --- STREAK CALCULATIONS ---
  let maxDailyStreak = 0;
  const dailyOrWeekdaysHabits = normalizedHabits.filter(
    (h) => h.goalType === 'daily' || h.goalType === 'weekdays'
  );

  dailyOrWeekdaysHabits.forEach((habit) => {
    const habitLogs = logsByHabit[habit.id] || [];
    const dateStrings = Array.from(new Set(habitLogs.map((l) => l.dateStr))).sort();
    if (dateStrings.length > 0) {
      const streaks = computeStreaks(habit, dateStrings, refTodayMidnight);
      if (streaks.longest > maxDailyStreak) {
        maxDailyStreak = streaks.longest;
      }
    }
  });

  let maxWeeklyStreak = 0;
  const weeklyHabits = normalizedHabits.filter((h) => h.goalType === 'weekly_target');
  weeklyHabits.forEach((habit) => {
    const habitLogs = logsByHabit[habit.id] || [];
    const dateStrings = Array.from(new Set(habitLogs.map((l) => l.dateStr))).sort();
    if (dateStrings.length > 0) {
      const streaks = computeStreaks(habit, dateStrings, refTodayMidnight);
      if (streaks.longest > maxWeeklyStreak) {
        maxWeeklyStreak = streaks.longest;
      }
    }
  });

  // --- COMEBACK (gap >= 7 days on same habit) ---
  let hasComeback = false;
  Object.values(logsByHabit).forEach((habitLogs) => {
    if (hasComeback) return;
    const uniqueDates = Array.from(new Set(habitLogs.map((l) => l.dateStr)))
      .map((dStr) => toUTCMidnightDate(dStr))
      .sort((a, b) => a.getTime() - b.getTime());

    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = uniqueDates[i - 1];
      const curr = uniqueDates[i];
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diffDays >= 7) {
        hasComeback = true;
        break;
      }
    }
  });

  // --- CONSISTENCY: PERFECT DAY & PERFECT WEEK ---
  // A perfect day requires at least 2 habits and every habit completed on that day
  const perfectDaysSet = new Set();
  if (normalizedHabits.length >= 2) {
    Object.entries(habitsByDate).forEach(([dateStr, hSet]) => {
      if (hSet.size === normalizedHabits.length) {
        perfectDaysSet.add(dateStr);
      }
    });
  }

  const hasPerfectDay = perfectDaysSet.size > 0;

  // Perfect week: 7 consecutive calendar days that are each a Perfect Day
  let maxConsecutivePerfectDays = 0;
  if (perfectDaysSet.size >= 7) {
    const sortedPerfectDates = Array.from(perfectDaysSet)
      .map((dStr) => toUTCMidnightDate(dStr))
      .sort((a, b) => a.getTime() - b.getTime());

    let currentRun = 1;
    for (let i = 1; i < sortedPerfectDates.length; i++) {
      const diff = Math.round(
        (sortedPerfectDates[i].getTime() - sortedPerfectDates[i - 1].getTime()) / 86400000
      );
      if (diff === 1) {
        currentRun += 1;
      } else {
        currentRun = 1;
      }
      if (currentRun > maxConsecutivePerfectDays) {
        maxConsecutivePerfectDays = currentRun;
      }
    }
    if (sortedPerfectDates.length > 0 && maxConsecutivePerfectDays === 0) {
      maxConsecutivePerfectDays = 1;
    }
  } else if (perfectDaysSet.size > 0) {
    maxConsecutivePerfectDays = Math.min(perfectDaysSet.size, 1);
  }

  // --- CONSISTENCY: SOLID MONTH (some habit done >= 24 of the last 30 days) ---
  // Window: [today - 29 days, today]
  const last30Start = new Date(refTodayMidnight);
  last30Start.setUTCDate(last30Start.getUTCDate() - 29);
  const last30StartMs = last30Start.getTime();
  const todayMs = refTodayMidnight.getTime();

  let maxCompletionsLast30 = 0;
  normalizedHabits.forEach((habit) => {
    const habitLogs = logsByHabit[habit.id] || [];
    const countIn30 = habitLogs.filter((l) => {
      const t = l.date.getTime();
      return t >= last30StartMs && t <= todayMs;
    }).length;
    if (countIn30 > maxCompletionsLast30) {
      maxCompletionsLast30 = countIn30;
    }
  });

  // --- CONSISTENCY: WEEKEND WARRIOR (completions on >= 8 weekend days in total) ---
  const weekendDates = new Set();
  normalizedLogs.forEach((l) => {
    const day = l.date.getUTCDay();
    if (day === 0 || day === 6) {
      // 0 = Sunday, 6 = Saturday
      weekendDates.add(l.dateStr);
    }
  });
  const weekendCount = weekendDates.size;

  // --- CROSS-HABIT: MULTITASKER (>= 3 different habits done on one day) ---
  let maxHabitsOnAnyDay = 0;
  Object.values(habitsByDate).forEach((hSet) => {
    if (hSet.size > maxHabitsOnAnyDay) {
      maxHabitsOnAnyDay = hSet.size;
    }
  });

  // --- CROSS-HABIT: BALANCED (>= 3 habits & every habit has >= 10 completions in last 90 days) ---
  const last90Start = new Date(refTodayMidnight);
  last90Start.setUTCDate(last90Start.getUTCDate() - 89);
  const last90StartMs = last90Start.getTime();

  const isBalanced =
    normalizedHabits.length >= 3 &&
    normalizedHabits.every((habit) => {
      const habitLogs = logsByHabit[habit.id] || [];
      const countIn90 = habitLogs.filter((l) => {
        const t = l.date.getTime();
        return t >= last90StartMs && t <= todayMs;
      }).length;
      return countIn90 >= 10;
    });

  // --- CROSS-HABIT: VARIETY PACK (>= 4 different habits completed within any 7-day window) ---
  const sortedUniqueDates = Array.from(new Set(normalizedLogs.map((l) => l.dateStr)))
    .map((dStr) => toUTCMidnightDate(dStr))
    .sort((a, b) => a.getTime() - b.getTime());

  let maxDistinctHabitsIn7Days = 0;
  sortedUniqueDates.forEach((startDate) => {
    const startMs = startDate.getTime();
    const endMs = startMs + 6 * 86400000;
    const windowHabits = new Set();
    normalizedLogs.forEach((l) => {
      const t = l.date.getTime();
      if (t >= startMs && t <= endMs) {
        windowHabits.add(l.habitId);
      }
    });
    if (windowHabits.size > maxDistinctHabitsIn7Days) {
      maxDistinctHabitsIn7Days = windowHabits.size;
    }
  });

  // --- TIME: VETERAN (first completion >= 30 days ago and >= 1 completion in last 7 days) ---
  let isVeteran = false;
  if (normalizedLogs.length > 0) {
    const earliestDate = normalizedLogs[0].date;
    const latestDate = normalizedLogs[normalizedLogs.length - 1].date;
    const daysSinceFirst = Math.round((todayMs - earliestDate.getTime()) / 86400000);
    const daysSinceLatest = Math.round((todayMs - latestDate.getTime()) / 86400000);
    if (daysSinceFirst >= 30 && daysSinceLatest <= 7) {
      isVeteran = true;
    }
  }

  // --- TIME: ACTIVE FIFTY & ACTIVE HUNDRED (distinct days with >= 1 completion) ---
  const distinctDaysActive = Object.keys(habitsByDate).length;

  // Build the list of exactly 25 badges
  const badges = [
    // 1. STREAK (6 badges)
    {
      id: 'streak_getting_started',
      name: 'Getting Started',
      description: 'Reach a 3-day streak on any daily or weekdays habit',
      category: 'streak',
      tier: 'bronze',
      emoji: '🌱',
      unlocked: maxDailyStreak >= 3,
      progress: {
        current: Math.min(maxDailyStreak, 3),
        target: 3
      }
    },
    {
      id: 'streak_7_days',
      name: '7-Day Streak',
      description: 'Longest streak >= 7 days on any daily/weekdays habit',
      category: 'streak',
      tier: 'bronze',
      emoji: '🔥',
      unlocked: maxDailyStreak >= 7,
      progress: {
        current: Math.min(maxDailyStreak, 7),
        target: 7
      }
    },
    {
      id: 'streak_14_days',
      name: 'Fortnight Focus',
      description: 'Reach a 14-day streak on any daily or weekdays habit',
      category: 'streak',
      tier: 'silver',
      emoji: '⚡',
      unlocked: maxDailyStreak >= 14,
      progress: {
        current: Math.min(maxDailyStreak, 14),
        target: 14
      }
    },
    {
      id: 'streak_30_days',
      name: '30-Day Streak',
      description: 'Longest streak >= 30 days on any daily/weekdays habit',
      category: 'streak',
      tier: 'silver',
      emoji: '🏆',
      unlocked: maxDailyStreak >= 30,
      progress: {
        current: Math.min(maxDailyStreak, 30),
        target: 30
      }
    },
    {
      id: 'streak_4_weeks',
      name: '4-Week Streak',
      description: 'Longest streak >= 4 weeks on any weekly_target habit',
      category: 'streak',
      tier: 'silver',
      emoji: '⭐',
      unlocked: maxWeeklyStreak >= 4,
      progress: {
        current: Math.min(maxWeeklyStreak, 4),
        target: 4
      }
    },
    {
      id: 'streak_60_days',
      name: 'Unstoppable',
      description: 'Reach a 60-day streak on any daily or weekdays habit',
      category: 'streak',
      tier: 'gold',
      emoji: '🚀',
      unlocked: maxDailyStreak >= 60,
      progress: {
        current: Math.min(maxDailyStreak, 60),
        target: 60
      }
    },

    // 2. VOLUME (5 badges)
    {
      id: 'first_checkin',
      name: 'First Check-in',
      description: 'First check-in ever',
      category: 'volume',
      tier: 'bronze',
      emoji: '🎯',
      unlocked: totalCompletions >= 1,
      progress: {
        current: Math.min(totalCompletions, 1),
        target: 1
      }
    },
    {
      id: 'volume_10',
      name: 'Ten Down',
      description: 'Complete 10 check-ins across all habits',
      category: 'volume',
      tier: 'bronze',
      emoji: '🔟',
      unlocked: totalCompletions >= 10,
      progress: {
        current: Math.min(totalCompletions, 10),
        target: 10
      }
    },
    {
      id: 'volume_50',
      name: 'Half Century',
      description: 'Complete 50 check-ins across all habits',
      category: 'volume',
      tier: 'silver',
      emoji: '🎖️',
      unlocked: totalCompletions >= 50,
      progress: {
        current: Math.min(totalCompletions, 50),
        target: 50
      }
    },
    {
      id: 'checkins_100',
      name: 'Century Club',
      description: '100 total check-ins across all habits',
      category: 'volume',
      tier: 'silver',
      emoji: '💯',
      unlocked: totalCompletions >= 100,
      progress: {
        current: Math.min(totalCompletions, 100),
        target: 100
      }
    },
    {
      id: 'volume_250',
      name: 'Powerhouse',
      description: 'Complete 250 check-ins across all habits',
      category: 'volume',
      tier: 'gold',
      emoji: '👑',
      unlocked: totalCompletions >= 250,
      progress: {
        current: Math.min(totalCompletions, 250),
        target: 250
      }
    },

    // 3. HABITS (3 badges)
    {
      id: 'habits_starter',
      name: 'Habit Starter',
      description: 'Create your first habit',
      category: 'habits',
      tier: 'bronze',
      emoji: '📝',
      unlocked: normalizedHabits.length >= 1,
      progress: {
        current: Math.min(normalizedHabits.length, 1),
        target: 1
      }
    },
    {
      id: 'habits_collector',
      name: 'Habit Collector',
      description: 'Create at least 3 habits',
      category: 'habits',
      tier: 'silver',
      emoji: '📚',
      unlocked: normalizedHabits.length >= 3,
      progress: {
        current: Math.min(normalizedHabits.length, 3),
        target: 3
      }
    },
    {
      id: 'habits_master',
      name: 'Habit Master',
      description: 'Create at least 5 habits',
      category: 'habits',
      tier: 'gold',
      emoji: '🧙',
      unlocked: normalizedHabits.length >= 5,
      progress: {
        current: Math.min(normalizedHabits.length, 5),
        target: 5
      }
    },

    // 4. CONSISTENCY (5 badges)
    {
      id: 'consistency_perfect_day',
      name: 'Perfect Day',
      description: 'Every habit completed on the same day (minimum 2 habits)',
      category: 'consistency',
      tier: 'bronze',
      emoji: '✨',
      unlocked: hasPerfectDay,
      progress: {
        current: hasPerfectDay ? 1 : 0,
        target: 1
      }
    },
    {
      id: 'consistency_perfect_week',
      name: 'Perfect Week',
      description: '7 consecutive Perfect Days',
      category: 'consistency',
      tier: 'gold',
      emoji: '🌟',
      unlocked: maxConsecutivePerfectDays >= 7,
      progress: {
        current: Math.min(maxConsecutivePerfectDays, 7),
        target: 7
      }
    },
    {
      id: 'consistency_solid_month',
      name: 'Solid Month',
      description: 'Some habit completed at least 24 of the last 30 days',
      category: 'consistency',
      tier: 'silver',
      emoji: '📅',
      unlocked: maxCompletionsLast30 >= 24,
      progress: {
        current: Math.min(maxCompletionsLast30, 24),
        target: 24
      }
    },
    {
      id: 'comeback',
      name: 'Comeback',
      description: 'A check-in made after a gap of >= 7 days on the same habit',
      category: 'consistency',
      tier: 'silver',
      emoji: '🔄',
      unlocked: hasComeback,
      progress: {
        current: hasComeback ? 1 : 0,
        target: 1
      }
    },
    {
      id: 'consistency_weekend_warrior',
      name: 'Weekend Warrior',
      description: 'Completions on at least 8 weekend days in total',
      category: 'consistency',
      tier: 'bronze',
      emoji: '🏖️',
      unlocked: weekendCount >= 8,
      progress: {
        current: Math.min(weekendCount, 8),
        target: 8
      }
    },

    // 5. CROSS-HABIT (3 badges)
    {
      id: 'cross_multitasker',
      name: 'Multitasker',
      description: '3 or more different habits completed on one day',
      category: 'cross_habit',
      tier: 'bronze',
      emoji: '🤹',
      unlocked: maxHabitsOnAnyDay >= 3,
      progress: {
        current: Math.min(maxHabitsOnAnyDay, 3),
        target: 3
      }
    },
    {
      id: 'cross_balanced',
      name: 'Balanced',
      description: '3 or more habits and every habit has at least 10 completions in the last 90 days',
      category: 'cross_habit',
      tier: 'silver',
      emoji: '⚖️',
      unlocked: isBalanced,
      progress: {
        current: isBalanced ? 1 : 0,
        target: 1
      }
    },
    {
      id: 'cross_variety_pack',
      name: 'Variety Pack',
      description: '4 or more different habits completed within any 7-day window',
      category: 'cross_habit',
      tier: 'silver',
      emoji: '🎁',
      unlocked: maxDistinctHabitsIn7Days >= 4,
      progress: {
        current: Math.min(maxDistinctHabitsIn7Days, 4),
        target: 4
      }
    },

    // 6. TIME (3 badges)
    {
      id: 'time_veteran',
      name: 'Veteran',
      description: 'First completion at least 30 days ago and at least one completion in the last 7 days',
      category: 'time',
      tier: 'silver',
      emoji: '🎖️',
      unlocked: isVeteran,
      progress: {
        current: isVeteran ? 1 : 0,
        target: 1
      }
    },
    {
      id: 'time_active_50',
      name: 'Active Fifty',
      description: '50 distinct days with at least one completion',
      category: 'time',
      tier: 'silver',
      emoji: '🗓️',
      unlocked: distinctDaysActive >= 50,
      progress: {
        current: Math.min(distinctDaysActive, 50),
        target: 50
      }
    },
    {
      id: 'time_active_100',
      name: 'Active Hundred',
      description: '100 distinct days with at least one completion',
      category: 'time',
      tier: 'gold',
      emoji: '🏛️',
      unlocked: distinctDaysActive >= 100,
      progress: {
        current: Math.min(distinctDaysActive, 100),
        target: 100
      }
    }
  ];

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return {
    unlockedCount,
    total: badges.length,
    badges
  };
}

module.exports = {
  computeAchievements
};
