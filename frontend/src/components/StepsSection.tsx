import { Download, Film, Link } from 'lucide-react';

export function StepsSection() {
  const steps = [
    {
      num: '1. Paste Link',
      description: 'Copy and paste any video URL into the search bar.',
      icon: <Link className="w-4 h-4 text-slate-700" />,
    },
    {
      num: '2. Select Format',
      description: 'Choose your desired output resolution up to 4K.',
      icon: <Film className="w-4 h-4 text-slate-700" />,
    },
    {
      num: '3. Save Media',
      description: 'Click download to save media directly to your device.',
      icon: <Download className="w-4 h-4 text-slate-700" />,
    },
  ];

  return (
    <div id="how-it-works" className="w-full card-apple p-6 sm:p-8 space-y-6">
      
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">How It Works</h3>
        <p className="text-xs text-slate-500 font-medium">Three simple steps to download high-resolution media</p>
      </div>

      {/* 3 Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 text-center space-y-2.5 flex flex-col items-center justify-center transition-all hover:bg-slate-50"
          >
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs mx-auto">
              {step.icon}
            </div>

            <h4 className="text-xs font-bold text-slate-900 tracking-tight">
              {step.num}
            </h4>

            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom Subtext */}
      <div className="text-center text-xs text-slate-500 font-medium border-t border-slate-100 pt-4">
        Super fast conversion • Safe & Private • No registration needed
      </div>

    </div>
  );
}
