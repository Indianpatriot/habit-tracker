import PropTypes from 'prop-types';

/**
 * 1. Today's progress ring: donut showing habits done today out of total
 */
export const TodayProgressRing = ({ todayDone, totalHabits, percent, takeaway }) => {
  const radius = 54;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius; // ~339.29
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="visual-card">
      <div className="visual-card-header">
        <h3 className="visual-card-title">Today&apos;s Progress</h3>
      </div>

      <div className="visual-svg-container">
        {totalHabits === 0 ? (
          <div className="visual-empty-state">
            <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌱</span>
            <span>No habits created yet.</span>
          </div>
        ) : (
          <svg
            width="160"
            height="160"
            viewBox="0 0 160 160"
            role="img"
            aria-label={`Today's progress ring: ${todayDone} of ${totalHabits} habits completed (${percent}%)`}
          >
            {/* Background ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="var(--border-color)"
              strokeWidth={strokeWidth}
            />
            {/* Animated progress ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
            {/* Center fraction & percentage */}
            <text
              x="80"
              y="74"
              textAnchor="middle"
              fontSize="24"
              fontWeight="700"
              fill="var(--text-dark)"
            >
              {todayDone}/{totalHabits}
            </text>
            <text
              x="80"
              y="96"
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              fill="var(--text-muted)"
            >
              {percent}% completed
            </text>
          </svg>
        )}
      </div>

      <p className="visual-takeaway">{takeaway}</p>
    </div>
  );
};

TodayProgressRing.propTypes = {
  todayDone: PropTypes.number.isRequired,
  totalHabits: PropTypes.number.isRequired,
  percent: PropTypes.number.isRequired,
  takeaway: PropTypes.string.isRequired
};

/**
 * 2. Weekly trend: bar chart of total completions per week for the last 12 weeks
 */
