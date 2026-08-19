import { NextRequest, NextResponse } from 'next/server';
import { ServerDownloaderService } from '../../../../lib/server/downloaderRegistry';
import { validateMediaUrl } from '../../../../lib/server/ssrfProtection';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body || {};

    const validation = validateMediaUrl(url);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Please enter a valid video link.' },
        { status: 400 }
      );
    }

    const result = await ServerDownloaderService.analyzeUrl(validation.normalizedUrl!);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to inspect video URL.' },
        { status: 422 }
      );
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'An error occurred while inspecting the video. Please try again.' },
      { status: 500 }
    );
  }
}
