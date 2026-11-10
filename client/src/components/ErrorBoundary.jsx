import { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * ErrorBoundary - Class Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs errors, and displays a friendly fallback UI.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <h2 style={styles.heading}>Something went wrong</h2>
            <p style={styles.message}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button style={styles.button} onClick={this.handleReload}>
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    padding: '1rem',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  card: {
    maxWidth: '480px',
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    textAlign: 'center'
  },
  heading: {
    margin: '0 0 1rem 0',
    color: '#b91c1c',
    fontSize: '1.5rem'
  },
  message: {
    margin: '0 0 1.5rem 0',
    color: '#4b5563',
    fontSize: '0.95rem'
  },
  button: {
    padding: '0.6rem 1.2rem',
    backgroundColor: '#15803d',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '500'
  }
};

export default ErrorBoundary;

