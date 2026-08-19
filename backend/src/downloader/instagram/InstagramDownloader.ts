import fs from 'fs';
import path from 'path';
import { env } from '../../config/env';
import { FFmpegService } from '../../ffmpeg/FFmpegService';
import { logger } from '../../utils/logger';
import { normalizeAndExtractMediaInfo } from '../../utils/urlNormalizer';
import { YtDlpDumpJson, YtDlpWrapper } from '../../utils/ytdlpWrapper';
import { DownloaderService } from '../DownloaderService';
import {
  DownloadJobOptions,
  DownloadJobResult,
  MediaAnalysisResult,
  PlatformType,
  QualityFormat,
} from '../types';

export class InstagramDownloader extends DownloaderService {
  readonly platform: PlatformType = 'instagram';

  public canHandle(url: string): boolean {
    if (!url) return false;
    const lower = url.trim().toLowerCase();
    return (
      lower.includes('instagram.com/reel/') ||
      lower.includes('instagram.com/reels/') ||
      lower.includes('instagram.com/p/') ||
      lower.includes('instagram.com/tv/') ||
      lower.includes('instagr.am/')
    );
  }

  public async getFormats(url: string): Promise<QualityFormat[]> {
    const analysis = await this.analyze(url);
    return analysis.formats;
  }

  public async analyze(url: string): Promise<MediaAnalysisResult> {
    const norm = normalizeAndExtractMediaInfo(url);
    if (!norm.isValid) {
      return {
        success: false,
        url,
        normalizedUrl: url,
        platform: 'instagram',
        title: '',
        thumbnail: '',
        duration: 0,
        maxAvailableQuality: '',
        formats: [],
        error: norm.error || 'Invalid Instagram URL.',
      };
    }

    const reelId = norm.mediaId;
    const targetUrl = norm.normalizedUrl;

    logger.info(`[ANALYSIS] [PLATFORM] instagram [REEL_ID] ${reelId || 'none'} [URL] ${targetUrl}`);

    try {
      const dump: YtDlpDumpJson = await YtDlpWrapper.dumpJson(targetUrl);

      // Section 7 Requirement: Verify analysis result corresponds to reelId
      const extractedId = dump.id || dump.display_id || dump.webpage_url_basename;
      if (reelId && extractedId && extractedId.toLowerCase() !== reelId.toLowerCase()) {
        logger.error(`[VERIFICATION_FAILED] Extracted ID ${extractedId} does not match Reel ID ${reelId}`);
        return {
          success: false,
          url,
          normalizedUrl: targetUrl,
          platform: 'instagram-reel',
          mediaId: reelId,
          title: '',
          thumbnail: '',
          duration: 0,
          maxAvailableQuality: '',
          formats: [],
          error: 'Unable to verify that the metadata matches the requested Instagram Reel ID.',
        };
      }

      const title = dump.title || (reelId ? `Instagram Reel (${reelId})` : 'Instagram Video');
      let thumbnail = dump.thumbnail || '';
      if (!thumbnail && dump.thumbnails && dump.thumbnails.length > 0) {
        thumbnail = dump.thumbnails[dump.thumbnails.length - 1].url;
      }
      const duration = Math.round(dump.duration || 0);

      const rawFormats = dump.formats || [];
      const formatMap = new Map<number, QualityFormat>();

      for (const fmt of rawFormats) {
        const hasVideo = fmt.vcodec !== 'none' && !!fmt.vcodec;
        if (!hasVideo && rawFormats.length > 1) continue;

        const height = fmt.height || (fmt.format_note?.includes('1080') ? 1080 : 720);
        const qualityLabel = `${height}p`;
        const hasAudio = fmt.acodec !== 'none' && !!fmt.acodec;

        if (!formatMap.has(height)) {
          formatMap.set(height, {
            quality: qualityLabel,
            height,
            format: 'mp4',
            formatId: fmt.format_id || 'best',
            hasVideo: true,
            hasAudio,
            needsMerge: !hasAudio,
            filesizeApprox: fmt.filesize || fmt.filesize_approx,
            fps: fmt.fps,
            vcodec: fmt.vcodec,
            acodec: fmt.acodec,
          });
        }
      }

      if (formatMap.size === 0) {
        formatMap.set(1080, {
          quality: '1080p',
          height: 1080,
          format: 'mp4',
          formatId: 'best',
          hasVideo: true,
          hasAudio: true,
          needsMerge: false,
        });
      }

      const sortedFormats = Array.from(formatMap.values()).sort(
        (a, b) => b.height - a.height
      );

      const maxAvailableQuality =
        sortedFormats.length > 0 ? sortedFormats[0].quality : '1080p';

      return {
        success: true,
        url,
        normalizedUrl: targetUrl,
        platform: reelId ? 'instagram-reel' : 'instagram',
        mediaId: reelId,
        title,
        thumbnail,
        duration,
        maxAvailableQuality,
        formats: sortedFormats,
      };
    } catch (err: any) {
      logger.error('Instagram analysis failed', { url: targetUrl, error: err.message });
      return {
        success: false,
        url,
        normalizedUrl: targetUrl,
        platform: 'instagram',
        mediaId: reelId,
        title: '',
        thumbnail: '',
        duration: 0,
        maxAvailableQuality: '',
        formats: [],
        error: err.message || 'Failed to analyze Instagram URL.',
      };
    }
  }

