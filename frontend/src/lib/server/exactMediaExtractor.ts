import { exec } from 'child_process';
import { promisify } from 'util';
import { PlatformType } from '../../types';
import { normalizeAndExtractMediaInfo } from './urlNormalizer';

const execAsync = promisify(exec);

export class ExactMediaExtractor {
  public static async extractExactMediaUrl(
    url: string,
    platform: PlatformType
  ): Promise<{ mediaUrl: string | null; title?: string; thumbnail?: string; mediaId?: string }> {
    const norm = normalizeAndExtractMediaInfo(url);
    const mediaId = norm.mediaId;

    try {
      // 1. Try yt-dlp if available on host (e.g. local or server worker environment)
      try {
        const { stdout } = await execAsync(`python -m yt_dlp --dump-json --no-warnings -- "${norm.normalizedUrl || url}"`, {
          timeout: 10000,
        });
        if (stdout && stdout.trim()) {
          const dump = JSON.parse(stdout.trim());
          const extractedId = dump.id || dump.display_id || dump.webpage_url_basename;

          // Strict Media Identity Check
          if (mediaId && extractedId && extractedId.toLowerCase() !== mediaId.toLowerCase()) {
            console.error(`[IDENTITY_FAILED] Extracted ID ${extractedId} does not match requested media ID ${mediaId}`);
            return { mediaUrl: null };
          }

          const streamUrl = dump.url || (dump.formats && dump.formats.find((f: any) => f.vcodec !== 'none' && f.acodec !== 'none')?.url);
          if (streamUrl) {
            return {
              mediaUrl: streamUrl,
              title: dump.title,
              thumbnail: dump.thumbnail,
              mediaId,
            };
          }
        }
      } catch (e) {
        // yt-dlp binary not present on serverless, proceed to pure HTTP resolvers
      }

      // 2. Pure HTTP platform resolvers
      if (platform === 'youtube' || platform === 'youtube-short') {
        return await this.extractYouTube(norm.normalizedUrl || url, mediaId);
      } else if (platform === 'facebook' || platform === 'facebook-reel') {
        return await this.extractFacebook(norm.normalizedUrl || url, mediaId);
      } else if (platform === 'instagram' || platform === 'instagram-reel') {
        return await this.extractInstagram(norm.normalizedUrl || url, mediaId);
      } else if (platform === 'sharechat') {
        return await this.extractShareChat(norm.normalizedUrl || url, mediaId);
      }
    } catch (e) {
      // ignore error
    }
    return { mediaUrl: null, mediaId };
  }

  private static async extractYouTube(url: string, mediaId?: string) {
    const match = url.match(/(?:watch\?v=|shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const videoId = mediaId || (match ? match[1] : null);
    let title = 'YouTube HD Video';
    let thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';

    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      );
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        if (data.title) title = data.title;
        if (data.thumbnail_url) thumbnail = data.thumbnail_url;
      }
    } catch (e) {}

