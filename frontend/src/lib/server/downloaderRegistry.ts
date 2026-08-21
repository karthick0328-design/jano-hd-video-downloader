import { exec } from 'child_process';
import { promisify } from 'util';
import { MediaAnalysisResponse, PlatformType, QualityFormat } from '../../types';
import { ExactMediaExtractor } from './exactMediaExtractor';
import { normalizeAndExtractMediaInfo } from './urlNormalizer';

const execAsync = promisify(exec);

export class ServerDownloaderService {
  public static detectPlatform(url: string): PlatformType {
    const norm = normalizeAndExtractMediaInfo(url);
    return norm.platform;
  }

  public static async analyzeUrl(url: string): Promise<MediaAnalysisResponse> {
    const norm = normalizeAndExtractMediaInfo(url);

    if (!norm.isValid || norm.platform === 'unknown') {
      return {
        success: false,
        url,
        normalizedUrl: url,
        platform: 'unknown',
        title: '',
        thumbnail: '',
        duration: 0,
        maxAvailableQuality: '',
        formats: [],
        error: norm.error || 'Please enter a valid YouTube, Instagram, Facebook, or ShareChat URL.',
      };
    }

    const normalizedUrl = norm.normalizedUrl;
    const mediaId = norm.mediaId;
    const platform = norm.platform;

    console.log(`[ANALYSIS] [PLATFORM] ${platform} [REEL_ID] ${mediaId || 'none'} [URL] ${normalizedUrl}`);

    // 1. Try local backend server if active
    try {
      const backendRes = await fetch('http://localhost:5000/api/media/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      if (backendRes.ok) {
        const backendData = await backendRes.json();
        if (backendData && backendData.success) {
          return {
            ...backendData,
            normalizedUrl,
            mediaId,
          };
        }
      }
    } catch (e) {
      // local backend server not active
    }

    // 2. Try yt-dlp first if available
    const clients = ['', 'youtube:player_client=android_creator,web', 'youtube:player_client=ios', 'youtube:player_client=tv_embedded'];
    
    for (const clientArgs of clients) {
      try {
        const extractorArgs = clientArgs ? `--extractor-args "${clientArgs}"` : '';
        const { stdout } = await execAsync(`python -m yt_dlp --dump-json ${extractorArgs} --no-warnings -- "${normalizedUrl}"`, {
          timeout: 10000,
        });

        if (stdout && stdout.trim()) {
          const dump = JSON.parse(stdout.trim());

          // Verify ID if mediaId exists (Section 7 verification)
          const extractedId = dump.id || dump.display_id || dump.webpage_url_basename;
          if (mediaId && extractedId && extractedId.toLowerCase() !== mediaId.toLowerCase()) {
            console.error(`[VERIFICATION_FAILED] Extracted ID ${extractedId} does not match requested ID ${mediaId}`);
            continue; // Try next fallback or fail
          }

          const title = dump.title || this.getDefaultTitle(platform);
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

          const sortedFormats = Array.from(formatMap.values()).sort((a, b) => b.height - a.height);
          const maxAvailableQuality = sortedFormats.length > 0 ? sortedFormats[0].quality : '1080p';

          return {
            success: true,
            url,
            normalizedUrl,
            platform,
            mediaId,
            title,
            thumbnail,
            duration,
            maxAvailableQuality,
            formats: sortedFormats,
          };
        }
      } catch (err) {
        // yt-dlp client failed, continue to next
      }
    }

    // 2.5 Try @distube/ytdl-core native module if available
    if (platform === 'youtube' || platform === 'youtube-short') {
      try {
        const ytdl = require('@distube/ytdl-core');
        const info = await ytdl.getInfo(normalizedUrl);
        
        if (info && info.formats) {
          // Verify ID
          if (mediaId && info.videoDetails.videoId && info.videoDetails.videoId.toLowerCase() !== mediaId.toLowerCase()) {
             // Verification failed, skip
          } else {
            const formatMap = new Map<number, QualityFormat>();
            
            for (const fmt of info.formats) {
              const hasVideo = !!fmt.hasVideo;
              if (!hasVideo && info.formats.length > 1) continue;
              
              const height = fmt.height || (fmt.qualityLabel ? parseInt(fmt.qualityLabel) : 720);
              const qualityLabel = `${height}p`;
              const hasAudio = !!fmt.hasAudio;
              
              if (!formatMap.has(height)) {
                formatMap.set(height, {
                  quality: qualityLabel,
                  height,
                  format: 'mp4',
                  formatId: fmt.itag?.toString() || 'best',
                  hasVideo: true,
                  hasAudio,
                  needsMerge: !hasAudio,
                  filesizeApprox: fmt.contentLength ? parseInt(fmt.contentLength) : undefined,
                  fps: fmt.fps,
                });
              }
            }
            
            if (formatMap.size > 0) {
              const sortedFormats = Array.from(formatMap.values()).sort((a, b) => b.height - a.height);
              const maxAvailableQuality = sortedFormats.length > 0 ? sortedFormats[0].quality : '1080p';
              
              return {
                success: true,
                url,
                normalizedUrl,
                platform,
                mediaId,
                title: info.videoDetails.title || this.getDefaultTitle(platform),
                thumbnail: info.videoDetails.thumbnails?.[info.videoDetails.thumbnails.length - 1]?.url || '',
                duration: parseInt(info.videoDetails.lengthSeconds || '0'),
                maxAvailableQuality,
                formats: sortedFormats,
              };
            }
          }
        }
      } catch(e) {
        // ytdl-core failed
      }
    }

    // 3. Serverless Metadata Inspector
    return this.serverlessMetadataInspector(normalizedUrl, platform, mediaId);
  }

