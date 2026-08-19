export type PlatformType =
  | 'youtube'
  | 'youtube-short'
  | 'instagram'
  | 'instagram-reel'
  | 'facebook'
  | 'facebook-reel'
  | 'sharechat'
  | 'unknown';

export interface QualityFormat {
  quality: string; // e.g., '2160p', '1440p', '1080p', '720p', '480p', '360p'
  height: number;
  format: string; // e.g., 'mp4', 'webm'
  formatId: string;
  hasVideo: boolean;
  hasAudio: boolean;
  needsMerge: boolean;
  filesizeApprox?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
}

export interface MediaAnalysisResult {
  success: boolean;
  url: string;
  normalizedUrl: string;
  platform: PlatformType;
  mediaId?: string; // reelId or videoId
  title: string;
  thumbnail: string;
  duration: number; // in seconds
  maxAvailableQuality: string;
  formats: QualityFormat[];
  error?: string;
}

export interface DownloadJobOptions {
  jobId: string;
  url: string;
  normalizedUrl: string;
  platform: PlatformType;
  mediaId?: string;
  quality: string;
  format: string;
  formatId?: string;
  title?: string;
}

export interface DownloadJobResult {
  jobId: string;
  normalizedUrl: string;
  mediaId?: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  duration: number;
  resolution: string;
  videoCodec: string;
  audioCodec: string;
}
