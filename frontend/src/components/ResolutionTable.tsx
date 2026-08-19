import { Check, Film, Monitor, Smartphone, Tv } from 'lucide-react';

export function ResolutionTable() {
  const resolutions = [
    {
      quality: '2160p (4K)',
      dimensions: '3840 x 2160',
      device: '4K Smart TVs, Desktop Monitors',
      icon: <Tv className="w-4 h-4 text-purple-600" />,
      badge: 'Ultra HD',
    },
    {
      quality: '1440p (2K)',
      dimensions: '2560 x 1440',
      device: 'Gaming Monitors, High-Res Laptops',
      icon: <Monitor className="w-4 h-4 text-indigo-600" />,
      badge: 'Quad HD',
    },
    {
      quality: '1080p (Full HD)',
      dimensions: '1920 x 1080',
      device: 'Standard Laptops, Smartphones',
      icon: <Smartphone className="w-4 h-4 text-blue-600" />,
      badge: 'Recommended',
    },
    {
      quality: '720p (HD)',
      dimensions: '1280 x 720',
      device: 'Tablets, Mobile Data Saving',
      icon: <Film className="w-4 h-4 text-cyan-600" />,
      badge: 'HD Ready',
    },
  ];

  return (
    <div className="w-full my-12 space-y-6 max-w-3xl mx-auto text-center flex flex-col items-center justify-center">
      
      <div className="text-center space-y-2 flex flex-col items-center justify-center">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight text-center">
          Supported Output Resolutions
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 font-medium text-center">
          Comprehensive breakdown of available video formats and screen compatibility.
        </p>
      </div>

      <div className="bg-white/90 backdrop-blur-md rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs overflow-x-auto w-full">
        <table className="w-full text-center border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-extrabold font-mono uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4 sm:px-6 text-center">Quality</th>
              <th className="py-3.5 px-4 sm:px-6 text-center">Dimensions</th>
              <th className="py-3.5 px-4 sm:px-6 text-center">Best Device</th>
              <th className="py-3.5 px-4 sm:px-6 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {resolutions.map((r, i) => (
              <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                <td className="py-4 px-4 sm:px-6 font-extrabold text-slate-900 flex items-center justify-center gap-2">
                  {r.icon}
                  <span>{r.quality}</span>
                </td>
                <td className="py-4 px-4 sm:px-6 font-mono text-slate-600">{r.dimensions}</td>
                <td className="py-4 px-4 sm:px-6 text-slate-600">{r.device}</td>
                <td className="py-4 px-4 sm:px-6">
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-bold">
                    <Check className="w-3 h-3 stroke-[3]" /> {r.badge}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
