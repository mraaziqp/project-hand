import React from 'react';
import { History, Trash2, X } from 'lucide-react';
import { ScanHistoryEntry } from '../types';

interface ScanHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: ScanHistoryEntry[];
  onOpenEntry: (entry: ScanHistoryEntry) => void;
  onDeleteEntry: (id: string) => void;
  onClearAll: () => void;
}

const MODE_LABEL: Record<string, string> = {
  HARVEST: 'Scan & source',
  SOLDER_COACH: 'Solder coach',
  BUILD_ADVISOR: 'Build advisor',
  CRAVING_OVERRIDE: 'Craving',
  DEVICE_DOCTOR: 'Device doctor',
};

export const ScanHistoryDrawer: React.FC<ScanHistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onOpenEntry,
  onDeleteEntry,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[92dvh] flex flex-col rounded-2xl bg-[#090e1f] border border-cyan-500/40 shadow-2xl text-slate-100 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-3 sm:px-5 py-3 bg-[#050811] border-b border-cyan-950/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold text-sm uppercase">
            <History className="w-5 h-5" />
            <span>SCAN HISTORY ({history.length})</span>
          </div>
          <div className="flex items-center gap-1">
            {history.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Delete all saved scans?')) onClearAll();
                }}
                className="min-h-[40px] px-2.5 rounded-lg text-[11px] font-mono text-rose-300 border border-rose-900/60"
              >
                CLEAR
              </button>
            )}
            <button onClick={onClose} className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400" title="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {history.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
              No scans yet. Every scan is saved here on this device so you can come back to it.
            </div>
          ) : (
            history.map(entry => (
              <div
                key={entry.id}
                onClick={() => onOpenEntry(entry)}
                className="flex gap-3 p-2 rounded-xl bg-slate-900/70 border border-slate-800 active:bg-slate-800 cursor-pointer"
              >
                {entry.thumbnail ? (
                  <img src={entry.thumbnail} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0 bg-black" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-black shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-mono text-slate-500">
                    {new Date(entry.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} ·{' '}
                    {MODE_LABEL[entry.mode] ?? entry.mode}
                  </div>
                  <div className="text-sm font-semibold text-white leading-snug line-clamp-2">
                    {entry.analysis.object_identified || 'Scan'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {entry.question ? `Q: ${entry.question}` : `${entry.analysis.detections.length} parts found`}
                  </div>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteEntry(entry.id);
                  }}
                  className="min-h-[40px] min-w-[40px] self-center flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-400 shrink-0"
                  title="Delete scan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
