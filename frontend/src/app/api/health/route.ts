import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'hd-downloader-frontend-api',
    blobConfigured: !!process.env.BLOB_READ_WRITE_TOKEN,
    timestamp: new Date().toISOString(),
  });
}

