import fs from 'fs';
import mongoose from 'mongoose';
import path from 'path';
import { env } from '../config/env';
import { DownloaderRegistry } from '../downloader/DownloaderRegistry';
import { DownloadJobOptions } from '../downloader/types';
import { Download, DownloadStatus, IDownload } from '../models/Download';
import { logger } from '../utils/logger';

// In-memory job state store for local fallback when MongoDB / Redis are offline
const inMemoryJobs = new Map<string, Partial<IDownload>>();

export class JobService {
  /**
   * Create new download job record
   */
  public static async createJob(
    jobId: string,
    url: string,
    quality: string,
    format: string,
    title: string = ''
  ): Promise<Partial<IDownload>> {
    const platform = DownloaderRegistry.detectPlatform(url);
    const expiresAt = new Date(Date.now() + env.TEMP_FILE_TTL_SECONDS * 1000);

    const initialData: Partial<IDownload> = {
      jobId,
      sourceUrl: url,
      platform,
      title,
      quality,
      format,
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
      expiresAt,
    };

    if (mongoose.connection.readyState === 1) {
      try {
        const doc = await Download.create(initialData);
        return doc.toObject();
      } catch (err: any) {
        logger.warn('Database save failed, using in-memory store for job', {
          jobId,
          error: err.message,
        });
      }
    }

    inMemoryJobs.set(jobId, initialData);
    return initialData;
  }

  /**
   * Update job status and progress
   */
  public static async updateJobStatus(
    jobId: string,
    status: DownloadStatus,
    progress: number = 0,
    additional?: {
      filePath?: string;
      fileSize?: number;
      errorMessage?: string;
      title?: string;
    }
  ): Promise<void> {
    const update: any = { status, progress };

    if (status === 'completed') {
      update.completedAt = new Date();
    }

    if (additional?.filePath) update.filePath = additional.filePath;
    if (additional?.fileSize) update.fileSize = additional.fileSize;
    if (additional?.errorMessage) update.errorMessage = additional.errorMessage;
    if (additional?.title) update.title = additional.title;

    // Update in-memory map first
    const existing = inMemoryJobs.get(jobId) || {};
    inMemoryJobs.set(jobId, { ...existing, ...update });

    if (mongoose.connection.readyState === 1) {
      try {
        await Download.updateOne({ jobId }, { $set: update });
      } catch (err: any) {
        logger.warn('Failed to update DB job status', { jobId, error: err.message });
      }
    }
  }

  /**
   * Get job status and details
   */
  public static async getJob(jobId: string): Promise<Partial<IDownload> | null> {
    if (mongoose.connection.readyState === 1) {
      try {
        const doc = await Download.findOne({ jobId });
        if (doc) return doc.toObject();
      } catch (err) {
        // Fallback check
      }
    }

    return inMemoryJobs.get(jobId) || null;
  }

  /**
   * Execute actual download processing (called by BullMQ worker or fallback queue)
   */
  public static async processJob(
    jobOptions: DownloadJobOptions
  ): Promise<{ filePath: string; fileSize: number }> {
    const { jobId, url, quality, format } = jobOptions;

    logger.info('Starting job processing', { jobId, url, quality });

    await this.updateJobStatus(jobId, 'processing', 5);

    const service = DownloaderRegistry.getService(url);
    if (!service) {
      const errorMsg = 'Unsupported platform or invalid video URL.';
      await this.updateJobStatus(jobId, 'failed', 0, { errorMessage: errorMsg });
      throw new Error(errorMsg);
    }

    try {
      const result = await service.executeDownload(jobOptions, (progress, stage) => {
        if (progress >= 100) return;
        const nextStatus: DownloadStatus = stage.includes('Merging')
          ? 'merging'
          : 'processing';
        this.updateJobStatus(jobId, nextStatus, progress);
      });

      // Max file size enforcement
      const maxSizeBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;
      if (result.fileSize > maxSizeBytes) {
        throw new Error(
          `Downloaded media file exceeds maximum allowed size of ${env.MAX_FILE_SIZE_MB}MB.`
        );
      }

      await this.updateJobStatus(jobId, 'completed', 100, {
        filePath: result.filePath,
        fileSize: result.fileSize,
      });

      return {
        filePath: result.filePath,
        fileSize: result.fileSize,
      };
    } catch (err: any) {
      logger.error('Job processing failed', { jobId, error: err.message });
      await this.updateJobStatus(jobId, 'failed', 0, {
        errorMessage: err.message || 'Processing failed.',
      });
      throw err;
    }
  }

  /**
   * Cleanup expired temporary files and old DB records
   */
  public static async cleanupExpiredFiles(): Promise<number> {
    let count = 0;
    const now = new Date();

    // Clean up local temp directory files older than TTL
    const tempDir = env.TEMP_DOWNLOAD_DIR;
    if (fs.existsSync(tempDir)) {
      const jobDirs = fs.readdirSync(tempDir);
      for (const dir of jobDirs) {
        const fullPath = path.join(tempDir, dir);
        try {
          const stats = fs.statSync(fullPath);
          const ageMs = now.getTime() - stats.mtime.getTime();
          if (ageMs > env.TEMP_FILE_TTL_SECONDS * 1000) {
            fs.rmSync(fullPath, { recursive: true, force: true });
            count++;
          }
        } catch (e) {
          // ignore cleanup errors
        }
      }
    }

    // Clean up DB records
    try {
      await Download.deleteMany({ expiresAt: { $lt: now } });
    } catch (e) {
      // ignore
    }

    return count;
  }
}
