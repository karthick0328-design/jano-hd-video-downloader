import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { getFullDownloadUrl } from '../lib/api';
import { JobStatusResponse } from '../types';

interface DownloadProgressProps {
  job: JobStatusResponse;
  onReset: () => void;
}

export function DownloadProgress({ job, onReset }: DownloadProgressProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const getStageLabel = () => {
    switch (job.status) {
      case 'queued':
        return 'Queueing job in high-speed worker queue...';
      case 'processing':
        return 'Fetching HD media streams from server...';
      case 'merging':
        return 'Pasting & merging high-bitrate video + audio via FFmpeg...';
      case 'completed':
        return 'Processing complete! File compiled in original HD resolution.';
      case 'failed':
        return 'Processing error encountered.';
      default:
        return 'Processing download request...';
    }
  };

  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed' || !!downloadError;

  const handleDownload = async () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('show-floating-balls'));
    }
    if (!job.downloadUrl) return;

    try {
      setDownloading(true);
      setDownloadError(null);

      const targetUrl = getFullDownloadUrl(job.downloadUrl);
      console.log('[FRONTEND_DOWNLOAD_TRIGGER] Triggering server-proxied video download:', targetUrl);

      // Trigger direct server-proxied MP4 browser download
      const link = document.createElement('a');
      link.href = targetUrl;
      link.setAttribute('download', `${job.title || 'Video'}.mp4`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('[FRONTEND_DOWNLOAD_ERROR]', err);
      setDownloadError(err.message || 'Failed to download video file.');
    } finally {
      setTimeout(() => setDownloading(false), 2500);
    }
  };

  return (
    <div className="w-full glass-panel-light-glow rounded-3xl p-6 sm:p-8 space-y-6 animate-fadeIn relative overflow-hidden">
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
              isCompleted && !downloadError
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                : isFailed
                ? 'bg-rose-50 border border-rose-200 text-rose-600'
                : 'bg-indigo-50 border border-indigo-200 text-indigo-600'
            }`}
          >
            {isCompleted && !downloadError ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            ) : isFailed ? (
              <AlertCircle className="w-6 h-6 text-rose-600" />
            ) : (
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            )}
          </div>
          <div>
            <h4 className="text-lg font-extrabold text-slate-900 leading-tight flex items-center gap-2">
              {isCompleted && !downloadError
                ? 'HD Video Ready!'
                : isFailed
                ? 'Download Encountered Error'
                : 'Processing HD Video Download'}
              {isCompleted && !downloadError && (
                <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-mono font-extrabold">
                  100% COMPLETE
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-500 font-mono mt-1">
              {downloadError ? 'Download error' : getStageLabel()}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition font-bold shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-indigo-600" /> New Link
        </button>
      </div>

      {/* Progress Bar */}
      {!isFailed && (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-mono text-slate-500">
            <span className="font-bold text-slate-700">Download Progress</span>
            <span className="text-indigo-600 font-extrabold">{job.progress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3.5 p-0.5 border border-slate-200 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-500 h-full rounded-full transition-all duration-500 shadow-md relative"
              style={{ width: `${Math.max(job.progress, 5)}%` }}
            >
              <div className="absolute inset-0 bg-white/25 animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {/* Success CTA Download Button */}
      {isCompleted && job.downloadUrl && !downloadError && (
        <div className="pt-2 animate-fadeIn space-y-3">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-base sm:text-lg py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/20 transform hover:scale-[1.01] transition-all cursor-pointer disabled:opacity-75"
          >
            {downloading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" /> Preparing MP4 Stream...
              </>
            ) : (
              <>
                <Download className="w-6 h-6" /> Download MP4 Video ({job.quality})
              </>
            )}
          </button>

          {/* Mobile Gallery Saving Instructions */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-600 space-y-2 text-left">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <span>📱 How to Save to Phone Gallery / Photos:</span>
            </div>
            <ul className="space-y-1 list-disc list-inside text-[11px] leading-relaxed text-slate-600">
              <li>
                <strong className="text-slate-800">iPhone / iOS:</strong> After tapping Download, open Safari's Downloads menu ➔ tap the video ➔ tap the <strong className="text-blue-600">Share icon</strong> ➔ select <strong className="text-emerald-700">"Save Video"</strong> to place it directly in your Camera Roll.
              </li>
              <li>
                <strong className="text-slate-800">Android:</strong> The video saves automatically to your <strong className="text-slate-800">Downloads</strong> folder and will appear in your Photos/Gallery app under Albums ➔ Downloads.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Failure Message Container */}
      {isFailed && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-mono leading-relaxed">
          {downloadError || job.error || 'Video download processing failed. Please verify the URL and try again.'}
        </div>
      )}
    </div>
  );
}

