import fs from 'fs';
import path from 'path';
import { env } from '../../config/env';
import { FFmpegService } from '../../ffmpeg/FFmpegService';
import { logger } from '../../utils/logger';
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
    try {
      const dump: YtDlpDumpJson = await YtDlpWrapper.dumpJson(url);

      const title = dump.title || 'Instagram Video';
      let thumbnail = dump.thumbnail || '';
      if (!thumbnail && dump.thumbnails && dump.thumbnails.length > 0) {
        thumbnail = dump.thumbnails[dump.thumbnails.length - 1].url;
      }
      const duration = Math.round(dump.duration || 0);

      const rawFormats = dump.formats || [];
      const formatMap = new Map<number, QualityFormat>();

      // Filter video streams
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
        platform: 'instagram',
        title,
        thumbnail,
        duration,
        maxAvailableQuality,
        formats: sortedFormats,
      };
    } catch (err: any) {
      logger.error('Instagram analysis failed', { url, error: err.message });
      return {
        success: false,
        url,
        platform: 'instagram',
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
    const jobDir = path.join(env.TEMP_DOWNLOAD_DIR, options.jobId);
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }

    const outputTemplate = path.join(jobDir, 'media.%(ext)s');

    onProgress?.(15, 'Downloading Instagram media streams');

    const files = await YtDlpWrapper.downloadMedia(
      options.url,
      outputTemplate,
      options.formatId,
      options.quality,
      (dlPercent) => {
        onProgress?.(15 + Math.floor(dlPercent * 0.5), 'Downloading media streams');
      }
    );

    if (!files || files.length === 0) {
      throw new Error('Download failed: No media file retrieved for Instagram URL.');
    }

    logger.info('Instagram downloaded raw files', { jobId: options.jobId, files });

    let videoFile: string | undefined;
    let audioFile: string | undefined;

    // Probe each file to accurately identify video stream file and audio stream file
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

    onProgress?.(100, 'Processing completed');

    return {
      jobId: options.jobId,
      filePath: finalFilePath,
      fileName: `instagram_${options.jobId}.mp4`,
      fileSize: probe.size,
      duration: Math.round(probe.duration),
      resolution: `${probe.height || 1080}p`,
      videoCodec: probe.videoCodec,
      audioCodec: probe.audioCodec,
    };
  }
}
