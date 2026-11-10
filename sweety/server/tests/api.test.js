// These tests exercise the HTTP layer for requests that are rejected *before*
// any database access (auth + validation), so no Postgres instance is needed.
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const config = require('../src/config');

const token = jwt.sign({ sub: '1' }, config.jwtSecret);
const auth = { Authorization: `Bearer ${token}` };
const doctorAuth = {
  Authorization: `Bearer ${jwt.sign({ sub: '2', role: 'doctor' }, config.jwtSecret)}`,
};

describe('authentication guard', () => {
  test.each([
    ['get', '/api/readings'],
    ['post', '/api/readings'],
    ['get', '/api/reports/daily'],
    ['get', '/api/reports/monthly'],
  ])('%s %s requires a token', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });

  test('rejects an invalid token', async () => {
    const res = await request(app).get('/api/readings').set('Authorization', 'Bearer nope');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/register validation', () => {
  test('rejects a short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Asha', email: 'asha@example.com', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('password');
  });
});

describe('POST /api/readings validation', () => {
  const today = new Date().toISOString().slice(0, 10);

  test('requires a value', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set(auth)
      .send({ date: today, slot: 'morning' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Please enter a glucose value.');
  });

  test('rejects an out-of-range value', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set(auth)
      .send({ date: today, slot: 'morning', value: 700 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Value must be between 40 and 600 mg/dl.');
  });

  test('rejects a date far in the future', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set(auth)
      .send({ date: '2999-01-01', slot: 'morning', value: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Date cannot be in the future.');
  });
});

describe('GET /api/reports/*', () => {
  test('rejects an invalid date', async () => {
    const res = await request(app).get('/api/reports/daily?date=yesterday').set(auth);
    expect(res.status).toBe(400);
  });
});

describe('roles', () => {
  test('a doctor cannot use the patient reading and report endpoints', async () => {
    for (const path of ['/api/readings', '/api/reports/daily', '/api/care/doctors']) {
      const res = await request(app).get(path).set(doctorAuth);
      expect(res.status).toBe(403);
    }
  });

  test('a patient cannot use the doctor endpoints', async () => {
    for (const path of ['/api/doctor/patients', '/api/doctor/patients/1/reports/daily']) {
      const res = await request(app).get(path).set(auth);
      expect(res.status).toBe(403);
    }
  });

  test('doctor endpoints require a token', async () => {
    expect((await request(app).get('/api/doctor/patients')).status).toBe(401);
  });

  test('registration rejects an unknown role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Eve', email: 'eve@example.com', password: 'longenough1', role: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('role');
  });
});

describe('care and doctor request validation', () => {
  test('granting access needs an email', async () => {
    const res = await request(app).post('/api/care/doctors').set(auth).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('email');
  });

  test('a doctor asking for a malformed patient id or unknown report gets 404', async () => {
    expect((await request(app).get('/api/doctor/patients/abc/reports/daily').set(doctorAuth)).status).toBe(404);
    expect((await request(app).get('/api/doctor/patients/1/reports/yearly').set(doctorAuth)).status).toBe(404);
  });
});
