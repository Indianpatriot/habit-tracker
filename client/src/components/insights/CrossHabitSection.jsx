import PropTypes from 'prop-types';

const PALETTE = ['#15803d', '#16a34a', '#22c55e', '#4ade80', '#86efac', '#0d9488', '#0284c7'];

const getMatrixCellColor = (val) => {
  if (val <= 0) return '#f8fafc';
  if (val <= 0.25) return '#dcfce7';
  if (val <= 0.50) return '#86efac';
  if (val <= 0.75) return '#22c55e';
  return '#15803d';
};

/**
 * Habit Pairs Heatmap Matrix Component
 */
const PairsHeatmap = ({ matrix }) => {
  if (!matrix || !matrix.habits || matrix.habits.length === 0) return null;

  const n = matrix.habits.length;
  const cellSize = Math.min(Math.max(Math.floor(280 / n), 36), 60);
  const labelWidth = 90;
  const headerHeight = 70;
  const svgWidth = labelWidth + n * cellSize + 20;
  const svgHeight = headerHeight + n * cellSize + 20;

  return (
    <div className="matrix-card">
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-dark)' }}>
        Habit Pairs Heatmap (90 Days)
      </h3>
      <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
        Co-occurrence ratio: days both habits done divided by days either was done.
      </p>

      <div style={{ overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
        <svg
          width={svgWidth}
          height={svgHeight}
          role="img"
          aria-label="Habit pairs co-occurrence heatmap matrix"
        >
          {/* Column labels (top) */}
          {matrix.habits.map((h, j) => {
            const x = labelWidth + j * cellSize + cellSize / 2;
            const y = headerHeight - 10;
            return (
              <text
                key={`col-${h.id}`}
                x={x}
                y={y}
                textAnchor="start"
                transform={`rotate(-40 ${x} ${y})`}
                fontSize="11"
                fontWeight="600"
                fill="#475569"
              >
                {h.name.length > 10 ? `${h.name.slice(0, 9)}…` : h.name}
              </text>
            );
          })}

          {/* Row labels & Cells */}
          {matrix.habits.map((hRow, i) => {
            const y = headerHeight + i * cellSize;

            return (
              <g key={`row-${hRow.id}`}>
                {/* Row label */}
                <text
                  x={labelWidth - 10}
                  y={y + cellSize / 2 + 4}
                  textAnchor="end"
                  fontSize="11"
                  fontWeight="600"
                  fill="#475569"
                >
                  {hRow.name.length > 12 ? `${hRow.name.slice(0, 11)}…` : hRow.name}
                </text>

                {/* Matrix cells */}
                {matrix.habits.map((hCol, j) => {
                  const x = labelWidth + j * cellSize;
                  const val = matrix.values?.[i]?.[j] ?? 0;
                  const fill = getMatrixCellColor(val);
                  const isDark = val > 0.5;
                  const percentText = `${Math.round(val * 100)}%`;

                  return (
                    <g key={`cell-${hRow.id}-${hCol.id}`}>
                      <rect
                        x={x + 1}
                        y={y + 1}
                        width={cellSize - 2}
                        height={cellSize - 2}
                        rx="4"
                        fill={fill}
                        stroke="#e2e8f0"
                        strokeWidth="1"
                        style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }}
                      >
                        <title>{`${hRow.name} & ${hCol.name}: ${percentText} co-occurrence`}</title>
                      </rect>
                      <text
                        x={x + cellSize / 2}
                        y={y + cellSize / 2 + 4}
                        textAnchor="middle"
                        fontSize={cellSize < 45 ? '10' : '11'}
                        fontWeight="700"
                        fill={isDark ? '#ffffff' : '#1e293b'}
                        pointerEvents="none"
                      >
                        {percentText}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Heatmap color scale legend */}
      <div className="matrix-legend">
        <span>0%</span>
        <div className="matrix-legend-box" style={{ background: '#f8fafc' }} title="0%" />
        <div className="matrix-legend-box" style={{ background: '#dcfce7' }} title="1% - 25%" />
        <div className="matrix-legend-box" style={{ background: '#86efac' }} title="26% - 50%" />
        <div className="matrix-legend-box" style={{ background: '#22c55e' }} title="51% - 75%" />
        <div className="matrix-legend-box" style={{ background: '#15803d' }} title="76% - 100%" />
        <span>100%</span>
      </div>
    </div>
  );
};

PairsHeatmap.propTypes = {
  matrix: PropTypes.shape({
    habits: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired
      })
    ).isRequired,
    values: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired
  })
};

/**
 * Share of Effort Donut Component
 */
const ShareOfEffort = ({ share }) => {
  if (!share || share.length === 0) return null;

  const radius = 60;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius; // ~376.99
  const totalCount = share.reduce((sum, s) => sum + s.count, 0);

  // Compute stroke offsets for each segment
  let runningPercent = 0;
  const segments = share.map((item, idx) => {
    const segmentLen = (item.percent / 100) * circumference;
    const offset = -((runningPercent / 100) * circumference);
    runningPercent += item.percent;

    return {
      ...item,
      color: PALETTE[idx % PALETTE.length],
      segmentLen,
      offset
    };
  });

  return (
    <div className="matrix-card">
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-dark)' }}>
        Share of Effort (90 Days)
      </h3>
      <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
        Proportion of total completions contributed by each habit.
      </p>

      <div className="share-effort-container">
        <svg
          width="170"
          height="170"
          viewBox="0 0 170 170"
          role="img"
          aria-label="Share of effort donut chart"
        >
          <circle cx="85" cy="85" r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />

          {segments.map((seg) => (
            <circle
              key={seg.habitId}
              cx="85"
              cy="85"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg.segmentLen} ${circumference - seg.segmentLen}`}
              strokeDashoffset={seg.offset}
              transform="rotate(-90 85 85)"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            >
              <title>{`${seg.name}: ${seg.count} check-ins (${seg.percent}%)`}</title>
            </circle>
          ))}

          <text x="85" y="80" textAnchor="middle" fontSize="18" fontWeight="800" fill="#0f172a">
            {totalCount}
          </text>
          <text x="85" y="98" textAnchor="middle" fontSize="11" fontWeight="600" fill="#64748b">
            total logs
          </text>
        </svg>

        {/* Legend */}
        <div className="share-legend-list">
          {segments.map((seg) => (
            <div key={seg.habitId} className="share-legend-item">
              <span className="share-color-dot" style={{ backgroundColor: seg.color }} />
              <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{seg.name}</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {seg.count} ({seg.percent}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

ShareOfEffort.propTypes = {
  share: PropTypes.arrayOf(
    PropTypes.shape({
      habitId: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
      percent: PropTypes.number.isRequired
    })
  ).isRequired
};

/**
 * Main Cross-Habit Section component
 */
const CrossHabitSection = ({ crossData }) => {
  if (!crossData || !crossData.enough) {
    return (
      <section className="cross-insights-section">
        <div className="cross-insights-header">
          <h2 className="cross-insights-title">Cross-Habit Insights</h2>
        </div>
        <div className="card text-center text-muted" style={{ padding: '2rem 1.5rem' }}>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>
            {crossData?.message || 'Add at least 2 habits to explore cross-habit insights.'}
          </p>
        </div>
      </section>
    );
  }

  const { matrix, bestPair, keystone, share, droppedTogether } = crossData;

  return (
    <section className="cross-insights-section">
      <div className="cross-insights-header">
        <h2 className="cross-insights-title">Cross-Habit Insights</h2>
        <p className="cross-insights-subtitle">
          Advanced relationships, keystone drivers, and co-occurrence patterns across all habits.
        </p>
      </div>

      {/* Summary Cards: Keystone, Best Pair, Dropped Together */}
      <div className="cross-summary-grid">
        {/* Keystone Habit */}
        {keystone && (
          <div className="keystone-card">
            <div>
              <span className="keystone-badge">★ KEYSTONE HABIT</span>
              <div className="keystone-body">
                <span className="keystone-number">{keystone.avgOther}</span>
                <span className="keystone-label">avg other habits completed</span>
              </div>
            </div>
            <p className="keystone-sentence">{keystone.sentence}</p>
          </div>
        )}

        {/* Best Pair */}
        {bestPair && (
          <div className="pair-card">
            <div>
              <span className="pair-badge">MOST OFTEN TOGETHER</span>
              <p className="pair-sentence">&ldquo;{bestPair.sentence}&rdquo;</p>
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Completed together on {bestPair.bothCount} of {bestPair.eitherCount} combined days.
            </div>
          </div>
        )}

        {/* Dropped Together */}
        {droppedTogether && (
          <div className="pair-card">
            <div>
              <span className="pair-badge dropped">MOST DROPPED TOGETHER</span>
              <p className="pair-sentence">&ldquo;{droppedTogether.sentence}&rdquo;</p>
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Both missed on {droppedTogether.missedTogetherCount} days when another habit was done.
            </div>
          </div>
        )}
      </div>

      {/* Deep-Dive Grid: Pairs Heatmap & Share of Effort */}
      <div className="cross-deep-grid">
        <PairsHeatmap matrix={matrix} />
        <ShareOfEffort share={share} />
      </div>
    </section>
  );
};

CrossHabitSection.propTypes = {
  crossData: PropTypes.shape({
    enough: PropTypes.bool.isRequired,
    message: PropTypes.string,
    matrix: PropTypes.shape({
      habits: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          name: PropTypes.string.isRequired
        })
      ),
      values: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number))
    }),
    bestPair: PropTypes.shape({
      habitA: PropTypes.shape({ id: PropTypes.string.isRequired, name: PropTypes.string.isRequired }),
      habitB: PropTypes.shape({ id: PropTypes.string.isRequired, name: PropTypes.string.isRequired }),
      bothCount: PropTypes.number.isRequired,
      eitherCount: PropTypes.number.isRequired,
      percent: PropTypes.number.isRequired,
      sentence: PropTypes.string.isRequired
    }),
    keystone: PropTypes.shape({
      habit: PropTypes.shape({ id: PropTypes.string.isRequired, name: PropTypes.string.isRequired }),
      avgOther: PropTypes.number.isRequired,
      sentence: PropTypes.string.isRequired
    }),
    share: PropTypes.arrayOf(
      PropTypes.shape({
        habitId: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        count: PropTypes.number.isRequired,
        percent: PropTypes.number.isRequired
      })
    ),
    droppedTogether: PropTypes.shape({
      habitA: PropTypes.shape({ id: PropTypes.string.isRequired, name: PropTypes.string.isRequired }),
      habitB: PropTypes.shape({ id: PropTypes.string.isRequired, name: PropTypes.string.isRequired }),
      missedTogetherCount: PropTypes.number.isRequired,
      sentence: PropTypes.string.isRequired
    })
  })
};

export default CrossHabitSection;
