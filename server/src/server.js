import app from './app.js';
import { pool } from './config/db.js';
import { startNightlyAggregation } from './jobs/nightlyAggregation.js';
import { initPolicyAlertsWebSocket } from './realtime/policyAlertsWs.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

const wsServer = initPolicyAlertsWebSocket(server);

startNightlyAggregation();

let isShuttingDown = false;
const shutdown = async (signal) => {
  if (isShuttingDown) return; 
  isShuttingDown = true;
  console.log(`Received ${signal}. Shutting down server`);

  wsServer.close();
  server.close(async () => {
    try {
      await pool.end();
      process.exit(0);
    } catch (err) {
      console.error('Error closing database pool', err);
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
