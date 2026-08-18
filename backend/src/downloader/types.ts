export type PlatformType = 'youtube' | 'instagram' | 'unknown';

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
  platform: PlatformType;
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
  platform: PlatformType;
  quality: string;
  format: string;
  formatId?: string;
}

export interface DownloadJobResult {
  jobId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  duration: number;
  resolution: string;
  videoCodec: string;
  audioCodec: string;
}
