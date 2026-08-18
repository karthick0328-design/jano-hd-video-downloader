import { Calendar, Clock, ExternalLink, Trash2 } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryListProps {
  items: HistoryItem[];
  onSelect: (url: string) => void;
  onClear: () => void;
}

export function HistoryList({ items, onSelect, onClear }: HistoryListProps) {
  if (items.length === 0) return null;

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full mt-6 space-y-3 text-left">
      <div className="flex items-center justify-between">
        <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
          <Clock className="w-4 h-4 text-blue-600" /> Recent Downloads
        </h4>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 transition font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear History
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 w-full">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item.url)}
            className="card-clean p-3.5 flex items-center justify-between hover:border-blue-500 cursor-pointer transition-all group w-full"
          >
            <div className="flex items-center space-x-3.5 overflow-hidden">
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-14 h-9 rounded-lg object-cover bg-slate-100 flex-shrink-0 border border-slate-200"
              />
              <div className="truncate">
                <p className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                  {item.title}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-500">
                  <span className="uppercase font-bold text-blue-600">{item.platform}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-bold">{item.quality}</span>
                  {item.downloadedAt && (
                    <>
                      <span>•</span>
                      <span className="text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDateTime(item.downloadedAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition flex-shrink-0 ml-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
