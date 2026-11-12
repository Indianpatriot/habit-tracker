import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getHabitById, updateHabit, deleteHabit } from '../api';

const WEEKDAY_NAMES = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' }
];

/**
 * EditHabit Page (/habits/:id/edit)
 * Reads :id from route parameters using useParams().
 * Pre-fills form with current habit from MongoDB Atlas and allows updating goal settings or deleting.
 */
const EditHabit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [goalType, setGoalType] = useState('daily');
  const [targetPerWeek, setTargetPerWeek] = useState(3);
  const [weekdays, setWeekdays] = useState([1, 3, 5]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [habitNotFound, setHabitNotFound] = useState(false);

  // Fetch habit from database on mount to pre-fill the form
  useEffect(() => {
    let isMounted = true;
    getHabitById(id)
      .then((habit) => {
        if (!isMounted) return;
        if (habit) {
          setName(habit.name || '');
          setGoalType(habit.goalType || 'daily');
          if (habit.targetPerWeek) setTargetPerWeek(habit.targetPerWeek);
          if (Array.isArray(habit.weekdays) && habit.weekdays.length > 0) {
            setWeekdays(habit.weekdays);
          }
        } else {
          setHabitNotFound(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load habit:', err);
        if (isMounted) {
          setHabitNotFound(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleWeekdayToggle = (dayNumber) => {
    setWeekdays((prev) => {
      const exists = prev.includes(dayNumber);
      return exists ? prev.filter((d) => d !== dayNumber) : [...prev, dayNumber].sort();
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      setError('Habit name is required.');
      return;
    }
    if (trimmed.length < 2) {
      setError('Habit name must be at least 2 characters.');
      return;
    }

    if (goalType === 'weekly_target') {
      const target = Number(targetPerWeek);
      if (!target || target < 1 || target > 7) {
        setError('Target per week must be between 1 and 7.');
        return;
      }
    }

    if (goalType === 'weekdays' && (!weekdays || weekdays.length === 0)) {
      setError('Please select at least one weekday.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await updateHabit(id, {
        name: trimmed,
        goalType,
        targetPerWeek: goalType === 'weekly_target' ? Number(targetPerWeek) : undefined,
        weekdays: goalType === 'weekdays' ? weekdays : undefined
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to update habit.');
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this habit? All tracking history will be permanently deleted.'
    );
    if (!confirmed) return;

    try {
      setIsSubmitting(true);
      await deleteHabit(id);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to delete habit.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="card text-center text-muted">Loading habit details...</div>;
  }

  if (habitNotFound) {
    return (
      <div className="card text-center">
        <h2>Habit Not Found</h2>
        <p className="page-subtitle" style={{ margin: '1rem 0' }}>
          The requested habit could not be found.
        </p>
        <Link to="/" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: '560px', margin: '1rem auto' }}>
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Edit Habit</h1>
          <p className="page-subtitle">Update habit name or manage habit settings.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="habitName" className="form-label">
            Habit Name
          </label>
          <input
            id="habitName"
            type="text"
            className={`form-input ${error && !name.trim() ? 'input-error' : ''}`}
            placeholder="e.g. Read 20 pages"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            disabled={isSubmitting}
            autoFocus
          />
        </div>

        {/* Goal Type Selector */}
        <div className="form-group">
          <label htmlFor="goalType" className="form-label">
            Goal Type
          </label>
          <select
            id="goalType"
            className="form-input"
            value={goalType}
            onChange={(e) => {
              setGoalType(e.target.value);
              setError('');
            }}
            disabled={isSubmitting}
          >
            <option value="daily">Daily (Every calendar day)</option>
            <option value="weekly_target">Weekly Target (Target days per week)</option>
            <option value="weekdays">Specific Weekdays (Scheduled days)</option>
          </select>
        </div>

        {/* Conditional Target Input for weekly_target */}
        {goalType === 'weekly_target' && (
          <div className="form-group">
            <label htmlFor="targetPerWeek" className="form-label">
              Days per week (1 - 7)
            </label>
            <input
              id="targetPerWeek"
              type="number"
              min="1"
              max="7"
              className="form-input"
              value={targetPerWeek}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setTargetPerWeek(isNaN(val) ? '' : Math.min(Math.max(val, 1), 7));
                setError('');
              }}
              disabled={isSubmitting}
            />
          </div>
        )}

        {/* Conditional Weekdays Checkboxes for weekdays */}
        {goalType === 'weekdays' && (
          <div className="form-group">
            <label className="form-label">Scheduled Weekdays</label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
              {WEEKDAY_NAMES.map(({ day, label }) => {
                const isChecked = weekdays.includes(day);
                return (
                  <label
                    key={day}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleWeekdayToggle(day)}
                      disabled={isSubmitting}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div className="form-actions" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/')}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>

          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={isSubmitting}
          >
            Delete Habit
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditHabit;
