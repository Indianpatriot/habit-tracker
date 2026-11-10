import { useState, useEffect } from 'react';
import Heatmap from '../components/Heatmap';
import { getHeatmap } from '../api';

/**
 * HeatmapPage (/heatmap)
 * Displays the 90-day overall activity graph across all habits.
 */
const HeatmapPage = () => {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getHeatmap().then((data) => {
      if (isMounted) {
        setHeatmapData(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Calculate summary metrics
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

      <div className="card">
        <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', fontWeight: 600 }}>
          90-Day Contribution Graph
        </h2>
        {loading ? (
          <div className="text-center text-muted" style={{ padding: '2rem' }}>
            Loading heatmap...
          </div>
        ) : (
          <Heatmap data={heatmapData} />
        )}
      </div>
    </div>
  );
};

export default HeatmapPage;
