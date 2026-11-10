const app = require('./app');
const config = require('./config');
const migrate = require('./migrate');

async function start() {
  // Retry a few times so the API can start while Postgres is still booting.
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      await migrate();
      break;
    } catch (err) {
      if (attempt === 10) throw err;
      console.log(`Waiting for database (attempt ${attempt})...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  app.listen(config.port, () => {
    console.log(`Sweety API listening on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
