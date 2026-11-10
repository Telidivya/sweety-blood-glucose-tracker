const roundTo1 = (n) => Math.round(n * 10) / 10;

// Builds the report payload from the readings that fall inside `range`.
// Empty periods return null stats so the UI can show an empty state.
function buildReport(readings, range) {
  const count = readings.length;
  if (count === 0) {
    return { range, count: 0, highest: null, lowest: null, average: null, readings: [] };
  }
  const values = readings.map((r) => r.value);
  const sum = values.reduce((total, v) => total + v, 0);
  return {
    range,
    count,
    highest: Math.max(...values),
    lowest: Math.min(...values),
    average: roundTo1(sum / count),
    readings,
  };
}

module.exports = { buildReport };
