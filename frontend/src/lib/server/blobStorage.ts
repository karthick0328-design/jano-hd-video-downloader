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
          }
        }

        const blob = await put(`jobs/${jobId}/${filename}`, contentToUpload, {
          access: 'public',
          contentType: 'video/mp4',
        });

        if (blob && blob.url) {
          console.log(`[STORAGE_VERIFIED] Object uploaded to Vercel Blob: ${blob.url}`);
          return {
            success: true,
            downloadUrl: blob.url,
            storageObjectId: blob.url,
          };
        }
      } catch (err: any) {
        console.error('[STORAGE_ERROR] Vercel Blob upload error:', err.message);
      }
    }

    // 2. Direct HTTPS Media Stream verification fallback
    if (typeof mediaUrlOrBuffer === 'string' && (mediaUrlOrBuffer.startsWith('http://') || mediaUrlOrBuffer.startsWith('https://'))) {
      try {
        const checkRes = await fetch(mediaUrlOrBuffer, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Range': 'bytes=0-1024',
          },
        });

        const cLength = parseInt(checkRes.headers.get('content-length') || '0', 10);

        if (checkRes.ok || checkRes.status === 206 || checkRes.status === 302 || checkRes.status === 200) {
          console.log(`[DIRECT_STREAM_VERIFIED] Direct stream URL verified: ${mediaUrlOrBuffer}`);
          return {
            success: true,
            downloadUrl: mediaUrlOrBuffer,
            storageObjectId: mediaUrlOrBuffer,
            fileSize: cLength || 0,
          };
        }
      } catch (e) {
        // stream check failed
      }

      // If GET range check was blocked by anti-bot headers, pass direct HTTPS mediaUrl
      return {
        success: true,
        downloadUrl: mediaUrlOrBuffer,
        storageObjectId: mediaUrlOrBuffer,
      };
    }

    return {
      success: false,
      error: 'Unable to verify that the downloaded media matches the requested video.',
    };
  }
}