  public async executeDownload(
    options: DownloadJobOptions,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<DownloadJobResult> {
    const reelId = options.mediaId;
    const downloadUrl = options.normalizedUrl || options.url;

    logger.info(
      `[JOB] ${options.jobId} [PLATFORM] instagram [REEL_ID] ${reelId || 'none'} [URL] ${downloadUrl} [QUALITY] ${options.quality} [STATUS] processing`
    );

    // Section 5 Requirement: Isolated directory per jobId
    const jobDir = path.join(env.TEMP_DOWNLOAD_DIR, options.jobId);
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }

    const outputTemplate = path.join(jobDir, 'media.%(ext)s');

    onProgress?.(15, 'Downloading Instagram media streams');

    const files = await YtDlpWrapper.downloadMedia(
      downloadUrl,
      outputTemplate,
      options.formatId,
      options.quality,
      (dlPercent) => {
        onProgress?.(15 + Math.floor(dlPercent * 0.5), 'Downloading media streams');
      }
    );

    if (!files || files.length === 0) {
      logger.error(`[JOB] ${options.jobId} [STATUS] failed - No media files downloaded`);
      throw new Error('Download failed: No media file retrieved for Instagram Reel.');
    }

    let videoFile: string | undefined;
    let audioFile: string | undefined;

    for (const f of files) {
      try {
        const probe = await FFmpegService.probeFile(f);
        if (probe.videoCodec && probe.videoCodec !== 'unknown' && probe.height > 0) {
          videoFile = f;
        } else if (probe.audioCodec && probe.audioCodec !== 'unknown' && probe.height === 0) {
          audioFile = f;
        }
      } catch (e) {
        // ignore probe error
      }
    }

    let finalFilePath = videoFile || files[0];

    if (files.length > 1 && videoFile && audioFile && videoFile !== audioFile) {
      onProgress?.(70, 'Merging HD video picture and audio streams using FFmpeg');
      const mergedPath = path.join(jobDir, `final_${options.jobId}.mp4`);

      finalFilePath = await FFmpegService.mergeStreams(
        videoFile,
        audioFile,
        mergedPath,
        (mergePercent) => {
          onProgress?.(70 + Math.floor(mergePercent * 0.2), 'Merging video and audio');
        }
      );
    }

    onProgress?.(92, 'Validating output media file with ffprobe');

    const probe = await FFmpegService.probeFile(finalFilePath);

    // Section 8 Requirement: Strict Media Verification
    const fileExists = fs.existsSync(finalFilePath);
    const hasValidSize = probe.size > 0;
    const hasValidVideo = probe.videoCodec !== 'unknown' || probe.duration > 0;

    if (!fileExists || !hasValidSize || !hasValidVideo) {
      logger.error(`[JOB] ${options.jobId} [STATUS] failed - Verification failed for Reel ${reelId}`);
      throw new Error('Unable to verify that the downloaded media matches the requested Instagram Reel.');
    }

    logger.info(
      `[JOB] ${options.jobId} [PLATFORM] instagram [REEL_ID] ${reelId || 'none'} [URL] ${downloadUrl} [QUALITY] ${options.quality} [STATUS] completed`
    );

    onProgress?.(100, 'Processing completed');

    const safeReelId = reelId ? `_${reelId}` : '';

    return {
      jobId: options.jobId,
      normalizedUrl: downloadUrl,
      mediaId: reelId,
      filePath: finalFilePath,
      fileName: `Instagram${safeReelId}_${options.quality}.mp4`,
      fileSize: probe.size,
      duration: Math.round(probe.duration),
      resolution: `${probe.height || 1080}p`,
      videoCodec: probe.videoCodec,
      audioCodec: probe.audioCodec,
    };
  }
}
