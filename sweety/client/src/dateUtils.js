const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Today in the browser's local timezone as 'YYYY-MM-DD'.
export function todayString(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// '2026-10-15' -> '15 Oct 2026'
export function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// '2026-10-01' -> '1 Oct' (for chart axes)
export function formatShortDate(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

// { from: '2026-10-01', to: '2026-10-15' } -> '1 Oct – 15 Oct 2026'
export function formatRange({ from, to }) {
  if (from === to) return formatDate(from);
  const [fy] = from.split('-');
  const [ty] = to.split('-');
  const start = fy === ty ? formatShortDate(from) : formatDate(from);
  return `${start} – ${formatDate(to)}`;
}
