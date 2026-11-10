// Doctor-side, read-only: list assigned patients and view their reports.
const express = require('express');
const { query } = require('../db');
const { HttpError } = require('../utils/errors');
const { requireAuth, requireRole } = require('../middleware/auth');
const { loadReport, REPORT_KINDS } = require('../services/reportLoader');

const router = express.Router();
router.use(requireAuth, requireRole('doctor'));

// GET /api/doctor/patients
router.get('/patients', async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email
     FROM doctor_patients dp JOIN users u ON u.id = dp.patient_id
     WHERE dp.doctor_id = $1
     ORDER BY u.name`,
    [req.user.id]
  );
  res.json({ data: rows });
});

// GET /api/doctor/patients/:patientId/reports/:kind?date=YYYY-MM-DD
router.get('/patients/:patientId/reports/:kind', async (req, res) => {
  const { patientId, kind } = req.params;
  if (!/^\d+$/.test(patientId) || !REPORT_KINDS.includes(kind)) {
    throw new HttpError(404, 'Not found.');
  }

  // The access check is the whole point of this route: a doctor only sees
  // patients who have granted them access.
  const access = await query(
    'SELECT 1 FROM doctor_patients WHERE doctor_id = $1 AND patient_id = $2',
    [req.user.id, Number(patientId)]
  );
  if (access.rowCount === 0) {
    throw new HttpError(403, "You don't have access to this patient's reports.");
  }

  const { value, status } = await loadReport(Number(patientId), kind, req.query.date);
  res.set('X-Cache', status);
  res.json(value);
});

module.exports = router;
