// Report cache with per-user versioning.
//
// Each cached report lives under   reports:<userId>:<version>:<kind>:<date>
// and the current version is stored under   reports:ver:<userId>.
//
// When a reading changes we bump the user's version (INCR). Old entries are
// instantly unreachable and expire on their own via the TTL. Versioning also
// closes a race that plain deleting has: a request that read the database
// *before* a change but writes the cache *after* it can only write under the
// old version, which nobody reads any more.
//
// The cache is best-effort: if Redis is missing or erroring, we simply compute
// the report from the database.

const versionKey = (userId) => `reports:ver:${userId}`;
const dataKey = (userId, version, field) => `reports:${userId}:${version}:${field}`;

function createCache(client, { ttlSeconds = 600, logger = console } = {}) {
  const warn = (action, err) => logger.warn(`[cache] ${action} failed: ${err.message}`);

  // Resolves to { value, status } where status is HIT, MISS or BYPASS.
  async function wrap(userId, field, compute) {
    if (!client) return { value: await compute(), status: 'BYPASS' };

    let key;
    try {
      const version = (await client.get(versionKey(userId))) || '0';
      key = dataKey(userId, version, field);
      const cached = await client.get(key);
      if (cached) return { value: JSON.parse(cached), status: 'HIT' };
    } catch (err) {
      warn('read', err);
      return { value: await compute(), status: 'BYPASS' };
    }

    const value = await compute();
    try {
      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      warn('write', err);
    }
    return { value, status: 'MISS' };
  }

  // Call after a reading is created, updated or deleted.
  async function invalidate(userId) {
    if (!client) return;
    try {
      await client.incr(versionKey(userId));
    } catch (err) {
      warn('invalidate', err);
    }
  }

  return { wrap, invalidate, enabled: Boolean(client) };
}

module.exports = { createCache };
