const { createReportLoader } = require('../src/services/reportLoader');
const { createCache } = require('../src/cache');

function fakeRedis() {
  const store = new Map();
  return {
    get: async (k) => (store.has(k) ? store.get(k) : null),
    set: async (k, v) => { store.set(k, String(v)); },
    incr: async (k) => { store.set(k, String(Number(store.get(k) || 0) + 1)); },
  };
}

// Fake database that records the queries it receives.
function fakeDb(rows) {
  const db = async (sql, params) => { db.calls.push(params); return { rows }; };
  db.calls = [];
  return db;
}

const rows = [
  { id: 1, date: '2026-10-15', slot: 'morning', value: 100 },
  { id: 2, date: '2026-10-15', slot: 'after_lunch', value: 160 },
];

describe('report loader', () => {
  test('queries the correct date range for each report kind', async () => {
    const db = fakeDb([]);
    const load = createReportLoader({ db, cache: createCache(null), today: () => '2026-10-20' });

    await load(7, 'daily', '2026-10-15');
    await load(7, 'month-to-date', '2026-10-15');
    await load(7, 'monthly', '2026-10-15');

    expect(db.calls).toEqual([
      [7, '2026-10-15', '2026-10-15'],
      [7, '2026-10-01', '2026-10-15'],
      [7, '2026-09-01', '2026-09-30'],
    ]);
  });

  test('builds the summary and labels each reading with its slot', async () => {
    const load = createReportLoader({ db: fakeDb(rows), cache: createCache(null), today: () => '2026-10-15' });
    const { value } = await load(1, 'daily', '2026-10-15');

    expect(value).toMatchObject({ count: 2, highest: 160, lowest: 100, average: 130 });
    expect(value.readings[1].slotLabel).toBe('After lunch');
  });

  test('uses today when no date is given', async () => {
    const db = fakeDb([]);
    const load = createReportLoader({ db, cache: createCache(null), today: () => '2026-10-20' });
    const { value } = await load(1, 'daily');
    expect(value.range).toEqual({ from: '2026-10-20', to: '2026-10-20' });
  });

  test('empty period returns a zero-count report', async () => {
    const load = createReportLoader({ db: fakeDb([]), cache: createCache(null) });
    const { value } = await load(1, 'daily', '2026-10-15');
    expect(value).toMatchObject({ count: 0, highest: null, average: null });
  });

  test('rejects an invalid date and an unknown kind', async () => {
    const load = createReportLoader({ db: fakeDb([]), cache: createCache(null) });
    let status;
    try { await load(1, 'daily', 'yesterday'); } catch (e) { status = e.status; }
    expect(status).toBe(400);
    try { await load(1, 'yearly', '2026-10-15'); } catch (e) { status = e.status; }
    expect(status).toBe(404);
  });

  test('second identical request is served from cache; a change invalidates it', async () => {
    const db = fakeDb(rows);
    const cache = createCache(fakeRedis(), { logger: { warn() {} } });
    const load = createReportLoader({ db, cache });

    expect((await load(1, 'daily', '2026-10-15')).status).toBe('MISS');
    expect((await load(1, 'daily', '2026-10-15')).status).toBe('HIT');
    expect(db.calls.length).toBe(1); // the database was only queried once

    await cache.invalidate(1); // what the readings routes do after add/edit/delete
    expect((await load(1, 'daily', '2026-10-15')).status).toBe('MISS');
    expect(db.calls.length).toBe(2);
  });
});
