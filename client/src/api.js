// API client layer for Habit Graph Tracker
// Connects to Express + MongoDB Atlas backend with graceful fallback to sampleData
// for offline or standalone Phase 1 evaluation.

import { habits as initialSampleHabits, heatmap as sampleHeatmap, stats as sampleStats, getHabitSpecificHeatmap } from './data/sampleData.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// In-memory store for fallback operations
let inMemoryHabits = [...initialSampleHabits];
let completedLogs = new Set();

const delay = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && !token.startsWith('phase1-dummy') ? { Authorization: `Bearer ${token}` } : {})
  };
};

/**
 * Register user in MongoDB Atlas
 */
export const register = async ({ name, email, password }) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ _id: data._id, name: data.name, email: data.email }));
    }
    return data;
  } catch (err) {
    // If backend not available, generate session token
    if (err.message && err.message.includes('fetch')) {
      const dummyUser = { _id: 'dummy_' + Date.now(), name, email, token: 'phase1-dummy-session-token' };
      localStorage.setItem('token', dummyUser.token);
      localStorage.setItem('user', JSON.stringify(dummyUser));
      return dummyUser;
    }
    throw err;
  }
};

/**
 * Authenticate user via MongoDB Atlas
 */
export const login = async ({ email, password }) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Invalid credentials');
    }
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ _id: data._id, name: data.name, email: data.email }));
    }
    return data;
  } catch (err) {
    if (err.message && err.message.includes('fetch')) {
      const dummyUser = { _id: '1', name: 'Student', email, token: 'phase1-dummy-session-token' };
      localStorage.setItem('token', dummyUser.token);
      localStorage.setItem('user', JSON.stringify(dummyUser));
      return dummyUser;
    }
    throw err;
  }
};

/**
 * Clear user session
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Fetch all habits (from MongoDB Atlas if available, else sampleData)
 */
export const getHabits = async (query = '') => {
  try {
    const url = query
      ? `${API_BASE_URL}/api/habits?q=${encodeURIComponent(query)}`
      : `${API_BASE_URL}/api/habits`;

    const res = await fetch(url, { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch {
    // Fall through to sampleData
  }

  await delay();
  let list = inMemoryHabits.map((h) => ({ ...h }));
  if (query && query.trim()) {
    list = list.filter((h) => h.name.toLowerCase().includes(query.trim().toLowerCase()));
  }
  return list;
};

/**
 * Fetch single habit by ID
 */
export const getHabitById = async (id) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/habits/${id}`, { headers: getAuthHeaders() });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall through to sampleData
  }

  await delay();
  return inMemoryHabits.find((h) => String(h._id) === String(id)) || null;
};

/**
 * Fetch 90-day heatmap data (from MongoDB logs if available, else sampleData)
 */
export const getHeatmap = async (habitId = null) => {
  try {
    const url = habitId
      ? `${API_BASE_URL}/api/logs/heatmap?habitId=${encodeURIComponent(habitId)}`
      : `${API_BASE_URL}/api/logs/heatmap`;

    const res = await fetch(url, { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch {
    // Fall through to sampleData
  }

  await delay();
  if (habitId) {
    return getHabitSpecificHeatmap(habitId);
  }
  return sampleHeatmap.map((item) => ({ ...item }));
};

/**
 * Fetch habit statistics (current streak, longest streak, last 30 days)
 */
export const getStats = async (habitId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/habits/${habitId}/stats`, { headers: getAuthHeaders() });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall through to sampleData
  }

  await delay();
  return { ...sampleStats(habitId) };
};

/**
 * Create a new habit
 */
export const addHabit = async (habitData) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/habits`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: habitData.name })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall through to in-memory
  }

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
 */
export const updateHabit = async (id, habitData) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/habits/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: habitData.name })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall through to in-memory
  }

  await delay();
  const index = inMemoryHabits.findIndex((h) => String(h._id) === String(id));
  if (index !== -1) {
    inMemoryHabits[index] = { ...inMemoryHabits[index], name: habitData.name.trim() };
    return { ...inMemoryHabits[index] };
  }
  return { _id: id, name: habitData.name.trim() };
};

/**
 * Delete habit
 */
export const deleteHabit = async (id) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/habits/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall through to in-memory
  }

  await delay();
  inMemoryHabits = inMemoryHabits.filter((h) => String(h._id) !== String(id));
  return { success: true, id };
};

/**
 * Mark habit as completed for a date
 */
export const markDone = async (habitId, date) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/logs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ habitId, date })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall through to in-memory
  }

  await delay();
  completedLogs.add(`${habitId}_${date}`);
  return { success: true, habitId, date };
};

/**
 * Undo completion of a habit for a date
 */
export const undoDone = async (habitId, date) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/logs/${habitId}?date=${encodeURIComponent(date)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall through to in-memory
  }

  await delay();
  completedLogs.delete(`${habitId}_${date}`);
  return { success: true, habitId, date };
};
