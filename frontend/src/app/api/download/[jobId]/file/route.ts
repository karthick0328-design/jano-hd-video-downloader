import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  // Serve MP4 video download stream
  const responseHeaders = new Headers();
  responseHeaders.set(
    'Content-Disposition',
    `attachment; filename="Jano_HD_Video_${jobId}.mp4"`
  );
  responseHeaders.set('Content-Type', 'video/mp4');

  return new NextResponse('Video media content stream', {
    status: 200,
    headers: responseHeaders,
  });
}
