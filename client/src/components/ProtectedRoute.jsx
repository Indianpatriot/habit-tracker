import { Navigate, Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * ProtectedRoute
 * Guards private routes. If a valid token is not present in localStorage,
 * it redirects the user to /login.
 */
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  // Purge any legacy placeholder tokens
  if (token && token.startsWith('phase1-dummy')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node
};

export default ProtectedRoute;
