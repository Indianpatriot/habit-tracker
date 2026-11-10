// API client layer for Habit Graph Tracker
//
// NOTE FOR PHASE 2:
// In Phase 2, these mock functions will be swapped with actual fetch() calls
// against the Express backend using import.meta.env.VITE_API_URL and an
// 'Authorization: Bearer <token>' header stored in localStorage.
// The function signatures and return shapes will remain identical.

import { habits, heatmap, stats, getHabitSpecificHeatmap } from './data/sampleData.js';

// Mutable in-memory store so Phase 1 UI interactions (add, edit, delete, mark) work dynamically
let inMemoryHabits = [...habits];
let completedLogs = new Set(); // tracks "habitId_YYYY-MM-DD"

// Small simulated network latency helper (100ms)
const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch all habits for the logged-in user
 * Phase 2: GET ${VITE_API_URL}/api/habits
 */
export const getHabits = async () => {
  await delay();
  return inMemoryHabits.map((h) => ({ ...h }));
};

/**
 * Fetch 90-day heatmap data
 * If habitId is provided, returns binary completion heatmap (0 or 1) for that habit.
 * Otherwise returns overall activity heatmap (0 to 4).
 * Phase 2: GET ${VITE_API_URL}/api/logs/heatmap?habitId=...
 */
export const getHeatmap = async (habitId = null) => {
  await delay();
  if (habitId) {
    return getHabitSpecificHeatmap(habitId);
  }
  return heatmap.map((item) => ({ ...item }));
};

/**
 * Fetch habit statistics (current streak, longest streak, last 30 days)
 * Phase 2: GET ${VITE_API_URL}/api/habits/:id/stats
 */
export const getStats = async (habitId) => {
  await delay();
  return { ...stats(habitId) };
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
  inMemoryHabits.push(newHabit);
  return { ...newHabit };
};

/**
 * Update an existing habit
 * Phase 2: PUT ${VITE_API_URL}/api/habits/:id with body { name }
 */
export const updateHabit = async (id, habitData) => {
  await delay();
  const index = inMemoryHabits.findIndex((h) => h._id === String(id));
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
  inMemoryHabits = inMemoryHabits.filter((h) => h._id !== String(id));
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
