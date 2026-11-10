const { createCache } = require('../src/cache');

// A tiny in-memory stand-in for the parts of ioredis the cache uses.
function fakeRedis() {
  const store = new Map();
  return {
    store,
    get: async (k) => (store.has(k) ? store.get(k) : null),
    set: async (k, v) => { store.set(k, String(v)); return 'OK'; },
    incr: async (k) => { const n = Number(store.get(k) || 0) + 1; store.set(k, String(n)); return n; },
  };
}
const quiet = { warn() {} };
const counter = (value) => {
  const fn = async () => { fn.calls += 1; return value; };
  fn.calls = 0;
  return fn;
};

describe('report cache', () => {
  test('first call is a MISS, second is a HIT and does not recompute', async () => {
    const cache = createCache(fakeRedis(), { logger: quiet });
    const compute = counter({ count: 3 });

    const first = await cache.wrap(1, 'daily:2026-10-15', compute);
    const second = await cache.wrap(1, 'daily:2026-10-15', compute);

    expect(first).toEqual({ value: { count: 3 }, status: 'MISS' });
    expect(second).toEqual({ value: { count: 3 }, status: 'HIT' });
    expect(compute.calls).toBe(1);
  });

  test('different reports are cached separately', async () => {
    const cache = createCache(fakeRedis(), { logger: quiet });
    await cache.wrap(1, 'daily:2026-10-15', counter('a'));
    const other = await cache.wrap(1, 'monthly:2026-10-15', counter('b'));
    expect(other).toEqual({ value: 'b', status: 'MISS' });
  });

  test("one user's cache is never served to another user", async () => {
    const cache = createCache(fakeRedis(), { logger: quiet });
    await cache.wrap(1, 'daily:2026-10-15', counter('user one data'));
    const other = await cache.wrap(2, 'daily:2026-10-15', counter('user two data'));
    expect(other).toEqual({ value: 'user two data', status: 'MISS' });
  });

  test('invalidate makes the next read recompute fresh data', async () => {
    const cache = createCache(fakeRedis(), { logger: quiet });
    await cache.wrap(1, 'daily:2026-10-15', counter('old'));
    await cache.invalidate(1);

    const after = await cache.wrap(1, 'daily:2026-10-15', counter('new'));
    expect(after).toEqual({ value: 'new', status: 'MISS' });
  });

  test('invalidating one user leaves other users cached', async () => {
    const cache = createCache(fakeRedis(), { logger: quiet });
    await cache.wrap(2, 'daily:2026-10-15', counter('keep me'));
    await cache.invalidate(1);
    const again = await cache.wrap(2, 'daily:2026-10-15', counter('recomputed'));
    expect(again).toEqual({ value: 'keep me', status: 'HIT' });
  });

  test('a slow read that finishes after an invalidation cannot poison the cache', async () => {
    const cache = createCache(fakeRedis(), { logger: quiet });

    // Request A starts, reads old data, and is still "in the database" ...
    let releaseA;
    const slowCompute = () => new Promise((resolve) => { releaseA = () => resolve('stale'); });
    const requestA = cache.wrap(1, 'daily:2026-10-15', slowCompute);
    await new Promise((r) => setImmediate(r));

    // ... meanwhile a reading changes and the cache is invalidated ...
    await cache.invalidate(1);
    releaseA();
    await requestA;

    // ... so the stale value must not be served afterwards.
    const next = await cache.wrap(1, 'daily:2026-10-15', counter('fresh'));
    expect(next).toEqual({ value: 'fresh', status: 'MISS' });
  });

  test('without Redis it just computes (BYPASS)', async () => {
    const cache = createCache(null);
    const compute = counter('x');
    expect(await cache.wrap(1, 'k', compute)).toEqual({ value: 'x', status: 'BYPASS' });
    expect(await cache.wrap(1, 'k', compute)).toEqual({ value: 'x', status: 'BYPASS' });
    expect(compute.calls).toBe(2);
    await cache.invalidate(1); // must not throw
    expect(cache.enabled).toBe(false);
  });

  test('if Redis errors on read, it falls back to computing', async () => {
    const broken = { get: async () => { throw new Error('down'); }, set: async () => {}, incr: async () => {} };
    const cache = createCache(broken, { logger: quiet });
    expect(await cache.wrap(1, 'k', counter('db'))).toEqual({ value: 'db', status: 'BYPASS' });
  });

  test('if Redis errors on write or invalidate, requests still succeed', async () => {
    const flaky = {
      get: async () => null,
      set: async () => { throw new Error('down'); },
      incr: async () => { throw new Error('down'); },
    };
    const cache = createCache(flaky, { logger: quiet });
    expect(await cache.wrap(1, 'k', counter('db'))).toEqual({ value: 'db', status: 'MISS' });
    await cache.invalidate(1);
  });

  test('cached data is JSON round-tripped faithfully, including nulls (empty report)', async () => {
    const cache = createCache(fakeRedis(), { logger: quiet });
    const empty = { count: 0, highest: null, lowest: null, average: null, readings: [] };
    await cache.wrap(1, 'k', counter(empty));
    expect((await cache.wrap(1, 'k', counter('unused'))).value).toEqual(empty);
  });
});
