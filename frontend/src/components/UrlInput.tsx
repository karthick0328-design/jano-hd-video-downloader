import { AlertCircle, ArrowRight, Link, Loader2 } from 'lucide-react';
import React, { useState } from 'react';

interface UrlInputProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  error?: string | null;
}

export function UrlInput({ onAnalyze, isLoading, error }: UrlInputProps) {
  const [url, setUrl] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !isLoading) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('show-floating-balls'));
      }
      onAnalyze(url.trim());
    }
  };

  return (
    <div className="w-full space-y-3">
      
      {/* Search Input Bar (Fully Mobile Optimized) */}
      <form onSubmit={handleSubmit} className="relative w-full">
        <div className="relative flex items-center bg-white border border-slate-200 rounded-full p-1 sm:p-1.5 shadow-sm focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          
          {/* Link Icon */}
          <div className="pl-3 sm:pl-4 pr-1 sm:pr-2 text-slate-400">
            <Link className="w-4 h-4" />
          </div>

          {/* Input Field */}
          <input
            type="url"
            value={url}
            onChange={handleChange}
            placeholder="Paste video URL here..."
            className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-xs sm:text-base px-1 sm:px-2 py-2 sm:py-2.5 focus:outline-none font-medium"
            disabled={isLoading}
          />

          {/* Download CTA Button */}
          <button
            type="submit"
            disabled={!url.trim() || isLoading}
            className="btn-apple px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-1 sm:gap-1.5 min-w-[90px] sm:min-w-[120px] justify-center disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> Analyzing
              </span>
            ) : (
              <>
                Download <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-rose-700 text-xs sm:text-sm bg-rose-50 border border-rose-200 px-3.5 py-2 sm:py-2.5 rounded-2xl font-semibold">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

    </div>
  );
}
