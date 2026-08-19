import { NextRequest, NextResponse } from 'next/server';
import { ExactMediaExtractor } from '../../../../../lib/server/exactMediaExtractor';
import { JobStoreService } from '../../../../../lib/server/jobStore';
import { normalizeAndExtractMediaInfo } from '../../../../../lib/server/urlNormalizer';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  const searchParams = req.nextUrl.searchParams;

  const rawUrlParam = searchParams.get('u');
  const qualityParam = searchParams.get('q') || '1080p';

  // 1. Retrieve job from memory store or query parameters
  const job = await JobStoreService.getJob(jobId);

  const targetUrl = job?.normalizedUrl || rawUrlParam || '';
  const quality = job?.quality || qualityParam;
  const mediaId = job?.mediaId;
  const title = job?.title || 'JANO_HD_Video';

  if (!targetUrl) {
    return new NextResponse('Download link expired. Please analyze the URL again.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const norm = normalizeAndExtractMediaInfo(targetUrl);
  if (!norm.isValid) {
    return new NextResponse('Invalid video link.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const normalizedUrl = norm.normalizedUrl;
  const platform = norm.platform;
  const reelId = mediaId || norm.mediaId;

  console.log(
    `[FILE_DOWNLOAD] [JOB] ${jobId} [PLATFORM] ${platform} [REEL_ID] ${reelId || 'none'} [URL] ${normalizedUrl}`
  );

  let mediaStreamUrl = job?.mediaUrl;

  // 2. Resolve direct media stream if missing
  if (!mediaStreamUrl) {
    const exact = await ExactMediaExtractor.extractExactMediaUrl(normalizedUrl, platform);
    if (exact && exact.mediaUrl) {
      mediaStreamUrl = exact.mediaUrl;
    }
  }

  // 3. Try streaming or 302 redirecting to verified media stream URL
  if (mediaStreamUrl && (mediaStreamUrl.startsWith('http://') || mediaStreamUrl.startsWith('https://'))) {
    try {
      const videoRes = await fetch(mediaStreamUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (videoRes.ok && videoRes.body) {
        const cleanTitle = (title || 'Video')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '')
          .substring(0, 40);
        const filename = `JANO_HD_${cleanTitle || 'Video'}_${quality}.mp4`;

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
      // stream proxy failed, fall back to 302 redirect below
    }

    // Direct 302 Redirect to verified HTTPS media stream URL
    return NextResponse.redirect(mediaStreamUrl, 302);
  }

  // 4. Try local backend service if active
  try {
    const backendRes = await fetch(`http://localhost:5000/api/download/${jobId}/file`);
    if (backendRes.ok && backendRes.body) {
      const cleanTitle = (title || 'Video')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 40);
      const filename = `JANO_HD_${cleanTitle || 'Video'}_${quality}.mp4`;

      const responseHeaders = new Headers();
      responseHeaders.set('Content-Type', 'video/mp4');
      responseHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);

      return new NextResponse(backendRes.body as any, {
        status: 200,
        headers: responseHeaders,
      });
    }
  } catch (e) {
    // backend not active
  }

  // 5. Direct 302 Redirect to normalized original URL if media stream URL could not be proxied
  return NextResponse.redirect(normalizedUrl, 302);
}
