import { validateMediaUrl } from '../src/middleware/ssrfProtection';
import { DownloaderRegistry } from '../src/downloader/DownloaderRegistry';

describe('URL Validation & SSRF Protection', () => {
  it('should accept valid YouTube video URLs', () => {
    const res = validateMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(res.valid).toBe(true);
    expect(res.normalizedUrl).toContain('youtube.com');
  });

  it('should accept valid YouTube Shorts URLs', () => {
    const res = validateMediaUrl('https://www.youtube.com/shorts/abcdef12345');
    expect(res.valid).toBe(true);
  });

  it('should accept valid Instagram Reel URLs', () => {
    const res = validateMediaUrl('https://www.instagram.com/reel/C1234567890/');
    expect(res.valid).toBe(true);
  });

  it('should reject private or local network URLs (SSRF protection)', () => {
    expect(validateMediaUrl('http://localhost:5000/api').valid).toBe(false);
    expect(validateMediaUrl('http://127.0.0.1/admin').valid).toBe(false);
    expect(validateMediaUrl('http://192.168.1.1/router').valid).toBe(false);
    expect(validateMediaUrl('http://169.254.169.254/latest/meta-data').valid).toBe(false);
  });

  it('should reject unsupported hostnames', () => {
    expect(validateMediaUrl('https://example.com/video.mp4').valid).toBe(false);
    expect(validateMediaUrl('https://malicious-site.org/play').valid).toBe(false);
  });
});

describe('Platform Detection', () => {
  it('should correctly detect YouTube platform', () => {
    expect(DownloaderRegistry.detectPlatform('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
    expect(DownloaderRegistry.detectPlatform('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
    expect(DownloaderRegistry.detectPlatform('https://youtube.com/shorts/xyz123')).toBe('youtube');
  });

  it('should correctly detect Instagram platform', () => {
    expect(DownloaderRegistry.detectPlatform('https://www.instagram.com/reel/C1234567890/')).toBe('instagram');
    expect(DownloaderRegistry.detectPlatform('https://instagram.com/p/B1234567890/')).toBe('instagram');
  });

  it('should return unknown for unrecognized URLs', () => {
    expect(DownloaderRegistry.detectPlatform('https://otherdomain.com/item')).toBe('unknown');
  });
});
