// Pure API client layer for Habit Graph Tracker
// Directly connects to Express backend & MongoDB Atlas (Zero mock/sample data)

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
 * Register a new user in MongoDB Atlas
 */
export const register = async ({ name, email, password }) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  const data = await handleResponse(res);
  if (data.token) {
    const user = data.user || data;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({ _id: user._id, name: user.name, email: user.email }));
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
    const user = data.user || data;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({ _id: user._id, name: user.name, email: user.email }));
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
 * Fetch heatmap data from MongoDB Atlas logs (supports 30, 90, 365 days)
 */
export const getHeatmap = async (habitId = null, days = 90) => {
  const params = new URLSearchParams();
  if (habitId) params.set('habitId', habitId);
  if (days) params.set('days', String(days));
  const qs = params.toString();
  const url = `${API_BASE_URL}/api/stats/heatmap${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

/**
 * Fetch real streak & last 30 days statistics for a habit from MongoDB Atlas
 */
export const getStats = async (habitId) => {
  const res = await fetch(`${API_BASE_URL}/api/habits/${habitId}/stats`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

/**
 * Fetch most active and least active habit summary from MongoDB Atlas logs (supports 30, 90, 365 days)
 */
export const getActivitySummary = async (days = 90) => {
  const url = `${API_BASE_URL}/api/stats/activity${days ? `?days=${days}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

/**
 * Fetch streaks ({ current, longest, unit: 'days'|'weeks' }) for a habit
 */
export const getStreaks = async (habitId) => {
  const res = await fetch(`${API_BASE_URL}/api/habits/${habitId}/streaks`, {
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
    body: JSON.stringify(habitData)
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
    body: JSON.stringify(habitData)
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
 * Record a habit completion log for a date in MongoDB Atlas (with optional note)
 */
export const markDone = async (habitId, date, note) => {
  const payload = {};
  if (date) payload.date = date;
  if (note !== undefined && note !== null) payload.note = note;

  const res = await fetch(`${API_BASE_URL}/api/habits/${habitId}/logs`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
};

/**
 * Edit or clear note on an existing check-in log
 */
export const patchLogNote = async (habitId, date, note) => {
  const res = await fetch(`${API_BASE_URL}/api/habits/${habitId}/logs/${date}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ note })
  });
  return handleResponse(res);
};

/**
 * Fetch paginated history of completions and notes for a habit
 */
export const getHabitHistory = async (habitId, page = 1, limit = 10) => {
  const res = await fetch(
    `${API_BASE_URL}/api/habits/${habitId}/history?page=${page}&limit=${limit}`,
    {
      method: 'GET',
      headers: getAuthHeaders()
    }
  );
  return handleResponse(res);
};

/**
 * Delete habit completion log for a date in MongoDB Atlas
 */
export const undoDone = async (habitId, date) => {
  const res = await fetch(`${API_BASE_URL}/api/habits/${habitId}/logs/${date}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

/**
 * Fetch achievement badges for logged-in user (legacy 6 badges)
 */
export const getBadges = async () => {
  const res = await fetch(`${API_BASE_URL}/api/badges`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

/**
 * Fetch all 25 achievement badges for logged-in user from live analytics
 */
export const getAchievements = async () => {
  const res = await fetch(`${API_BASE_URL}/api/stats/achievements`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

/**
 * Fetch overview data and takeaways for all 6 SVG insight charts
 */
export const getInsightsOverview = async () => {
  const res = await fetch(`${API_BASE_URL}/api/stats/insights/overview`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

/**
 * Fetch cross-habit insights (matrix, best pair, keystone, share, dropped together)
 */
export const getCrossInsights = async () => {
  const res = await fetch(`${API_BASE_URL}/api/stats/insights/cross`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

/**
 * Fetch correlation for a pair of habits over a window of days
 */
export const getCorrelation = async (habitAId, habitBId, days = 90) => {
  const res = await fetch(
    `${API_BASE_URL}/api/insights/correlation?a=${encodeURIComponent(habitAId)}&b=${encodeURIComponent(habitBId)}&days=${days}`,
    {
      method: 'GET',
      headers: getAuthHeaders()
    }
  );
  return handleResponse(res);
};

/**
 * Fetch top cross-habit correlations by lift
 */
export const getCorrelations = async (days = 90) => {
  const res = await fetch(`${API_BASE_URL}/api/insights/correlations?days=${days}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

/**
 * Fetch user profile from /api/auth/me
 */
export const getProfile = async () => {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};

/**
 * Update user profile via PUT /api/auth/me
 */
export const updateProfile = async (profileData) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(profileData)
  });
  const data = await handleResponse(res);
  const stored = localStorage.getItem('user');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      localStorage.setItem(
        'user',
        JSON.stringify({
          ...parsed,
          name: data.name,
          email: data.email,
          picture: data.picture || ''
        })
      );
    } catch {
      // ignore JSON parse error
    }
  }
  return data;
};

/**
 * Fetch this week vs last week comparison stats
 */
export const getWeekCompare = async () => {
  const res = await fetch(`${API_BASE_URL}/api/stats/week-compare`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(res);
};
