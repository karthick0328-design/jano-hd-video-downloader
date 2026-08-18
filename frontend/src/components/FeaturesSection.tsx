import { Cpu, DownloadCloud, Film, HardDrive, ShieldCheck, Zap } from 'lucide-react';

export function FeaturesSection() {
  const features = [
    {
      icon: <Zap className="w-6 h-6 text-indigo-600" />,
      title: 'Ultra Fast Conversion',
      description: 'Asynchronous worker queue processes media links within seconds using multi-threaded streaming.',
    },
    {
      icon: <Film className="w-6 h-6 text-blue-600" />,
      title: 'Full 1080p & 4K HD',
      description: 'Preserves original video bitrates up to 2160p 4K resolution without compression artifacts.',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
      title: '100% Safe & Private',
      description: 'No account registration required. All downloaded media files are automatically cleaned after expiration.',
    },
    {
      icon: <DownloadCloud className="w-6 h-6 text-cyan-600" />,
      title: 'YouTube & Instagram',
      description: 'Full support for YouTube videos, Shorts, and Instagram Reels with automatic format selection.',
    },
    {
      icon: <Cpu className="w-6 h-6 text-purple-600" />,
      title: 'FFmpeg Audio Sync',
      description: 'Separate high-bitrate video and audio DASH streams are merged into universal MP4 files.',
    },
    {
      icon: <HardDrive className="w-6 h-6 text-amber-600" />,
      title: 'Cross-Device Compatible',
      description: 'Fully optimized for iOS iPhones, Android smartphones, tablets, laptops, and desktop computers.',
    },
  ];

  return (
    <div className="w-full my-12 space-y-8 text-center flex flex-col items-center justify-center">
      
      {/* Section Header */}
      <div className="text-center space-y-2 max-w-2xl mx-auto flex flex-col items-center justify-center">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight text-center">
          Why Choose <span className="gradient-text-videodl-1">Jano HD</span>?
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 font-medium text-center">
          Built with cutting-edge media processing technology for maximum speed and video clarity.
        </p>
      </div>

      {/* Solid Pure White Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
        {features.map((f, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3 shadow-md hover:shadow-xl hover:border-indigo-300 transition-all duration-200 group flex flex-col items-center justify-center text-center"
          >
            <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 shadow-2xs group-hover:scale-105 transition-transform mx-auto">
              {f.icon}
            </div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight text-center">
              {f.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-center font-medium">
              {f.description}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}
