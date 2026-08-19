import { exec } from 'child_process';
import { promisify } from 'util';
import { MediaAnalysisResponse, PlatformType, QualityFormat } from '../../types';

const execAsync = promisify(exec);

export class ServerDownloaderService {
  public static detectPlatform(url: string): PlatformType {
    if (!url) return 'unknown';
    const lower = url.trim().toLowerCase();

    if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      if (lower.includes('/shorts/')) return 'youtube-short';
      return 'youtube';
    }

    if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
      if (lower.includes('/reel/') || lower.includes('/reels/')) return 'instagram-reel';
      return 'instagram';
    }

    if (lower.includes('facebook.com') || lower.includes('fb.watch') || lower.includes('fb.gg')) {
      if (lower.includes('/reel/') || lower.includes('/reels/')) return 'facebook-reel';
      return 'facebook';
    }

    if (lower.includes('sharechat.com')) {
      return 'sharechat';
    }

    return 'unknown';
  }

  public static async analyzeUrl(url: string): Promise<MediaAnalysisResponse> {
    const platform = this.detectPlatform(url);
    if (platform === 'unknown') {
      return {
        success: false,
        url,
        platform: 'unknown',
        title: '',
        thumbnail: '',
        duration: 0,
        maxAvailableQuality: '',
        formats: [],
        error: 'Unsupported website or invalid video link.',
      };
    }

    // Try yt-dlp first
    try {
      const { stdout } = await execAsync(`python -m yt_dlp --dump-json --no-warnings -- "${url}"`, {
        timeout: 10000,
      });

      if (stdout && stdout.trim()) {
        const dump = JSON.parse(stdout.trim());
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
          platform,
          title,
          thumbnail,
          duration,
          maxAvailableQuality,
          formats: sortedFormats,
        };
      }
    } catch (err) {
      // Fallback to meta-scraping analysis if yt-dlp binary is not available on serverless
    }

    // HTML Meta tag fallback for serverless environment
    return this.fallbackMetaAnalysis(url, platform);
  }

  private static getDefaultTitle(platform: PlatformType): string {
    switch (platform) {
      case 'youtube-short':
        return 'YouTube Short';
      case 'youtube':
        return 'YouTube Video';
      case 'instagram-reel':
        return 'Instagram Reel';
      case 'instagram':
        return 'Instagram Video';
      case 'facebook-reel':
        return 'Facebook Reel';
      case 'facebook':
        return 'Facebook Video';
      case 'sharechat':
        return 'ShareChat Video';
      default:
        return 'Media Video';
    }
  }

  private static async fallbackMetaAnalysis(url: string, platform: PlatformType): Promise<MediaAnalysisResponse> {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!res.ok) {
        throw new Error(`Unable to fetch page (Status ${res.status})`);
      }

      const html = await res.text();

      const titleMatch =
        html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
        html.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/&#\d+;/g, '').trim() : this.getDefaultTitle(platform);

      const thumbMatch =
        html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
        html.match(/<meta\s+name=["']twitter:image["']\s+content=["'](.*?)["']/i);
      const thumbnail = thumbMatch ? thumbMatch[1] : '';

      const formats: QualityFormat[] = [
        {
          quality: '1080p',
          height: 1080,
          format: 'mp4',
          formatId: 'best',
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
        url,
        platform,
        title,
        thumbnail,
        duration: 0,
        maxAvailableQuality: '1080p',
        formats,
      };
    } catch (err: any) {
      return {
        success: false,
        url,
        platform,
        title: '',
        thumbnail: '',
        duration: 0,
        maxAvailableQuality: '',
        formats: [],
        error: err.message || 'Unable to access video information.',
      };
    }
  }
}
