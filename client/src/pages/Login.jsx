import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

/**
 * Login Page
 * Controlled form with inline validation (email format, password min length).
 * Sets a dummy session token in localStorage and redirects to Dashboard.
 */
const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate form fields
  const validate = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific error as user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    // Simulate login: store dummy auth token for Phase 1
    localStorage.setItem('token', 'phase1-dummy-session-token');

    // Programmatic redirect to Dashboard
    navigate('/');
  };

  return (
    <div className="form-container">
      <div className="card">
        <div className="text-center" style={{ marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '2rem' }}>🌱</span>
          <h1 className="page-title" style={{ marginTop: '0.5rem' }}>
            Sign In to HabitGraph
          </h1>
          <p className="page-subtitle">Track your consistency and streaks</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              placeholder="student@rvce.edu.in"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={`form-input ${errors.password ? 'input-error' : ''}`}
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center" style={{ marginTop: '1.5rem', fontSize: '0.875rem' }}>
          Don&apos;t have an account?{' '}
          <Link to="/register" style={{ fontWeight: 600 }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
