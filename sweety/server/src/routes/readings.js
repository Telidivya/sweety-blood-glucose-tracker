const express = require('express');
const { query, withTransaction } = require('../db');
const config = require('../config');
const { HttpError } = require('../utils/errors');
const { requireAuth, requireRole } = require('../middleware/auth');
const reportCache = require('../reportCache');
const { isValidDateString, todayInTimezone } = require('../utils/dateUtils');
const {
  SLOTS,
  SLOT_KEYS,
  MESSAGES,
  MAX_READINGS_PER_DAY,
  duplicateSlotMessage,
  validateReadingInput,
} = require('../utils/validation');

const router = express.Router();
router.use(requireAuth, requireRole('patient'));

const COLUMNS = 'id, reading_date AS date, slot, value, created_at, updated_at';
// Sort slots in the order of the day rather than alphabetically.
const SLOT_ORDER = `array_position(ARRAY[${SLOT_KEYS.map((k) => `'${k}'`).join(',')}], slot)`;

const toReading = (row) => ({
  id: row.id,
  date: row.date,
  slot: row.slot,
  slotLabel: SLOTS[row.slot],
  value: row.value,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

function validateOrThrow(body) {
  const today = todayInTimezone(config.timezone);
  const result = validateReadingInput(body, today);
  if (result.error) {
    throw new HttpError(400, result.error.message, result.error.field);
  }
  return result.values;
}

function parseId(raw) {
  if (!/^\d+$/.test(raw)) throw new HttpError(404, 'Reading not found.');
  return Number(raw);
}

function parsePositiveInt(raw, fallback) {
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

// Locks the user's row so two simultaneous requests can't both pass the
// "max 4 per day" check. Must be called inside a transaction.
async function assertRoomForReading(client, userId, date, excludeId = null) {
  await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS count FROM readings
     WHERE user_id = $1 AND reading_date = $2 AND ($3::int IS NULL OR id <> $3)`,
    [userId, date, excludeId]
  );
  if (rows[0].count >= MAX_READINGS_PER_DAY) {
    throw new HttpError(409, MESSAGES.dailyLimit, 'date');
  }
}

const isDuplicateError = (err) =>
  err.code === '23505' && err.constraint === 'readings_one_per_slot';

// GET /api/readings?page=1&limit=20&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (req, res) => {
  const page = parsePositiveInt(req.query.page, 1);
  const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
  const { from, to } = req.query;

  const conditions = ['user_id = $1'];
  const params = [req.user.id];
  for (const [name, value, op] of [['from', from, '>='], ['to', to, '<=']]) {
    if (value === undefined) continue;
    if (!isValidDateString(value)) {
      throw new HttpError(400, `Query parameter "${name}" must be a valid date (YYYY-MM-DD).`);
    }
    params.push(value);
    conditions.push(`reading_date ${op} $${params.length}`);
  }
  const where = conditions.join(' AND ');

  const totalResult = await query(`SELECT COUNT(*)::int AS total FROM readings WHERE ${where}`, params);
  const total = totalResult.rows[0].total;

  const { rows } = await query(
    `SELECT ${COLUMNS} FROM readings WHERE ${where}
     ORDER BY reading_date DESC, ${SLOT_ORDER}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit]
  );

  res.json({
    data: rows.map(toReading),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

router.post('/', async (req, res) => {
  const { date, slot, value } = validateOrThrow(req.body);

  try {
    const row = await withTransaction(async (client) => {
      await assertRoomForReading(client, req.user.id, date);
      const { rows } = await client.query(
        `INSERT INTO readings (user_id, reading_date, slot, value)
         VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
        [req.user.id, date, slot, value]
      );
      return rows[0];
    });
    await reportCache.invalidate(req.user.id);
    res.status(201).json(toReading(row));
  } catch (err) {
    if (isDuplicateError(err)) throw new HttpError(409, duplicateSlotMessage(slot), 'slot');
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const { date, slot, value } = validateOrThrow(req.body);

  try {
    const row = await withTransaction(async (client) => {
      const existing = await client.query(
        'SELECT id FROM readings WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      if (!existing.rows[0]) throw new HttpError(404, 'Reading not found.');

      await assertRoomForReading(client, req.user.id, date, id);
      const { rows } = await client.query(
        `UPDATE readings
         SET reading_date = $3, slot = $4, value = $5, updated_at = now()
         WHERE id = $1 AND user_id = $2 RETURNING ${COLUMNS}`,
        [id, req.user.id, date, slot, value]
      );
      return rows[0];
    });
    await reportCache.invalidate(req.user.id);
    res.json(toReading(row));
  } catch (err) {
    if (isDuplicateError(err)) throw new HttpError(409, duplicateSlotMessage(slot), 'slot');
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const { rowCount } = await query(
    'DELETE FROM readings WHERE id = $1 AND user_id = $2',
    [id, req.user.id]
  );
  if (rowCount === 0) throw new HttpError(404, 'Reading not found.');
  await reportCache.invalidate(req.user.id);
  res.status(204).end();
});

module.exports = router;
