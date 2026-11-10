import PropTypes from 'prop-types';

/**
 * Heatmap component (Pure SVG, no external libraries)
 * Renders a 90-day activity matrix laid out by week columns and weekday rows.
 * Pads the first week so days align to Sunday-Saturday.
 */
const Heatmap = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center text-muted">No heatmap data available.</div>;
  }

  // 5 green shades mapped to count (0 to 4)
  const colorScale = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

  const cellSize = 13;
  const cellGap = 3;
  const leftMargin = 32; // Space for Mon/Wed/Fri labels
  const topMargin = 22;  // Space for month labels

  // Compute weekday offset for the first day so weekdays align
  // Parse YYYY-MM-DD safely at local midnight
  const [firstYear, firstMonth, firstDay] = data[0].date.split('-').map(Number);
  const startDate = new Date(firstYear, firstMonth - 1, firstDay);
  const startDayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday

  // Calculate layout coordinates for each day
  const cells = data.map((item, index) => {
    // Offset by startDayOfWeek so Sunday is row 0, Saturday is row 6
    const adjustedIndex = index + startDayOfWeek;
    const weekIndex = Math.floor(adjustedIndex / 7);
    const dayOfWeek = adjustedIndex % 7;

    const x = leftMargin + weekIndex * (cellSize + cellGap);
    const y = topMargin + dayOfWeek * (cellSize + cellGap);

    const safeCount = Math.min(Math.max(item.count || 0, 0), 4);
    const fillColor = colorScale[safeCount];

    return {
      ...item,
      x,
      y,
      fillColor,
      weekIndex,
      dayOfWeek
    };
  });

  const totalWeeks = Math.ceil((data.length + startDayOfWeek) / 7);
  const svgWidth = leftMargin + totalWeeks * (cellSize + cellGap) + 10;
  const svgHeight = topMargin + 7 * (cellSize + cellGap) + 10;

  // Derive unique month labels based on the first day of each month present in data
  const monthLabels = [];
  let lastSeenMonth = -1;

  data.forEach((item, index) => {
    const [y, m, d] = item.date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const currentMonth = dateObj.getMonth();

    if (currentMonth !== lastSeenMonth) {
      lastSeenMonth = currentMonth;
      const adjustedIndex = index + startDayOfWeek;
      const weekIndex = Math.floor(adjustedIndex / 7);
      const x = leftMargin + weekIndex * (cellSize + cellGap);
      const monthName = dateObj.toLocaleString('default', { month: 'short' });
      monthLabels.push({ text: monthName, x });
    }
  });

  return (
    <div className="heatmap-wrapper">
      <div className="heatmap-scroll">
        <svg
          width={svgWidth}
          height={svgHeight}
          className="heatmap-svg"
          aria-label="Habit streak activity graph"
        >
          {/* Month labels at top */}
          {monthLabels.map((lbl, idx) => (
            <text
              key={idx}
              x={lbl.x}
              y={14}
              fontSize="10"
              fill="#6b7280"
              fontFamily="sans-serif"
            >
              {lbl.text}
            </text>
          ))}

          {/* Weekday indicators along left axis (Mon, Wed, Fri) */}
          <text
            x={10}
            y={topMargin + 1 * (cellSize + cellGap) + 10}
            fontSize="9"
            fill="#9ca3af"
            fontFamily="sans-serif"
          >
            Mon
          </text>
          <text
            x={10}
            y={topMargin + 3 * (cellSize + cellGap) + 10}
            fontSize="9"
            fill="#9ca3af"
            fontFamily="sans-serif"
          >
            Wed
          </text>
          <text
            x={10}
            y={topMargin + 5 * (cellSize + cellGap) + 10}
            fontSize="9"
            fill="#9ca3af"
            fontFamily="sans-serif"
          >
            Fri
          </text>

          {/* Activity cells */}
          {cells.map((cell) => (
            <rect
              key={cell.date}
              x={cell.x}
              y={cell.y}
              width={cellSize}
              height={cellSize}
              rx={2}
              ry={2}
              fill={cell.fillColor}
              className="heatmap-cell"
            >
              <title>{`${cell.date}: ${cell.count} completion${cell.count === 1 ? '' : 's'}`}</title>
            </rect>
          ))}
        </svg>
      </div>

      {/* Legend below the SVG */}
      <div className="heatmap-legend">
        <span>Less</span>
        {colorScale.map((color, idx) => (
          <span
            key={idx}
            className="legend-cell"
            style={{ backgroundColor: color }}
            title={`Level ${idx}`}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};

Heatmap.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired
    })
  ).isRequired
};

export default Heatmap;

