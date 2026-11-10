import { NavLink, useNavigate } from 'react-router-dom';

/**
 * Navbar component
 * Navigation bar containing links to Dashboard, Heatmap, Add Habit,
 * and a Logout action that clears the session and redirects to /login.
 */
const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear dummy authentication token from localStorage
    localStorage.removeItem('token');
    // Programmatic redirect using useNavigate()
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        <NavLink to="/" className="navbar-brand">
          <span className="brand-icon">🌱</span>
          <span className="brand-name">HabitGraph</span>
        </NavLink>

        <nav className="navbar-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/heatmap"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            Heatmap
          </NavLink>
          <NavLink
            to="/habits/new"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            + Add Habit
          </NavLink>
          <button onClick={handleLogout} className="btn-logout" type="button">
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;

