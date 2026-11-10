const config = require('./config');

// Returns null when REDIS_URL is not set, which turns caching off.
let client = null;

if (config.redisUrl) {
  const IORedis = require('ioredis');
  client = new IORedis(config.redisUrl, {
    // Fail fast instead of queueing commands while Redis is down: a slow cache
    // is worse than no cache, so requests fall back to the database.
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });

  let lastLogged = 0;
  client.on('error', (err) => {
    const now = Date.now();
    if (now - lastLogged > 30000) {
      lastLogged = now;
      console.warn(`[redis] ${err.message}`);
    }
  });
}

module.exports = client;
