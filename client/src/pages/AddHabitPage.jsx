import { useNavigate } from 'react-router-dom';
import AddHabitForm from '../components/AddHabitForm';

/**
 * AddHabitPage
 * Functional route wrapper supplying the `useNavigate` hook to the
 * `AddHabitForm` class component.
 */
const AddHabitPage = () => {
  const navigate = useNavigate();

  return (
    <div className="card" style={{ maxWidth: '560px', margin: '1rem auto' }}>
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Add New Habit</h1>
          <p className="page-subtitle">Track a new daily or recurring habit.</p>
        </div>
      </div>
      <AddHabitForm navigate={navigate} />
    </div>
  );
};

export default AddHabitPage;
