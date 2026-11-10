// All dates in Sweety are plain 'YYYY-MM-DD' strings. Using strings (and UTC
// arithmetic for month maths) keeps results independent of the server timezone.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n) => String(n).padStart(2, '0');
const format = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

function isValidDateString(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

// "Today" as seen in a given IANA timezone, e.g. 'Asia/Kolkata'.
function todayInTimezone(timeZone, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

// ISO date strings compare correctly as plain strings.
const isFuture = (date, today) => date > today;

// 1st of the month up to (and including) the selected date.
function monthToDateRange(date) {
  const [y, m] = date.split('-').map(Number);
  return { from: format(y, m, 1), to: date };
}

// The whole calendar month before the month of the selected date.
function previousMonthRange(date) {
  let [y, m] = date.split('-').map(Number);
  m -= 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  // Day 0 of the *next* month is the last day of month m.
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: format(y, m, 1), to: format(y, m, lastDay) };
}

const dailyRange = (date) => ({ from: date, to: date });

module.exports = {
  isValidDateString,
  todayInTimezone,
  isFuture,
  dailyRange,
  monthToDateRange,
  previousMonthRange,
};
