import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  X,
  Sparkles,
  Download,
} from 'lucide-react';
import { Currency, SalvagedPart } from '../types';
import { playTacticalAudio } from '../utils/audio';
import { formatPrice } from '../utils/shopping';

interface PartsBinDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  parts: SalvagedPart[];
  onAddPart: (part: Omit<SalvagedPart, 'id' | 'dateHarvested'>) => void;
  onDeletePart: (id: string) => void;
  onToggleTested: (id: string) => void;
  currency: Currency;
}

export const PartsBinDrawer: React.FC<PartsBinDrawerProps> = ({
  isOpen,
  onClose,
  parts,
  onAddPart,
  onDeletePart,
  onToggleTested,
  currency,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [customName, setCustomName] = useState('');

  if (!isOpen) return null;

  const quickChips: { name: string; category: SalvagedPart['category'] }[] = [
    { name: '470uF 25V Electrolytic Cap', category: 'Capacitor' },
    { name: '2.54mm Pin Header (4-Pin)', category: 'Header' },
    { name: '6mm Tactile Momentary Switch', category: 'Switch' },
    { name: '5mm Emerald Green LED', category: 'LED' },
    { name: 'N-Channel Power MOSFET (TO-220)', category: 'MOSFET' },
    { name: 'Toroidal Inductor Coil', category: 'Inductor' },
    { name: '5V Active Piezo Buzzer', category: 'Buzzer' },
    { name: 'AMS1117 3.3V LDO Regulator', category: 'IC' },
    { name: 'USB-A Salvaged Wire Lead', category: 'Connector' },
  ];

  const handleQuickAdd = (chip: { name: string; category: SalvagedPart['category'] }) => {
    playTacticalAudio.chirp();
    onAddPart({
      name: chip.name,
      category: chip.category,
      testedWorking: true,
      reuseIdeas: 'Salvaged off dead PCB for workbench project',
      sourceBoard: 'Workbench Harvest',
    });
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    playTacticalAudio.chirp();
    onAddPart({
      name: customName.trim(),
      category: 'Other',
      testedWorking: true,
      reuseIdeas: 'Manual bench harvest',
      sourceBoard: 'Manual Entry',
    });
    setCustomName('');
  };

  const categories = ['ALL', ...Array.from(new Set(parts.map(p => p.category)))];
  const q = searchQuery.toLowerCase();
  const filteredParts = parts.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      (p.partNumber ?? '').toLowerCase().includes(q) ||
      (p.reuseIdeas ?? '').toLowerCase().includes(q);
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(parts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis-salvaged-parts-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Safari cancels the download if the URL is revoked synchronously.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const totalValue = parts.reduce((sum, p) => sum + (p.estValue ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[92dvh] flex flex-col rounded-2xl bg-[#090e1f] border border-cyan-500/40 shadow-2xl text-slate-100 overflow-hidden">
        {/* Drawer Header */}
        <div className="px-3 sm:px-5 py-3 bg-[#050811] border-b border-cyan-950/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold text-sm tracking-wide uppercase min-w-0">
            <Cpu className="w-5 h-5 text-cyan-400 shrink-0" />
            <span className="truncate">PARTS BIN ({parts.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportJSON}
              disabled={parts.length === 0}
              className="min-h-[40px] px-2.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-700 text-xs font-mono flex items-center gap-1.5 disabled:opacity-40"
              title="Export parts as JSON"
            >
              <Download className="w-4 h-4" />
              <span className="hidden xs:inline">EXPORT</span>
            </button>
            <button
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Quick-Add Harvest Chips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>QUICK ADD</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">TAP TO LOG</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickAdd(chip)}
                  className="min-h-[36px] px-2.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 hover:bg-amber-950/30 text-slate-300 hover:text-amber-300 text-xs font-mono flex items-center gap-1.5 active:scale-95 transition"
                >
                  <Plus className="w-3 h-3 text-amber-400" />
                  <span>{chip.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Add Input */}
          <form onSubmit={handleManualAddSubmit} className="flex gap-2">
            <input
              type="text"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="Add a part (e.g. 10k potentiometer)"
              className="flex-1 min-w-0 min-h-[44px] px-3 rounded-xl bg-slate-900 border border-slate-800 text-base sm:text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider shrink-0"
            >
              + ADD
            </button>
          </form>

          {/* Search & Category Filter */}
          <div className="space-y-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search parts, part numbers, ideas..."
                className="w-full min-h-[44px] pl-9 pr-3 rounded-xl bg-slate-900/60 border border-slate-800 text-base sm:text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
            {categories.length > 2 && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`min-h-[32px] px-2.5 rounded-lg text-[11px] font-mono whitespace-nowrap shrink-0 border ${
                      selectedCategory === cat
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Parts List */}
          <div className="space-y-2">
            {filteredParts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
                {parts.length === 0
                  ? 'Your bin is empty. Scan something and tap LOG on parts you pull, or quick-add above.'
                  : 'No parts match that search.'}
              </div>
            ) : (
              filteredParts.map(part => (
                <div
                  key={part.id}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-sm text-white">
                        {part.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/70 border border-cyan-800/60 text-cyan-300">
                        {part.category}
                      </span>
                      <button
                        onClick={() => onToggleTested(part.id)}
                        className={`flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded transition ${
                          part.testedWorking
                            ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                        title="Toggle Tested Working"
                      >
                        {part.testedWorking ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>{part.testedWorking ? 'TESTED OK' : 'UNTESTED'}</span>
                      </button>
                    </div>

                    {(part.partNumber || part.estValue) && (
                      <p className="text-[11px] font-mono mt-1">
                        {part.partNumber && <span className="text-amber-300 mr-2">{part.partNumber}</span>}
                        {formatPrice(part.estValue, currency) && (
                          <span className="text-emerald-300">{formatPrice(part.estValue, currency)}</span>
                        )}
                      </p>
                    )}

                    {part.pinout && (
                      <p className="text-[11px] text-slate-300 mt-1 font-sans">
                        <strong className="text-cyan-400 font-mono">Pinout:</strong> {part.pinout}
                      </p>
                    )}

                    {part.reuseIdeas && (
                      <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                        <strong className="text-amber-400 font-mono">Reuse:</strong> {part.reuseIdeas}
                      </p>
                    )}

                    <span className="text-[10px] font-mono text-slate-500 block mt-1">
                      Harvested: {part.dateHarvested} · Source: {part.sourceBoard || 'Workbench'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      playTacticalAudio.chirp();
                      onDeletePart(part.id);
                    }}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition shrink-0"
                    title="Delete part"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Summary */}
        <div className="px-3 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#050811] border-t border-cyan-950/80 flex items-center justify-between gap-2 text-xs font-mono text-slate-400 shrink-0">
          <span>
            Est. value: <strong className="text-emerald-400">{formatPrice(totalValue, currency) || '—'} {totalValue > 0 ? currency : ''}</strong>
          </span>
          <button
            onClick={onClose}
            className="min-h-[40px] px-5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs uppercase"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
