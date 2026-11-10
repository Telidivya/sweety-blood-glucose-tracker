import { buildChartData } from './chartData';
import { formatRange, todayString } from './dateUtils';
import { validateReading } from './validation';

describe('validateReading', () => {
  test('accepts the boundaries', () => {
    expect(validateReading({ date: '2026-10-15', slot: 'morning', value: '40' }, '2026-10-15').values.value).toBe(40);
    expect(validateReading({ date: '2026-10-15', slot: 'morning', value: '600' }, '2026-10-15').values.value).toBe(600);
  });
});

describe('buildChartData', () => {
  test('groups readings by date with one column per slot, sorted by date', () => {
    const readings = [
      { date: '2026-10-02', slot: 'morning', value: 90 },
      { date: '2026-10-01', slot: 'morning', value: 100 },
      { date: '2026-10-01', slot: 'after_lunch', value: 150 },
    ];
    expect(buildChartData(readings)).toEqual([
      { date: '2026-10-01', morning: 100, after_lunch: 150 },
      { date: '2026-10-02', morning: 90 },
    ]);
  });

  test('returns an empty array for no readings', () => {
    expect(buildChartData([])).toEqual([]);
  });
});

describe('date helpers', () => {
  test('formatRange', () => {
    expect(formatRange({ from: '2026-10-15', to: '2026-10-15' })).toBe('15 Oct 2026');
    expect(formatRange({ from: '2026-10-01', to: '2026-10-15' })).toBe('1 Oct – 15 Oct 2026');
    expect(formatRange({ from: '2026-09-01', to: '2026-09-30' })).toBe('1 Sep – 30 Sep 2026');
  });

  test('todayString uses local date parts', () => {
    expect(todayString(new Date(2026, 9, 5))).toBe('2026-10-05');
  });
});
