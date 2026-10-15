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
  Filter,
} from 'lucide-react';
import { SalvagedPart } from '../types';
import { playTacticalAudio } from '../utils/audio';

interface PartsBinDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  parts: SalvagedPart[];
  onAddPart: (part: Omit<SalvagedPart, 'id' | 'dateHarvested'>) => void;
  onDeletePart: (id: string) => void;
  onToggleTested: (id: string) => void;
}

export const PartsBinDrawer: React.FC<PartsBinDrawerProps> = ({
  isOpen,
  onClose,
  parts,
  onAddPart,
  onDeletePart,
  onToggleTested,
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

  const filteredParts = parts.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.reuseIdeas && p.reuseIdeas.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(parts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis-salvaged-parts-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[#090e1f] border border-cyan-500/40 shadow-2xl text-slate-100 overflow-hidden">
        {/* Drawer Header */}
        <div className="px-5 py-3.5 bg-[#050811] border-b border-cyan-950/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold text-sm tracking-wide uppercase">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span>SALVAGED PARTS BIN // {parts.length} COMPONENTS</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportJSON}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition"
              title="Export Parts as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Quick-Add Harvest Chips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>1-TAP QUICK HARVEST CHIPS</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">TAP TO LOG</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickAdd(chip)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 hover:bg-amber-950/30 text-slate-300 hover:text-amber-300 text-xs font-mono flex items-center gap-1.5 active:scale-95 transition"
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
              placeholder="Custom harvested part name (e.g. 10k Potentiometer, Optocoupler)..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider shrink-0"
            >
              + ADD PART
            </button>
          </form>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search inventory..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Parts List */}
          <div className="space-y-2">
            {filteredParts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
                No salvaged components match query. Tap a quick chip or scan a motherboard to harvest parts!
              </div>
            ) : (
              filteredParts.map(part => (
                <div
                  key={part.id}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-white truncate">
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
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition shrink-0"
                    title="Delete Part"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Summary */}
        <div className="px-5 py-3 bg-[#050811] border-t border-cyan-950/80 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
          <span>Est. Hardware Value Saved: <strong className="text-emerald-400">${(parts.length * 2.5).toFixed(2)} USD</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs uppercase"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
