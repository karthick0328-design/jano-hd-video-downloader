import {
  DownloadJobOptions,
  DownloadJobResult,
  MediaAnalysisResult,
  PlatformType,
  QualityFormat,
} from './types';

export abstract class DownloaderService {
  abstract readonly platform: PlatformType;

  /**
   * Check if this service can handle the given URL
   */
  abstract canHandle(url: string): boolean;

  /**
   * Analyze media URL to fetch metadata and available formats
   */
  abstract analyze(url: string): Promise<MediaAnalysisResult>;

  /**
   * Extract available quality formats
   */
  abstract getFormats(url: string): Promise<QualityFormat[]>;

  /**
   * Execute actual download and format merging
   */
  abstract executeDownload(
    options: DownloadJobOptions,
    onProgress?: (progress: number, stage: string) => void
  ): Promise<DownloadJobResult>;
}
