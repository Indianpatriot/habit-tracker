import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import HabitCard from '../components/HabitCard';
import { getHabits, markDone, undoDone, getWeekCompare } from '../api';

/**
 * Dashboard Page (/)
 * Lists all habits from MongoDB Atlas with a filter box bound to URL query string (?q=).
 * Features a This Week vs Last Week comparison card at top and optional note check-ins.
 */
const Dashboard = () => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  // This Week vs Last Week comparison state
  const [weekCompare, setWeekCompare] = useState(null);
  const [weekLoading, setWeekLoading] = useState(true);

  // Read ?q= filter from the URL query string
  const searchQuery = searchParams.get('q') || '';

  // Load habits from MongoDB Atlas backend
  useEffect(() => {
    let isMounted = true;

    getHabits(searchQuery)
      .then((data) => {
        if (isMounted) {
          setHabits(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load habits:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [searchQuery]);

  // Load weekly comparison stats
  useEffect(() => {
    let isMounted = true;
    getWeekCompare()
      .then((data) => {
        if (isMounted) {
          setWeekCompare(data);
          setWeekLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load week comparison:', err);
        if (isMounted) setWeekLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update URL search params as the user types
  const handleSearchChange = (e) => {
    const val = e.target.value;
    if (val) {
      setSearchParams({ q: val });
    } else {
      setSearchParams({});
    }
  };

  // Helper to format today's date in local/UTC YYYY-MM-DD
  const getTodayString = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Optimistic toggle check-in handler: updates UI immediately and rolls back on failure
  const handleToggleDone = async (habitId, isCurrentlyDone, note = '') => {
    const todayStr = getTodayString();
    const target = habits.find((h) => h._id === habitId);
    const habitName = target ? target.name : 'Habit';

    // 1. Optimistic update: flip completedToday in state
    setHabits((prev) =>
      prev.map((h) =>
        h._id === habitId ? { ...h, completedToday: !isCurrentlyDone } : h
      )
    );

    // 2. Perform API call to sync with MongoDB Atlas
    try {
      if (isCurrentlyDone) {
        await undoDone(habitId, todayStr);
        showNotification(`↺ Undone completion for "${habitName}".`);
      } else {
        await markDone(habitId, todayStr, note);
        showNotification(`✓ "${habitName}" marked done for today!`);
      }
      // Re-fetch weekly comparison in background
      getWeekCompare().then(setWeekCompare).catch(() => {});
    } catch (err) {
      // 3. Roll back on failure and notify user
      setHabits((prev) =>
        prev.map((h) =>
          h._id === habitId ? { ...h, completedToday: isCurrentlyDone } : h
        )
      );
      showNotification(`Failed to update "${habitName}": ${err.message}`);
    }
  };

  // Backward compatible callbacks
  const handleMarkDone = (habitId) => handleToggleDone(habitId, false);
  const handleUndo = (habitId) => handleToggleDone(habitId, true);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification('');
    }, 3000);
  };

  // Render takeaway indicator for This Week vs Last Week
  const renderWeekTakeaway = () => {
    if (!weekCompare) return null;
    const { thisWeek, lastWeek, delta } = weekCompare;

    if (thisWeek.total === 0 && lastWeek.total === 0) {
      return (
        <div className="week-compare-takeaway">
          <span>ℹ️</span>
          <span>No check-ins recorded for this week or last week yet.</span>
        </div>
      );
    }

    if (lastWeek.total === 0) {
      return (
        <div className="week-compare-takeaway">
          <span>↗ [Arrow Up-Right]</span>
          <span>No data for last week yet ({thisWeek.total} completions this week).</span>
        </div>
      );
    }

    if (delta.total > 0) {
      return (
        <div className="week-compare-takeaway" style={{ color: 'var(--primary)' }}>
          <span>↑ [Arrow Up]</span>
          <span>Up {delta.percent}% on last week (+{delta.total} completions)</span>
        </div>
      );
    }

    if (delta.total < 0) {
      return (
        <div className="week-compare-takeaway" style={{ color: 'var(--danger)' }}>
          <span>↓ [Arrow Down]</span>
          <span>Down {Math.abs(delta.percent)}% on last week ({delta.total} completions)</span>
        </div>
      );
    }

    return (
      <div className="week-compare-takeaway">
        <span>→ [Arrow Right]</span>
        <span>Same as last week ({thisWeek.total} completions)</span>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Habit Dashboard</h1>
          <p className="page-subtitle">Track your daily commitments and consistency.</p>
        </div>
        <Link to="/habits/new" className="btn btn-primary">
          + Add Habit
        </Link>
      </div>

      {/* Feedback banner */}
      {notification && <div className="alert alert-success">{notification}</div>}

      {/* This Week vs Last Week Card (Step 5) */}
      {!weekLoading && weekCompare && (
        <div className="week-compare-card" aria-label="Weekly comparison stats">
          <div className="week-compare-header">
            <h2 className="week-compare-title">Weekly Performance</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Mon–{new Date().toLocaleDateString('en-US', { weekday: 'short' })} vs same days last week
            </span>
          </div>

          <div className="week-compare-grid">
            {/* This Week column */}
            <div className="week-compare-col">
              <div className="week-col-title">This Week ({weekCompare.thisWeek.start} to {weekCompare.thisWeek.end})</div>
              <div className="week-col-stats">
                <span className="week-col-total">{weekCompare.thisWeek.total}</span>
                <span className="week-col-sub">completions ({weekCompare.thisWeek.activeDays} active day{weekCompare.thisWeek.activeDays === 1 ? '' : 's'})</span>
              </div>
              <div className="week-col-best">
                Best habit: <strong>{weekCompare.thisWeek.bestHabit ? `${weekCompare.thisWeek.bestHabit.name} (${weekCompare.thisWeek.bestHabit.count})` : 'None'}</strong>
              </div>
            </div>

            {/* Last Week column */}
            <div className="week-compare-col">
              <div className="week-col-title">Last Week ({weekCompare.lastWeek.start} to {weekCompare.lastWeek.end})</div>
              <div className="week-col-stats">
                <span className="week-col-total">{weekCompare.lastWeek.total}</span>
                <span className="week-col-sub">completions ({weekCompare.lastWeek.activeDays} active day{weekCompare.lastWeek.activeDays === 1 ? '' : 's'})</span>
              </div>
              <div className="week-col-best">
                Best habit: <strong>{weekCompare.lastWeek.bestHabit ? `${weekCompare.lastWeek.bestHabit.name} (${weekCompare.lastWeek.bestHabit.count})` : 'None'}</strong>
              </div>
            </div>
          </div>

          {renderWeekTakeaway()}
        </div>
      )}

      {/* Filter box bound to URL query string */}
      <div className="filter-bar">
        <input
          type="text"
          className="filter-input"
          placeholder="Filter habits by name"
          value={searchQuery}
          onChange={handleSearchChange}
          aria-label="Filter habits by name"
        />
      </div>

      {loading ? (
        <div className="card text-center text-muted">Loading habits from database...</div>
      ) : habits.length > 0 ? (
        <div className="habit-list">
          {habits.map((habit) => (
            <HabitCard
              key={habit._id}
              habit={habit}
              onToggleDone={handleToggleDone}
              onMarkDone={handleMarkDone}
              onUndo={handleUndo}
            />
          ))}
        </div>
      ) : (
        <div className="card text-center" style={{ padding: '3rem 1.5rem' }}>
          {searchQuery ? (
            <div>
              <p className="page-subtitle">No habits matching &quot;{searchQuery}&quot;</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '0.75rem' }}
                onClick={() => setSearchParams({})}
              >
                Clear Filter
              </button>
            </div>
          ) : (
            <div>
              <p className="page-subtitle">No habits found in your database. Start building your streaks!</p>
              <Link to="/habits/new" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Create your first habit
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
