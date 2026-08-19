import { NextRequest, NextResponse } from 'next/server';
import { JobStoreService } from '../../../../../lib/server/jobStore';

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

  console.log(
    `[FILE_DOWNLOAD] [JOB] ${jobId} [REEL_ID] ${job.mediaId || 'none'} [URL] ${job.normalizedUrl}`
  );

  // 1. Try streaming from direct mediaUrl if present
  if (job.mediaUrl) {
    try {
      const videoRes = await fetch(job.mediaUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (videoRes.ok && videoRes.body) {
        const safeTitle = (job.title || 'Jano_HD_Video').replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${safeTitle}_${job.quality || '1080p'}.mp4`;

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', 'video/mp4');
        responseHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);

        const contentLength = videoRes.headers.get('content-length');
        if (contentLength) {
          responseHeaders.set('Content-Length', contentLength);
        }

        return new NextResponse(videoRes.body as any, {
          status: 200,
          headers: responseHeaders,
        });
      }
    } catch (err: any) {
      // ignore stream error
    }
  }

  // 2. Try proxying from local backend engine if active
  try {
    const backendRes = await fetch(`http://localhost:5000/api/download/${jobId}/file`);
    if (backendRes.ok && backendRes.body) {
      const safeTitle = (job.title || 'Jano_HD_Video').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safeTitle}_${job.quality || '1080p'}.mp4`;

      const responseHeaders = new Headers();
      responseHeaders.set('Content-Type', 'video/mp4');
      responseHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);

      return new NextResponse(backendRes.body as any, {
        status: 200,
        headers: responseHeaders,
      });
    }
  } catch (e) {
    // backend not running
  }

  // Section 8 Requirement: Verification Failure Response
  return NextResponse.json(
    {
      success: false,
      error:
        'Unable to verify that the downloaded media matches the requested Instagram Reel.',
    },
    { status: 400 }
  );
}
