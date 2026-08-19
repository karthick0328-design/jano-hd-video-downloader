import { DownloaderService } from './DownloaderService';
import { FacebookDownloader } from './facebook/FacebookDownloader';
import { InstagramDownloader } from './instagram/InstagramDownloader';
import { ShareChatDownloader } from './sharechat/ShareChatDownloader';
import { PlatformType } from './types';
import { YouTubeDownloader } from './youtube/YouTubeDownloader';

export class DownloaderRegistry {
  private static downloaders: DownloaderService[] = [
    new YouTubeDownloader(),
    new InstagramDownloader(),
    new FacebookDownloader(),
    new ShareChatDownloader(),
  ];

  /**
   * Find appropriate downloader service for given URL
   */
  public static getService(url: string): DownloaderService | null {
    if (!url) return null;
    const cleanUrl = url.trim();
    for (const service of this.downloaders) {
      if (service.canHandle(cleanUrl)) {
        return service;
      }
    }
    return null;
  }

  /**
   * Identify platform type from URL
   */
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
}
