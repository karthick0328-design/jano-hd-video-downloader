import { NextRequest, NextResponse } from 'next/server';
import { generateSafeFilename } from '../../../../../lib/server/blobStorage';
import { JobStoreService } from '../../../../../lib/server/jobStore';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  // 1. Retrieve job from memory store
  const job = await JobStoreService.getJob(jobId);

  if (!job) {
    return NextResponse.json(
      { success: false, error: 'Download link expired or job not found. Please analyze the URL again.' },
      { status: 404 }
    );
  }

  if (job.status !== 'completed') {
    return NextResponse.json(
      { success: false, error: job.errorMessage || 'Video processing did not complete successfully.' },
      { status: 400 }
    );
  }

  const mediaStreamUrl = job.blobUrl || job.storageObjectId || job.mediaUrl;
  const title = job.title || 'Video';
  const quality = job.quality || '1080p';
  const filename = generateSafeFilename(title, quality);

  console.log(
    `[FILE_DOWNLOAD_REQUEST] [JOB] ${jobId} [PLATFORM] ${job.platform || 'unknown'} [REEL_ID] ${job.mediaId || 'none'} [MEDIA_URL] ${mediaStreamUrl}`
  );

  if (mediaStreamUrl && (mediaStreamUrl.startsWith('http://') || mediaStreamUrl.startsWith('https://'))) {
    try {
      const videoRes = await fetch(mediaStreamUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (videoRes.ok && videoRes.body) {
        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', 'video/mp4');
        responseHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);

        const contentLength = videoRes.headers.get('content-length');
        if (contentLength && contentLength !== '0') {
          responseHeaders.set('Content-Length', contentLength);
        }

        return new NextResponse(videoRes.body as any, {
          status: 200,
          headers: responseHeaders,
        });
      } else {
        console.error(`[FILE_FETCH_FAILED] Media stream URL returned HTTP status ${videoRes.status}`);
      }
    } catch (err: any) {
      console.error('[FILE_FETCH_ERROR] Error fetching media stream from storage:', err.message);
    }
  }

  // Never return 302 redirects to web pages or plain text error responses
  return NextResponse.json(
    { success: false, error: 'Unable to stream MP4 media file from storage.' },
    { status: 404 }
  );
}

