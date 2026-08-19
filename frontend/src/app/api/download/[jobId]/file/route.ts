import { NextRequest, NextResponse } from 'next/server';
import { JobStoreService } from '../../../../../lib/server/jobStore';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  const job = await JobStoreService.getJob(jobId);

  if (!job || !job.mediaUrl) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Unable to extract direct MP4 video stream for this link. Please verify that the URL is a public video and try again.',
      },
      { status: 400 }
    );
  }

  try {
    const videoRes = await fetch(job.mediaUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!videoRes.ok || !videoRes.body) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unable to stream media file from source. Content may be restricted or private.',
        },
        { status: 400 }
      );
    }

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
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Error streaming media content. Please verify that the link is accessible.',
      },
      { status: 500 }
    );
  }
}
