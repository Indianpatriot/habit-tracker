import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import Heatmap from '../components/Heatmap';
import {
  getHabitById,
  getStats,
  getHeatmap,
  markDone,
  undoDone,
  getHabitHistory,
  patchLogNote
} from '../api';

// Helper to format Date into "YYYY-MM-DD" UTC string
const formatUTCDateString = (d) => {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to format streak values with appropriate unit ("2 weeks", "5 days")
const formatStreakUnit = (value, unit = 'days') => {
  const count = Number(value) || 0;
  if (unit === 'weeks') {
    return count === 1 ? '1 week' : `${count} weeks`;
  }
  return count === 1 ? '1 day' : `${count} days`;
};

/**
 * HabitDetail Page (/habits/:id)
 * Displays habit metadata, streak statistics, configurable activity heatmap (30, 90, 365 days),
 * and server-paginated history with inline note editing.
 */
const HabitDetail = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read range (?days=) and pagination (?page=) from searchParams
  const rawDays = parseInt(searchParams.get('days') || '90', 10);
  const days = [30, 90, 365].includes(rawDays) ? rawDays : 90;

  const rawPage = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const [habit, setHabit] = useState(null);
  const [stats, setStats] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => formatUTCDateString(new Date()));
  const [notification, setNotification] = useState('');
  const [isError, setIsError] = useState(false);

  // History state
  const [history, setHistory] = useState({
    items: [],
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingDate, setEditingDate] = useState(null);
  const [editNoteText, setEditNoteText] = useState('');

  const todayStr = formatUTCDateString(new Date());

  // Load habit metadata, streak stats, and heatmap for the selected range
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      getHabitById(id),
      getStats(id),
      getHeatmap(id, days)
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
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, days]);

  // Load history when id or currentPage changes
  useEffect(() => {
    let isMounted = true;
    setHistoryLoading(true);

    getHabitHistory(id, currentPage, 10)
      .then((res) => {
        if (!isMounted) return;
        setHistory(res);
        setHistoryLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load habit history:', err);
        if (isMounted) setHistoryLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, currentPage]);

  const handleDaysChange = (newDays) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('days', String(newDays));
      return next;
    });
  };

  const handlePageChange = (newPage) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
  };

  // Completion state DERIVED from check-in data for the selected date
  const isDone = (heatmapData.find((item) => item.date === selectedDate)?.count ?? 0) > 0;

  const showNotification = (msg, error = false) => {
    setNotification(msg);
    setIsError(error);
    setTimeout(() => {
      setNotification('');
      setIsError(false);
    }, 3500);
  };

  // Toggle check-in handler with optimistic update and rollback
  const handleToggle = async () => {
    if (!habit) return;

    const prevHeatmapData = heatmapData;
    const targetDate = selectedDate;
    const nextCount = isDone ? 0 : 1;

    // 1. Optimistic update
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
      // Re-fetch stats and history in background to keep data fresh
      getStats(habit._id).then(setStats).catch(() => {});
      getHabitHistory(habit._id, currentPage, 10).then(setHistory).catch(() => {});
    } catch (err) {
      // 3. Roll back on error
      setHeatmapData(prevHeatmapData);
      showNotification(`Failed to update check-in: ${err.message}`, true);
    }
  };

  // Inline note editing handlers
  const handleStartEdit = (item) => {
    setEditingDate(item.date);
    setEditNoteText(item.note || '');
  };

  const handleSaveNote = async (date) => {
    try {
      const trimmed = editNoteText.trim();
      await patchLogNote(id, date, trimmed);
      setHistory((prev) => ({
        ...prev,
        items: prev.items.map((it) => (it.date === date ? { ...it, note: trimmed } : it))
      }));
      setEditingDate(null);
      showNotification(`Note updated for ${date}`);
    } catch (err) {
      showNotification(`Failed to save note: ${err.message}`, true);
    }
  };

  if (loading && !habit) {
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

      {/* Feedback banner */}
      {notification && (
        <div className={`alert ${isError ? 'alert-danger' : 'alert-success'}`} style={{ marginBottom: '1rem' }}>
          {notification}
        </div>
      )}

      {/* Real Stats strip */}
      {stats && (
        <div className="stats-strip">
          <div className="stat-box">
            <div className="stat-value">{formatStreakUnit(stats.currentStreak, stats.unit)} 🔥</div>
            <div className="stat-label">Current Streak</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{formatStreakUnit(stats.longestStreak, stats.unit)} 🏆</div>
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

      {/* Habit-specific Heatmap with Segmented Control Range Selector */}
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
              {days === 365 ? '1-Year' : `${days}-Day`} Habit Streak Graph
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Selected Date: <strong>{selectedDate}</strong> {selectedDate === todayStr ? '(Today)' : ''}
            </span>
          </div>

          <div className="segmented-control" role="group" aria-label="Heatmap range selector">
            <button
              type="button"
              className={`segmented-btn ${days === 30 ? 'active' : ''}`}
              onClick={() => handleDaysChange(30)}
            >
              30 days
            </button>
            <button
              type="button"
              className={`segmented-btn ${days === 90 ? 'active' : ''}`}
              onClick={() => handleDaysChange(90)}
            >
              90 days
            </button>
            <button
              type="button"
              className={`segmented-btn ${days === 365 ? 'active' : ''}`}
              onClick={() => handleDaysChange(365)}
            >
              1 year
            </button>
          </div>
        </div>

        <Heatmap
          data={heatmapData}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </div>

      {/* History & Notes List */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}
        >
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>History & Notes</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {history.total} total check-in{history.total === 1 ? '' : 's'}
          </span>
        </div>

        {historyLoading ? (
          <p className="text-muted" style={{ padding: '1rem 0' }}>Loading history...</p>
        ) : history.items.length === 0 ? (
          <p className="text-muted" style={{ padding: '1rem 0' }}>No check-ins found for this page.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {history.items.map((item) => (
              <div
                key={item.date}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-page)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius)',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '220px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', minWidth: '95px', color: 'var(--text-dark)' }}>
                    {item.date}
                  </span>
                  {editingDate === item.date ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                        maxLength={200}
                        value={editNoteText}
                        onChange={(e) => setEditNoteText(e.target.value)}
                        placeholder="Note (empty to clear)"
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleSaveNote(item.date)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => setEditingDate(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.88rem',
                        color: item.note ? 'var(--text-dark)' : 'var(--text-muted)',
                        fontStyle: item.note ? 'normal' : 'italic'
                      }}
                    >
                      {item.note || 'No note'}
                    </span>
                  )}
                </div>

                {editingDate !== item.date && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    style={{ fontSize: '0.78rem', padding: '0.2rem 0.55rem' }}
                    onClick={() => handleStartEdit(item)}
                  >
                    {item.note ? 'Edit note' : 'Add note'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.25rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid var(--border-color)'
          }}
        >
          <button
            type="button"
            className="btn btn-sm btn-outline"
            disabled={currentPage <= 1 || historyLoading}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            ← Previous
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Page {history.page || currentPage} of {Math.max(history.totalPages || 1, 1)}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            disabled={currentPage >= (history.totalPages || 1) || historyLoading}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default HabitDetail;
