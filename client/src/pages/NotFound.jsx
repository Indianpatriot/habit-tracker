import { Link } from 'react-router-dom';

/**
 * 404 Not Found Page
 */
const NotFound = () => {
  return (
    <div className="card text-center" style={{ maxWidth: '480px', margin: '4rem auto' }}>
      <h2>404 - Page Not Found</h2>
      <p style={{ margin: '1rem 0' }}>The page you are looking for does not exist.</p>
      <Link to="/" className="btn btn-primary">
        Return to Dashboard
      </Link>
    </div>
  );
};

export default NotFound;

