const mongoose = require('mongoose');
const Habit = require('../../models/Habit');
const Log = require('../../models/Log');
const {
  computeStreaks,
  toUTCString,
  toUTCMidnightDate,
  getMondayUTC
} = require('./streaks');

/**
 * Pure function: computeBadges({ habits, logs })
 * Computes all 6 achievement badges from habits and check-in logs.
 *
 * Badges:
 * - first_checkin: first check-in ever
 * - streak_7_days: longest streak >= 7 days on any daily/weekdays habit
 * - streak_30_days: longest streak >= 30 days on any daily/weekdays habit
 * - streak_4_weeks: longest streak >= 4 weeks on any weekly_target habit
 * - checkins_100: 100 total check-ins across all habits
 * - comeback: a check-in made after a gap of >= 7 days on the same habit
 */
function computeBadges({ habits = [], logs = [] }) {
  // Normalize and sort logs chronologically ascending
  const normalizedLogs = (logs || [])
    .map((l) => ({
      habitId: String(l.habitId?._id || l.habitId),
      date: toUTCMidnightDate(l.date),
      dateStr: toUTCString(l.date)
    }))
    .filter((l) => Boolean(l.habitId) && Boolean(l.dateStr))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const totalCheckins = normalizedLogs.length;

  // 1. first_checkin
  const firstCheckinEarned = totalCheckins >= 1;
  const firstCheckinBadge = {
    key: 'first_checkin',
    name: 'First Check-in',
    description: 'First check-in ever',
    earned: firstCheckinEarned,
    earnedOn: firstCheckinEarned ? normalizedLogs[0].dateStr : null,
    progress: Math.min(totalCheckins, 1),
    target: 1
  };

  // 2. checkins_100 (100 total check-ins)
  const checkins100Earned = totalCheckins >= 100;
  const checkins100Badge = {
    key: 'checkins_100',
    name: 'Century Club',
    description: '100 total check-ins across all habits',
    earned: checkins100Earned,
    earnedOn: checkins100Earned ? normalizedLogs[99].dateStr : null,
    progress: Math.min(totalCheckins, 100),
    target: 100
  };

  // 3. comeback (check-in made after a gap of >= 7 days on the same habit)
  let earliestComebackDate = null;
  const logsByHabit = {};
  normalizedLogs.forEach((l) => {
    if (!logsByHabit[l.habitId]) logsByHabit[l.habitId] = [];
    logsByHabit[l.habitId].push(l);
  });

  Object.values(logsByHabit).forEach((habitLogs) => {
    // Unique dates sorted
    const uniqueDates = Array.from(new Set(habitLogs.map((l) => l.dateStr)))
      .map((dStr) => toUTCMidnightDate(dStr))
      .sort((a, b) => a.getTime() - b.getTime());

    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = uniqueDates[i - 1];
      const curr = uniqueDates[i];
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diffDays >= 7) {
        if (!earliestComebackDate || curr < earliestComebackDate) {
          earliestComebackDate = curr;
        }
      }
    }
  });

  const comebackBadge = {
    key: 'comeback',
    name: 'Comeback',
    description: 'A check-in made after a gap of >= 7 days on the same habit',
    earned: Boolean(earliestComebackDate),
    earnedOn: earliestComebackDate ? toUTCString(earliestComebackDate) : null,
    progress: earliestComebackDate ? 1 : 0,
    target: 1
  };

  // 4. Streak badges: streak_7_days, streak_30_days (daily or weekdays habits)
  let maxDailyWeekdaysStreak = 0;
  let first7DayDate = null;
  let first30DayDate = null;

  const dailyOrWeekdaysHabits = habits.filter(
    (h) => (h.goalType || 'daily') === 'daily' || h.goalType === 'weekdays'
  );

  dailyOrWeekdaysHabits.forEach((habit) => {
    const habitLogs = logsByHabit[String(habit._id)] || [];
    const dateStrings = Array.from(new Set(habitLogs.map((l) => l.dateStr))).sort();

    if (dateStrings.length === 0) return;

    // Use computeStreaks to find habit's overall longest streak
    const habitStreaks = computeStreaks(habit, dateStrings);
    if (habitStreaks.longest > maxDailyWeekdaysStreak) {
      maxDailyWeekdaysStreak = habitStreaks.longest;
    }

    // Determine earnedOn by walking check-ins sequentially
    const scheduledDays = habit.goalType === 'weekdays'
      ? new Set((habit.weekdays || []).map(Number))
      : null;

    let runStreak = 0;
    let prevScheduledDate = null;

    dateStrings.forEach((dStr) => {
      const d = toUTCMidnightDate(dStr);
      if (scheduledDays && !scheduledDays.has(d.getUTCDay())) {
        return; // Skip unscheduled
      }

      if (prevScheduledDate === null) {
        runStreak = 1;
      } else {
        if (habit.goalType === 'weekdays') {
          // Check if any scheduled days were missed between prevScheduledDate and d
          let check = new Date(prevScheduledDate);
          check.setUTCDate(check.getUTCDate() + 1);
          let missedScheduledDay = false;
          while (check < d) {
            if (scheduledDays.has(check.getUTCDay())) {
              missedScheduledDay = true;
              break;
            }
            check.setUTCDate(check.getUTCDate() + 1);
          }
          if (missedScheduledDay) {
            runStreak = 1;
          } else {
            runStreak += 1;
          }
        } else {
          // Daily: consecutive calendar days
          const diffDays = Math.round((d.getTime() - prevScheduledDate.getTime()) / 86400000);
          if (diffDays === 1) {
            runStreak += 1;
          } else {
            runStreak = 1;
          }
        }
      }

      prevScheduledDate = d;

      if (runStreak >= 7 && (!first7DayDate || d < first7DayDate)) {
        first7DayDate = d;
      }
      if (runStreak >= 30 && (!first30DayDate || d < first30DayDate)) {
        first30DayDate = d;
      }
    });
  });

  const streak7Badge = {
    key: 'streak_7_days',
    name: '7-Day Streak',
    description: 'Longest streak >= 7 days on any daily/weekdays habit',
    earned: maxDailyWeekdaysStreak >= 7,
    earnedOn: maxDailyWeekdaysStreak >= 7 && first7DayDate ? toUTCString(first7DayDate) : null,
    progress: Math.min(maxDailyWeekdaysStreak, 7),
    target: 7
  };

  const streak30Badge = {
    key: 'streak_30_days',
    name: '30-Day Streak',
    description: 'Longest streak >= 30 days on any daily/weekdays habit',
    earned: maxDailyWeekdaysStreak >= 30,
    earnedOn: maxDailyWeekdaysStreak >= 30 && first30DayDate ? toUTCString(first30DayDate) : null,
    progress: Math.min(maxDailyWeekdaysStreak, 30),
    target: 30
  };

  // 5. streak_4_weeks (weekly_target habits)
  let maxWeeklyStreak = 0;
  let first4WeeksDate = null;
  const weeklyHabits = habits.filter((h) => h.goalType === 'weekly_target');

  weeklyHabits.forEach((habit) => {
    const habitLogs = logsByHabit[String(habit._id)] || [];
    const dateStrings = Array.from(new Set(habitLogs.map((l) => l.dateStr))).sort();

    if (dateStrings.length === 0) return;

    const habitStreaks = computeStreaks(habit, dateStrings);
    if (habitStreaks.longest > maxWeeklyStreak) {
      maxWeeklyStreak = habitStreaks.longest;
    }

    // Determine earnedOn for 4 consecutive weeks
    const target = Number(habit.targetPerWeek) || 1;
    const weekMap = {};
    dateStrings.forEach((dStr) => {
      const monStr = toUTCString(getMondayUTC(dStr));
      if (!weekMap[monStr]) weekMap[monStr] = [];
      weekMap[monStr].push(dStr);
    });

    const qualifyingWeeks = Object.keys(weekMap)
      .filter((monStr) => weekMap[monStr].length >= target)
      .map((monStr) => ({
        monStr,
        date: toUTCMidnightDate(monStr),
        completionDate: toUTCMidnightDate(weekMap[monStr][target - 1])
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    let runWeekStreak = 0;
    let prevMon = null;

    qualifyingWeeks.forEach((item) => {
      if (prevMon === null) {
        runWeekStreak = 1;
      } else {
        const diffWeeks = Math.round((item.date.getTime() - prevMon.getTime()) / 604800000);
        if (diffWeeks === 1) {
          runWeekStreak += 1;
        } else {
          runWeekStreak = 1;
        }
      }
      prevMon = item.date;

      if (runWeekStreak >= 4 && (!first4WeeksDate || item.completionDate < first4WeeksDate)) {
        first4WeeksDate = item.completionDate;
      }
    });
  });

  const streak4WeeksBadge = {
    key: 'streak_4_weeks',
    name: '4-Week Streak',
    description: 'Longest streak >= 4 weeks on any weekly_target habit',
    earned: maxWeeklyStreak >= 4,
    earnedOn: maxWeeklyStreak >= 4 && first4WeeksDate ? toUTCString(first4WeeksDate) : null,
    progress: Math.min(maxWeeklyStreak, 4),
    target: 4
  };

  return [
    firstCheckinBadge,
    streak7Badge,
    streak30Badge,
    streak4WeeksBadge,
    checkins100Badge,
    comebackBadge
  ];
}

/**
 * Fetch user data from MongoDB and compute badges
 */
async function getBadgesForUser(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const habits = await Habit.find({ userId: userObjectId }).lean();
  const logs = await Log.find({ userId: userObjectId }).sort({ date: 1 }).lean();

  return computeBadges({ habits, logs });
}

module.exports = {
  computeBadges,
  getBadgesForUser
};

