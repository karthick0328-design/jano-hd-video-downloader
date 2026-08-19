import { URL } from 'url';

export interface NormalizedMediaInfo {
  isValid: boolean;
  rawUrl: string;
  normalizedUrl: string;
  platform: 'youtube' | 'youtube-short' | 'instagram' | 'instagram-reel' | 'facebook' | 'facebook-reel' | 'sharechat' | 'unknown';
  mediaId?: string; // reelId, videoId, postKey
  error?: string;
}

const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'ig_web_button_share_sheet',
  'ig_sh',
  'igshid',
  'fbclid',
  'si',
  'feature',
  'context',
  'ref',
  'app',
];

export function normalizeAndExtractMediaInfo(urlStr: string): NormalizedMediaInfo {
  if (!urlStr || typeof urlStr !== 'string') {
    return {
      isValid: false,
      rawUrl: '',
      normalizedUrl: '',
      platform: 'unknown',
      error: 'Please enter a valid video URL.',
    };
  }

  const rawUrl = urlStr.trim();
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return {
      isValid: false,
      rawUrl,
      normalizedUrl: rawUrl,
      platform: 'unknown',
      error: 'Invalid URL format.',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isValid: false,
      rawUrl,
      normalizedUrl: rawUrl,
      platform: 'unknown',
      error: 'Only HTTP and HTTPS URLs are supported.',
    };
  }

  // Remove tracking query parameters
  for (const param of TRACKING_PARAMS) {
    parsed.searchParams.delete(param);
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname;

  // 1. INSTAGRAM
  if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) {
    // Reel match: /reel/DavTm4AT7GK/ or /reels/DavTm4AT7GK/
    const reelMatch = pathname.match(/\/(?:reel|reels)\/([A-Za-z0-9_-]+)/i);
    if (reelMatch && reelMatch[1]) {
      const reelId = reelMatch[1];
      const normalizedUrl = `https://www.instagram.com/reel/${reelId}/`;
      return {
        isValid: true,
        rawUrl,
        normalizedUrl,
        platform: 'instagram-reel',
        mediaId: reelId,
      };
    }

    // Post / TV match: /p/DavTm4AT7GK/ or /tv/DavTm4AT7GK/
    const postMatch = pathname.match(/\/(?:p|tv)\/([A-Za-z0-9_-]+)/i);
    if (postMatch && postMatch[1]) {
      const mediaId = postMatch[1];
      const typeStr = pathname.includes('/tv/') ? 'tv' : 'p';
      const normalizedUrl = `https://www.instagram.com/${typeStr}/${mediaId}/`;
      return {
        isValid: true,
        rawUrl,
        normalizedUrl,
        platform: 'instagram',
        mediaId,
      };
    }

    return {
      isValid: true,
      rawUrl,
      normalizedUrl: `https://www.instagram.com${pathname}`,
      platform: 'instagram',
    };
  }

  // 2. YOUTUBE
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    // Shorts: /shorts/videoId
    const shortsMatch = pathname.match(/\/shorts\/([A-Za-z0-9_-]{11})/i);
    if (shortsMatch && shortsMatch[1]) {
      const videoId = shortsMatch[1];
      return {
        isValid: true,
        rawUrl,
        normalizedUrl: `https://www.youtube.com/shorts/${videoId}`,
        platform: 'youtube-short',
        mediaId: videoId,
      };
    }

    // Standard Watch: v=videoId or youtu.be/videoId
    let videoId = parsed.searchParams.get('v');
    if (!videoId && hostname.includes('youtu.be')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length > 0) videoId = parts[0];
    }

    if (videoId && videoId.length === 11) {
      return {
        isValid: true,
        rawUrl,
        normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
        platform: 'youtube',
        mediaId: videoId,
      };
    }

    return {
      isValid: true,
      rawUrl,
      normalizedUrl: parsed.toString(),
      platform: 'youtube',
    };
  }

  // 3. FACEBOOK
  if (hostname.includes('facebook.com') || hostname.includes('fb.watch') || hostname.includes('fb.gg')) {
    const reelMatch = pathname.match(/\/reel\/([0-9A-Za-z_-]+)/i);
    if (reelMatch && reelMatch[1]) {
      const reelId = reelMatch[1];
      return {
        isValid: true,
        rawUrl,
        normalizedUrl: `https://www.facebook.com/reel/${reelId}/`,
        platform: 'facebook-reel',
        mediaId: reelId,
      };
    }

    const videoId = parsed.searchParams.get('v') || pathname.match(/\/videos\/([0-9]+)/i)?.[1];
    if (videoId) {
      return {
        isValid: true,
        rawUrl,
        normalizedUrl: `https://www.facebook.com/watch/?v=${videoId}`,
        platform: 'facebook',
        mediaId: videoId,
      };
    }

    return {
      isValid: true,
      rawUrl,
      normalizedUrl: parsed.toString(),
      platform: 'facebook',
    };
  }

  // 4. SHARECHAT
  if (hostname.includes('sharechat.com')) {
    const postMatch = pathname.match(/\/(?:post|video|item)\/([A-Za-z0-9_-]+)/i);
    if (postMatch && postMatch[1]) {
      const postId = postMatch[1];
      return {
        isValid: true,
        rawUrl,
        normalizedUrl: `https://sharechat.com/post/${postId}`,
        platform: 'sharechat',
        mediaId: postId,
      };
    }

    return {
      isValid: true,
      rawUrl,
      normalizedUrl: parsed.toString(),
      platform: 'sharechat',
    };
  }

  return {
    isValid: false,
    rawUrl,
    normalizedUrl: parsed.toString(),
    platform: 'unknown',
    error: 'Unsupported platform URL.',
  };
}
