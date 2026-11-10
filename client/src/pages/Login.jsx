import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api';

/**
 * Login Page
 * Controlled form that authenticates the user against MongoDB Atlas via Express API.
 */
const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (errors[name] || errors.form) {
      setErrors((prev) => ({ ...prev, [name]: '', form: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await login({
        email: formData.email.trim(),
        password: formData.password
      });

      // Redirect to Dashboard on successful login
      navigate('/');
    } catch (err) {
      setErrors({ form: err.message || 'Login failed. Please check your credentials.' });
      setIsSubmitting(false);
    }
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

        {errors.form && (
          <div className="alert" style={{ backgroundColor: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b', marginBottom: '1.25rem' }}>
            {errors.form}
          </div>
        )}

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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
