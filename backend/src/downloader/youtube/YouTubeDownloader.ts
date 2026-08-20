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

export class YouTubeDownloader extends DownloaderService {
  readonly platform: PlatformType = 'youtube';

  public canHandle(url: string): boolean {
    if (!url) return false;
    const lower = url.trim().toLowerCase();
    return (
      lower.includes('youtube.com/watch') ||
      lower.includes('youtu.be/') ||
      lower.includes('youtube.com/shorts') ||
      lower.includes('youtube.com/embed')
    );
  }

  public async getFormats(url: string): Promise<QualityFormat[]> {
    const analysis = await this.analyze(url);
    return analysis.formats;
  }

  public async analyze(url: string): Promise<MediaAnalysisResult> {
    const norm = normalizeAndExtractMediaInfo(url);
    const targetUrl = norm.normalizedUrl || url;
    const isShort = norm.platform === 'youtube-short';
    const detectedPlatform: PlatformType = isShort ? 'youtube-short' : 'youtube';

    try {
      const dump: YtDlpDumpJson = await YtDlpWrapper.dumpJson(targetUrl);

      const title = dump.title || 'Untitled YouTube Video';
      let thumbnail = dump.thumbnail || '';
      if (!thumbnail && dump.thumbnails && dump.thumbnails.length > 0) {
        thumbnail = dump.thumbnails[dump.thumbnails.length - 1].url;
      }
      const duration = Math.round(dump.duration || 0);

      const rawFormats = dump.formats || [];
      const formatMap = new Map<number, QualityFormat>();

      for (const fmt of rawFormats) {
        if (!fmt.height || fmt.height < 144) continue;
        const height = fmt.height;
        const qualityLabel = `${height}p`;

        const hasVideo = fmt.vcodec !== 'none' && !!fmt.vcodec;
        const hasAudio = fmt.acodec !== 'none' && !!fmt.acodec;

        if (!hasVideo) continue;

        const existing = formatMap.get(height);

        let isBetter = false;
        if (!existing) {
          isBetter = true;
        } else {
          if (fmt.ext === 'mp4' && existing.format !== 'mp4') {
            isBetter = true;
          } else if ((fmt.fps || 0) > (existing.fps || 0)) {
            isBetter = true;
          } else if (hasAudio && !existing.hasAudio) {
            isBetter = true;
          }
        }

        if (isBetter) {
          formatMap.set(height, {
            quality: qualityLabel,
            height,
            format: 'mp4',
            formatId: fmt.format_id,
            url: fmt.url,
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

      const sortedFormats = Array.from(formatMap.values()).sort(
        (a, b) => b.height - a.height
      );

      const maxAvailableQuality =
        sortedFormats.length > 0 ? sortedFormats[0].quality : 'Unknown';

      return {
        success: true,
        url,
        normalizedUrl: targetUrl,
        platform: detectedPlatform,
        mediaId: norm.mediaId,
        title,
        thumbnail,
        duration,
        maxAvailableQuality,
        formats: sortedFormats,
      };
    } catch (err: any) {
      logger.error('YouTube analysis failed', { url: targetUrl, error: err.message });
      return {
        success: false,
        url,
        normalizedUrl: targetUrl,
        platform: detectedPlatform,
        mediaId: norm.mediaId,
        title: '',
        thumbnail: '',
        duration: 0,
        maxAvailableQuality: '',
        formats: [],
        error: err.message || 'Failed to analyze YouTube URL.',
      };
    }
  }

  public async executeDownload(
    options: DownloadJobOptions,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<DownloadJobResult> {
    const downloadUrl = options.normalizedUrl || options.url;
    const jobDir = path.join(env.TEMP_DOWNLOAD_DIR, options.jobId);
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }

    const outputTemplate = path.join(jobDir, 'media.%(ext)s');

    onProgress?.(10, 'Downloading media streams with yt-dlp');

    const files = await YtDlpWrapper.downloadMedia(
      downloadUrl,
      outputTemplate,
      options.formatId,
      options.quality,
      (dlPercent) => {
        onProgress?.(10 + Math.floor(dlPercent * 0.6), 'Downloading media streams');
      }
    );

    if (!files || files.length === 0) {
      throw new Error('Download failed: No output file produced by yt-dlp.');
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
      onProgress?.(75, 'Merging video picture and audio streams using FFmpeg');
      const mergedPath = path.join(jobDir, `final_${options.jobId}.mp4`);

      finalFilePath = await FFmpegService.mergeStreams(
        videoFile,
        audioFile,
        mergedPath,
        (mergePercent) => {
          onProgress?.(75 + Math.floor(mergePercent * 0.15), 'Merging streams');
        }
      );
    }

    onProgress?.(92, 'Validating output file with ffprobe');

    const probe = await FFmpegService.probeFile(finalFilePath);

    onProgress?.(100, 'Processing completed');

    return {
      jobId: options.jobId,
      normalizedUrl: downloadUrl,
      mediaId: options.mediaId,
      filePath: finalFilePath,
      fileName: `youtube_${options.jobId}.mp4`,
      fileSize: probe.size,
      duration: Math.round(probe.duration),
      resolution: `${probe.height}p`,
      videoCodec: probe.videoCodec,
      audioCodec: probe.audioCodec,
    };
  }
}
