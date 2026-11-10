const config = require('../config');
const { query } = require('../db');
const reportCache = require('../reportCache');
const { HttpError } = require('../utils/errors');
const {
  isValidDateString,
  todayInTimezone,
  dailyRange,
  monthToDateRange,
  previousMonthRange,
} = require('../utils/dateUtils');
const { SLOTS, SLOT_KEYS } = require('../utils/validation');
const { buildReport } = require('./reportService');

const RANGES = {
  daily: dailyRange,
  'month-to-date': monthToDateRange,
  monthly: previousMonthRange,
};
const REPORT_KINDS = Object.keys(RANGES);

const SLOT_ORDER = `array_position(ARRAY[${SLOT_KEYS.map((k) => `'${k}'`).join(',')}], slot)`;

// Dependencies are injectable so the logic can be tested without Postgres/Redis.
function createReportLoader({
  db = query,
  cache = reportCache,
  today = () => todayInTimezone(config.timezone),
} = {}) {
  // Returns { value: report, status: 'HIT' | 'MISS' | 'BYPASS' }.
  return async function loadReport(userId, kind, dateParam) {
    const getRange = RANGES[kind];
    if (!getRange) throw new HttpError(404, 'Unknown report.');

    const date = dateParam ?? today();
    if (!isValidDateString(date)) {
      throw new HttpError(400, 'Please provide a valid date (YYYY-MM-DD).', 'date');
    }
    const range = getRange(date);

    return cache.wrap(userId, `${kind}:${date}`, async () => {
      const { rows } = await db(
        `SELECT id, reading_date AS date, slot, value
         FROM readings
         WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3
         ORDER BY reading_date, ${SLOT_ORDER}`,
        [userId, range.from, range.to]
      );
      const readings = rows.map((r) => ({ ...r, slotLabel: SLOTS[r.slot] }));
      return buildReport(readings, range);
    });
  };
}

module.exports = { createReportLoader, loadReport: createReportLoader(), REPORT_KINDS };
