export interface DownloadJob {
  jobId: string;
  url: string;
  quality: string;
  format: string;
  title: string;
  status: 'queued' | 'processing' | 'merging' | 'completed' | 'failed';
  progress: number;
  fileSize?: number;
  filePath?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

const jobStore = new Map<string, DownloadJob>();

export class JobStoreService {
  public static async createJob(
    jobId: string,
    url: string,
    quality: string,
    format: string,
    title: string
  ): Promise<DownloadJob> {
    const job: DownloadJob = {
      jobId,
      url,
      quality,
      format,
      title,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    jobStore.set(jobId, job);
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
