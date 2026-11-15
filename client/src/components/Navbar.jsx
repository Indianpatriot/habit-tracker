import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

/**
 * Navbar component
 * Navigation bar containing links to Dashboard, Heatmap, Badges, Insights,
 * Add Habit, Profile avatar, Dark/Light mode toggle, and Logout.
 */
const Navbar = () => {
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    const currentAttr = document.documentElement.getAttribute('data-theme');
    if (currentAttr) return currentAttr;
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleUserUpdate = () => {
      try {
        setUser(JSON.parse(localStorage.getItem('user')) || null);
      } catch {
        setUser(null);
      }
    };
    window.addEventListener('user-profile-updated', handleUserUpdate);
    window.addEventListener('storage', handleUserUpdate);
    return () => {
      window.removeEventListener('user-profile-updated', handleUserUpdate);
      window.removeEventListener('storage', handleUserUpdate);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
            to="/badges"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            Badges
          </NavLink>
          <NavLink
            to="/insights"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            Insights
          </NavLink>
          <NavLink
            to="/habits/new"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            + Add Habit
          </NavLink>

          {/* Dark / Light mode toggle */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Current mode: ${theme}`}
          >
            {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>

          {/* User profile avatar linking to /profile */}
          <NavLink
            to="/profile"
            className="nav-avatar-link"
            title="User Profile"
            aria-label="User Profile"
          >
            {user && user.picture ? (
              <img
                src={user.picture}
                alt={user.name || 'User'}
                className="avatar-img"
              />
            ) : (
              <div className="avatar-initials">
                {user && user.name ? user.name.trim().charAt(0).toUpperCase() : 'U'}
              </div>
            )}
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
