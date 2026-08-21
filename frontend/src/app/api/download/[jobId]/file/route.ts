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

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN;

  // 1. Private Vercel Blob store URLs MUST be proxy-fetched because they are private
  if (mediaStreamUrl.includes('private.blob.vercel-storage.com') && blobToken) {
    try {
      console.log('[PRIVATE_BLOB_FETCH] Fetching private blob stream via @vercel/blob SDK...');
      const privateResult = await get(mediaStreamUrl, { access: 'private', token: blobToken });
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

  // 2. Proxy URLs and Direct URLs (Cobalt, Instagram, etc)
  // Instead of proxying the video through Vercel (which crashes due to 10s timeout and 4.5MB limit),
  // we redirect the user to the underlying proxy URL.
  // Our dynamic Cobalt instances return proxy URLs that are not IP-bound, allowing the user's browser to download them!
  return NextResponse.redirect(mediaStreamUrl);
}