    const microserviceUrl = process.env.YOUTUBE_MICROSERVICE_URL || 'https://jano-hd-video-downloader.onrender.com';
    if (microserviceUrl) {
      try {
        const msRes = await fetch(`${microserviceUrl.replace(/\/$/, '')}/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        if (msRes.ok) {
          const msData = await msRes.json();
          if (msData.success && msData.mediaUrl) {
            return {
              mediaUrl: msData.mediaUrl,
              title: msData.title || title,
              thumbnail: msData.thumbnail || thumbnail,
              mediaId: msData.mediaId || videoId || undefined,
            };
          }
        }
      } catch (e) {}
    }

    const apiKey = process.env.RAPIDAPI_KEY || 'adad1ed563msh0f60216ba743677p16798bjsn5796797e67b6';
    if (videoId && apiKey) {
      // 1. Try youtube-media-downloader API
      try {
        const rapidRes = await fetch(
          `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${videoId}`,
          {
            headers: {
              'x-rapidapi-host': 'youtube-media-downloader.p.rapidapi.com',
              'x-rapidapi-key': apiKey,
            },
          }
        );
        if (rapidRes.ok) {
          const rData = await rapidRes.json();
          if (rData.title) title = rData.title;
          if (rData.thumbnails && rData.thumbnails.length > 0) {
            thumbnail = rData.thumbnails[rData.thumbnails.length - 1].url || thumbnail;
          }

          const videoItems = Array.isArray(rData.videos)
            ? rData.videos
            : rData.videos?.items || rData.formats || [];

          // 1. Prioritize MP4 formats with both video and audio
          const withAudio = videoItems.find(
            (f: any) =>
              (f.url || f.link || f.downloadUrl) &&
              f.hasAudio === true &&
              (f.extension === 'mp4' || f.mimeType?.includes('mp4') || f.container === 'mp4' || !f.extension)
          );

          // 2. Fallback to any MP4 format
          const anyMp4 = videoItems.find(
            (f: any) =>
              (f.url || f.link || f.downloadUrl) &&
              (f.extension === 'mp4' || f.mimeType?.includes('mp4') || f.container === 'mp4' || !f.extension)
          );

          const selected = withAudio || anyMp4;
          if (selected) {
            const streamLink = selected.url || selected.link || selected.downloadUrl;
            return {
              mediaUrl: streamLink,
              title,
              thumbnail,
              mediaId: videoId,
            };
          }
        }
      } catch (e) {}

      // 2. Try yt-api (RapidAPI)
      try {
        const ytApiRes = await fetch(`https://yt-api.p.rapidapi.com/dl?id=${videoId}`, {
          headers: {
            'x-rapidapi-host': 'yt-api.p.rapidapi.com',
            'x-rapidapi-key': apiKey,
          },
        });
        if (ytApiRes.ok) {
          const ytData = await ytApiRes.json();
          if (ytData.title) title = ytData.title;
          const formats = ytData.formats || ytData.adaptiveFormats || [];
          const bestFormat = formats.find(
            (f: any) => f.url && (f.mimeType?.includes('video/mp4') || f.container === 'mp4')
          ) || formats[0];

          if (bestFormat && bestFormat.url) {
            return {
              mediaUrl: bestFormat.url,
              title,
              thumbnail,
              mediaId: videoId,
            };
          }
        }
      } catch (e) {}
    }

    if (videoId) {
      const instances = [
        `https://inv.tux.pizza/api/v1/videos/${videoId}`,
        `https://invidious.projectsegfau.lt/api/v1/videos/${videoId}`,
        `https://invidious.privacydev.net/api/v1/videos/${videoId}`,
        `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`,
        `https://invidious.drgns.space/api/v1/videos/${videoId}`,
        `https://api.piped.video/streams/${videoId}`,
        `https://pipedapi.kavin.rocks/streams/${videoId}`,
      ];

      for (const instUrl of instances) {
        try {
          const res = await fetch(instUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.formatStreams && data.formatStreams.length > 0) {
              const stream = data.formatStreams.find((s: any) => s.container === 'mp4') || data.formatStreams[0];
              if (stream && stream.url) {
                return { mediaUrl: stream.url, title, thumbnail, mediaId: videoId };
              }
            }
            if (data.videoStreams && data.videoStreams.length > 0) {
              const stream = data.videoStreams.find((s: any) => s.format === 'mp4' || s.mimeType?.includes('mp4')) || data.videoStreams[0];
              if (stream && stream.url) {
                return { mediaUrl: stream.url, title, thumbnail, mediaId: videoId };
              }
            }
          }
        } catch (e) {}
      }
    }

    return { mediaUrl: null, title, thumbnail, mediaId: videoId || undefined };
  }

  private static async extractFacebook(url: string, mediaId?: string) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (res.ok) {
        const html = await res.text();

        const titleMatch =
          html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
          html.match(/<title>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].replace(/&quot;/g, '"').trim() : 'Facebook Video';

        const thumbMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
        const thumbnail = thumbMatch ? thumbMatch[1].replace(/&amp;/g, '&') : '';

        const videoMatch =
          html.match(/"browser_native_hd_url":"([^"]+)"/i) ||
          html.match(/"browser_native_sd_url":"([^"]+)"/i) ||
          html.match(/"playable_url_quality_hd":"([^"]+)"/i) ||
          html.match(/"playable_url":"([^"]+)"/i) ||
          html.match(/<meta\s+property=["']og:video:secure_url["']\s+content=["'](.*?)["']/i) ||
          html.match(/<meta\s+property=["']og:video["']\s+content=["'](.*?)["']/i);

        if (videoMatch && videoMatch[1]) {
          const mediaUrl = videoMatch[1].replace(/\\/g, '').replace(/&amp;/g, '&');
          return { mediaUrl, title, thumbnail, mediaId };
        }
      }
    } catch (e) {}

    return { mediaUrl: null, mediaId };
  }

  private static async extractInstagram(url: string, mediaId?: string) {
    const reelId = mediaId || url.match(/\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i)?.[1];

    if (!reelId) {
      return { mediaUrl: null };
    }

    // 1. Try Embed Page inspection & oEmbed metadata
    const embedUrls = [
      `https://www.instagram.com/reel/${reelId}/embed/captioned/`,
      `https://www.instagram.com/p/${reelId}/embed/captioned/`,
      `https://www.instagram.com/reel/${reelId}/embed/`,
      `https://www.instagram.com/reel/${reelId}/`,
    ];

    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    ];

    for (const embedUrl of embedUrls) {
      for (const ua of userAgents) {
        try {
          const res = await fetch(embedUrl, {
            headers: {
              'User-Agent': ua,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });
          if (res.ok) {
            const html = await res.text();
            const cleanHtml = html
              .replace(/\\u0026/g, '&')
              .replace(/\\/g, '')
              .replace(/&amp;/g, '&');

            // Look for direct video_url, video_versions, or video src matching CDN
            const videoMatch =
              cleanHtml.match(/"video_url":"([^"]+)"/i) ||
              cleanHtml.match(/"url":"(https:\/\/[^"]+?\.mp4[^"]*)"/i) ||
              cleanHtml.match(/"video_versions":\[\{[^}]*?"url":"([^"]+)"/i) ||
              cleanHtml.match(/<video[^>]+src=["']([^"']+)["']/i) ||
              cleanHtml.match(/"contentUrl":"([^"]+)"/i) ||
              cleanHtml.match(/meta\s+property=["']og:video["']\s+content=["']([^"']+)["']/i) ||
              cleanHtml.match(/meta\s+property=["']og:video:secure_url["']\s+content=["']([^"']+)["']/i) ||
              cleanHtml.match(/meta\s+name=["']twitter:player:stream["']\s+content=["']([^"']+)["']/i);

            const titleMatch =
              html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
              html.match(/<title>(.*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : `Instagram Reel (${reelId})`;

            const thumbMatch =
              html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
            const thumbnail = thumbMatch ? thumbMatch[1].replace(/&amp;/g, '&') : '';

            if (
              videoMatch &&
              videoMatch[1] &&
              (videoMatch[1].startsWith('http://') || videoMatch[1].startsWith('https://'))
            ) {
              const mediaUrl = videoMatch[1].replace(/&amp;/g, '&');
              return { mediaUrl, title, thumbnail, mediaId: reelId };
            }
          }
        } catch (e) {}
      }
    }

    return { mediaUrl: null, mediaId: reelId };
  }

  private static async extractShareChat(url: string, mediaId?: string) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      if (res.ok) {
        const html = await res.text();

        const titleMatch =
          html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
          html.match(/<title>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'ShareChat Video';

        const thumbMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
        const thumbnail = thumbMatch ? thumbMatch[1].replace(/&amp;/g, '&') : '';

        const videoMatch =
          html.match(/"videoUrl":"([^"]+)"/i) ||
          html.match(/"compressedVideoUrl":"([^"]+)"/i) ||
          html.match(/<meta\s+property=["']og:video:secure_url["']\s+content=["'](.*?)["']/i) ||
          html.match(/<meta\s+property=["']og:video["']\s+content=["'](.*?)["']/i);

        if (videoMatch && videoMatch[1]) {
          const mediaUrl = videoMatch[1].replace(/\\/g, '').replace(/&amp;/g, '&');
          return { mediaUrl, title, thumbnail, mediaId };
        }
      }
    } catch (e) {}

    return { mediaUrl: null, mediaId };
  }
}

