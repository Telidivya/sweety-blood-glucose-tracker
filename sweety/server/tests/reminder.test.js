const {
  findPatientsNeedingReminder,
  formatReminder,
  runReminderJob,
} = require('../src/jobs/reminder');

const patients = [
  { id: 1, name: 'Asha', email: 'asha@example.com', count: 0 },
  { id: 2, name: 'Ravi', email: 'ravi@example.com', count: 3 },
];

function fakeDb(rows) {
  const db = async (sql, params) => { db.calls.push({ sql, params }); return { rows }; };
  db.calls = [];
  return db;
}

describe('daily reminder job', () => {
  test('asks the database for patients with fewer than 4 readings on the given date', async () => {
    const db = fakeDb(patients);
    const result = await findPatientsNeedingReminder('2026-10-15', db);

    expect(result).toEqual(patients);
    expect(db.calls[0].params).toEqual(['2026-10-15', 4]);
    expect(db.calls[0].sql).toContain("u.role = 'patient'");
    expect(db.calls[0].sql).toContain('HAVING COUNT(r.id) < $2');
  });

  test('formats a readable reminder line', () => {
    expect(formatReminder(patients[1], '2026-10-15')).toBe(
      '[reminder] Ravi <ravi@example.com>: 3 of 4 readings logged for 2026-10-15 - 1 still to go.'
    );
    expect(formatReminder(patients[0], '2026-10-15')).toContain('4 still to go');
  });

  test('logs one line per patient plus a summary', async () => {
    const lines = [];
    const result = await runReminderJob({ date: '2026-10-15', db: fakeDb(patients), log: (l) => lines.push(l) });

    expect(result).toHaveLength(2);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('Asha');
    expect(lines[2]).toBe('[reminder] 2026-10-15: 2 patient(s) reminded.');
  });

  test('logs only the summary when everyone is up to date', async () => {
    const lines = [];
    await runReminderJob({ date: '2026-10-15', db: fakeDb([]), log: (l) => lines.push(l) });
    expect(lines).toEqual(['[reminder] 2026-10-15: 0 patient(s) reminded.']);
  });
});
