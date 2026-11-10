import PropTypes from 'prop-types';

/**
 * ActivityHighlights component
 * Displays "Most active" and "Least active" habit cards over the last 90 days.
 * Includes prop validation and renders contextual messages when cards are missing.
 */
const ActivityHighlights = ({ most, least, message }) => {
  // Empty state when no habits exist
  if (!most && !least) {
    return (
      <div className="activity-highlights-container">
        <div className="activity-card activity-card-empty">
          <p className="activity-muted-text">{message || 'No habits yet'}</p>
        </div>
      </div>
    );
  }

  return (
    <aside className="activity-highlights-container" aria-label="Habit activity highlights">
      {/* Most active card */}
      {most && (
        <div className="activity-card activity-card-most">
          <h3 className="activity-card-title">Most active</h3>
          <div className="activity-habit-name">{most.name}</div>
          <div className="activity-habit-meta">
            {most.count} completions in the last 90 days
            <span className="activity-badge">{most.percent}%</span>
          </div>
        </div>
      )}

      {/* Least active card OR muted placeholder message */}
      {least ? (
        <div className="activity-card activity-card-least">
          <h3 className="activity-card-title">Least active</h3>
          <div className="activity-habit-name">{least.name}</div>
          <div className="activity-habit-meta">
            {least.count} completions in the last 90 days
            <span className="activity-badge">{least.percent}%</span>
          </div>
        </div>
      ) : (
        message && (
          <div className="activity-card activity-card-placeholder">
            <p className="activity-muted-text">{message}</p>
          </div>
        )
      )}
    </aside>
  );
};

ActivityHighlights.propTypes = {
  most: PropTypes.shape({
    habitId: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    count: PropTypes.number.isRequired,
    percent: PropTypes.number.isRequired
  }),
  least: PropTypes.shape({
    habitId: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    count: PropTypes.number.isRequired,
    percent: PropTypes.number.isRequired
  }),
  message: PropTypes.string
};

export default ActivityHighlights;
