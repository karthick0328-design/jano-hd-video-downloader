import { NextRequest, NextResponse } from 'next/server';
import { generateSafeFilename } from '../../../../../lib/server/blobStorage';
import { JobStoreService } from '../../../../../lib/server/jobStore';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  const searchParams = req.nextUrl.searchParams;

  const blobUrlParam = searchParams.get('b') || searchParams.get('u');
  const customNameParam = searchParams.get('name');

  // 1. Retrieve job or stateless query parameter
  let mediaStreamUrl = blobUrlParam ? decodeURIComponent(blobUrlParam) : undefined;
  let filename = customNameParam ? decodeURIComponent(customNameParam) : undefined;

  if (!mediaStreamUrl) {
    const job = await JobStoreService.getJob(jobId);
    if (job && job.status === 'completed') {
      mediaStreamUrl = job.blobUrl || job.storageObjectId || job.mediaUrl;
      if (!filename) {
        filename = generateSafeFilename(job.title || 'Video', job.quality || '1080p');
      }
    }
  }

  if (!filename) {
    filename = generateSafeFilename('Video', '1080p');
  }

  if (!mediaStreamUrl || (!mediaStreamUrl.startsWith('http://') && !mediaStreamUrl.startsWith('https://'))) {
    return NextResponse.json(
      { success: false, error: 'Download link expired or storage object unavailable. Please analyze the URL again.' },
      { status: 404 }
    );
  }

  console.log(
    `[FILE_DOWNLOAD_REQUEST] [JOB] ${jobId} [MEDIA_URL] ${mediaStreamUrl} [FILENAME] ${filename}`
  );

  try {
    const fetchHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      fetchHeaders['Authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`;
    }

    const videoRes = await fetch(mediaStreamUrl, {
      headers: fetchHeaders,
    });

    const contentType = videoRes.headers.get('content-type') || '';

    if (videoRes.ok && videoRes.body && !contentType.includes('text/html') && !contentType.includes('application/json')) {
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
      console.error(`[FILE_FETCH_FAILED] Stream URL returned Content-Type ${contentType} and status ${videoRes.status}`);
      if (
        mediaStreamUrl.includes('googlevideo.com') ||
        mediaStreamUrl.includes('cdninstagram.com') ||
        mediaStreamUrl.includes('fbcdn.net') ||
        mediaStreamUrl.includes('.mp4')
      ) {
        console.log(`[FILE_REDIRECT_FALLBACK] Redirecting client directly to media stream: ${mediaStreamUrl}`);
        return NextResponse.redirect(mediaStreamUrl, { status: 302 });
      }
    }
  } catch (err: any) {
    console.error('[FILE_FETCH_ERROR] Error fetching media stream from storage:', err.message);
    if (
      mediaStreamUrl &&
      (mediaStreamUrl.includes('googlevideo.com') ||
        mediaStreamUrl.includes('cdninstagram.com') ||
        mediaStreamUrl.includes('fbcdn.net') ||
        mediaStreamUrl.includes('.mp4'))
    ) {
      console.log(`[FILE_REDIRECT_FALLBACK] Redirecting client directly to media stream on error: ${mediaStreamUrl}`);
      return NextResponse.redirect(mediaStreamUrl, { status: 302 });
    }
  }

  // Never return 302 redirects to web pages or plain text error responses
  return NextResponse.json(
    { success: false, error: 'Unable to stream MP4 media file from storage.' },
    { status: 404 }
  );
}


