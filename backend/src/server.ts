import './config/index.js';
import app from './app.js';
import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

async function main() {
  await prisma.$connect();
  logger.info('Database connected');

  app.listen(config.port, () => {
    logger.info(`Server running on http://localhost:${config.port} [${config.nodeEnv}]`);
  });
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
