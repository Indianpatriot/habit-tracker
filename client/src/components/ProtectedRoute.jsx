import { Navigate, Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * ProtectedRoute
 * Guards private routes. If a token is not present in localStorage,
 * it redirects the user to /login.
 */
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Support both nested route <Outlet /> and wrapper <ProtectedRoute>{children}</ProtectedRoute>
  return children ? children : <Outlet />;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node
};

export default ProtectedRoute;

