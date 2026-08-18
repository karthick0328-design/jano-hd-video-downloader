import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { DownloadJobOptions } from '../downloader/types';
import { JobService } from '../services/jobService';
import { logger } from '../utils/logger';

let downloadQueue: Queue<DownloadJobOptions> | null = null;
let redisConnection: Redis | null = null;
let isRedisAvailable = false;

if (env.NODE_ENV !== 'test') {
  try {
    redisConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 1) {
          logger.warn('Redis connection retry limit reached. Switching to in-memory processing.');
          return null;
        }
        return 100;
      },
    });

    redisConnection.on('ready', () => {
      isRedisAvailable = true;
      logger.info('Redis connection established successfully for BullMQ');
    });

    redisConnection.on('error', (err) => {
      isRedisAvailable = false;
      logger.warn('Redis error encountered', { error: err.message });
    });

    downloadQueue = new Queue<DownloadJobOptions>('download-queue', {
      connection: redisConnection,
    });
  } catch (err: any) {
    logger.warn('Failed to initialize Redis client, fallback queue will be used', {
      error: err.message,
    });
  }
}

export async function enqueueDownloadJob(
  jobOptions: DownloadJobOptions
): Promise<void> {
  if (isRedisAvailable && downloadQueue) {
    logger.info('Enqueuing job to BullMQ queue', { jobId: jobOptions.jobId });
    await downloadQueue.add('process-media', jobOptions, {
      jobId: jobOptions.jobId,
    });
  } else {
    logger.info('Redis not available. Processing job asynchronously in-memory worker fallback', {
      jobId: jobOptions.jobId,
    });
    // In-memory background task fallback
    setImmediate(async () => {
      try {
        await JobService.processJob(jobOptions);
      } catch (err: any) {
        logger.error('In-memory job processing failed', {
          jobId: jobOptions.jobId,
          error: err.message,
        });
      }
    });
  }
}

export { downloadQueue, isRedisAvailable, redisConnection };
