import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { DownloaderRegistry } from '../downloader/DownloaderRegistry';
import { enqueueDownloadJob } from '../queues/downloadQueue';
import { JobService } from '../services/jobService';
import { logger } from '../utils/logger';
import { normalizeAndExtractMediaInfo } from '../utils/urlNormalizer';

export class MediaController {
  /**
   * POST /api/media/analyze
   */
  public static async analyzeMedia(req: Request, res: Response) {
    const { url } = req.body;
    const norm = normalizeAndExtractMediaInfo(url);

    logger.info(`[ANALYSIS] [PLATFORM] ${norm.platform} [REEL_ID] ${norm.mediaId || 'none'} [URL] ${norm.normalizedUrl}`);

    const service = DownloaderRegistry.getService(norm.normalizedUrl || url);
    if (!service) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid YouTube, Instagram, Facebook, or ShareChat URL.',
      });
    }

    try {
      const result = await service.analyze(norm.normalizedUrl || url);

      if (!result.success) {
        return res.status(422).json({
          success: false,
          error: result.error || 'Failed to analyze video URL.',
        });
      }

      return res.json(result);
    } catch (err: any) {
      logger.error('Error during media analysis', { url: norm.normalizedUrl, error: err.message });
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
    const norm = normalizeAndExtractMediaInfo(url);

    const crypto = require('crypto');
    const jobId = `job_${crypto.randomUUID()}`;

    logger.info(
      `[CREATE_JOB] ${jobId} [PLATFORM] ${norm.platform} [REEL_ID] ${norm.mediaId || 'none'} [URL] ${norm.normalizedUrl} [QUALITY] ${quality}`
    );

    const service = DownloaderRegistry.getService(norm.normalizedUrl || url);
    if (!service) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid YouTube, Instagram, Facebook, or ShareChat URL.',
      });
    }

    try {
      // Save job in DB / in-memory store
      await JobService.createJob(jobId, norm.normalizedUrl || url, quality, format, title);

      // Enqueue job for background worker processing
      await enqueueDownloadJob({
        jobId,
        url: norm.normalizedUrl || url,
        normalizedUrl: norm.normalizedUrl || url,
        platform: service.platform,
        mediaId: norm.mediaId,
        quality,
        format,
        formatId,
      });

      const safeTitle = (title || 'Video')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 40);

      const downloadUrl = `/api/download/${jobId}/file?u=${encodeURIComponent(norm.normalizedUrl || url)}&q=${quality}`;

      return res.status(202).json({
        success: true,
        jobId,
        normalizedUrl: norm.normalizedUrl,
        mediaId: norm.mediaId,
        downloadUrl,
        filename: `JANO_HD_${safeTitle}_${quality}.mp4`,
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

    const targetUrl = (job as any).normalizedUrl || job.sourceUrl || '';
    const downloadUrl = `/api/download/${job.jobId}/file?u=${encodeURIComponent(targetUrl)}&q=${job.quality}`;

    return res.json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      progress: job.progress || 0,
      title: job.title || '',
      quality: job.quality,
      format: job.format,
      fileSize: job.fileSize || 0,
      downloadUrl: isCompleted ? downloadUrl : null,
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
    const fallbackUrl = req.query.u ? (req.query.u as string) : '';
    const job = await JobService.getJob(jobId);

    if (job && job.status === 'completed' && job.filePath && fs.existsSync(job.filePath)) {
      const normalizedFilePath = path.normalize(job.filePath);
      const safeTitle = (job.title || 'Video')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 40);

      const filename = `JANO_HD_${safeTitle}_${job.quality || '1080p'}.${job.format || 'mp4'}`;

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'video/mp4');

      const fileStream = fs.createReadStream(normalizedFilePath);
      return fileStream.pipe(res);
    }

    // Stateless fallback: Redirect directly to normalized video URL if file is not on local worker
    if (fallbackUrl && (fallbackUrl.startsWith('http://') || fallbackUrl.startsWith('https://'))) {
      return res.redirect(302, fallbackUrl);
    }

    // Never return JSON for file download requests
    res.setHeader('Content-Type', 'text/plain');
    return res.status(404).send('Download file not available. Please analyze the URL again.');
  }
}
