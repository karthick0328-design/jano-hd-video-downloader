import { NextRequest, NextResponse } from 'next/server';
import { JobStoreService } from '../../../lib/server/jobStore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, quality = '1080p', format = 'mp4', title = '', mediaUrl } = body || {};

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    await JobStoreService.createJob(jobId, url, quality, format, title, mediaUrl);

    return NextResponse.json(
      {
        success: true,
        jobId,
        message: 'Download job created successfully.',
      },
      { status: 202 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to initialize download job. Please try again.' },
      { status: 500 }
    );
  }
}
