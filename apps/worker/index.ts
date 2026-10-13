import dotenv from 'dotenv';
import { initializeWorker } from '../../src/server/worker';
import { logger } from '../../src/server/services/logger';

dotenv.config();

logger.info('Starting Accord Standalone Background Worker Process...');
initializeWorker();

// Keep worker alive
setInterval(() => {
  logger.debug('Worker heartbeat: active and listening on queues.');
}, 60000);
