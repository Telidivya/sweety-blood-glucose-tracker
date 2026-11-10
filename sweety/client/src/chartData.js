// Turns a flat list of readings into one row per date, with a column per slot,
// which is the shape Recharts' LineChart expects.
export function buildChartData(readings) {
  const byDate = new Map();
  for (const r of readings) {
    if (!byDate.has(r.date)) byDate.set(r.date, { date: r.date });
    byDate.get(r.date)[r.slot] = r.value;
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
