const config = require('./config');
const { createCache } = require('./cache');
const redis = require('./redis');

// The app-wide cache instance (a no-op when Redis isn't configured).
module.exports = createCache(redis, { ttlSeconds: config.reportCacheTtlSeconds });
