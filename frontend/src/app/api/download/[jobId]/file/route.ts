import { NextResponse, NextRequest } from 'next/server';
import { JobStoreService } from '@/lib/server/jobStore';
import { generateSafeFilename } from '@/lib/server/blobStorage';
import { get } from '@vercel/blob';
import ytdl from '@distube/ytdl-core';

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
      if (!filename) filename = generateSafeFilename(job.title || 'Video', job.quality || '1080p');
    }
  }

  if (!filename) filename = generateSafeFilename('Video', '1080p');

  if (!mediaStreamUrl) {
    return NextResponse.json({ success: false, error: 'Download link expired.' }, { status: 404 });
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN;

  if (mediaStreamUrl.includes('private.blob.vercel-storage.com') && blobToken) {
    try {
      const privateResult = await get(mediaStreamUrl, { access: 'private', token: blobToken });
      if (privateResult && privateResult.stream) {
const resHeaders = new Headers(); resHeaders.set('Access-Control-Allow-Origin', '*');
        if (privateResult.headers) {
          Object.entries(privateResult.headers).forEach(([k, v]) => { if (v) resHeaders.set(k, String(v)); });
        }
        resHeaders.set('Content-Type', 'video/mp4');
        resHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);
        return new Response(privateResult.stream as any, { status: privateResult.statusCode || 200, headers: resHeaders });
      }
    } catch (privErr: any) {
      console.error('[PRIVATE_BLOB_FETCH_ERROR]', privErr.message);
    }
  }

  if (mediaStreamUrl.includes('youtube.com') || mediaStreamUrl.includes('youtu.be')) {
    try {
      console.log(`[VERCEL_PROXY] Extracting and Proxying RAW YouTube URL natively: ${mediaStreamUrl}`);
      const clientRange = req.headers.get('range');
      const options: any = { filter: 'audioandvideo', quality: 'highest' };
      
      let start = 0;
      let end: number | undefined = undefined;
      let isPartial = false;
      
      if (clientRange) {
        const match = clientRange.match(/bytes=(\d+)-(\d*)/);
        if (match) {
          start = parseInt(match[1], 10);
          if (match[2]) end = parseInt(match[2], 10);
          options.range = { start, end };
          isPartial = true;
        }
      }

      const info = await ytdl.getInfo(mediaStreamUrl);
      const format = ytdl.chooseFormat(info.formats, options);
      const contentLength = parseInt(format.contentLength || '0', 10);
      
      const ytStream = ytdl(mediaStreamUrl, options);
      
      const webStream = new ReadableStream({
        start(controller) {
          ytStream.on('data', (chunk: any) => controller.enqueue(chunk));
          ytStream.on('end', () => controller.close());
          ytStream.on('error', (err: any) => controller.error(err));
        },
        cancel() {
          ytStream.destroy();
        }
      });

      const resHeaders = new Headers();
      resHeaders.set('Access-Control-Allow-Origin', '*');
      resHeaders.set('Content-Type', 'video/mp4');
      resHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);
      resHeaders.set('Accept-Ranges', 'bytes');
      
      if (contentLength) {
         const finalEnd = end !== undefined ? end : contentLength - 1;
         const length = finalEnd - start + 1;
         resHeaders.set('Content-Length', length.toString());
         if (isPartial) {
           resHeaders.set('Content-Range', `bytes ${start}-${finalEnd}/${contentLength}`);
         }
      }

      return new NextResponse(webStream, {
        status: isPartial ? 206 : 200,
        headers: resHeaders,
      });
    } catch (e: any) {
      console.error('[YTDL-CORE_PROXY_ERROR]', e.message);
      const accept = req.headers.get('accept') || '';
      if (accept.includes('text/html')) {
        return NextResponse.redirect(new URL('/?error=YouTube+is+currently+blocking+our+servers.+Please+try+again+later.', req.url));
      }
      return NextResponse.json({ success: false, error: 'Video stream expired or rate limited.' }, { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
  }

  if (mediaStreamUrl.includes('googlevideo.com')) {
    try {
      const fetchHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com/'
      };
      
      const clientRange = req.headers.get('range');
      if (clientRange) {
        fetchHeaders['Range'] = clientRange;
      }

      console.log(`[VERCEL_PROXY] Proxying googlevideo stream via standard fetch: ${mediaStreamUrl.substring(0, 50)}...`);
      const videoRes = await fetch(mediaStreamUrl, { headers: fetchHeaders });
      
      if (videoRes.ok || videoRes.status === 206) {
        const responseHeaders = new Headers();
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Content-Type', 'video/mp4');
        responseHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);
        responseHeaders.set('Accept-Ranges', 'bytes');
        
        const cl = videoRes.headers.get('content-length');
        if (cl) responseHeaders.set('Content-Length', cl);
        const cr = videoRes.headers.get('content-range');
        if (cr) responseHeaders.set('Content-Range', cr);

        return new NextResponse(videoRes.body as any, {
          status: videoRes.status,
          headers: responseHeaders,
        });
      } else {
        console.error(`[VERCEL_PROXY_ERROR] Standard fetch failed with status ${videoRes.status}`);
        const accept = req.headers.get('accept') || '';
        if (accept.includes('text/html')) {
          return NextResponse.redirect(new URL('/?error=Video+stream+expired.+Please+extract+again.', req.url));
        }
        return NextResponse.json({ success: false, error: 'Video stream expired or rate limited.' }, { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
    } catch (e: any) {
      console.error('[VERCEL_PROXY_ERROR]', e.message);
    }
  }

  // Redirect to underlying media (Cobalt proxies handle CORS and IP natively!)
  return NextResponse.redirect(mediaStreamUrl, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    }
  });
}
