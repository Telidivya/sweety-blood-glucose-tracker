// Patient-side sharing: a patient decides which doctors may see their reports.
// (Granting access from the patient's side means a doctor can never pull data
// from someone who hasn't agreed to share it.)
const express = require('express');
const { query } = require('../db');
const { HttpError } = require('../utils/errors');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('patient'));

// GET /api/care/doctors – doctors who can see my reports
router.get('/doctors', async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email
     FROM doctor_patients dp JOIN users u ON u.id = dp.doctor_id
     WHERE dp.patient_id = $1
     ORDER BY u.name`,
    [req.user.id]
  );
  res.json({ data: rows });
});

// POST /api/care/doctors  { email } – give a doctor access
router.post('/doctors', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email) throw new HttpError(400, "Please enter your doctor's email.", 'email');

  const found = await query(
    "SELECT id, name, email FROM users WHERE email = $1 AND role = 'doctor'",
    [email]
  );
  const doctor = found.rows[0];
  if (!doctor) {
    throw new HttpError(404, 'No doctor account found with that email.', 'email');
  }

  const inserted = await query(
    `INSERT INTO doctor_patients (doctor_id, patient_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [doctor.id, req.user.id]
  );
  if (inserted.rowCount === 0) {
    throw new HttpError(409, 'This doctor already has access to your reports.', 'email');
  }
  res.status(201).json(doctor);
});

// DELETE /api/care/doctors/:doctorId – revoke access
router.delete('/doctors/:doctorId', async (req, res) => {
  if (!/^\d+$/.test(req.params.doctorId)) throw new HttpError(404, 'Doctor not found.');
  const { rowCount } = await query(
    'DELETE FROM doctor_patients WHERE doctor_id = $1 AND patient_id = $2',
    [Number(req.params.doctorId), req.user.id]
  );
  if (rowCount === 0) throw new HttpError(404, 'Doctor not found.');
  res.status(204).end();
});

module.exports = router;
