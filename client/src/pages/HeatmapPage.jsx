import { useState, useEffect } from 'react';
import Heatmap from '../components/Heatmap';
import ActivityHighlights from '../components/ActivityHighlights';
import { getHeatmap, getActivitySummary } from '../api';

/**
 * HeatmapPage (/heatmap)
 * Displays the 90-day activity matrix on the left and Most/Least active highlights on the right.
 * Flex-row layout collapses into a vertical stack below 700px.
 */
const HeatmapPage = () => {
  const [heatmapData, setHeatmapData] = useState([]);
  const [activitySummary, setActivitySummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getHeatmap(), getActivitySummary()])
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
  }, []);

  // Summary statistics across the 90 days
  const totalCompletions = heatmapData.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const activeDays = heatmapData.filter((item) => item.count > 0).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Global Activity Heatmap</h1>
          <p className="page-subtitle">Visualizing your daily habit completions over the past 90 days.</p>
        </div>
      </div>

      {/* Top summary strip */}
      <div className="stats-strip" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-box">
          <div className="stat-value">{totalCompletions}</div>
          <div className="stat-label">Total Check-ins</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{activeDays} / 90</div>
          <div className="stat-label">Active Days</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">
            {heatmapData.length ? Math.round((activeDays / heatmapData.length) * 100) : 0}%
          </div>
          <div className="stat-label">Consistency Rate</div>
        </div>
      </div>

      {/* Main card with flex layout: Heatmap on left, ActivityHighlights on right */}
      <div className="card">
        {loading ? (
          <div className="text-center text-muted" style={{ padding: '2rem' }}>
            Loading heatmap and activity highlights...
          </div>
        ) : (
          <div className="heatmap-layout-row">
            {/* Heatmap column */}
            <div className="heatmap-main-col">
              <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', fontWeight: 600 }}>
                90-Day Contribution Graph
              </h2>
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
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeatmapPage;
