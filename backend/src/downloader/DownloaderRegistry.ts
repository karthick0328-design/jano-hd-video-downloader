import { DownloaderService } from './DownloaderService';
import { InstagramDownloader } from './instagram/InstagramDownloader';
import { PlatformType } from './types';
import { YouTubeDownloader } from './youtube/YouTubeDownloader';

export class DownloaderRegistry {
  private static downloaders: DownloaderService[] = [
    new YouTubeDownloader(),
    new InstagramDownloader(),
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
    const service = this.getService(url);
    return service ? service.platform : 'unknown';
  }
}
