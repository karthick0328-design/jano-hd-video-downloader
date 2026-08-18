import mongoose from 'mongoose';
import app from './app';
import { env } from './config/env';
import { JobService } from './services/jobService';
import { logger } from './utils/logger';
import { startWorker } from './workers/downloadWorker';

async function bootstrap() {
  // Connect MongoDB (optional in local dev, required in production)
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    logger.info('Connected to MongoDB successfully');
  } catch (err: any) {
    logger.warn('MongoDB connection failed. Continuing in local in-memory fallback mode.', {
      error: err.message,
    });
  }

  // Start background file cleanup timer (runs every 15 minutes)
  setInterval(async () => {
    try {
      const cleaned = await JobService.cleanupExpiredFiles();
      if (cleaned > 0) {
        logger.info(`Scheduled cleanup removed ${cleaned} expired download tasks/files.`);
      }
    } catch (e: any) {
      logger.error('Error during scheduled cleanup execution', { error: e.message });
    }
  }, 15 * 60 * 1000);

  // Start BullMQ Worker process if Redis connection is active
  startWorker();

  // Listen on PORT
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 HD Downloader Backend running on http://localhost:${env.PORT}`);
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    logger.info('Shutting down server gracefully...');
    server.close(() => {
      mongoose.connection.close(false);
      logger.info('Server closed cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  logger.error('Failed to bootstrap backend application', { error: err.message });
});
