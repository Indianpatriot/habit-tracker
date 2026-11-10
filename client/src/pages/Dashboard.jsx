import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import HabitCard from '../components/HabitCard';
import { getHabits, markDone, undoDone } from '../api';

/**
 * Dashboard Page (/)
 * Lists all habits from MongoDB Atlas with a filter box bound to URL query string (?q=).
 * Implements child-to-parent communication via onMarkDone and onUndo callbacks passed to HabitCard.
 */
const Dashboard = () => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

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

  // Update URL search params as the user types
  const handleSearchChange = (e) => {
    const val = e.target.value;
    if (val) {
      setSearchParams({ q: val });
    } else {
      setSearchParams({});
    }
  };

  // Helper to format today's date in local YYYY-MM-DD
  const getTodayString = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Child-to-parent callback: mark habit done in MongoDB Atlas
  const handleMarkDone = async (habitId) => {
    try {
      const todayStr = getTodayString();
      await markDone(habitId, todayStr);
      const target = habits.find((h) => h._id === habitId);
      showNotification(`✓ "${target ? target.name : 'Habit'}" marked done for today!`);
    } catch (err) {
      showNotification(`Failed to mark habit: ${err.message}`);
    }
  };

  // Child-to-parent callback: undo completion in MongoDB Atlas
  const handleUndo = async (habitId) => {
    try {
      const todayStr = getTodayString();
      await undoDone(habitId, todayStr);
      const target = habits.find((h) => h._id === habitId);
      showNotification(`↺ Undone completion for "${target ? target.name : 'Habit'}".`);
    } catch (err) {
      showNotification(`Failed to undo habit: ${err.message}`);
    }
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification('');
    }, 3000);
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

      {/* Filter box bound to URL query string */}
      <div className="filter-bar">
        <input
          type="search"
          className="filter-input"
          placeholder="Filter habits by name (?q=)..."
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
