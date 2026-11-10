// Runs the reminder job immediately, without Redis/BullMQ. Handy for a demo:
//   npm run reminders:once
const { pool } = require('../db');
const { runReminderJob } = require('./reminder');

runReminderJob()
  .then(() => pool.end())
  .catch((err) => {
    console.error('Reminder job failed:', err);
    process.exit(1);
  });
