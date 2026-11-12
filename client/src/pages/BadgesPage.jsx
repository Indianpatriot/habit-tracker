import { useState, useEffect } from 'react';
import { getBadges } from '../api';

const BADGE_ICONS = {
  first_checkin: '🌱',
  streak_7_days: '🔥',
  streak_30_days: '🏆',
  streak_4_weeks: '⭐',
  checkins_100: '💯',
  comeback: '🔄'
};

/**
 * BadgesPage (/badges)
 * Displays achievement badges computed from MongoDB Atlas logs.
 * Earned badges are highlighted with the date earned;
 * locked badges are greyed out with a dynamic progress bar.
 */
const BadgesPage = () => {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    getBadges()
      .then((data) => {
        if (!isMounted) return;
        setBadges(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load badges:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load badges');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <div className="card text-center text-muted">Loading achievement badges...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Achievement Badges</h1>
          <p className="page-subtitle">
            Unlocked {earnedCount} of {badges.length} badges based on your consistency.
          </p>
        </div>
      </div>

      <div className="badges-grid">
        {badges.map((badge) => {
          const icon = BADGE_ICONS[badge.key] || '🎖️';
          const percent = Math.min(100, Math.round(((badge.progress || 0) / (badge.target || 1)) * 100));

          return (
            <div
              key={badge.key}
              className={`badge-card ${badge.earned ? 'earned' : 'locked'}`}
            >
              <div className="badge-icon-wrapper">
                <span className="badge-icon">{icon}</span>
              </div>

              <div className="badge-content">
                <h3 className="badge-title">{badge.name}</h3>
                <p className="badge-description">{badge.description}</p>

                {badge.earned ? (
                  <div className="badge-status earned">
                    <span className="earned-check">✓</span>
                    <span>Earned {badge.earnedOn ? `on ${badge.earnedOn}` : ''}</span>
                  </div>
                ) : (
                  <div className="badge-progress-wrapper">
                    <div className="badge-progress-text">
                      <span>Progress</span>
                      <span>
                        {badge.progress} / {badge.target}
                      </span>
                    </div>
                    <div className="badge-progress-bar">
                      <div
                        className="badge-progress-fill"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BadgesPage;

