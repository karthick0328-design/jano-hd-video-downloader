import { Lock, Shield, Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white py-10 mt-20 text-slate-500 text-xs shadow-inner">
      <div className="max-w-6xl mx-auto px-4 flex flex-col items-center justify-center gap-6 text-center">
        
        <div className="flex flex-col items-center justify-center text-center space-y-1">
          <p className="font-black text-base text-slate-900 flex items-center justify-center gap-1.5">
            Jano <span className="gradient-text-videodl-1">HD</span> Engine
          </p>
          <p className="text-slate-500 text-xs max-w-lg leading-relaxed text-center">
            High-definition media downloader service supporting YouTube, Instagram, Facebook, and ShareChat up to 4K Ultra HD.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 text-slate-600 font-mono text-[11px] mx-auto">
          <span className="flex items-center gap-1.5 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200 text-indigo-700 font-bold">
            <Shield className="w-3.5 h-3.5 text-indigo-600" /> Terms Compliant
          </span>
          <span className="flex items-center gap-1.5 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200 text-blue-700 font-bold">
            <Lock className="w-3.5 h-3.5 text-blue-600" /> Privacy Focused
          </span>
          <span className="flex items-center gap-1.5 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200 text-emerald-700 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Auto TTL Cleanup
          </span>
        </div>

      </div>
    </footer>
  );
}
