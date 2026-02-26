import app from './app.js';
import { config } from './config/env.js';
import { pool } from './config/db.js';
import { startNightlyAggregation } from './jobs/nightlyAggregation.js';
import { initPolicyAlertsWebSocket } from './realtime/policyAlertsWs.js';

const server = app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});

const wsServer = initPolicyAlertsWebSocket(server);

startNightlyAggregation();

const shutdown = async () => {
  console.log('Shutting down server');
  wsServer.close();
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
