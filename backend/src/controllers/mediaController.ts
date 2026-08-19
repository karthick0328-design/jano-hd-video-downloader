import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { DownloaderRegistry } from '../downloader/DownloaderRegistry';
import { enqueueDownloadJob } from '../queues/downloadQueue';
import { JobService } from '../services/jobService';
import { logger } from '../utils/logger';

export class MediaController {
  /**
   * POST /api/media/analyze
   */
  public static async analyzeMedia(req: Request, res: Response) {
    const { url } = req.body;
    logger.info('Analyze media request received', { url });

    const service = DownloaderRegistry.getService(url);
    if (!service) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid YouTube, Instagram, Facebook, or ShareChat URL.',
      });
    }

    try {
      const result = await service.analyze(url);

      if (!result.success) {
        return res.status(422).json({
          success: false,
          error: result.error || 'Failed to analyze video URL.',
        });
      }

      return res.json(result);
    } catch (err: any) {
      logger.error('Error during media analysis', { url, error: err.message });
      return res.status(500).json({
        success: false,
        error: 'An error occurred while inspecting the video. Please try again.',
      });
    }
  }

  /**
   * POST /api/download
   */
  public static async createDownload(req: Request, res: Response) {
    const { url, quality = '1080p', format = 'mp4', title = '', formatId } = req.body;
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    logger.info('Create download request', { jobId, url, quality, format, formatId });

    const service = DownloaderRegistry.getService(url);
    if (!service) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid YouTube, Instagram, Facebook, or ShareChat URL.',
      });
    }

    try {
      // Save job in DB / in-memory store
      await JobService.createJob(jobId, url, quality, format, title);

      // Enqueue job for background worker processing
      await enqueueDownloadJob({
        jobId,
        url,
        platform: service.platform,
        quality,
        format,
        formatId,
      });

      return res.status(202).json({
        success: true,
        jobId,
        message: 'Download job queued successfully.',
      });
    } catch (err: any) {
      logger.error('Failed to create download job', { jobId, error: err.message });
      return res.status(500).json({
        success: false,
        error: 'Failed to initialize download job. Please try again.',
      });
    }
  }

  /**
   * GET /api/download/:jobId
   */
  public static async getDownloadStatus(req: Request, res: Response) {
    const { jobId } = req.params;
    const job = await JobService.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Download job not found or expired.',
      });
    }

    const isCompleted = job.status === 'completed';
    const isFailed = job.status === 'failed';

    return res.json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      progress: job.progress || 0,
      title: job.title || '',
      quality: job.quality,
      format: job.format,
      fileSize: job.fileSize || 0,
      downloadUrl: isCompleted ? `/api/download/${job.jobId}/file` : null,
      error: isFailed ? job.errorMessage || 'Download processing failed.' : null,
      completedAt: job.completedAt,
      expiresAt: job.expiresAt,
    });
  }

  /**
   * GET /api/download/:jobId/file
   */
  public static async downloadFile(req: Request, res: Response) {
    const { jobId } = req.params;
    const job = await JobService.getJob(jobId);

    if (!job || job.status !== 'completed' || !job.filePath) {
      return res.status(404).json({
        success: false,
        error: 'Download file not available or has expired. Please analyze the URL again.',
      });
    }

    if (!fs.existsSync(job.filePath)) {
      return res.status(410).json({
        success: false,
        error: 'Temporary download file has expired and been cleaned up.',
      });
    }

    const safeTitle = (job.title || 'video')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 60);

    const filename = `${safeTitle}_${job.quality || 'HD'}.${job.format || 'mp4'}`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'video/mp4');

    const fileStream = fs.createReadStream(job.filePath);
    fileStream.pipe(res);
  }
}