export const WeeklyTrendChart = ({ weekly, takeaway }) => {
  const maxCount = Math.max(...(weekly || []).map((w) => w.count || 0), 1);
  const chartHeight = 100;
  const zeroData = (weekly || []).every((w) => (w.count || 0) === 0);

  return (
    <div className="visual-card">
      <div className="visual-card-header">
        <h3 className="visual-card-title">Weekly Trend (12 Weeks)</h3>
      </div>

      <div className="visual-svg-container">
        {zeroData ? (
          <div className="visual-empty-state">
            <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</span>
            <span>No completions recorded in the last 12 weeks.</span>
          </div>
        ) : (
          <svg
            viewBox="0 0 460 170"
            role="img"
            aria-label="Weekly completions trend bar chart for the last 12 weeks"
          >
            {/* Grid baseline */}
            <line x1="20" y1="135" x2="445" y2="135" stroke="var(--border-color)" strokeWidth="1" />

            {(weekly || []).map((item, idx) => {
              const barWidth = 22;
              const x = 32 + idx * 34;
              const barHeight = Math.max(Math.round(((item.count || 0) / maxCount) * chartHeight), 3);
              const y = 135 - barHeight;
              const isCurrent = item.isCurrent;

              return (
                <g key={item.weekStart || idx}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="4"
                    fill={isCurrent ? 'var(--primary)' : 'var(--heat-1)'}
                    style={{ transition: 'height 0.4s ease, y 0.4s ease' }}
                  >
                    <title>{`${item.label}: ${item.count} check-ins ${isCurrent ? '(Current Week)' : ''}`}</title>
                  </rect>
                  {item.count > 0 && (
                    <text
                      x={x + barWidth / 2}
                      y={Math.max(y - 5, 12)}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill={isCurrent ? 'var(--primary)' : 'var(--text-dark)'}
                    >
                      {item.count}
                    </text>
                  )}
                  {/* Label for every other week or current week */}
                  {(idx % 2 === 0 || isCurrent) && (
                    <text
                      x={x + barWidth / 2}
                      y="152"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight={isCurrent ? '700' : '500'}
                      fill={isCurrent ? 'var(--primary)' : 'var(--text-muted)'}
                    >
                      {item.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <p className="visual-takeaway">{takeaway}</p>
    </div>
  );
};

WeeklyTrendChart.propTypes = {
  weekly: PropTypes.arrayOf(
    PropTypes.shape({
      weekStart: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
      isCurrent: PropTypes.bool.isRequired
    })
  ).isRequired,
  takeaway: PropTypes.string.isRequired
};

/**
 * 3. Day-of-week pattern: 7 bars (Mon to Sun) over the last 90 days
 */
export const WeekdayPatternChart = ({ weekdayCounts, takeaway }) => {
  const maxCount = Math.max(...(weekdayCounts || []).map((d) => d.count || 0), 1);
  const chartHeight = 100;
  const zeroData = (weekdayCounts || []).every((d) => (d.count || 0) === 0);

  return (
    <div className="visual-card">
      <div className="visual-card-header">
        <h3 className="visual-card-title">Day-of-Week Pattern (90 Days)</h3>
      </div>

      <div className="visual-svg-container">
        {zeroData ? (
          <div className="visual-empty-state">
            <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗓️</span>
            <span>No completions recorded over the last 90 days.</span>
          </div>
        ) : (
          <svg
            viewBox="0 0 380 170"
            role="img"
            aria-label="Day-of-week completions pattern bar chart over the last 90 days"
          >
            <line x1="25" y1="135" x2="355" y2="135" stroke="var(--border-color)" strokeWidth="1" />

            {(weekdayCounts || []).map((item, idx) => {
              const barWidth = 32;
              const x = 38 + idx * 45;
              const barHeight = Math.max(Math.round(((item.count || 0) / maxCount) * chartHeight), 3);
              const y = 135 - barHeight;

              return (
                <g key={item.day}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="4"
                    fill={item.isBest ? 'var(--primary)' : 'var(--heat-2)'}
                    style={{ transition: 'height 0.4s ease, y 0.4s ease' }}
                  >
                    <title>{`${item.day}: ${item.count} completions ${item.isBest ? '(Most Active)' : ''}`}</title>
                  </rect>
                  <text
                    x={x + barWidth / 2}
                    y={Math.max(y - 6, 12)}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill={item.isBest ? 'var(--primary)' : 'var(--text-dark)'}
                  >
                    {item.count}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y="152"
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight={item.isBest ? '700' : '500'}
                    fill={item.isBest ? 'var(--primary)' : 'var(--text-muted)'}
                  >
                    {item.day}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <p className="visual-takeaway">{takeaway}</p>
    </div>
  );
};

WeekdayPatternChart.propTypes = {
  weekdayCounts: PropTypes.arrayOf(
    PropTypes.shape({
      day: PropTypes.string.isRequired,
      dayIndex: PropTypes.number.isRequired,
      count: PropTypes.number.isRequired,
      isBest: PropTypes.bool.isRequired
    })
  ).isRequired,
  takeaway: PropTypes.string.isRequired
};

/**
 * 4. Streak race: horizontal bars per habit showing current vs longest streak
 */
export const StreakRaceChart = ({ streaks, takeaway }) => {
  const maxStreak = Math.max(
    ...(streaks || []).map((s) => s.longestStreak || 0),
    ...(streaks || []).map((s) => s.currentStreak || 0),
    1
  );

  const barMaxPx = 200;
  const svgHeight = Math.max((streaks || []).length * 36 + 20, 120);

  return (
    <div className="visual-card">
      <div className="visual-card-header">
        <h3 className="visual-card-title">Streak Race</h3>
      </div>

      <div className="visual-svg-container">
        {(!streaks || streaks.length === 0) ? (
          <div className="visual-empty-state">
            <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏁</span>
            <span>No habits created yet to compare streaks.</span>
          </div>
        ) : (
          <svg
            viewBox={`0 0 460 ${svgHeight}`}
            role="img"
            aria-label="Horizontal bar chart comparing current streak against longest streak per habit"
          >
            {streaks.map((s, idx) => {
              const y = 20 + idx * 36;
              const longestWidth = Math.max(Math.round((s.longestStreak / maxStreak) * barMaxPx), 4);
              const currentWidth = Math.max(Math.round((s.currentStreak / maxStreak) * barMaxPx), 0);

              return (
                <g key={s.habitId || idx}>
                  {/* Habit Name */}
                  <text
                    x="15"
                    y={y + 12}
                    fontSize="11"
                    fontWeight="600"
                    fill="var(--text-dark)"
                  >
                    {s.name.length > 15 ? `${s.name.slice(0, 14)}…` : s.name}
                  </text>

                  {/* Longest streak background bar */}
                  <rect
                    x="130"
                    y={y}
                    width={longestWidth}
                    height="16"
                    rx="4"
                    fill="var(--primary-light)"
                  >
                    <title>{`Longest: ${s.longestStreak} days`}</title>
                  </rect>

                  {/* Current streak foreground bar */}
                  {currentWidth > 0 && (
                    <rect
                      x="130"
                      y={y}
                      width={currentWidth}
                      height="16"
                      rx="4"
                      fill="var(--primary)"
                    >
                      <title>{`Current: ${s.currentStreak} days`}</title>
                    </rect>
                  )}

                  {/* Label */}
                  <text
                    x="345"
                    y={y + 12}
                    fontSize="11"
                    fontWeight="600"
                    fill="var(--text-dark)"
                  >
                    {s.currentStreak}d <tspan fill="var(--text-muted)">/ best {s.longestStreak}d</tspan>
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <p className="visual-takeaway">{takeaway}</p>
    </div>
  );
};

StreakRaceChart.propTypes = {
  streaks: PropTypes.arrayOf(
    PropTypes.shape({
      habitId: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      currentStreak: PropTypes.number.isRequired,
      longestStreak: PropTypes.number.isRequired
    })
  ).isRequired,
  takeaway: PropTypes.string.isRequired
};

/**
 * 5. 30-day completion rings: small donut per habit (small multiples)
 */
export const Last30Donuts = ({ last30, takeaway }) => {
  const radius = 26;
  const strokeWidth = 6.5;
  const circumference = 2 * Math.PI * radius; // ~163.36

  return (
    <div className="visual-card">
      <div className="visual-card-header">
        <h3 className="visual-card-title">30-Day Completion Rings</h3>
      </div>

      <div className="visual-svg-container">
        {(!last30 || last30.length === 0) ? (
          <div className="visual-empty-state">
            <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🍩</span>
            <span>No habits tracked in the last 30 days.</span>
          </div>
        ) : (
          <div
            className="small-multiples-grid"
            role="img"
            aria-label="Small multiple donut rings showing 30-day completion percent per habit"
          >
            {last30.map((h) => {
              const dashOffset = circumference - (h.percent / 100) * circumference;

              return (
                <div key={h.habitId} className="small-donut-item">
                  <svg width="72" height="72" viewBox="0 0 72 72">
                    <circle
                      cx="36"
                      cy="36"
                      r={radius}
                      fill="none"
                      stroke="var(--border-color)"
                      strokeWidth={strokeWidth}
                    />
                    <circle
                      cx="36"
                      cy="36"
                      r={radius}
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="round"
                      transform="rotate(-90 36 36)"
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                    <text
                      x="36"
                      y="40"
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="700"
                      fill="var(--text-dark)"
                    >
                      {h.percent}%
                    </text>
                  </svg>
                  <span className="small-donut-label" title={h.name}>
                    {h.name}
                  </span>
                  <span className="small-donut-sub">{h.doneCount}/30 days</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="visual-takeaway">{takeaway}</p>
    </div>
  );
};

Last30Donuts.propTypes = {
  last30: PropTypes.arrayOf(
    PropTypes.shape({
      habitId: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      doneCount: PropTypes.number.isRequired,
      totalDays: PropTypes.number.isRequired,
      percent: PropTypes.number.isRequired
    })
  ).isRequired,
  takeaway: PropTypes.string.isRequired
};

/**
 * 6. Momentum line: 90-day rolling 7-day average of daily completions, with dot on today
 */
export const MomentumLineChart = ({ rolling7, takeaway }) => {
  const maxValue = Math.max(...(rolling7 || []).map((r) => r.value || 0), 1);
  const plotWidth = 440;
  const plotHeight = 100;
  const zeroData = (rolling7 || []).every((r) => (r.value || 0) === 0);

  // Generate SVG path points
  const points = (rolling7 || []).map((pt, idx) => {
    const x = 35 + (idx / Math.max(rolling7.length - 1, 1)) * plotWidth;
    const y = 130 - (pt.value / maxValue) * plotHeight;
    return { x, y, pt };
  });

  const lineD = points.length > 0
    ? `M ${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`
    : '';

  const areaD = points.length > 0
    ? `${lineD} L ${points[points.length - 1].x.toFixed(1)},130 L ${points[0].x.toFixed(1)},130 Z`
    : '';

  const todayPoint = points.length > 0 ? points[points.length - 1] : null;

  return (
    <div className="visual-card">
      <div className="visual-card-header">
        <h3 className="visual-card-title">Momentum Line (90 Days)</h3>
      </div>

      <div className="visual-svg-container">
        {zeroData ? (
          <div className="visual-empty-state">
            <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📈</span>
            <span>No completions recorded over the last 90 days.</span>
          </div>
        ) : (
          <svg
            viewBox="0 0 500 165"
            role="img"
            aria-label="90-day momentum line chart showing rolling 7-day average daily completions"
          >
            <defs>
              <linearGradient id="momentumGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Baseline */}
            <line x1="30" y1="130" x2="480" y2="130" stroke="var(--border-color)" strokeWidth="1" />

            {/* Area fill */}
            {areaD && <path d={areaD} fill="url(#momentumGradient)" />}

            {/* Line stroke */}
            {lineD && (
              <path
                d={lineD}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Dot on Today */}
            {todayPoint && (
              <g>
                <circle
                  cx={todayPoint.x}
                  cy={todayPoint.y}
                  r="5"
                  fill="var(--primary)"
                  stroke="var(--bg-card)"
                  strokeWidth="2"
                />
                <title>{`Today: ${todayPoint.pt.value} completions/day`}</title>
              </g>
            )}

            {/* X-axis date labels */}
            <text x="35" y="148" fontSize="10" fill="var(--text-muted)">
              90d ago
            </text>
            <text x="250" y="148" textAnchor="middle" fontSize="10" fill="var(--text-muted)">
              45d ago
            </text>
            <text x="475" y="148" textAnchor="end" fontSize="10" fontWeight="700" fill="var(--primary)">
              Today
            </text>
          </svg>
        )}
      </div>

      <p className="visual-takeaway">{takeaway}</p>
    </div>
  );
};

MomentumLineChart.propTypes = {
  rolling7: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
      isToday: PropTypes.bool.isRequired
    })
  ).isRequired,
  takeaway: PropTypes.string.isRequired
};

