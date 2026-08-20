import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { generateSafeFilename } from '../../../../../lib/server/blobStorage';
import { ExactMediaExtractor } from '../../../../../lib/server/exactMediaExtractor';
import { JobStoreService } from '../../../../../lib/server/jobStore';
import { normalizeAndExtractMediaInfo } from '../../../../../lib/server/urlNormalizer';

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

  const fetchStream = async (url: string) => {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN;

    // Handle Private Vercel Blob store URLs via SDK get()
    if (url.includes('private.blob.vercel-storage.com') && blobToken) {
      try {
        console.log('[PRIVATE_BLOB_FETCH] Fetching private blob stream via @vercel/blob SDK...');
        const privateResult = await get(url, { access: 'private', token: blobToken });
        if (privateResult && privateResult.stream) {
          const resHeaders = new Headers();
          if (privateResult.headers) {
            Object.entries(privateResult.headers).forEach(([k, v]) => {
              if (v) resHeaders.set(k, String(v));
            });
          }
          resHeaders.set('Content-Type', 'video/mp4');
          resHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);

          return new Response(privateResult.stream as any, {
            status: privateResult.statusCode || 200,
            headers: resHeaders,
          });
        }
      } catch (privErr: any) {
        console.error('[PRIVATE_BLOB_FETCH_ERROR]', privErr.message);
      }
    }

    const fetchHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    if (url.includes('googlevideo.com') || url.includes('youtube.com') || url.includes('youtu.be')) {
      fetchHeaders['Referer'] = 'https://www.youtube.com/';
      fetchHeaders['Origin'] = 'https://www.youtube.com/';
    } else if (url.includes('instagram.com') || url.includes('cdninstagram.com')) {
      fetchHeaders['Referer'] = 'https://www.instagram.com/';
    } else if (url.includes('facebook.com') || url.includes('fbcdn.net')) {
      fetchHeaders['Referer'] = 'https://www.facebook.com/';
    }

    if (blobToken) {
      fetchHeaders['Authorization'] = `Bearer ${blobToken}`;
    }

    const clientRange = req.headers.get('range');
    if (clientRange) {
      fetchHeaders['Range'] = clientRange;
    }

    return await fetch(url, { headers: fetchHeaders });
  };

  try {
    let videoRes = await fetchStream(mediaStreamUrl);

    // If initial stream fetch returned 403 or non-ok (e.g. expired/restricted googlevideo URL), refresh stream URL
    if (!videoRes.ok && videoRes.status !== 206) {
      console.warn(
        `[STREAM_FETCH_WARN] Direct fetch returned status ${videoRes.status}. Attempting fresh stream re-extraction...`
      );
      const job = await JobStoreService.getJob(jobId);
      const targetUrl = searchParams.get('u') || job?.url || job?.normalizedUrl;
      if (targetUrl) {
        const norm = normalizeAndExtractMediaInfo(targetUrl);
        const refreshed = await ExactMediaExtractor.extractExactMediaUrl(
          norm.normalizedUrl || targetUrl,
          norm.platform
        );
        if (refreshed && refreshed.mediaUrl) {
          console.log(`[STREAM_REFRESH_SUCCESS] Obtained fresh media URL: ${refreshed.mediaUrl}`);
          mediaStreamUrl = refreshed.mediaUrl;
          videoRes = await fetchStream(mediaStreamUrl);
        }
      }
    }

    const contentType = videoRes.headers.get('content-type') || '';

    if (
      (videoRes.ok || videoRes.status === 206) &&
      videoRes.body &&
      !contentType.includes('text/html') &&
      !contentType.includes('application/json')
    ) {
      const responseHeaders = new Headers();
      responseHeaders.set('Content-Type', 'video/mp4');
      responseHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);
      responseHeaders.set('Accept-Ranges', 'bytes');

      const contentLength = videoRes.headers.get('content-length');
      if (contentLength && contentLength !== '0') {
        responseHeaders.set('Content-Length', contentLength);
      }

      const contentRange = videoRes.headers.get('content-range');
      if (contentRange) {
        responseHeaders.set('Content-Range', contentRange);
      }

      return new NextResponse(videoRes.body as any, {
        status: videoRes.status,
        headers: responseHeaders,
      });
    } else {
      console.error(
        `[FILE_FETCH_FAILED] Stream URL returned status ${videoRes.status} and Content-Type ${contentType}`
      );
    }
  } catch (err: any) {
    console.error('[FILE_FETCH_ERROR] Error fetching media stream:', err.message);
  }

  // Never return 302 redirects to googlevideo.com or plain text error files
  return NextResponse.json(
    {
      success: false,
      error: 'Video stream expired or access denied by source provider. Please analyze the URL again.',
    },
    { status: 403 }
  );
}


