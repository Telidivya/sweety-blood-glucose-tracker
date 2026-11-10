const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { loadReport, REPORT_KINDS } = require('../services/reportLoader');

const router = express.Router();
router.use(requireAuth, requireRole('patient'));

// GET /api/reports/daily | month-to-date | monthly   ?date=YYYY-MM-DD
for (const kind of REPORT_KINDS) {
  router.get(`/${kind}`, async (req, res) => {
    const { value, status } = await loadReport(req.user.id, kind, req.query.date);
    res.set('X-Cache', status);
    res.json(value);
  });
}

module.exports = router;
