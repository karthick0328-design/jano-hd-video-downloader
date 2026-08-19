const { URL } = require('url');

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

function normalizeAndExtractMediaInfo(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') {
    return { isValid: false, rawUrl: '', normalizedUrl: '', platform: 'unknown', error: 'Please enter a valid video URL.' };
  }

  const rawUrl = urlStr.trim();
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { isValid: false, rawUrl, normalizedUrl: rawUrl, platform: 'unknown', error: 'Invalid URL format.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, rawUrl, normalizedUrl: rawUrl, platform: 'unknown', error: 'Only HTTP and HTTPS URLs are supported.' };
  }

  for (const param of TRACKING_PARAMS) {
    parsed.searchParams.delete(param);
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname;

  if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) {
    const reelMatch = pathname.match(/\/(?:reel|reels)\/([A-Za-z0-9_-]+)/i);
    if (reelMatch && reelMatch[1]) {
      const reelId = reelMatch[1];
      const normalizedUrl = `https://www.instagram.com/reel/${reelId}/`;
      return { isValid: true, rawUrl, normalizedUrl, platform: 'instagram-reel', mediaId: reelId };
    }
  }

  return { isValid: true, rawUrl, normalizedUrl: parsed.toString(), platform: 'unknown' };
}

const res = normalizeAndExtractMediaInfo('https://www.instagram.com/reel/DavTm4AT7GK/?utm_source=ig_web_button_share_sheet');
console.log('Normalized Result:', res);
