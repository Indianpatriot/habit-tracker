import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * HabitCard component
 * Displays habit information and action buttons (Mark Done toggle / View / Edit).
 * Demonstrates child-to-parent communication via onToggleDone callback.
 * Completion state is DERIVED from check-in data (habit.completedToday) to survive refresh.
 */
const HabitCard = ({ habit, onToggleDone, onMarkDone, onUndo }) => {
  // Format creation date for display
  const createdDate = habit.createdAt
    ? new Date(habit.createdAt).toLocaleDateString()
    : 'Recently';

  // Completion state derived from check-in data
  const isDone = Boolean(habit.completedToday);

  // Toggle handler with fallback to onMarkDone / onUndo
  const handleToggle = () => {
    if (onToggleDone) {
      onToggleDone(habit._id, isDone);
    } else if (isDone && onUndo) {
      onUndo(habit._id);
    } else if (!isDone && onMarkDone) {
      onMarkDone(habit._id);
    }
  };

  return (
    <div className="habit-card">
      <div className="habit-info">
        <Link to={`/habits/${habit._id}`} className="habit-name">
          {habit.name}
        </Link>
        <span className="habit-date">Created: {createdDate}</span>
      </div>

      <div className="habit-actions">
        {/* Color-coded Mark Done / Done toggle button */}
        <button
          type="button"
          className={`btn btn-sm ${isDone ? 'btn-done' : 'btn-outline'}`}
          aria-pressed={isDone ? 'true' : 'false'}
          onClick={handleToggle}
          title={isDone ? 'Click to undo completion for today' : 'Click to mark done for today'}
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

        <Link
          to={`/habits/${habit._id}`}
          className="btn btn-sm btn-secondary"
          title="View habit stats and streak graph"
        >
          Stats
        </Link>

        <Link
          to={`/habits/${habit._id}/edit`}
          className="btn btn-sm btn-outline"
          title="Edit or delete habit"
        >
          Edit
        </Link>
      </div>
    </div>
  );
};

HabitCard.propTypes = {
  habit: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    createdAt: PropTypes.string,
    completedToday: PropTypes.bool
  }).isRequired,
  onToggleDone: PropTypes.func,
  onMarkDone: PropTypes.func,
  onUndo: PropTypes.func
};

export default HabitCard;
