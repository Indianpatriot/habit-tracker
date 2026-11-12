import { Component } from 'react';
import PropTypes from 'prop-types';
import { addHabit } from '../api';

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
 * AddHabitForm - Class Component
 * Manages form state using this.state and this.setState as per course requirement.
 * Includes goal-type selector with conditional target number input or weekday checkboxes.
 * Redirects to / on successful creation via this.props.navigate.
 */
class AddHabitForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      goalType: 'daily',
      targetPerWeek: 3,
      weekdays: [1, 3, 5], // Default Mon, Wed, Fri
      error: '',
      isSubmitting: false
    };
  }

  // Handle controlled name input
  handleInputChange = (e) => {
    this.setState({
      name: e.target.value,
      error: ''
    });
  };

  // Handle goal type selector change
  handleGoalTypeChange = (e) => {
    this.setState({
      goalType: e.target.value,
      error: ''
    });
  };

  // Handle weekly target number change
  handleTargetChange = (e) => {
    const val = parseInt(e.target.value, 10);
    this.setState({
      targetPerWeek: isNaN(val) ? '' : Math.min(Math.max(val, 1), 7),
      error: ''
    });
  };

  // Handle weekday checkbox toggle
  handleWeekdayToggle = (dayNumber) => {
    this.setState((prevState) => {
      const exists = prevState.weekdays.includes(dayNumber);
      const nextWeekdays = exists
        ? prevState.weekdays.filter((d) => d !== dayNumber)
        : [...prevState.weekdays, dayNumber].sort();
      return { weekdays: nextWeekdays, error: '' };
    });
  };

  // Form submission handler with validation
  handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = this.state.name.trim();

    if (!trimmedName) {
      this.setState({ error: 'Habit name is required.' });
      return;
    }
    if (trimmedName.length < 2) {
      this.setState({ error: 'Habit name must be at least 2 characters.' });
      return;
    }

    const { goalType, targetPerWeek, weekdays } = this.state;

    if (goalType === 'weekly_target') {
      const target = Number(targetPerWeek);
      if (!target || target < 1 || target > 7) {
        this.setState({ error: 'Target per week must be between 1 and 7.' });
        return;
      }
    }

    if (goalType === 'weekdays' && (!weekdays || weekdays.length === 0)) {
      this.setState({ error: 'Please select at least one weekday.' });
      return;
    }

    try {
      this.setState({ isSubmitting: true, error: '' });
      await addHabit({
        name: trimmedName,
        goalType,
        targetPerWeek: goalType === 'weekly_target' ? Number(targetPerWeek) : undefined,
        weekdays: goalType === 'weekdays' ? weekdays : undefined
      });

      this.props.navigate('/');
    } catch (err) {
      this.setState({
        error: err.message || 'Failed to create habit. Please try again.',
        isSubmitting: false
      });
    }
  };

  render() {
    const { name, goalType, targetPerWeek, weekdays, error, isSubmitting } = this.state;

    return (
      <form onSubmit={this.handleSubmit} className="form-card" noValidate>
        <div className="form-group">
          <label htmlFor="habitName" className="form-label">
            Habit Name
          </label>
          <input
            id="habitName"
            type="text"
            className={`form-input ${error && !name.trim() ? 'input-error' : ''}`}
            placeholder="e.g. Read 20 pages, Morning Jog"
            value={name}
            onChange={this.handleInputChange}
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
            onChange={this.handleGoalTypeChange}
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
              onChange={this.handleTargetChange}
              disabled={isSubmitting}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Streak increases for each week you complete at least {targetPerWeek || 3} days.
            </span>
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
                      onChange={() => this.handleWeekdayToggle(day)}
                      disabled={isSubmitting}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
              Only scheduled days count towards your streak. Unscheduled days are skipped.
            </span>
          </div>
        )}

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

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
