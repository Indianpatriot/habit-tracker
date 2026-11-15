const { toUTCString, toUTCMidnightDate } = require('../src/services/streaks');

// Helper to add days in UTC
const addDaysUTC = (date, n) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

/**
 * Normalizes inputs for cross-habit insights
 */
function normalizeInputs({ today = new Date(), habits = [], logs = [] }) {
  const refToday = today instanceof Date ? today : new Date(today);
  const refTodayMidnight = new Date(
    Date.UTC(refToday.getUTCFullYear(), refToday.getUTCMonth(), refToday.getUTCDate(), 0, 0, 0, 0)
  );

  // Sort habits alphabetically by name for stable tie-breaking and matrix ordering
  const sortedHabits = (habits || [])
    .map((h) => ({
      id: String(h._id || h.id),
      name: (h.name || 'Habit').trim()
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Deduplicate and filter logs
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

  return {
    refToday: refTodayMidnight,
    habits: sortedHabits,
    logs: normalizedLogs
  };
}

/**
 * 1. N by N Co-occurrence Matrix over the last 90 days
 * Cell value = (days both done) / (days either done) [0 to 1]
 * Symmetrical, with diagonal = 1 (or 0 if never completed)
 */
function computePairMatrix(habits, logs90, habitDaysMap) {
  const n = habits.length;
  const values = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        // Diagonal is 1 if habit has at least 1 check-in, else 1 per convention
        values[i][j] = 1;
      } else if (i < j) {
        const setA = habitDaysMap[habits[i].id] || new Set();
        const setB = habitDaysMap[habits[j].id] || new Set();

        let both = 0;
        setA.forEach((d) => {
          if (setB.has(d)) both += 1;
        });

        const union = new Set([...setA, ...setB]);
        const either = union.size;

        const val = either > 0 ? Number((both / either).toFixed(2)) : 0;
        values[i][j] = val;
        values[j][i] = val; // Symmetry
      }
    }
  }

  return {
    habits: habits.map((h) => ({ id: h.id, name: h.name })),
    values
  };
}

/**
 * 2. Best Pair: the two habits most often done together
 */
function computeBestPair(habits, habitDaysMap) {
  if (habits.length < 2) return null;

  let best = null;

  for (let i = 0; i < habits.length; i++) {
    for (let j = i + 1; j < habits.length; j++) {
      const hA = habits[i];
      const hB = habits[j];

      const setA = habitDaysMap[hA.id] || new Set();
      const setB = habitDaysMap[hB.id] || new Set();

      let both = 0;
      setA.forEach((d) => {
        if (setB.has(d)) both += 1;
      });

      const union = new Set([...setA, ...setB]);
      const either = union.size;
      const ratio = either > 0 ? both / either : 0;
      const percent = Math.round(ratio * 100);

      const candidate = {
        habitA: { id: hA.id, name: hA.name },
        habitB: { id: hB.id, name: hB.name },
        bothCount: both,
        eitherCount: either,
        ratio,
        percent,
        sentence: `${hA.name} and ${hB.name} are done together ${percent}% of the time.`
      };

      if (!best) {
        best = candidate;
      } else if (candidate.ratio > best.ratio) {
        best = candidate;
      } else if (candidate.ratio === best.ratio) {
        // Tie-breaker 1: higher both count
        if (candidate.bothCount > best.bothCount) {
          best = candidate;
        } else if (candidate.bothCount === best.bothCount) {
          // Tie-breaker 2: alphabetical by habitA, then habitB
          const compA = candidate.habitA.name.localeCompare(best.habitA.name);
          if (compA < 0 || (compA === 0 && candidate.habitB.name.localeCompare(best.habitB.name) < 0)) {
            best = candidate;
          }
        }
      }
    }
  }

  return best;
}

/**
 * 3. Keystone Habit: the habit whose done-days have the highest average number of OTHER habits completed that day
 */
