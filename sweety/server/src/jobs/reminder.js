const config = require('../config');
const { query } = require('../db');
const { todayInTimezone } = require('../utils/dateUtils');
const { MAX_READINGS_PER_DAY } = require('../utils/validation');

// Patients (doctors don't log readings) with fewer than 4 readings on `date`.
async function findPatientsNeedingReminder(date, db = query) {
  const { rows } = await db(
    `SELECT u.id, u.name, u.email, COUNT(r.id)::int AS count
     FROM users u
     LEFT JOIN readings r ON r.user_id = u.id AND r.reading_date = $1
     WHERE u.role = 'patient'
     GROUP BY u.id
     HAVING COUNT(r.id) < $2
     ORDER BY u.id`,
    [date, MAX_READINGS_PER_DAY]
  );
  return rows;
}

function formatReminder(patient, date) {
  const missing = MAX_READINGS_PER_DAY - patient.count;
  return (
    `[reminder] ${patient.name} <${patient.email}>: ${patient.count} of ` +
    `${MAX_READINGS_PER_DAY} readings logged for ${date} - ${missing} still to go.`
  );
}

// The job itself. "Sending" a reminder is a log line, as the brief suggests;
// swap `log` for an email/SMS/push sender to make it real.
async function runReminderJob({
  date = todayInTimezone(config.timezone),
  db = query,
  log = console.log,
} = {}) {
  const patients = await findPatientsNeedingReminder(date, db);
  patients.forEach((patient) => log(formatReminder(patient, date)));
  log(`[reminder] ${date}: ${patients.length} patient(s) reminded.`);
  return patients;
}

module.exports = { findPatientsNeedingReminder, formatReminder, runReminderJob };
