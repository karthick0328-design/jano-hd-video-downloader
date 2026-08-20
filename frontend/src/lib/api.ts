import {
  CreateDownloadResponse,
  JobStatusResponse,
  MediaAnalysisResponse,
} from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export async function extractYouTubeClientSide(url: string): Promise<MediaAnalysisResponse | null> {
  const match = url.match(/(?:watch\?v=|shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!match) return null;

  const videoId = match[1];
  const apiKey = process.env.NEXT_PUBLIC_RAPIDAPI_KEY || 'adad1ed563msh0f60216ba743677p16798bjsn5796797e67b6';

  try {
    const res = await fetch(
      `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${videoId}`,
      {
        headers: {
          'x-rapidapi-host': 'youtube-media-downloader.p.rapidapi.com',
          'x-rapidapi-key': apiKey,
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const videoItems = Array.isArray(data.videos)
        ? data.videos
        : data.videos?.items || data.formats || [];

      const withAudio = videoItems.find(
        (f: any) =>
          (f.url || f.link || f.downloadUrl) &&
          f.hasAudio === true &&
          (f.extension === 'mp4' || f.mimeType?.includes('mp4') || f.container === 'mp4' || !f.extension)
      );

      const anyMp4 = videoItems.find(
        (f: any) =>
          (f.url || f.link || f.downloadUrl) &&
          (f.extension === 'mp4' || f.mimeType?.includes('mp4') || f.container === 'mp4' || !f.extension)
      );

      const selected = withAudio || anyMp4;

      if (selected) {
        const streamLink = selected.url || selected.link || selected.downloadUrl;
        let maxQuality = selected.quality || '1080p';

        return {
          success: true,
          platform: url.includes('shorts') ? 'youtube-short' : 'youtube',
          mediaId: videoId,
          url,
          normalizedUrl: url,
          duration: data.lengthSeconds ? parseInt(data.lengthSeconds, 10) : 0,
          title: data.title || 'YouTube HD Video',
          thumbnail:
            data.thumbnails?.[data.thumbnails.length - 1]?.url ||
            `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          mediaUrl: streamLink,
          maxAvailableQuality: maxQuality,
          formats: [
            {
              quality: maxQuality,
              height: parseInt(maxQuality.replace('p', ''), 10) || 1080,
              format: 'mp4',
              formatId: '18',
              hasVideo: true,
              hasAudio: true,
              needsMerge: false,
            },
            {
              quality: '720p',
              height: 720,
              format: 'mp4',
              formatId: '22',
              hasVideo: true,
              hasAudio: true,
              needsMerge: false,
            },
          ],
        };
      }
    }
  } catch (e) {
    console.warn('[CLIENT_YOUTUBE_RESOLVE_WARN] Client-side resolution fallback to server:', e);
  }

  return null;
}

export async function analyzeUrl(url: string): Promise<MediaAnalysisResponse> {
  // 1. Try high-speed client-side YouTube resolution (generates browser-IP bound stream URLs)
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const clientResult = await extractYouTubeClientSide(url);
    if (clientResult && clientResult.success) {
      console.log('[CLIENT_YOUTUBE_RESOLVE_SUCCESS] Resolved stream directly from client browser IP.');
      return clientResult;
    }
  }

  const res = await fetch(`${API_BASE}/media/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  const data = await res.json();
  if (!res.ok && !data.error) {
    throw new Error(data.message || 'Failed to analyze URL');
  }
  return data;
}

export async function triggerDownload(
  url: string,
  quality: string,
  format: string = 'mp4',
  title: string = '',
  formatId?: string,
  mediaUrl?: string
): Promise<CreateDownloadResponse> {
  const res = await fetch(`${API_BASE}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, quality, format, title, formatId, mediaUrl }),
  });

  const data = await res.json();
  if (!res.ok && !data.error) {
    throw new Error(data.message || 'Failed to initiate download');
  }
  return data;
}

export async function checkJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE}/download/${jobId}`);
  const data = await res.json();
  if (!res.ok && !data.error) {
    throw new Error('Failed to fetch job status');
  }
  return data;
}

export function getFullDownloadUrl(pathUrl: string): string {
  if (pathUrl.startsWith('http')) return pathUrl;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return baseUrl ? `${baseUrl}${pathUrl}` : pathUrl;
}
