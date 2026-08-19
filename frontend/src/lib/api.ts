import {
  CreateDownloadResponse,
  JobStatusResponse,
  MediaAnalysisResponse,
} from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export async function analyzeUrl(url: string): Promise<MediaAnalysisResponse> {
  const res = await fetch(`${API_BASE}/media/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  const data = await res.json();
  if (!res.ok && !data.error) {
    throw new Error(data.message || 'Failed to analyze URL');
  }
  return data;
}

export async function triggerDownload(
  url: string,
  quality: string,
  format: string = 'mp4',
  title: string = '',
  formatId?: string,
  mediaUrl?: string
): Promise<CreateDownloadResponse> {
  const res = await fetch(`${API_BASE}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, quality, format, title, formatId, mediaUrl }),
  });

  const data = await res.json();
  if (!res.ok && !data.error) {
    throw new Error(data.message || 'Failed to initiate download');
  }
  return data;
}

export async function checkJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE}/download/${jobId}`);
  const data = await res.json();
  if (!res.ok && !data.error) {
    throw new Error('Failed to fetch job status');
  }
  return data;
}

export function getFullDownloadUrl(pathUrl: string): string {
  if (pathUrl.startsWith('http')) return pathUrl;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return baseUrl ? `${baseUrl}${pathUrl}` : pathUrl;
}
