import { NextRequest, NextResponse } from 'next/server';
import { JobStoreService } from '../../../../lib/server/jobStore';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  const job = await JobStoreService.getJob(jobId);

  if (!job) {
    return NextResponse.json(
      {
        success: false,
        error: 'Job not found or expired.',
      },
      { status: 404 }
    );
  }

  const isCompleted = job.status === 'completed';
  const downloadUrl = isCompleted ? `/api/download/${job.jobId}/file` : null;

  return NextResponse.json({
    success: job.status !== 'failed',
    jobId: job.jobId,
    normalizedUrl: job.normalizedUrl,
    mediaId: job.mediaId,
    status: job.status,
    progress: job.progress,
    title: job.title || 'Video Download',
    quality: job.quality || '1080p',
    format: job.format || 'mp4',
    downloadUrl,
    error: job.status === 'failed' ? job.errorMessage || 'Job processing failed.' : undefined,
    completedAt: job.completedAt || new Date().toISOString(),
  });
}

