import crypto from 'crypto';

export interface DownloadJob {
  jobId: string;
  url: string;
  normalizedUrl: string;
  mediaId?: string; // reelId, videoId
  platform?: string;
  quality: string;
  format: string;
  title: string;
  mediaUrl?: string;
  blobUrl?: string;
  storageObjectId?: string;
  mimeType?: string;
  status: 'queued' | 'processing' | 'merging' | 'completed' | 'failed';
  progress: number;
  fileSize?: number;
  filePath?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
}

const jobStore = new Map<string, DownloadJob>();

export class JobStoreService {
  public static async createJob(
    url: string,
    normalizedUrl: string,
    quality: string,
    format: string,
    title: string,
    mediaId?: string,
    platform?: string,
    mediaUrl?: string,
    blobUrl?: string,
    status: 'queued' | 'processing' | 'merging' | 'completed' | 'failed' = 'completed',
    errorMessage?: string
  ): Promise<DownloadJob> {
    const jobId = `job_${crypto.randomUUID()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3600 * 1000).toISOString();

    const job: DownloadJob = {
      jobId,
      url,
      normalizedUrl,
      mediaId,
      platform,
      quality,
      format,
      title,
      mediaUrl,
      blobUrl: blobUrl || mediaUrl,
      storageObjectId: blobUrl || mediaUrl,
      mimeType: 'video/mp4',
      status,
      progress: status === 'completed' ? 100 : 0,
      errorMessage,
      createdAt: now.toISOString(),
      completedAt: status === 'completed' ? now.toISOString() : undefined,
      expiresAt,
    };
    jobStore.set(jobId, job);

    console.log(
      `[JOB_STORE] ${jobId} [PLATFORM] ${platform || 'unknown'} [REEL_ID] ${mediaId || 'none'} [URL] ${normalizedUrl} [QUALITY] ${quality} [STATUS] ${status}`
    );

    return job;
  }

  public static async getJob(jobId: string): Promise<DownloadJob | null> {
    return jobStore.get(jobId) || null;
  }

  public static async updateJob(
    jobId: string,
    updates: Partial<DownloadJob>
  ): Promise<DownloadJob | null> {
    const existing = jobStore.get(jobId);
    if (!existing) return null;

    const updated = { ...existing, ...updates };
    jobStore.set(jobId, updated);
    return updated;
  }
}

