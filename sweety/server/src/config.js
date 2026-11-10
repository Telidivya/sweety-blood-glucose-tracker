require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl:
    process.env.DATABASE_URL || 'postgres://sweety:sweety@localhost:5432/sweety',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret',
  jwtExpiresIn: '7d',
  timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  // Redis is optional: without REDIS_URL the API still works, just uncached,
  // and the reminder worker refuses to start.
  redisUrl: process.env.REDIS_URL || '',
  reportCacheTtlSeconds: Number(process.env.REPORT_CACHE_TTL) || 600,
  // Cron pattern (evaluated in APP_TIMEZONE) for the daily reminder job.
  reminderCron: process.env.REMINDER_CRON || '0 20 * * *',
};
