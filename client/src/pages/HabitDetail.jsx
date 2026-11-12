import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Heatmap from '../components/Heatmap';
import { getHabitById, getStats, getHeatmap, markDone, undoDone } from '../api';

// Helper to format Date into "YYYY-MM-DD" UTC string
const formatUTCDateString = (d) => {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * HabitDetail Page (/habits/:id)
 * Displays habit metadata, streak statistics, and 90-day activity heatmap.
 * Mark-done button state is DERIVED directly from check-in data (heatmapData)
 * for the selected date, staying in sync with the heatmap cell and surviving refresh.
 */
const HabitDetail = () => {
  const { id } = useParams();

  const [habit, setHabit] = useState(null);
  const [stats, setStats] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => formatUTCDateString(new Date()));
  const [notification, setNotification] = useState('');
  const [isError, setIsError] = useState(false);

  const todayStr = formatUTCDateString(new Date());

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getHabitById(id),
      getStats(id),
      getHeatmap(id)
    ])
      .then(([habitData, statsData, heatmapResult]) => {
        if (!isMounted) return;
        setHabit(habitData || null);
        setStats(statsData);
        setHeatmapData(Array.isArray(heatmapResult) ? heatmapResult : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load habit details:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Completion state DERIVED from check-in data for the selected date (never a separate boolean)
  const isDone = (heatmapData.find((item) => item.date === selectedDate)?.count ?? 0) > 0;

  const showNotification = (msg, error = false) => {
    setNotification(msg);
    setIsError(error);
    setTimeout(() => {
      setNotification('');
      setIsError(false);
    }, 3500);
  };

  // Optimistic update: toggles check-in immediately, rolls back and shows error on failure
  const handleToggle = async () => {
    if (!habit) return;

    const prevHeatmapData = heatmapData;
    const targetDate = selectedDate;
    const nextCount = isDone ? 0 : 1;

    // 1. Optimistic update: modify heatmap cell count immediately
    setHeatmapData((prev) => {
      const exists = prev.some((c) => c.date === targetDate);
      if (exists) {
        return prev.map((c) => (c.date === targetDate ? { ...c, count: nextCount } : c));
      }
      return [...prev, { date: targetDate, count: nextCount }];
    });

    // 2. Perform API call to sync with MongoDB Atlas
    try {
      if (isDone) {
        await undoDone(habit._id, targetDate);
        showNotification(`↺ Undone completion for ${targetDate}`);
      } else {
        await markDone(habit._id, targetDate);
        showNotification(`✓ Marked done for ${targetDate}!`);
      }
      // Re-fetch stats in background to keep stats strip accurate
      getStats(habit._id).then(setStats).catch(() => {});
    } catch (err) {
      // 3. Roll back immediately on error
      setHeatmapData(prevHeatmapData);
      showNotification(`Failed to update check-in: ${err.message}`, true);
    }
  };

  if (loading) {
    return <div className="card text-center text-muted">Loading habit details from database...</div>;
  }

  if (!habit) {
    return (
      <div className="card text-center">
        <h2>Habit Not Found</h2>
        <p className="page-subtitle" style={{ margin: '1rem 0' }}>
          We could not find the habit you requested.
        </p>
        <Link to="/" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{habit.name}</h1>
          <p className="page-subtitle">
            Created on {habit.createdAt ? new Date(habit.createdAt).toLocaleDateString() : 'N/A'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Color-coded Mark done toggle button */}
          <button
            type="button"
            className={`btn ${isDone ? 'btn-done' : 'btn-outline'}`}
            aria-pressed={isDone ? 'true' : 'false'}
            onClick={handleToggle}
            title={isDone ? `Undo completion for ${selectedDate}` : `Mark done for ${selectedDate}`}
          >
            {isDone ? (
              <>
                <span className="btn-done-text">Done ✓</span>
                <span className="btn-undo-text">Undo</span>
              </>
            ) : (
              'Mark done'
            )}
          </button>

          <Link to={`/habits/${habit._id}/edit`} className="btn btn-outline">
            Edit Habit
          </Link>
          <Link to="/" className="btn btn-secondary">
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* Feedback banner (optimistic update rollback & confirmations) */}
      {notification && (
        <div className={`alert ${isError ? 'alert-danger' : 'alert-success'}`} style={{ marginBottom: '1rem' }}>
          {notification}
        </div>
      )}

      {/* Real Stats strip */}
      {stats && (
        <div className="stats-strip">
          <div className="stat-box">
            <div className="stat-value">{stats.currentStreak} 🔥</div>
            <div className="stat-label">Current Streak</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{stats.longestStreak} 🏆</div>
            <div className="stat-label">Longest Streak</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{stats.last30?.done || 0} / 30</div>
            <div className="stat-label">Last 30 Days Done</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{stats.last30?.percent || 0}%</div>
            <div className="stat-label">30-Day Completion</div>
          </div>
        </div>
      )}

      {/* Habit-specific Heatmap */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
            90-Day Habit Streak Graph
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Selected Date: <strong>{selectedDate}</strong> {selectedDate === todayStr ? '(Today)' : ''}
          </span>
        </div>
        <Heatmap
          data={heatmapData}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </div>
    </div>
  );
};

export default HabitDetail;
