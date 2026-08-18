import { Check, Download, Monitor, Smartphone, Tv } from 'lucide-react';
import { useState } from 'react';
import { QualityFormat } from '../types';

interface QualitySelectorProps {
  formats: QualityFormat[];
  maxQuality: string;
  onDownload: (selectedQuality: string, selectedFormatId?: string) => void;
  isDownloading: boolean;
}

export function QualitySelector({
  formats,
  maxQuality,
  onDownload,
  isDownloading,
}: QualitySelectorProps) {
  const defaultSelected = formats.length > 0 ? formats[0].quality : '1080p';
  const [selectedQuality, setSelectedQuality] = useState<string>(defaultSelected);

  const selectedFormatObj = formats.find((f) => f.quality === selectedQuality);

  const handleDownloadClick = () => {
    onDownload(selectedQuality, selectedFormatObj?.formatId);
  };

  const getQualityIcon = (q: string) => {
    const hNum = parseInt(q.replace('p', ''), 10);
    if (hNum >= 1080) return <Tv className="w-4 h-4 text-slate-700" />;
    if (hNum >= 720) return <Monitor className="w-4 h-4 text-slate-700" />;
    return <Smartphone className="w-4 h-4 text-slate-700" />;
  };

  const getQualitySubtext = (q: string) => {
    const hNum = parseInt(q.replace('p', ''), 10);
    if (hNum >= 1080) return 'High quality • 1920x1080';
    if (hNum >= 720) return 'Balanced quality • 1280x720';
    return 'Standard quality • 854x480';
  };

  return (
    <div className="w-full card-apple p-6 sm:p-8 space-y-5">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Choose Quality</h3>
          <p className="text-xs text-slate-500 font-medium">Select your output format and resolution</p>
        </div>
        <span className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
          MP4
        </span>
      </div>

      {/* Quality Rows */}
      <div className="space-y-2.5">
        {formats.map((fmt) => {
          const isSelected = selectedQuality === fmt.quality;

          return (
            <div
              key={fmt.quality}
              onClick={() => setSelectedQuality(fmt.quality)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                isSelected
                  ? 'bg-blue-50/60 border-blue-500 shadow-2xs'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
                  {getQualityIcon(fmt.quality)}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    {fmt.quality} {fmt.quality === '1080p' ? 'Full HD' : fmt.quality === '720p' ? 'HD' : 'SD'}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {getQualitySubtext(fmt.quality)}
                  </p>
                </div>
              </div>

              {/* Radio Indicator */}
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
              }`}>
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Download Action CTA */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleDownloadClick}
          disabled={isDownloading}
          className="w-full btn-apple text-white font-semibold text-sm py-3 px-6 rounded-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {isDownloading ? 'Processing Download...' : `Download (${selectedQuality})`}
        </button>
      </div>

    </div>
  );
}
