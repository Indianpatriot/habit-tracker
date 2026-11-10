import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * HabitCard component
 * Displays habit information and action buttons (Mark Done / Undo / View / Edit).
 * Demonstrates child-to-parent communication via onMarkDone and onUndo callbacks.
 */
const HabitCard = ({ habit, onMarkDone, onUndo }) => {
  // Format creation date for display
  const createdDate = habit.createdAt
    ? new Date(habit.createdAt).toLocaleDateString()
    : 'Recently';

  return (
    <div className="habit-card">
      <div className="habit-info">
        <Link to={`/habits/${habit._id}`} className="habit-name">
          {habit.name}
        </Link>
        <span className="habit-date">Created: {createdDate}</span>
      </div>

      <div className="habit-actions">
        {/* Child-to-parent callbacks */}
        <button
          type="button"
          className="btn btn-sm btn-success"
          onClick={() => onMarkDone(habit._id)}
          title="Mark habit done for today"
        >
          ✓ Mark Done
        </button>

        <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={() => onUndo(habit._id)}
          title="Undo completion for today"
        >
          ↺ Undo
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
    createdAt: PropTypes.string
  }).isRequired,
  onMarkDone: PropTypes.func.isRequired,
  onUndo: PropTypes.func.isRequired
};

export default HabitCard;

