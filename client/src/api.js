// API client layer for Habit Graph Tracker
// Communicates with Express backend connected to MongoDB Atlas

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper to construct authorization headers with stored JWT token
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

// Generic response handler to parse JSON and throw meaningful errors
const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    const errorMsg = data.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }
  return data;
};

/**
 * Register a new user in MongoDB
 */
export const register = async ({ name, email, password }) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  const data = await handleResponse(res);
  if (data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({ _id: data._id, name: data.name, email: data.email }));
  }
  return data;
};

/**
 * Authenticate existing user and store JWT token
 */
export const login = async ({ email, password }) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await handleResponse(res);
  if (data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({ _id: data._id, name: data.name, email: data.email }));
  }
  return data;
};

/**
 * Clear user session
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Fetch all habits for the logged-in user from MongoDB Atlas
 */
export const getHabits = async (query = '') => {
  const url = query
    ? `${API_BASE_URL}/api/habits?q=${encodeURIComponent(query)}`
    : `${API_BASE_URL}/api/habits`;

  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

/**
 * Fetch single habit by ID
 */
export const getHabitById = async (id) => {
  const res = await fetch(`${API_BASE_URL}/api/habits/${id}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

/**
 * Fetch 90-day heatmap data from MongoDB logs
 */
export const getHeatmap = async (habitId = null) => {
  const url = habitId
    ? `${API_BASE_URL}/api/logs/heatmap?habitId=${encodeURIComponent(habitId)}`
    : `${API_BASE_URL}/api/logs/heatmap`;

  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

/**
 * Fetch real streak & last 30 days statistics for a habit
 */
export const getStats = async (habitId) => {
  const res = await fetch(`${API_BASE_URL}/api/habits/${habitId}/stats`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

/**
 * Create a new habit in MongoDB Atlas
 */
export const addHabit = async (habitData) => {
  const res = await fetch(`${API_BASE_URL}/api/habits`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name: habitData.name })
  });
  return handleResponse(res);
};

/**
 * Update habit in MongoDB Atlas
 */
export const updateHabit = async (id, habitData) => {
  const res = await fetch(`${API_BASE_URL}/api/habits/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name: habitData.name })
  });
  return handleResponse(res);
};

/**
 * Delete habit and its logs in MongoDB Atlas
 */
export const deleteHabit = async (id) => {
  const res = await fetch(`${API_BASE_URL}/api/habits/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

/**
 * Record a habit completion log for a date in MongoDB Atlas
 */
export const markDone = async (habitId, date) => {
  const res = await fetch(`${API_BASE_URL}/api/logs`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ habitId, date })
  });
  return handleResponse(res);
};

/**
 * Delete habit completion log for a date in MongoDB Atlas
 */
export const undoDone = async (habitId, date) => {
  const res = await fetch(`${API_BASE_URL}/api/logs/${habitId}?date=${encodeURIComponent(date)}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};
