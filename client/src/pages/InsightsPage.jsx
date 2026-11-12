import { useState, useEffect } from 'react';
import { getHabits, getCorrelation, getCorrelations } from '../api';

/**
 * InsightsPage (/insights)
 * Explores cross-habit correlation patterns.
 * Computes P(B|A), P(B|~A), and lift ratio across a configurable day window.
 */
const InsightsPage = () => {
  const [habits, setHabits] = useState([]);
  const [habitA, setHabitA] = useState('');
  const [habitB, setHabitB] = useState('');
  const [days, setDays] = useState(90);

  const [correlation, setCorrelation] = useState(null);
  const [topCorrelations, setTopCorrelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCorrelation, setLoadingCorrelation] = useState(false);
  const [error, setError] = useState('');

  // Initial load: habits and top correlations
  useEffect(() => {
    let isMounted = true;

    Promise.all([getHabits(), getCorrelations(days)])
      .then(([habitList, topList]) => {
        if (!isMounted) return;
        const validHabits = Array.isArray(habitList) ? habitList : [];
        setHabits(validHabits);
        setTopCorrelations(Array.isArray(topList) ? topList : []);

        if (validHabits.length >= 2) {
          // If top correlations exist, default to the top correlated pair
          if (Array.isArray(topList) && topList.length > 0 && topList[0].a && topList[0].b) {
            setHabitA(topList[0].a._id);
            setHabitB(topList[0].b._id);
          } else {
            setHabitA(validHabits[0]._id);
            setHabitB(validHabits[1]._id);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load insights data:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load habits for insights.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [days]);

  // Load single pair correlation whenever habitA, habitB, or days change
  useEffect(() => {
    if (!habitA || !habitB || habitA === habitB) {
      setCorrelation(null);
      return;
    }

    let isMounted = true;
    setLoadingCorrelation(true);

    getCorrelation(habitA, habitB, days)
      .then((data) => {
        if (!isMounted) return;
        setCorrelation(data);
        setLoadingCorrelation(false);
      })
      .catch((err) => {
        console.error('Failed to calculate pair correlation:', err);
        if (isMounted) {
          setLoadingCorrelation(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [habitA, habitB, days]);

  const handleSelectPair = (aId, bId) => {
    setHabitA(aId);
    setHabitB(bId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <div className="card text-center text-muted">Analyzing habit cross-correlations...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (habits.length < 2) {
    return (
      <div className="card text-center" style={{ padding: '3rem 1.5rem' }}>
        <h2>At least 2 habits required</h2>
        <p className="page-subtitle" style={{ margin: '1rem 0' }}>
          Cross-habit correlation analyzes relationships between pairs of habits.
          Please create at least two habits to explore insights.
        </p>
      </div>
    );
  }

  const selectedHabitA = habits.find((h) => h._id === habitA);
  const selectedHabitB = habits.find((h) => h._id === habitB);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cross-Habit Insights</h1>
          <p className="page-subtitle">
            Discover behavioral synergies and patterns between your habits.
          </p>
        </div>
        <div>
          <label htmlFor="windowDays" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>
            Window:
          </label>
          <select
            id="windowDays"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="filter-input"
            style={{ width: 'auto', display: 'inline-block', padding: '0.35rem 0.65rem' }}
          >
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
            <option value={180}>Last 180 Days</option>
            <option value={365}>Last 365 Days</option>
          </select>
        </div>
      </div>

      {/* Habit Selectors */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
          Compare Habit Pair
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="habitASelect" className="form-label">
              When I do (Habit A):
            </label>
            <select
              id="habitASelect"
              className="form-input"
              value={habitA}
              onChange={(e) => setHabitA(e.target.value)}
            >
              {habits.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="habitBSelect" className="form-label">
              How often do I also do (Habit B):
            </label>
            <select
              id="habitBSelect"
              className="form-input"
              value={habitB}
              onChange={(e) => setHabitB(e.target.value)}
            >
              {habits.map((h) => (
                <option key={h._id} value={h._id} disabled={h._id === habitA}>
                  {h.name} {h._id === habitA ? '(Select a different habit)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {habitA === habitB && (
          <p className="error-message" style={{ marginTop: '0.5rem' }}>
            Please select two different habits to evaluate correlation.
          </p>
        )}
      </div>

      {/* Sentence Card & Correlation Statistics */}
      {loadingCorrelation ? (
        <div className="card text-center text-muted">Calculating correlation...</div>
      ) : correlation ? (
        <div className="card sentence-card" style={{ marginBottom: '1.75rem' }}>
          {correlation.enough ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <p className="sentence-text">
                  &ldquo;On days you did <strong>{correlation.a?.name || selectedHabitA?.name}</strong>, you also did{' '}
                  <strong>{correlation.b?.name || selectedHabitB?.name}</strong>{' '}
                  <span className="sentence-highlight">{Math.round(correlation.pBgivenA * 100)}%</span> of the time (vs{' '}
                  <span className="sentence-secondary">{Math.round(correlation.pBgivenNotA * 100)}%</span> on other days).&rdquo;
                </p>

                {correlation.lift !== null && (
                  <span className={`lift-badge ${correlation.lift >= 1 ? 'lift-positive' : 'lift-negative'}`}>
                    Lift: {correlation.lift.toFixed(2)}x
                  </span>
                )}
              </div>

              <div className="stats-strip" style={{ marginTop: '1.25rem' }}>
                <div className="stat-box">
                  <div className="stat-value">{Math.round(correlation.pBgivenA * 100)}%</div>
                  <div className="stat-label">P({selectedHabitB?.name} | {selectedHabitA?.name})</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">{Math.round(correlation.pBgivenNotA * 100)}%</div>
                  <div className="stat-label">P({selectedHabitB?.name} | No {selectedHabitA?.name})</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">{correlation.both} days</div>
                  <div className="stat-label">Both Done Together</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">{correlation.daysA} / {correlation.days}</div>
                  <div className="stat-label">{selectedHabitA?.name} Days</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '0.5rem 0' }}>
              <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', backgroundColor: '#f3f4f6', borderRadius: '4px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Not enough data yet
              </div>
              <p className="page-subtitle">
                Needs at least 10 completed days and 10 non-completed days for{' '}
                <strong>{selectedHabitA?.name}</strong> in the {correlation.days}-day window to establish statistical significance.
                (Currently: {correlation.daysA} completed, {correlation.days - correlation.daysA} missed).
              </p>
            </div>
          )}
        </div>
      ) : null}

      {/* Top Correlations List */}
      <div className="card">
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem' }}>
          Top Correlated Habits (Highest Lift)
        </h2>

        {topCorrelations && topCorrelations.length > 0 ? (
          <div className="top-correlations-list">
            {topCorrelations.map((pair, idx) => {
              const isSelected = pair.a?._id === habitA && pair.b?._id === habitB;
              return (
                <div
                  key={`${pair.a?._id}-${pair.b?._id}-${idx}`}
                  className={`correlation-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectPair(pair.a?._id, pair.b?._id)}
                  style={{ cursor: 'pointer' }}
                  title="Click to view full pair comparison"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="correlation-rank">#{idx + 1}</span>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                        {pair.a?.name} &rarr; {pair.b?.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Done together {pair.both} days ({Math.round(pair.pBgivenA * 100)}% vs{' '}
                        {Math.round(pair.pBgivenNotA * 100)}%)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {pair.enough ? (
                      <span className="lift-pill">
                        {pair.lift ? `${pair.lift.toFixed(2)}x lift` : 'N/A'}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Low sample
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="page-subtitle">
            No strong correlations found yet in the current time window. Continue tracking your habits!
          </p>
        )}
      </div>

      {/* Footnote */}
      <p
        className="footnote"
        style={{
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
          marginTop: '2rem'
        }}
      >
        Correlation is not causation.
      </p>
    </div>
  );
};

export default InsightsPage;
