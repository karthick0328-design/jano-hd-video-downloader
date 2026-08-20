import mongoose from 'mongoose';
import app from './app';
import { env } from './config/env';
import { JobService } from './services/jobService';
import { logger } from './utils/logger';
import { startWorker } from './workers/downloadWorker';

async function bootstrap() {
  // 1. Start HTTP server IMMEDIATELY on 0.0.0.0 so Cloud/Render health checks pass instantly
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : (env.PORT || 5000);
  const server = app.listen(port, '0.0.0.0', () => {
    logger.info(`🚀 HD Downloader Backend running on port ${port}`);
  });

  // 2. Connect MongoDB asynchronously (optional)
  try {
    if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('localhost')) {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 2000,
      });
      logger.info('Connected to MongoDB successfully');
    }
  } catch (err: any) {
    logger.warn('MongoDB connection skipped/failed. Running in memory fallback mode.', {
      error: err.message,
    });
  }

  // 3. Start background file cleanup timer (runs every 15 minutes)
  setInterval(async () => {
    try {
      const cleaned = await JobService.cleanupExpiredFiles();
      if (cleaned > 0) {
        logger.info(`Scheduled cleanup removed ${cleaned} expired download tasks/files.`);
      }
    } catch (e: any) {}
  }, 15 * 60 * 1000);

  // 4. Start Worker process if available
  try {
    startWorker();
  } catch (e: any) {}

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
