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
  quality: string;
  height: number;
  format: string;
  formatId: string;
  hasVideo: boolean;
  hasAudio: boolean;
  needsMerge: boolean;
  filesizeApprox?: number;
  fps?: number;
}

export interface MediaAnalysisResponse {
  success: boolean;
  url: string;
  normalizedUrl: string;
  platform: PlatformType;
  mediaId?: string; // reelId or videoId
  title: string;
  thumbnail: string;
  duration: number;
  maxAvailableQuality: string;
  formats: QualityFormat[];
  error?: string;
}

export interface CreateDownloadResponse {
  success: boolean;
  jobId: string;
  normalizedUrl?: string;
  mediaId?: string;
  downloadUrl?: string;
  filename?: string;
  message?: string;
  error?: string;
}


export type JobStatus =
  | 'queued'
  | 'processing'
  | 'merging'
  | 'completed'
  | 'failed';

export interface JobStatusResponse {
  success: boolean;
  jobId: string;
  normalizedUrl?: string;
  mediaId?: string;
  status: JobStatus;
  progress: number;
  title?: string;
  quality: string;
  format: string;
  fileSize?: number;
  downloadUrl?: string | null;
  error?: string | null;
  completedAt?: string;
  expiresAt?: string;
}

export interface HistoryItem {
  id: string;
  url: string;
  platform: PlatformType;
  title: string;
  thumbnail: string;
  quality: string;
  downloadedAt: string;
}
