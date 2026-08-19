import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService, generateSafeFilename } from '../../../lib/server/blobStorage';
import { ServerDownloaderService } from '../../../lib/server/downloaderRegistry';
import { ExactMediaExtractor } from '../../../lib/server/exactMediaExtractor';
import { JobStoreService } from '../../../lib/server/jobStore';
import { normalizeAndExtractMediaInfo } from '../../../lib/server/urlNormalizer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { url, quality = '1080p', format = 'mp4', title = '', mediaUrl } = body || {};

    const norm = normalizeAndExtractMediaInfo(url);
    if (!norm.isValid) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid video link.' },
        { status: 400 }
      );
    }

    const normalizedUrl = norm.normalizedUrl;
    const platform = norm.platform;
    const mediaId = norm.mediaId;

    // 1. Resolve media stream URL if missing
    if (!mediaUrl) {
      const exact = await ExactMediaExtractor.extractExactMediaUrl(normalizedUrl, platform);
      if (exact && exact.mediaUrl) {
        mediaUrl = exact.mediaUrl;
        if (!title && exact.title) title = exact.title;
      } else {
        const analysis = await ServerDownloaderService.analyzeUrl(normalizedUrl);
        if (analysis && analysis.success) {
          if (!title) title = analysis.title;
        }
      }
    }

    const safeTitle = title || 'Video';
    const safeFilename = generateSafeFilename(safeTitle, quality);

    // 2. mandatory storage verification before marking completed
    let storageResult = null;
    if (mediaUrl) {
      storageResult = await BlobStorageService.persistAndVerifyMedia(
        `job_${Date.now()}`,
        mediaUrl,
        safeTitle,
        quality
      );
    }

    if (!storageResult || !storageResult.success || !storageResult.downloadUrl) {
      console.error(`[DOWNLOAD_FAILED] Media verification or persistent storage failed for ${normalizedUrl}`);
      return NextResponse.json(
        {
          success: false,
          error:
            'Unable to verify that the downloaded media matches the requested Instagram Reel.',
        },
        { status: 400 }
      );
    }

    const finalDownloadUrl = storageResult.downloadUrl;

    const job = await JobStoreService.createJob(
      url,
      normalizedUrl,
      quality,
      format,
      safeTitle,
      mediaId,
      platform,
      finalDownloadUrl
    );

    console.log(
      `[JOB_COMPLETED] [JOB] ${job.jobId} [PLATFORM] ${platform} [REEL_ID] ${mediaId || 'none'} [URL] ${normalizedUrl} [STORAGE_URL] ${finalDownloadUrl}`
    );

    return NextResponse.json(
      {
        success: true,
        jobId: job.jobId,
        normalizedUrl,
        mediaId,
        downloadUrl: finalDownloadUrl,
        filename: safeFilename,
        message: 'Download job created and verified successfully.',
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
