/**
 * Client-side YouTube video stream extractor
 * Runs directly in the user's browser (residential/mobile IP) to bypass cloud datacenter IP blocks.
 */
export async function extractYouTubeClientStream(videoId: string): Promise<string | null> {
  if (!videoId) return null;

  // Method 1: Client-side YouTubei Android API
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/player', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '18.11.35',
            androidSdkVersion: 30,
            hl: 'en',
            gl: 'US',
          },
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const formats = data.streamingData?.formats || [];
      const adaptiveFormats = data.streamingData?.adaptiveFormats || [];

      const mp4Stream =
        formats.find((f: any) => f.url && f.mimeType?.includes('mp4')) ||
        adaptiveFormats.find((f: any) => f.url && f.mimeType?.includes('mp4')) ||
        formats[0];

      if (mp4Stream && mp4Stream.url) {
        return mp4Stream.url;
      }
    }
  } catch (e) {
    // proceed to fallback
  }

  // Method 2: Client-side YouTube Watch Page HTML parsing
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (res.ok) {
      const html = await res.text();
      const cleanHtml = html.replace(/\\u0026/g, '&').replace(/\\/g, '');

      const match = cleanHtml.match(/"url":"(https:\/\/[^"]+?\.googlevideo\.com\/videoplayback[^"]*)"/i);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (e) {}

  return null;
}
