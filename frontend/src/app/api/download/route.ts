import { NextRequest, NextResponse } from 'next/server';
import { JobStoreService } from '../../../lib/server/jobStore';
import { normalizeAndExtractMediaInfo } from '../../../lib/server/urlNormalizer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, quality = '1080p', format = 'mp4', title = '', mediaUrl } = body || {};

    const norm = normalizeAndExtractMediaInfo(url);
    if (!norm.isValid) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid video link.' },
        { status: 400 }
      );
    }

    const job = await JobStoreService.createJob(
      url,
      norm.normalizedUrl,
      quality,
      format,
      title,
      norm.mediaId,
      norm.platform,
      mediaUrl
    );

    return NextResponse.json(
      {
        success: true,
        jobId: job.jobId,
        normalizedUrl: norm.normalizedUrl,
        mediaId: norm.mediaId,
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
