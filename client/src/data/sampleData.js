// Sample data for client-side development in Phase 1
// In Phase 2, this will be replaced with real MongoDB documents from backend APIs

// Initial 5 habits
export let habits = [
  { _id: '1', name: 'Exercise', createdAt: '2026-08-15T00:00:00.000Z' },
  { _id: '2', name: 'Read', createdAt: '2026-08-20T00:00:00.000Z' },
  { _id: '3', name: 'Meditate', createdAt: '2026-09-01T00:00:00.000Z' },
  { _id: '4', name: 'Drink Water (3L)', createdAt: '2026-09-10T00:00:00.000Z' },
  { _id: '5', name: 'Code & Learn', createdAt: '2026-09-15T00:00:00.000Z' }
];

// Helper to format a Date into "YYYY-MM-DD" in local calendar terms
const formatDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Generate 90 days of heatmap entries ending today with deliberate streaks and gaps
const generateHeatmap = () => {
  const items = [];
  const today = new Date();

  // Pattern with deliberate streaks and gaps across 90 days
  // 0 = no activity, 1-4 = activity levels
  const countPattern = [
    1, 2, 0, 3, 2, 4, 1, 0, 0, 2, 3, 4, 2, 1, 0, 3, 4, 3, 2, 0,
    1, 2, 3, 0, 0, 2, 4, 3, 1, 2, 0, 3, 4, 4, 2, 1, 0, 0, 3, 4,
    2, 3, 0, 1, 2, 3, 4, 0, 0, 0, 2, 3, 1, 4, 3, 2, 0, 2, 4, 3,
    1, 2, 0, 3, 4, 2, 1, 0, 2, 3, 4, 3, 2, 0, 1, 3, 4, 4, 3, 2,
    3, 4, 3, 2, 4, 4, 3, 4, 3, 4 // Strong recent streak up to today
  ];

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const patternIndex = 89 - i;
    items.push({
      date: formatDateString(d),
      count: countPattern[patternIndex] || 0
    });
  }

  return items;
};

export const heatmap = generateHeatmap();

// Predefined stats per habit
const habitStatsMap = {
  '1': { currentStreak: 6, longestStreak: 18, last30: { done: 24, percent: 80 } },
  '2': { currentStreak: 3, longestStreak: 12, last30: { done: 18, percent: 60 } },
  '3': { currentStreak: 1, longestStreak: 9, last30: { done: 14, percent: 47 } },
  '4': { currentStreak: 14, longestStreak: 25, last30: { done: 28, percent: 93 } },
  '5': { currentStreak: 8, longestStreak: 15, last30: { done: 22, percent: 73 } }
};

// Returns streak and last-30-day stats for a given habit
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

// Helper for habit-specific heatmap (binary completion 0 or 1)
export const getHabitSpecificHeatmap = (habitId) => {
  const seed = Number(habitId) || 1;
  return heatmap.map((item, index) => {
    // Generate deterministic 0 or 1 based on habitId and day index
    const isDone = (item.count > 0) && ((index + seed) % 3 !== 0);
    return {
      date: item.date,
      count: isDone ? 1 : 0
    };
  });
};

