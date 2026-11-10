import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getHabits, updateHabit, deleteHabit } from '../api';

/**
 * EditHabit Page (/habits/:id/edit)
 * Reads :id from route parameters using useParams().
 * Pre-fills form with current habit name and allows updating or deleting with confirmation.
 */
const EditHabit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [habitNotFound, setHabitNotFound] = useState(false);

  // Fetch habit on mount to pre-fill the form
  useEffect(() => {
    let isMounted = true;
    getHabits().then((habits) => {
      if (!isMounted) return;
      const target = habits.find((h) => h._id === String(id));
      if (target) {
        setName(target.name);
      } else {
        setHabitNotFound(true);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [id]);

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

    try {
      setIsSubmitting(true);
      setError('');
      await updateHabit(id, { name: trimmed });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to update habit.');
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this habit? All tracking history will be removed.'
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
            className={`form-input ${error ? 'input-error' : ''}`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            disabled={isSubmitting}
            autoFocus
          />
          {error && <span className="error-message">{error}</span>}
        </div>

        <div className="form-actions" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
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