function computeKeystoneHabit(habits, dateHabitsMap, habitDaysMap) {
  if (habits.length < 2) return null;

  let bestKeystone = null;

  habits.forEach((habit) => {
    const doneDays = habitDaysMap[habit.id] || new Set();
    const dayCount = doneDays.size;

    let totalOtherCompletions = 0;
    doneDays.forEach((dateStr) => {
      const habitsOnDate = dateHabitsMap[dateStr] || new Set();
      // Other habits done that day = (total habits on date) - 1
      totalOtherCompletions += Math.max(habitsOnDate.size - 1, 0);
    });

    const avgOther = dayCount > 0 ? Number((totalOtherCompletions / dayCount).toFixed(1)) : 0;

    const candidate = {
      habit: { id: habit.id, name: habit.name },
      dayCount,
      avgOther,
      sentence: `When you complete ${habit.name}, you average ${avgOther} other habits on the same day.`
    };

    if (!bestKeystone) {
      bestKeystone = candidate;
    } else if (candidate.avgOther > bestKeystone.avgOther) {
      bestKeystone = candidate;
    } else if (candidate.avgOther === bestKeystone.avgOther) {
      // Tie-breaker 1: higher day count
      if (candidate.dayCount > bestKeystone.dayCount) {
        bestKeystone = candidate;
      } else if (candidate.dayCount === bestKeystone.dayCount) {
        // Tie-breaker 2: alphabetical by name
        if (candidate.habit.name.localeCompare(bestKeystone.habit.name) < 0) {
          bestKeystone = candidate;
        }
      }
    }
  });

  return bestKeystone;
}

/**
 * 4. Share of Effort: each habit's share of total completions in the last 90 days
 */
function computeShareOfEffort(habits, habitDaysMap) {
  const counts = habits.map((h) => ({
    habitId: h.id,
    name: h.name,
    count: (habitDaysMap[h.id] || new Set()).size
  }));

  const totalCompletions = counts.reduce((sum, h) => sum + h.count, 0);

  return counts.map((h) => ({
    habitId: h.habitId,
    name: h.name,
    count: h.count,
    percent: totalCompletions > 0 ? Math.round((h.count / totalCompletions) * 100) : 0
  }));
}

/**
 * 5. Dropped Together: the pair most often both missed on the same day
 * (only counting days where at least one other habit was done)
 */
function computeDroppedTogether(habits, dateHabitsMap) {
  if (habits.length < 3) {
    // If only 2 habits exist, when one is missed, the other must be done (since at least one other was done)
    // so they can't both be missed while another habit was done.
    return {
      habitA: habits[0] ? { id: habits[0].id, name: habits[0].name } : null,
      habitB: habits[1] ? { id: habits[1].id, name: habits[1].name } : null,
      missedTogetherCount: 0,
      qualifyingDays: 0,
      percent: 0,
      sentence: 'Track at least 3 habits to identify pairs frequently missed together.'
    };
  }

  // Days where at least one habit was completed
  const activeDates = Object.keys(dateHabitsMap);
  let bestPair = null;

  for (let i = 0; i < habits.length; i++) {
    for (let j = i + 1; j < habits.length; j++) {
      const hA = habits[i];
      const hB = habits[j];

      let missedTogetherCount = 0;
      let qualifyingDays = 0;

      activeDates.forEach((dateStr) => {
        const completedHabits = dateHabitsMap[dateStr];
        // Qualifying day: at least one OTHER habit (not hA and not hB) was completed
        let otherHabitDone = false;
        completedHabits.forEach((id) => {
          if (id !== hA.id && id !== hB.id) {
            otherHabitDone = true;
          }
        });

        if (otherHabitDone) {
          qualifyingDays += 1;
          const aMissed = !completedHabits.has(hA.id);
          const bMissed = !completedHabits.has(hB.id);
          if (aMissed && bMissed) {
            missedTogetherCount += 1;
          }
        }
      });

      const percent = qualifyingDays > 0 ? Math.round((missedTogetherCount / qualifyingDays) * 100) : 0;

      const candidate = {
        habitA: { id: hA.id, name: hA.name },
        habitB: { id: hB.id, name: hB.name },
        missedTogetherCount,
        qualifyingDays,
        percent,
        sentence: `${hA.name} and ${hB.name} are most often missed together (${missedTogetherCount} days).`
      };

      if (!bestPair) {
        bestPair = candidate;
      } else if (candidate.missedTogetherCount > bestPair.missedTogetherCount) {
        bestPair = candidate;
      } else if (candidate.missedTogetherCount === bestPair.missedTogetherCount) {
        // Tie-breaker: alphabetical by habitA name, then habitB name
        const compA = candidate.habitA.name.localeCompare(bestPair.habitA.name);
        if (compA < 0 || (compA === 0 && candidate.habitB.name.localeCompare(bestPair.habitB.name) < 0)) {
          bestPair = candidate;
        }
      }
    }
  }

  return bestPair;
}

