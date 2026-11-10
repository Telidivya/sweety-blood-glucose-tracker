// Background worker: schedules the daily reminder and processes it.
// Run it as its own process:  npm run worker   (needs REDIS_URL and Postgres)
const IORedis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const config = require('./config');
const { pool } = require('./db');
const { runReminderJob } = require('./jobs/reminder');

const QUEUE_NAME = 'reminders';
const SCHEDULER_ID = 'daily-reading-reminder';

async function main() {
  if (!config.redisUrl) {
    throw new Error('REDIS_URL must be set to run the worker.');
  }

  // BullMQ needs maxRetriesPerRequest: null on its connections.
  const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue(QUEUE_NAME, { connection });

  // Idempotent: re-running the worker updates the schedule instead of duplicating it.
  await queue.upsertJobScheduler(
    SCHEDULER_ID,
    { pattern: config.reminderCron, tz: config.timezone },
    {
      name: 'send-reminders',
      opts: { removeOnComplete: 50, removeOnFail: 50 },
    }
  );

  const worker = new Worker(QUEUE_NAME, async () => runReminderJob(), { connection });
  worker.on('completed', (job) => console.log(`[worker] job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[worker] job ${job?.id} failed:`, err.message));

  console.log(
    `[worker] reminder scheduled "${config.reminderCron}" (${config.timezone}); waiting for jobs...`
  );

  const shutdown = async () => {
    console.log('[worker] shutting down...');
    await worker.close();
    await queue.close();
    await connection.quit();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[worker] failed to start:', err);
  process.exit(1);
});
