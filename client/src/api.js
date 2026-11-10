// API client layer for Habit Graph Tracker (Phase 1)
// Resolves from sampleData with a small delay.
//
// NOTE FOR PHASE 2:
// In Phase 2, these mock functions will be swapped with actual fetch() calls
// against the Express backend using import.meta.env.VITE_API_URL and an
// 'Authorization: Bearer <token>' header stored in localStorage.
// The function signatures and return shapes will remain identical.

import {
  habits as initialHabits,
  heatmap as sampleHeatmap,
  stats as sampleStats,
  habitCounts,
  getHabitSpecificHeatmap
} from './data/sampleData.js';

// In-memory habits store for dynamic Phase 1 client interaction
let inMemoryHabits = initialHabits.map((h) => ({ ...h }));
let completedLogs = new Set(); // tracks "habitId_YYYY-MM-DD"

// Small simulated latency helper (80ms)
const delay = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reset or override in-memory habits for testing scenarios
 */
export const _setInMemoryHabits = (customHabits) => {
  inMemoryHabits = customHabits ? customHabits.map((h) => ({ ...h })) : initialHabits.map((h) => ({ ...h }));
};

/**
 * Fetch all habits
 * Phase 2: GET ${VITE_API_URL}/api/habits
 */
export const getHabits = async (query = '') => {
  await delay();
  let list = inMemoryHabits.map((h) => ({ ...h }));
  if (query && query.trim()) {
    list = list.filter((h) => h.name.toLowerCase().includes(query.trim().toLowerCase()));
  }
  return list;
};

/**
 * Fetch single habit by ID
 * Phase 2: GET ${VITE_API_URL}/api/habits/:id
 */
export const getHabitById = async (id) => {
  await delay();
  return inMemoryHabits.find((h) => String(h._id) === String(id)) || null;
};

/**
 * Fetch 90-day heatmap data
 * Phase 2: GET ${VITE_API_URL}/api/logs/heatmap?habitId=...
 */
export const getHeatmap = async (habitId = null) => {
  await delay();
  if (habitId) {
    return getHabitSpecificHeatmap(habitId);
  }
  return sampleHeatmap.map((item) => ({ ...item }));
};

/**
 * Fetch habit statistics (current streak, longest streak, last 30 days)
 * Phase 2: GET ${VITE_API_URL}/api/habits/:id/stats
 */
export const getStats = async (habitId) => {
  await delay();
  return { ...sampleStats(habitId) };
};

/**
 * Activity Summary: Most active and Least active habit over the last 90 days.
 *
 * NOTE FOR PHASE 2:
 * In Phase 2, this function will be swapped with a fetch() call to:
 * GET ${VITE_API_URL}/api/logs/activity-summary
 * powered by a MongoDB aggregation pipeline ($match on last 90 days, $group by habitId with count, $sort).
 * Return shape remains exactly identical:
 * {
 *   most:  { habitId, name, count, percent } | null,
 *   least: { habitId, name, count, percent } | null,
 *   message: string | null
 * }
 */
export const getActivitySummary = async () => {
  await delay();

  // If no habits exist, return empty state message
  if (!inMemoryHabits || inMemoryHabits.length === 0) {
    return {
      most: null,
      least: null,
      message: 'No habits yet'
    };
  }

  // Derive 90-day completion counts for each habit
  const countsMap = habitCounts(inMemoryHabits);

  const items = inMemoryHabits.map((h) => {
    const count = countsMap[h._id] !== undefined ? countsMap[h._id] : 0;
    return {
      habitId: String(h._id),
      name: h.name,
      count,
      percent: Math.round((count / 90) * 100)
    };
  });

  // Rule 1: Exactly 1 habit -> show under "Most active", no "Least active"
  if (items.length === 1) {
    return {
      most: items[0],
      least: null,
      message: 'Add more habits to compare'
    };
  }

  // Rule 2: All habits have the same count -> show only "Most active" (alphabetical first)
  const allSameCount = items.every((h) => h.count === items[0].count);
  if (allSameCount) {
    const sortedAlpha = [...items].sort((a, b) => a.name.localeCompare(b.name));
    return {
      most: sortedAlpha[0],
      least: null,
      message: 'All habits are equally active'
    };
  }

  // Rule 3: 2 or more habits with differing counts
  // Break ties alphabetically by name so the result is stable
  const sortedForMost = [...items].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const sortedForLeast = [...items].sort((a, b) => a.count - b.count || a.name.localeCompare(b.name));

  return {
    most: sortedForMost[0],
    least: sortedForLeast[0],
    message: null
  };
};

/**
 * Create a new habit
 * Phase 2: POST ${VITE_API_URL}/api/habits with body { name }
 */
export const addHabit = async (habitData) => {
  await delay();
  const newHabit = {
    _id: String(Date.now()),
    name: habitData.name.trim(),
    createdAt: new Date().toISOString()
  };
  inMemoryHabits.unshift(newHabit);
  return { ...newHabit };
};

/**
 * Update an existing habit
 * Phase 2: PUT ${VITE_API_URL}/api/habits/:id with body { name }
 */
export const updateHabit = async (id, habitData) => {
  await delay();
  const index = inMemoryHabits.findIndex((h) => String(h._id) === String(id));
  if (index === -1) {
    throw new Error('Habit not found');
  }
  inMemoryHabits[index] = {
    ...inMemoryHabits[index],
    name: habitData.name.trim()
  };
  return { ...inMemoryHabits[index] };
};

/**
 * Delete a habit by ID
 * Phase 2: DELETE ${VITE_API_URL}/api/habits/:id
 */
export const deleteHabit = async (id) => {
  await delay();
  inMemoryHabits = inMemoryHabits.filter((h) => String(h._id) !== String(id));
  return { success: true, id };
};

/**
 * Mark a habit as completed for a given date
 * Phase 2: POST ${VITE_API_URL}/api/logs with body { habitId, date }
 */
export const markDone = async (habitId, date) => {
  await delay();
  const key = `${habitId}_${date}`;
  completedLogs.add(key);
  return { success: true, habitId, date };
};

/**
 * Undo completion of a habit for a given date
 * Phase 2: DELETE ${VITE_API_URL}/api/logs/:habitId?date=...
 */
export const undoDone = async (habitId, date) => {
  await delay();
  const key = `${habitId}_${date}`;
  completedLogs.delete(key);
  return { success: true, habitId, date };
};

/**
 * Phase 1 Session Authentication Helpers
 */
export const register = async ({ name, email }) => {
  await delay();
  const dummyUser = { _id: '1', name: name.trim(), email: email.trim(), token: 'phase1-dummy-session-token' };
  localStorage.setItem('token', dummyUser.token);
  localStorage.setItem('user', JSON.stringify(dummyUser));
  return dummyUser;
};

export const login = async ({ email }) => {
  await delay();
  const dummyUser = { _id: '1', name: 'MCA Scholar', email: email.trim(), token: 'phase1-dummy-session-token' };
  localStorage.setItem('token', dummyUser.token);
  localStorage.setItem('user', JSON.stringify(dummyUser));
  return dummyUser;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
