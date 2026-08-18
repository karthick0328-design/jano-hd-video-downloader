import { Job, Worker } from 'bullmq';
import { env } from '../config/env';
import { DownloadJobOptions } from '../downloader/types';
import { redisConnection } from '../queues/downloadQueue';
import { JobService } from '../services/jobService';
import { logger } from '../utils/logger';

export function startWorker(): Worker<DownloadJobOptions> | null {
  if (!redisConnection) {
    logger.warn('Redis connection not initialized. Worker will not start in Redis mode.');
    return null;
  }

  logger.info('Starting BullMQ worker process', {
    concurrency: env.MAX_CONCURRENT_JOBS,
  });

  const worker = new Worker<DownloadJobOptions>(
    'download-queue',
    async (job: Job<DownloadJobOptions>) => {
      logger.info('Worker picked up job', { jobId: job.data.jobId });
      return await JobService.processJob(job.data);
    },
    {
      connection: redisConnection,
      concurrency: env.MAX_CONCURRENT_JOBS,
      limiter: {
        max: env.MAX_CONCURRENT_JOBS,
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job) => {
    logger.info('Worker completed job', { jobId: job.data.jobId });
  });

  worker.on('failed', (job, err) => {
    logger.error('Worker job failed', {
      jobId: job?.data.jobId,
      error: err.message,
    });
  });

  return worker;
}

if (require.main === module) {
  startWorker();
}
