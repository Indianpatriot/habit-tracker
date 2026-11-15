import { useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * HabitCard component
 * Displays habit information and action buttons (Mark Done toggle / View / Edit).
 * Demonstrates child-to-parent communication via onToggleDone callback.
 * Completion state is DERIVED from check-in data (habit.completedToday) to survive refresh.
 */
const HabitCard = ({ habit, onToggleDone, onMarkDone, onUndo }) => {
  const [note, setNote] = useState('');

  // Format creation date for display
  const createdDate = habit.createdAt
    ? new Date(habit.createdAt).toLocaleDateString()
    : 'Recently';

  // Completion state derived from check-in data
  const isDone = Boolean(habit.completedToday);

  // Toggle handler with fallback to onMarkDone / onUndo
  const handleToggle = () => {
    const trimmedNote = note.trim();
    if (onToggleDone) {
      onToggleDone(habit._id, isDone, trimmedNote);
    } else if (isDone && onUndo) {
      onUndo(habit._id);
    } else if (!isDone && onMarkDone) {
      onMarkDone(habit._id, trimmedNote);
    }
    if (!isDone) {
      setNote('');
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
        {/* Optional note input when habit is not done yet */}
        {!isDone && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              type="text"
              className="form-control"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: '130px' }}
              placeholder="Add note..."
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              aria-label={`Optional note for ${habit.name}`}
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: '42px' }}>
              {note.length}/200
            </span>
          </div>
        )}

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
