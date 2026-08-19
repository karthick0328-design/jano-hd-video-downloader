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

  // 1. Try retrieving job from memory store first
  const job = await JobStoreService.getJob(jobId);

  const targetUrl = job?.normalizedUrl || rawUrlParam || '';
  const quality = job?.quality || qualityParam;
  const mediaId = job?.mediaId;
  const title = job?.title || 'JANO_HD_Video';

  if (!targetUrl) {
    return NextResponse.json(
      {
        success: false,
        error: 'Download job not found or expired. Please analyze the URL again.',
      },
      { status: 404 }
    );
  }

  const norm = normalizeAndExtractMediaInfo(targetUrl);
  if (!norm.isValid) {
    return NextResponse.json(
      { success: false, error: 'Invalid video URL.' },
      { status: 400 }
    );
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

  if (mediaStreamUrl && (mediaStreamUrl.startsWith('http://') || mediaStreamUrl.startsWith('https://'))) {
    try {
      const videoRes = await fetch(mediaStreamUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (videoRes.ok && videoRes.body) {
        const safeTitle = (title || 'JANO_HD_Video')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .substring(0, 50);
        const safeReel = reelId ? `_${reelId}` : '';
        const filename = `JANO_HD${safeReel}_${quality}.mp4`;

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
      // stream proxy failed, fallback below
    }

    // Direct 302 Redirect to verified HTTPS media stream URL
    return NextResponse.redirect(mediaStreamUrl, 302);
  }

  // 3. Try local backend service if active
  try {
    const backendRes = await fetch(`http://localhost:5000/api/download/${jobId}/file`);
    if (backendRes.ok && backendRes.body) {
      const safeTitle = (title || 'JANO_HD_Video')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 50);
      const filename = `JANO_HD_${quality}.mp4`;

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

  return NextResponse.json(
    {
      success: false,
      error:
        'Unable to verify that the downloaded media matches the requested Instagram Reel.',
    },
    { status: 400 }
  );
}
