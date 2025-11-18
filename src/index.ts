import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`🚀 Lencopay Payment API started successfully`);
  logger.info(`📡 Server running on port ${config.port}`);
  logger.info(`🌍 Environment: ${config.nodeEnv}`);
  logger.info(`💳 Currency: ${config.payment.defaultCurrency}`);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('Server closed. Exiting process.');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection', { reason });
  gracefulShutdown('UNHANDLED_REJECTION');
});

export default app;
"94246ce346bbe6fb3db96c8176e76268a8642be5842ee76ba6b762253504c385"

"'993bed87f9d592566a6cce2cefd79363d1b7e95af3e1e6642b294ce5fc8c59f6"