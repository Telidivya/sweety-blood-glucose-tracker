const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const readingRoutes = require('./routes/readings');
const reportRoutes = require('./routes/reports');
const careRoutes = require('./routes/care');
const doctorRoutes = require('./routes/doctor');
const { HttpError } = require('./utils/errors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/care', careRoutes);
app.use('/api/doctor', doctorRoutes);

app.use((req, res) => {
  res.status(404).json({ error: { message: 'Not found.' } });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res
      .status(err.status)
      .json({ error: { message: err.message, field: err.field } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Invalid JSON body.' } });
  }
  console.error(err);
  return res
    .status(500)
    .json({ error: { message: 'Something went wrong. Please try again.' } });
});

module.exports = app;
