const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const config = require('../config');
const { HttpError } = require('../utils/errors');
const { validateRegistration } = require('../utils/validation');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;
// Compared against when the email is unknown, so response time doesn't reveal
// whether an account exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', SALT_ROUNDS);

const publicUser = (row) => ({ id: row.id, name: row.name, email: row.email, role: row.role });
const signToken = (user) =>
  jwt.sign({ sub: String(user.id), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

router.post('/register', async (req, res) => {
  const problem = validateRegistration(req.body);
  if (problem) throw new HttpError(400, problem.message, problem.field);

  const name = req.body.name.trim();
  const email = req.body.email.trim().toLowerCase();
  const role = req.body.role || 'patient';
  const passwordHash = await bcrypt.hash(req.body.password, SALT_ROUNDS);

  try {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id, name, email, role`,
      [name, email, passwordHash, role]
    );
    const user = publicUser(rows[0]);
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    if (err.code === '23505') {
      throw new HttpError(409, 'An account with this email already exists.', 'email');
    }
    throw err;
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw new HttpError(400, 'Please enter your email and password.');
  }

  const { rows } = await query(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
    [email.trim().toLowerCase()]
  );
  const row = rows[0];
  const matches = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);
  if (!row || !matches) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  const user = publicUser(row);
  res.json({ token: signToken(user), user });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT id, name, email, role FROM users WHERE id = $1', [
    req.user.id,
  ]);
  if (!rows[0]) throw new HttpError(401, 'Please log in to continue.');
  res.json({ user: publicUser(rows[0]) });
});

module.exports = router;