/**
 * Main Pure Function: computeCrossInsights({ today, habits, logs })
 */
function computeCrossInsights(input) {
  const { refToday, habits, logs } = normalizeInputs(input);

  // Verification 1: Need at least 2 habits
  if (habits.length < 2) {
    return {
      enough: false,
      message: 'Add at least 2 habits to generate cross-habit insights.',
      matrix: { habits: [], values: [] },
      bestPair: null,
      keystone: null,
      share: [],
      droppedTogether: null
    };
  }

  // Verification 2: Need at least 14 days of data
  // Calculate distinct calendar days with activity in logs
  const allUniqueDates = Array.from(new Set(logs.map((l) => l.dateStr)))
    .map((dStr) => toUTCMidnightDate(dStr))
    .sort((a, b) => a.getTime() - b.getTime());

  let totalDaysSpan = 0;
  if (allUniqueDates.length > 0) {
    const earliest = allUniqueDates[0];
    const latest = allUniqueDates[allUniqueDates.length - 1];
    totalDaysSpan = Math.round((latest.getTime() - earliest.getTime()) / 86400000) + 1;
  }

  if (allUniqueDates.length < 14 && totalDaysSpan < 14) {
    return {
      enough: false,
      message: 'Not enough data yet (requires at least 14 days of tracked data).',
      matrix: { habits: habits.map((h) => ({ id: h.id, name: h.name })), values: [] },
      bestPair: null,
      keystone: null,
      share: [],
      droppedTogether: null
    };
  }

  // Filter logs to last 90 days: [today - 89 days, today]
  const start90 = addDaysUTC(refToday, -89);
  const start90Ms = start90.getTime();
  const todayMs = refToday.getTime();

  const logs90 = logs.filter((l) => {
    const t = l.date.getTime();
    return t >= start90Ms && t <= todayMs;
  });

  // Pre-index maps for O(1) lookups
  const habitDaysMap = {}; // habitId -> Set of dateStr
  const dateHabitsMap = {}; // dateStr -> Set of habitId

  habits.forEach((h) => {
    habitDaysMap[h.id] = new Set();
  });

  logs90.forEach((l) => {
    if (habitDaysMap[l.habitId]) {
      habitDaysMap[l.habitId].add(l.dateStr);
    }
    if (!dateHabitsMap[l.dateStr]) {
      dateHabitsMap[l.dateStr] = new Set();
    }
    dateHabitsMap[l.dateStr].add(l.habitId);
  });

  // Compute all 5 features
  const matrix = computePairMatrix(habits, logs90, habitDaysMap);
  const bestPair = computeBestPair(habits, habitDaysMap);
  const keystone = computeKeystoneHabit(habits, dateHabitsMap, habitDaysMap);
  const share = computeShareOfEffort(habits, habitDaysMap);
  const droppedTogether = computeDroppedTogether(habits, dateHabitsMap);

  return {
    enough: true,
    message: null,
    matrix,
    bestPair,
    keystone,
    share,
    droppedTogether
  };
}

module.exports = {
  computePairMatrix,
  computeBestPair,
  computeKeystoneHabit,
  computeShareOfEffort,
  computeDroppedTogether,
  computeCrossInsights
};
