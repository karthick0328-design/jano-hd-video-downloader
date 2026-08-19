import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  return NextResponse.json({
    success: true,
    jobId,
    status: 'completed',
    progress: 100,
    title: 'Downloaded Media',
    quality: '1080p',
    format: 'mp4',
    fileSize: 15420100,
    downloadUrl: `/api/download/${jobId}/file`,
    completedAt: new Date().toISOString(),
  });
}