  private static getDefaultTitle(platform: PlatformType): string {
    switch (platform) {
      case 'youtube-short':
        return 'YouTube Short Video';
      case 'youtube':
        return 'YouTube HD Video';
      case 'instagram-reel':
        return 'Instagram Reel Video';
      case 'instagram':
        return 'Instagram Video Post';
      case 'facebook-reel':
        return 'Facebook Reel Video';
      case 'facebook':
        return 'Facebook Video Post';
      case 'sharechat':
        return 'ShareChat Video Post';
      default:
        return 'Media Video';
    }
  }

  private static async serverlessMetadataInspector(
    normalizedUrl: string,
    platform: PlatformType,
    mediaId?: string
  ): Promise<MediaAnalysisResponse> {
    let title = this.getDefaultTitle(platform);
    let thumbnail = '';
    let duration = 0;

    const exact = await ExactMediaExtractor.extractExactMediaUrl(normalizedUrl, platform);
    if (exact.title) title = exact.title;
    if (exact.thumbnail) thumbnail = exact.thumbnail;

    if (platform === 'youtube' || platform === 'youtube-short') {
      const match = normalizedUrl.match(/(?:watch\?v=|shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      const videoId = match ? match[1] : '';

      if (videoId) {
        thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }

      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`,
          { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          if (data.title) title = data.title;
          if (data.thumbnail_url) thumbnail = data.thumbnail_url;
        }
      } catch (e) {}
    }

    const defaultFormats: QualityFormat[] = [
      {
        quality: '1080p',
        height: 1080,
        format: 'mp4',
        formatId: '1080p',
        hasVideo: true,
        hasAudio: true,
        needsMerge: false,
      },
      {
        quality: '720p',
        height: 720,
        format: 'mp4',
        formatId: '720p',
        hasVideo: true,
        hasAudio: true,
        needsMerge: false,
      },
      {
        quality: '480p',
        height: 480,
        format: 'mp4',
        formatId: '480p',
        hasVideo: true,
        hasAudio: true,
        needsMerge: false,
      },
    ];

    return {
      success: true,
      url: normalizedUrl,
      normalizedUrl,
      platform,
      mediaId,
      mediaUrl: exact.mediaUrl || undefined,
      title: title || this.getDefaultTitle(platform),
      thumbnail,
      duration,
      maxAvailableQuality: '1080p',
      formats: defaultFormats,
    };
  }
}
