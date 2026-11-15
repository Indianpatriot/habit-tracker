import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Heatmap from '../components/Heatmap';
import ActivityHighlights from '../components/ActivityHighlights';
import { getHeatmap, getActivitySummary } from '../api';

/**
 * HeatmapPage (/heatmap)
 * Displays the activity matrix on the left and Most/Least active highlights on the right.
 * Range selector (30 days | 90 days | 1 year) bound to ?days= in useSearchParams.
 */
const HeatmapPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawDays = parseInt(searchParams.get('days') || '90', 10);
  const days = [30, 90, 365].includes(rawDays) ? rawDays : 90;

  const [heatmapData, setHeatmapData] = useState([]);
  const [activitySummary, setActivitySummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([getHeatmap(null, days), getActivitySummary(days)])
      .then(([heatmap, summary]) => {
        if (!isMounted) return;
        setHeatmapData(heatmap);
        setActivitySummary(summary);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load heatmap data:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [days]);

  const handleDaysChange = (newDays) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('days', String(newDays));
      return next;
    });
  };

  // Summary statistics across the selected range
  const totalCompletions = heatmapData.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const activeDays = heatmapData.filter((item) => item.count > 0).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Global Activity Heatmap</h1>
          <p className="page-subtitle">
            Visualizing your daily habit completions over the past {days === 365 ? '1 year' : `${days} days`}.
          </p>
        </div>
      </div>

      {/* Top summary strip */}
      <div className="stats-strip" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-box">
          <div className="stat-value">{totalCompletions}</div>
          <div className="stat-label">Total Check-ins</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{activeDays} / {days}</div>
          <div className="stat-label">Active Days</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">
            {days ? Math.round((activeDays / days) * 100) : 0}%
          </div>
          <div className="stat-label">Consistency Rate</div>
        </div>
      </div>

      {/* Main card with flex layout: Heatmap on left, ActivityHighlights on right */}
      <div className="card">
        {/* Segmented control selector */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
            {days === 365 ? '1-Year' : `${days}-Day`} Contribution Graph
          </h2>
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

        {loading ? (
          <div className="text-center text-muted" style={{ padding: '2rem' }}>
            Loading heatmap and activity highlights...
          </div>
        ) : (
          <div className="heatmap-layout-row">
            {/* Heatmap column */}
            <div className="heatmap-main-col">
              <Heatmap data={heatmapData} />
            </div>

            {/* Activity Highlights column */}
            <div className="heatmap-side-col">
              <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', fontWeight: 600 }}>
                Activity Highlights
              </h2>
              <ActivityHighlights
                most={activitySummary?.most || null}
                least={activitySummary?.least || null}
                message={activitySummary?.message || null}
                days={days}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeatmapPage;
