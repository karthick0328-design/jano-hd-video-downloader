import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'hd-downloader-frontend-api',
    timestamp: new Date().toISOString(),
  });
}
