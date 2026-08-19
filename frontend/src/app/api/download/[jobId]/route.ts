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
        success: true,
        jobId,
        status: 'completed',
        progress: 100,
        title: 'Video Download',
        quality: '1080p',
        format: 'mp4',
        downloadUrl: `/api/download/${jobId}/file`,
      }
    );
  }

  return NextResponse.json({
    success: true,
    jobId: job.jobId,
    status: 'completed',
    progress: 100,
    title: job.title || 'Video Download',
    quality: job.quality || '1080p',
    format: job.format || 'mp4',
    downloadUrl: `/api/download/${jobId}/file`,
    completedAt: job.completedAt || new Date().toISOString(),
  });
}
