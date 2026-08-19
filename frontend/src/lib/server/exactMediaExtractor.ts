import { PlatformType } from '../../types';

export class ExactMediaExtractor {
  public static async extractExactMediaUrl(
    url: string,
    platform: PlatformType
  ): Promise<{ mediaUrl: string | null; title?: string; thumbnail?: string }> {
    try {
      if (platform === 'youtube' || platform === 'youtube-short') {
        return await this.extractYouTube(url);
      } else if (platform === 'facebook' || platform === 'facebook-reel') {
        return await this.extractFacebook(url);
      } else if (platform === 'instagram' || platform === 'instagram-reel') {
        return await this.extractInstagram(url);
      } else if (platform === 'sharechat') {
        return await this.extractShareChat(url);
      }
    } catch (e) {
      // ignore
    }
    return { mediaUrl: null };
  }

  private static async extractYouTube(url: string) {
    const match = url.match(/(?:watch\?v=|shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const videoId = match ? match[1] : null;
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

    // Resolve via cobalt / invidious / public format stream resolvers
    if (videoId) {
      const instances = [
        `https://api.vkrdownloader.com/server?v=${encodeURIComponent(url)}`,
        `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`,
        `https://invidious.drgns.space/api/v1/videos/${videoId}`,
      ];

      for (const instUrl of instances) {
        try {
          const res = await fetch(instUrl);
          if (res.ok) {
            const data = await res.json();
            if (data.formatStreams && data.formatStreams.length > 0) {
              const stream = data.formatStreams.find((s: any) => s.container === 'mp4') || data.formatStreams[0];
              if (stream && stream.url) {
                return { mediaUrl: stream.url, title, thumbnail };
              }
            }
            if (data.data && data.data.downloadUrl) {
              return { mediaUrl: data.data.downloadUrl, title, thumbnail };
            }
          }
        } catch (e) {}
      }
    }

    return { mediaUrl: null, title, thumbnail };
  }

  private static async extractFacebook(url: string) {
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
          return { mediaUrl, title, thumbnail };
        }
      }
    } catch (e) {}

    return { mediaUrl: null };
  }

  private static async extractInstagram(url: string) {
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

        const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i);
        const title = titleMatch ? titleMatch[1].trim() : 'Instagram Reel';

        const thumbMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
        const thumbnail = thumbMatch ? thumbMatch[1].replace(/&amp;/g, '&') : '';

        const videoMatch =
          html.match(/"video_url":"([^"]+)"/i) ||
          html.match(/<meta\s+property=["']og:video:secure_url["']\s+content=["'](.*?)["']/i) ||
          html.match(/<meta\s+property=["']og:video["']\s+content=["'](.*?)["']/i);

        if (videoMatch && videoMatch[1]) {
          const mediaUrl = videoMatch[1].replace(/\\/g, '').replace(/&amp;/g, '&');
          return { mediaUrl, title, thumbnail };
        }
      }
    } catch (e) {}

    return { mediaUrl: null };
  }

  private static async extractShareChat(url: string) {
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
          return { mediaUrl, title, thumbnail };
        }
      }
    } catch (e) {}

    return { mediaUrl: null };
  }
}
