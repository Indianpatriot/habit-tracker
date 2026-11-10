// Sample data layer for Phase 1
// Each habit has its own deterministic 90-day completion log ending today.
// The overall heatmap count for each day equals the exact sum of habit completions on that day.

export const habits = [
  { _id: '1', name: 'Exercise', createdAt: '2026-08-15T00:00:00.000Z' },
  { _id: '2', name: 'Read', createdAt: '2026-08-20T00:00:00.000Z' },
  { _id: '3', name: 'Meditate', createdAt: '2026-09-01T00:00:00.000Z' },
  { _id: '4', name: 'Drink Water (3L)', createdAt: '2026-09-10T00:00:00.000Z' },
  { _id: '5', name: 'Code & Learn', createdAt: '2026-09-15T00:00:00.000Z' }
];

// Helper to format a Date into "YYYY-MM-DD" in local time
const formatDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Generates 90-day per-habit completion matrix ending today
const generate90DayData = () => {
  const today = new Date();
  const perHabitLogs = { '1': [], '2': [], '3': [], '4': [], '5': [] };
  const overallHeatmap = [];

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = formatDateString(d);
    const dayIndex = 89 - i; // 0 to 89

    // Deliberate rest days (zero completions)
    if (dayIndex === 10 || dayIndex === 25 || dayIndex === 55 || dayIndex === 72) {
      overallHeatmap.push({ date: dateStr, count: 0 });
      Object.keys(perHabitLogs).forEach((id) => perHabitLogs[id].push(0));
      continue;
    }

    // Individual habit patterns across the 90 days
    const h4 = (dayIndex % 7 !== 2); // Drink Water: highly consistent (approx 74 completions)
    const h1 = (dayIndex % 4 !== 0) && (dayIndex > 5); // Exercise: frequent (approx 60 completions)
    const h5 = (dayIndex % 3 !== 1) && (dayIndex > 8); // Code: consistent (approx 53 completions)
    const h2 = (dayIndex % 2 === 0) && (dayIndex % 6 !== 0); // Read: moderate (approx 29 completions)
    const h3 = (dayIndex % 5 === 0) || (dayIndex >= 84); // Meditate: occasional with recent streak (approx 19 completions)

    // Build day list and cap daily total to maximum 4
    const active = [
      { id: '4', done: h4 },
      { id: '1', done: h1 },
      { id: '5', done: h5 },
      { id: '2', done: h2 },
      { id: '3', done: h3 }
    ];

    const completed = active.filter((item) => item.done);
    if (completed.length > 4) {
      completed.pop(); // Ensure daily count is in range 0-4
    }

    const completedIds = new Set(completed.map((item) => item.id));

    // Record per-habit daily boolean (1 or 0)
    Object.keys(perHabitLogs).forEach((id) => {
      perHabitLogs[id].push(completedIds.has(id) ? 1 : 0);
    });

    // The overall heatmap count equals the sum across habits for this date
    overallHeatmap.push({
      date: dateStr,
      count: completedIds.size
    });
  }

  return { perHabitLogs, overallHeatmap };
};

const { perHabitLogs, overallHeatmap } = generate90DayData();

// Exported 90-day heatmap (sum across habits per day)
export const heatmap = overallHeatmap;

/**
 * Returns completion count for each habit over the 90 days
 * Shape: { [habitId]: count }
 */
export const habitCounts = (habitsList) => {
  const counts = {};
  if (!habitsList || habitsList.length === 0) return counts;

  habitsList.forEach((h) => {
    const logs = perHabitLogs[h._id];
    if (logs) {
      counts[h._id] = logs.reduce((sum, val) => sum + val, 0);
    } else {
      counts[h._id] = 0;
    }
  });

  return counts;
};

// Habit streak and 30-day stats
const habitStatsMap = {
  '1': { currentStreak: 6, longestStreak: 18, last30: { done: 24, percent: 80 } },
  '2': { currentStreak: 3, longestStreak: 12, last30: { done: 18, percent: 60 } },
  '3': { currentStreak: 6, longestStreak: 9,  last30: { done: 14, percent: 47 } },
  '4': { currentStreak: 14, longestStreak: 25, last30: { done: 28, percent: 93 } },
  '5': { currentStreak: 8, longestStreak: 15, last30: { done: 22, percent: 73 } }
};

export const stats = (habitId) => {
  if (habitId && habitStatsMap[habitId]) {
    return habitStatsMap[habitId];
  }
  return {
    currentStreak: 4,
    longestStreak: 10,
    last30: { done: 15, percent: 50 }
  };
};

// Habit-specific 90-day heatmap (binary completion 0 or 1)
export const getHabitSpecificHeatmap = (habitId) => {
  const logs = perHabitLogs[habitId];
  if (logs) {
    return overallHeatmap.map((item, idx) => ({
      date: item.date,
      count: logs[idx] || 0
    }));
  }
  return overallHeatmap.map((item) => ({
    date: item.date,
    count: 0
  }));
};
