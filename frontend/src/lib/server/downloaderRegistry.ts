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
        error: 'Please enter a valid YouTube, Instagram, Facebook, or ShareChat URL.',
      };
    }

    // 1. Try yt-dlp first if available
    try {
      const { stdout } = await execAsync(`python -m yt_dlp --dump-json --no-warnings -- "${url}"`, {
        timeout: 8000,
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
      // yt-dlp binary not available on serverless, fallback below
    }

    // 2. High-speed Multi-Tiered Serverless Metadata Inspector
    return this.serverlessMetadataInspector(url, platform);
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
    url: string,
    platform: PlatformType
  ): Promise<MediaAnalysisResponse> {
    let title = this.getDefaultTitle(platform);
    let thumbnail = '';
    let duration = 0;

    // YouTube specific extraction
    if (platform === 'youtube' || platform === 'youtube-short') {
      const match = url.match(/(?:watch\?v=|shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      const videoId = match ? match[1] : '';

      if (videoId) {
        thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }

      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
          { headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          if (data.title) title = data.title;
          if (data.thumbnail_url) thumbnail = data.thumbnail_url;
        }
      } catch (e) {
        // ignore oembed error
      }
    } else {
      // OpenGraph HTML Scraper for Facebook, Instagram, ShareChat
      try {
        const pageRes = await fetch(url, {
          headers: {
            'User-Agent':
              'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        if (pageRes.ok) {
          const html = await pageRes.text();

          const titleMatch =
            html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
            html.match(/<meta\s+name=["']title["']\s+content=["'](.*?)["']/i) ||
            html.match(/<title>(.*?)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1]
              .replace(/&#\d+;/g, '')
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&')
              .trim();
          }

          const thumbMatch =
            html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
            html.match(/<meta\s+name=["']twitter:image["']\s+content=["'](.*?)["']/i);
          if (thumbMatch && thumbMatch[1]) {
            thumbnail = thumbMatch[1].replace(/&amp;/g, '&');
          }
        }
      } catch (e) {
        // ignore scraper error
      }
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
      {
        quality: '360p',
        height: 360,
        format: 'mp4',
        formatId: '360p',
        hasVideo: true,
        hasAudio: true,
        needsMerge: false,
      },
    ];

    return {
      success: true,
      url,
      platform,
      title: title || this.getDefaultTitle(platform),
      thumbnail,
      duration,
      maxAvailableQuality: '1080p',
      formats: defaultFormats,
    };
  }
}
