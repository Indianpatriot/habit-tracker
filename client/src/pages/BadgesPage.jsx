import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getAchievements } from '../api';

const CATEGORIES = [
  { id: 'streak', title: 'Streak Milestones', subtitle: 'Consistency runs on individual habits' },
  { id: 'volume', title: 'Check-in Volume', subtitle: 'Total completed repetitions across all habits' },
  { id: 'habits', title: 'Habit Formation', subtitle: 'Expanding and sustaining your routine' },
  { id: 'consistency', title: 'Consistency & Dedication', subtitle: 'Mastering calendar regularity and comebacks' },
  { id: 'cross_habit', title: 'Cross-Habit Synergy', subtitle: 'Balancing and tracking multiple daily routines' },
  { id: 'time', title: 'Time & Longevity', subtitle: 'Long-term dedication over weeks and months' }
];

/**
 * Individual Badge Card component
 */
const BadgeCard = ({ badge }) => {
  const percent = Math.min(
    100,
    Math.round(((badge.progress?.current || 0) / (badge.progress?.target || 1)) * 100)
  );

  return (
    <div className={`badge-card ${badge.unlocked ? 'unlocked' : 'locked'}`}>
      <div className="badge-icon-wrapper">
        <div
          className={`badge-tier-ring ${badge.tier || 'bronze'}`}
          aria-label={`${badge.tier} tier`}
        >
          <span role="img" aria-label={badge.name}>
            {badge.emoji}
          </span>
        </div>
      </div>

      <div className="badge-content">
        <div className="badge-title-row">
          <h3 className="badge-title">{badge.name}</h3>
          <span className={`badge-tier-tag ${badge.tier}`}>{badge.tier}</span>
        </div>

        <p className="badge-description">{badge.description}</p>

        {badge.unlocked ? (
          <div className="badge-status unlocked-label">
            <span className="unlocked-check" aria-hidden="true">✓</span>
            <span>Unlocked</span>
          </div>
        ) : (
          <div className="badge-progress-wrapper">
            <div className="badge-progress-text">
              <span>Progress</span>
              <span>
                {badge.progress?.current} / {badge.progress?.target}
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
};

BadgeCard.propTypes = {
  badge: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    tier: PropTypes.oneOf(['bronze', 'silver', 'gold']).isRequired,
    emoji: PropTypes.string.isRequired,
    unlocked: PropTypes.bool.isRequired,
    progress: PropTypes.shape({
      current: PropTypes.number.isRequired,
      target: PropTypes.number.isRequired
    }).isRequired
  }).isRequired
};

/**
 * BadgesPage (/badges)
 * Displays 25 achievement badges with tier rings, live progress,
 * and category filtering.
 */
const BadgesPage = () => {
  const [badges, setBadges] = useState([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(25);
  const [filter, setFilter] = useState('all'); // 'all' | 'unlocked' | 'locked'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    getAchievements()
      .then((data) => {
        if (!isMounted) return;
        const badgeList = Array.isArray(data.badges) ? data.badges : [];
        setBadges(badgeList);
        setUnlockedCount(data.unlockedCount ?? badgeList.filter((b) => b.unlocked).length);
        setTotalCount(data.total ?? badgeList.length);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load achievements:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load achievements');
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

  // Filter badges based on user selection
  const filteredBadges = badges.filter((b) => {
    if (filter === 'unlocked') return b.unlocked;
    if (filter === 'locked') return !b.unlocked;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Achievement Badges</h1>
          <p className="page-subtitle">
            <strong>{unlockedCount} / {totalCount} unlocked</strong> — Keep tracking your daily routines to earn them all.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="badge-filter-nav" role="tablist" aria-label="Badge filters">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={`badge-filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({badges.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'unlocked'}
          className={`badge-filter-btn ${filter === 'unlocked' ? 'active' : ''}`}
          onClick={() => setFilter('unlocked')}
        >
          Unlocked ({unlockedCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'locked'}
          className={`badge-filter-btn ${filter === 'locked' ? 'active' : ''}`}
          onClick={() => setFilter('locked')}
        >
          Locked ({totalCount - unlockedCount})
        </button>
      </div>

      {/* Badges grouped by category */}
      {CATEGORIES.map((cat) => {
        const catBadges = filteredBadges.filter((b) => b.category === cat.id);
        if (catBadges.length === 0) return null;

        return (
          <section key={cat.id} className="badge-category-section">
            <div className="badge-category-header">
              <h2 className="badge-category-title">{cat.title}</h2>
              <p className="badge-category-subtitle">{cat.subtitle}</p>
            </div>

            <div className="badges-grid">
              {catBadges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          </section>
        );
      })}

      {filteredBadges.length === 0 && (
        <div className="card text-center text-muted" style={{ marginTop: '2rem' }}>
          No badges found matching the selected filter.
        </div>
      )}
    </div>
  );
};

export default BadgesPage;
