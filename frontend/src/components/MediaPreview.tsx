import { Clock, Film, Instagram, Play, Sparkles, Youtube } from 'lucide-react';
import { MediaAnalysisResponse } from '../types';

interface MediaPreviewProps {
  data: MediaAnalysisResponse;
}

export function MediaPreview({ data }: MediaPreviewProps) {
  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full card-clean p-6 sm:p-7 transition-all duration-300 relative overflow-hidden text-center flex flex-col items-center justify-center">
      
      <div className="flex flex-col md:flex-row gap-6 items-center justify-center relative z-10 w-full">
        
        {/* Media Thumbnail Showcase */}
        <div className="relative w-full md:w-72 aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm flex-shrink-0 group mx-auto">
          {data.thumbnail ? (
            <img
              src={data.thumbnail}
              alt={data.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium">
              No Thumbnail Available
            </div>
          )}

          {/* Overlay Play Icon */}
          <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 backdrop-blur-[1px] transition-all flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md transform scale-75 group-hover:scale-100 transition-all">
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </div>
          </div>

          {/* Duration Badge */}
          {data.duration > 0 && (
            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md text-slate-800 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              {formatDuration(data.duration)}
            </div>
          )}
        </div>

        {/* Video Metadata Information */}
        <div className="flex-1 space-y-3.5 text-center md:text-left flex flex-col items-center md:items-start justify-center">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
            {data.platform === 'youtube' ? (
              <span className="flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 text-xs px-3 py-1 rounded-full font-extrabold tracking-wide">
                <Youtube className="w-3.5 h-3.5 fill-red-600 text-red-600" /> YouTube Video
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-pink-50 text-pink-700 border border-pink-200 text-xs px-3 py-1 rounded-full font-extrabold tracking-wide">
                <Instagram className="w-3.5 h-3.5 text-pink-600" /> Instagram Reel
              </span>
            )}

            <span className="flex items-center gap-1 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              Max: {data.maxAvailableQuality}
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug tracking-tight text-center md:text-left">
            {data.title}
          </h2>

          {/* Spec Badges */}
          <div className="pt-1 flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs font-mono text-slate-600">
            <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 font-medium">
              <Film className="w-3.5 h-3.5 text-blue-600" /> Streams Validated
            </span>
            <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              ✓ Ready for HD Download
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
