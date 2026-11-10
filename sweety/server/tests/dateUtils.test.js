const {
  isValidDateString,
  todayInTimezone,
  isFuture,
  dailyRange,
  monthToDateRange,
  previousMonthRange,
} = require('../src/utils/dateUtils');

describe('report date ranges', () => {
  test('daily is just the selected date', () => {
    expect(dailyRange('2026-10-15')).toEqual({ from: '2026-10-15', to: '2026-10-15' });
  });

  test('month-to-date runs from the 1st to the selected date', () => {
    expect(monthToDateRange('2026-10-15')).toEqual({ from: '2026-10-01', to: '2026-10-15' });
  });

  test('monthly is the whole previous month', () => {
    expect(previousMonthRange('2026-10-15')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  test('monthly rolls back across the year boundary', () => {
    expect(previousMonthRange('2026-01-10')).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  test('monthly handles February in leap and non-leap years', () => {
    expect(previousMonthRange('2024-03-05').to).toBe('2024-02-29');
    expect(previousMonthRange('2026-03-05').to).toBe('2026-02-28');
  });
});

describe('isValidDateString', () => {
  test.each(['2026-10-15', '2024-02-29'])('accepts %s', (d) => {
    expect(isValidDateString(d)).toBe(true);
  });

  test.each(['2026-02-30', '2026-13-01', '15-10-2026', '', null, undefined, 20261015])(
    'rejects %s',
    (d) => {
      expect(isValidDateString(d)).toBe(false);
    }
  );
});

describe('today and future checks', () => {
  test('todayInTimezone respects the timezone', () => {
    const instant = new Date('2026-10-15T20:00:00Z'); // already 16 Oct in India
    expect(todayInTimezone('Asia/Kolkata', instant)).toBe('2026-10-16');
    expect(todayInTimezone('UTC', instant)).toBe('2026-10-15');
  });

  test('isFuture compares dates', () => {
    expect(isFuture('2026-10-16', '2026-10-15')).toBe(true);
    expect(isFuture('2026-10-15', '2026-10-15')).toBe(false);
    expect(isFuture('2026-10-14', '2026-10-15')).toBe(false);
  });
});
