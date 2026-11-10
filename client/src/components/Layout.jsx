import { Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import Navbar from './Navbar';

/**
 * Layout component
 * Renders the persistent navbar and wraps child routes via <Outlet /> or {children}.
 */
const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-container">
        {children ? children : <Outlet />}
      </main>
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node
};

export default Layout;

