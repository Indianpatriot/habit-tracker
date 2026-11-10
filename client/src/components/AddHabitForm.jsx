import { Component } from 'react';
import PropTypes from 'prop-types';
import { addHabit } from '../api';

/**
 * AddHabitForm - Class Component
 * Manages form state using this.state and this.setState as per course requirement.
 * Performs validation: name required, min 2 characters.
 * Redirects to / on successful creation via this.props.navigate.
 */
class AddHabitForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      error: '',
      isSubmitting: false
    };
  }

  // Handle controlled input changes
  handleInputChange = (e) => {
    this.setState({
      name: e.target.value,
      error: '' // Clear error on change
    });
  };

  // Form submission handler with validation
  handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = this.state.name.trim();

    // Client-side validation: name required, min 2 characters
    if (!trimmedName) {
      this.setState({ error: 'Habit name is required.' });
      return;
    }
    if (trimmedName.length < 2) {
      this.setState({ error: 'Habit name must be at least 2 characters.' });
      return;
    }

    try {
      this.setState({ isSubmitting: true, error: '' });
      await addHabit({ name: trimmedName });

      // Programmatically redirect to dashboard on successful save
      this.props.navigate('/');
    } catch (err) {
      this.setState({
        error: err.message || 'Failed to create habit. Please try again.',
        isSubmitting: false
      });
    }
  };

  render() {
    const { name, error, isSubmitting } = this.state;

    return (
      <form onSubmit={this.handleSubmit} className="form-card" noValidate>
        <div className="form-group">
          <label htmlFor="habitName" className="form-label">
            Habit Name
          </label>
          <input
            id="habitName"
            type="text"
            className={`form-input ${error ? 'input-error' : ''}`}
            placeholder="e.g. Read 20 pages, Morning Jog"
            value={name}
            onChange={this.handleInputChange}
            disabled={isSubmitting}
            autoFocus
          />
          {error && <span className="error-message">{error}</span>}
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Habit'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => this.props.navigate('/')}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }
}

AddHabitForm.propTypes = {
  navigate: PropTypes.func.isRequired
};

export default AddHabitForm;

