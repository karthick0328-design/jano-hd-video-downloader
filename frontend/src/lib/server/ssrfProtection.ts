import { URL } from 'url';

const ALLOWED_HOSTNAMES = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'instagram.com',
  'www.instagram.com',
  'instagr.am',
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
  'fb.watch',
  'fb.gg',
  'sharechat.com',
  'www.sharechat.com',
  'b.sharechat.com',
  'link.sharechat.com',
];

const BLOCKED_IP_REGEX = /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.|0\.|::1)/;

export function validateMediaUrl(urlStr: string): {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
} {
  if (!urlStr || typeof urlStr !== 'string') {
    return { valid: false, error: 'Please enter a valid video URL.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr.trim());
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format. Please paste a valid YouTube, Instagram, Facebook, or ShareChat link.',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTP and HTTPS URLs are supported.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_IP_REGEX.test(hostname) || hostname === 'localhost') {
    return { valid: false, error: 'Access to private or local network resources is forbidden.' };
  }

  const isAllowedHost = ALLOWED_HOSTNAMES.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  );

  if (!isAllowedHost) {
    return {
      valid: false,
      error: 'Please enter a valid YouTube, Instagram, Facebook, or ShareChat video link.',
    };
  }

  return { valid: true, normalizedUrl: parsed.toString() };
}
