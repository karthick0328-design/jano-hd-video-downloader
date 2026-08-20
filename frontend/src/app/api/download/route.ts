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

    // 1. Resolve exact direct media stream matching mediaId
    if (!mediaUrl) {
      const exact = await ExactMediaExtractor.extractExactMediaUrl(normalizedUrl, platform);
      if (exact && exact.mediaUrl) {
        // Strict Media Identity Check
        if (mediaId && exact.mediaId && exact.mediaId.toLowerCase() !== mediaId.toLowerCase()) {
          console.error(`[MEDIA_IDENTITY_REJECTED] Extracted ID ${exact.mediaId} !== requested ID ${mediaId}`);
          return NextResponse.json(
            { success: false, error: 'Unable to verify that the extracted media matches the requested video ID.' },
            { status: 422 }
          );
        }
        mediaUrl = exact.mediaUrl;
        if (!title && exact.title) title = exact.title;
      }
    }

    // If media stream could not be extracted directly by Invidious/scrapers, fallback to normalizedUrl
    if (!mediaUrl && normalizedUrl && (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://'))) {
      mediaUrl = normalizedUrl;
    }

    // If media stream could not be extracted directly
    if (!mediaUrl) {
      const tempJob = await JobStoreService.createJob(
        url,
        normalizedUrl,
        quality,
        format,
        title || 'Video',
        mediaId,
        platform,
        undefined,
        undefined,
        'failed',
        'Unable to retrieve the exact requested video stream. Please verify the link.'
      );

      return NextResponse.json(
        {
          success: false,
          jobId: tempJob.jobId,
          error: 'RapidAPI monthly limit reached or video unavailable. Please add your fresh free RAPIDAPI_KEY in Vercel settings.',
        },
        { status: 422 }
      );
    }

    const safeTitle = title || 'Video';
    const safeFilename = generateSafeFilename(safeTitle, quality);

    // 2. Storage & Stream Verification
    const storageResult = await BlobStorageService.persistAndVerifyMedia(
      `job_${Date.now()}`,
      mediaUrl,
      safeTitle,
      quality
    );

    if (!storageResult || !storageResult.success || !storageResult.downloadUrl) {
      const failedJob = await JobStoreService.createJob(
        url,
        normalizedUrl,
        quality,
        format,
        safeTitle,
        mediaId,
        platform,
        mediaUrl,
        undefined,
        'failed',
        storageResult?.error || 'Persistent storage verification failed. Media object could not be saved.'
      );

      return NextResponse.json(
        {
          success: false,
          jobId: failedJob.jobId,
          error: storageResult?.error || 'Persistent storage verification failed. Media object could not be saved.',
        },
        { status: 422 }
      );
    }

    const verifiedBlobUrl = storageResult.downloadUrl;

    // Create completed job referencing verified storage object
    const job = await JobStoreService.createJob(
      url,
      normalizedUrl,
      quality,
      format,
      safeTitle,
      mediaId,
      platform,
      mediaUrl,
      verifiedBlobUrl,
      'completed'
    );

    let finalDownloadUrl = `/api/download/${job.jobId}/file?b=${encodeURIComponent(verifiedBlobUrl)}&u=${encodeURIComponent(normalizedUrl)}&name=${encodeURIComponent(safeFilename)}`;

    if (
      verifiedBlobUrl &&
      (verifiedBlobUrl.includes('googlevideo.com') ||
        verifiedBlobUrl.includes('cdninstagram.com') ||
        verifiedBlobUrl.includes('fbcdn.net') ||
        verifiedBlobUrl.includes('sharechat.com'))
    ) {
      finalDownloadUrl = verifiedBlobUrl;
    }

    console.log(
      `[JOB_SUCCESS] [JOB] ${job.jobId} [PLATFORM] ${platform} [REEL_ID] ${mediaId || 'none'} [URL] ${normalizedUrl} [STORAGE_URL] ${verifiedBlobUrl} [DOWNLOAD_URL] ${finalDownloadUrl}`
    );


    return NextResponse.json(
      {
        success: true,
        jobId: job.jobId,
        normalizedUrl,
        mediaId,
        downloadUrl: finalDownloadUrl,
        filename: safeFilename,
        message: 'Download job created successfully and storage object verified.',
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


