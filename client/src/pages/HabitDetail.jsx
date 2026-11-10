import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Heatmap from '../components/Heatmap';
import { getHabits, getStats, getHeatmap } from '../api';

/**
 * HabitDetail Page (/habits/:id)
 * Displays habit metadata, streak statistics (current streak, longest streak, last 30 days),
 * and the 90-day activity heatmap filtered for this specific habit.
 */
const HabitDetail = () => {
  const { id } = useParams();

  const [habit, setHabit] = useState(null);
  const [stats, setStats] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getHabits(),
      getStats(id),
      getHeatmap(id)
    ]).then(([habits, statsData, heatmapResult]) => {
      if (!isMounted) return;
      const found = habits.find((h) => h._id === String(id));
      setHabit(found || null);
      setStats(statsData);
      setHeatmapData(heatmapResult);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return <div className="card text-center text-muted">Loading habit details...</div>;
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to={`/habits/${habit._id}/edit`} className="btn btn-outline">
            Edit Habit
          </Link>
          <Link to="/" className="btn btn-secondary">
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* Stats strip */}
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
        <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', fontWeight: 600 }}>
          90-Day Habit Streak Graph
        </h2>
        <Heatmap data={heatmapData} />
      </div>
    </div>
  );
};

export default HabitDetail;
