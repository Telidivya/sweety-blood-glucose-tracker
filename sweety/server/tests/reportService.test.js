const { buildReport } = require('../src/services/reportService');

const range = { from: '2026-10-01', to: '2026-10-15' };
const r = (value) => ({ value });

describe('buildReport', () => {
  test('returns highest, lowest, average and count', () => {
    const report = buildReport([r(100), r(150), r(200)], range);
    expect(report).toMatchObject({ count: 3, highest: 200, lowest: 100, average: 150 });
  });

  test('rounds the average to 1 decimal place', () => {
    // (100 + 101 + 101) / 3 = 100.666...
    expect(buildReport([r(100), r(101), r(101)], range).average).toBe(100.7);
  });

  test('keeps one decimal when needed and drops it when not', () => {
    expect(buildReport([r(100), r(101)], range).average).toBe(100.5);
    expect(buildReport([r(120), r(120)], range).average).toBe(120);
  });

  test('empty period gives null stats and a zero count', () => {
    expect(buildReport([], range)).toEqual({
      range,
      count: 0,
      highest: null,
      lowest: null,
      average: null,
      readings: [],
    });
  });

  test('works for a single reading', () => {
    expect(buildReport([r(95)], range)).toMatchObject({
      count: 1,
      highest: 95,
      lowest: 95,
      average: 95,
    });
  });
});
