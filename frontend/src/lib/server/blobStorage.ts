import { put } from '@vercel/blob';

export interface StorageUploadResult {
  success: boolean;
  downloadUrl?: string;
  storageObjectId?: string;
  fileSize?: number;
  error?: string;
}

export function generateSafeFilename(title: string, quality: string = '1080p'): string {
  const cleanTitle = (title || 'Video')
    .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace non-alphanumeric chars with underscore
    .replace(/_+/g, '_')             // Collapse consecutive underscores to a single underscore
    .replace(/^_+|_+$/g, '')         // Trim leading and trailing underscores
    .substring(0, 40);

  const safeName = cleanTitle || 'Video';
  return `JANO_HD_${safeName}_${quality}.mp4`;
}

export class BlobStorageService {
  /**
   * Perform an actual storage existence / readability check on a storage URL
   */
  public static async verifyStorageObject(storageUrl: string): Promise<{ verified: boolean; fileSize?: number }> {
    if (!storageUrl || (!storageUrl.startsWith('http://') && !storageUrl.startsWith('https://'))) {
      return { verified: false };
    }

    try {
      const checkRes = await fetch(storageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Range': 'bytes=0-1024',
        },
      });

      const contentType = checkRes.headers.get('content-type') || '';
      const contentLengthStr = checkRes.headers.get('content-length') || checkRes.headers.get('content-range')?.split('/')?.[1];
      const fileSize = contentLengthStr ? parseInt(contentLengthStr, 10) : 0;

      // Status must be 200 or 206 (Partial Content)
      if ((checkRes.ok || checkRes.status === 206) && (!contentType || contentType.includes('video') || contentType.includes('octet-stream') || contentType.includes('mp4') || fileSize > 0)) {
        return { verified: true, fileSize };
      }
    } catch (e) {
      console.error('[STORAGE_VERIFICATION_ERROR]', e);
    }

    return { verified: false };
  }

  /**
   * Upload MP4 stream or buffer to Vercel Blob persistent storage and verify readability
   */
  public static async persistAndVerifyMedia(
    jobId: string,
    mediaUrlOrBuffer: string | Buffer | ReadableStream,
    title: string,
    quality: string
  ): Promise<StorageUploadResult> {
    const filename = generateSafeFilename(title, quality);

    // 1. Try Vercel Blob Storage if BLOB_READ_WRITE_TOKEN is configured
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        console.log(`[STORAGE] Uploading MP4 to Vercel Blob: jobs/${jobId}/${filename}`);

        let contentToUpload: any = mediaUrlOrBuffer;
        if (typeof mediaUrlOrBuffer === 'string') {
          const res = await fetch(mediaUrlOrBuffer, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          });
          if (res.ok && res.body) {
            contentToUpload = res.body;
          } else {
            console.error(`[STORAGE_FETCH_ERROR] Stream fetch failed with status ${res.status}`);
          }
        }

        let blob: any;
        try {
          blob = await put(`jobs/${jobId}/${filename}`, contentToUpload, {
            access: 'public',
            contentType: 'video/mp4',
          });
        } catch (pubErr: any) {
          console.warn('[STORAGE] Public access put failed, trying private store access:', pubErr.message);
          blob = await put(`jobs/${jobId}/${filename}`, contentToUpload, {
            access: 'private',
            contentType: 'video/mp4',
          });
        }

        const targetBlobUrl = blob?.downloadUrl || blob?.url;

        if (blob && targetBlobUrl) {
          // Perform explicit storage existence & readability verification
          const verification = await this.verifyStorageObject(targetBlobUrl);
          if (verification.verified) {
            console.log(`[STORAGE_VERIFIED] Object uploaded and verified in Vercel Blob: ${targetBlobUrl}`);
            return {
              success: true,
              downloadUrl: targetBlobUrl,
              storageObjectId: targetBlobUrl,
              fileSize: verification.fileSize || 0,
            };
          } else {
            console.error(`[STORAGE_VERIFICATION_FAILED] Vercel Blob object check failed for ${targetBlobUrl}`);
          }
        }
      } catch (err: any) {
        console.error('[STORAGE_ERROR] Vercel Blob upload error:', err.message);
      }
    }


    // 2. Direct HTTPS Media Stream verification fallback
    if (typeof mediaUrlOrBuffer === 'string' && (mediaUrlOrBuffer.startsWith('http://') || mediaUrlOrBuffer.startsWith('https://'))) {
      const verification = await this.verifyStorageObject(mediaUrlOrBuffer);
      if (verification.verified) {
        console.log(`[DIRECT_STREAM_VERIFIED] Direct stream URL verified: ${mediaUrlOrBuffer}`);
        return {
          success: true,
          downloadUrl: mediaUrlOrBuffer,
          storageObjectId: mediaUrlOrBuffer,
          fileSize: verification.fileSize || 0,
        };
      }
    }

    return {
      success: false,
      error: 'Unable to verify that the downloaded media object exists, is readable, and contains valid MP4 data.',
    };
  }
}

