import React from 'react';
import { Search, Flame, Wrench, ShieldAlert, Stethoscope } from 'lucide-react';
import { OperatingMode } from '../types';

interface ModeSelectorProps {
  activeMode: OperatingMode;
  onSelectMode: (mode: OperatingMode) => void;
  isAnalyzing: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  activeMode,
  onSelectMode,
  isAnalyzing,
}) => {
  const modes: {
    id: OperatingMode;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    borderActive: string;
    bgActive: string;
    badge?: string;
  }[] = [
    {
      id: 'HARVEST',
      label: 'SCAN & HARVEST',
      sublabel: 'PCB Component Stripper',
      icon: Search,
      accentColor: 'text-cyan-400',
      borderActive: 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]',
      bgActive: 'bg-cyan-950/40',
    },
    {
      id: 'SOLDER_COACH',
      label: 'SOLDER COACH',
      sublabel: '3-Sec Rule & Joint Check',
      icon: Flame,
      accentColor: 'text-emerald-400',
      borderActive: 'border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]',
      bgActive: 'bg-emerald-950/40',
    },
    {
      id: 'BUILD_ADVISOR',
      label: 'BUILD ADVISOR',
      sublabel: 'Zero-Cost Schematics & Code',
      icon: Wrench,
      accentColor: 'text-amber-400',
      borderActive: 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]',
      bgActive: 'bg-amber-950/40',
    },
    {
      id: 'DEVICE_DOCTOR',
      label: 'DEVICE DOCTOR',
      sublabel: 'Non-Destructive Triage',
      icon: Stethoscope,
      accentColor: 'text-sky-400',
      borderActive: 'border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]',
      bgActive: 'bg-sky-950/40',
      badge: 'TRIAGE',
    },
    {
      id: 'CRAVING_OVERRIDE',
      label: 'CRAVING OVERRIDE',
      sublabel: '3-Min Dopamine Protocol',
      icon: ShieldAlert,
      accentColor: 'text-rose-400',
      borderActive: 'border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.35)]',
      bgActive: 'bg-rose-950/50',
      badge: 'URGENT',
    },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
        {modes.map(mode => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              disabled={isAnalyzing}
              className={`relative min-h-[58px] sm:min-h-[64px] p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all active:scale-[0.98] ${
                isActive
                  ? `${mode.borderActive} ${mode.bgActive} ring-1 ring-white/10`
                  : 'bg-[#0b1329]/70 border-slate-800/80 hover:border-slate-700 hover:bg-[#0f1b3d]/60 text-slate-300'
              }`}
            >
              {/* Tactical Indicator Dot for Active Mode */}
              {isActive && (
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              )}

              {/* Mode Icon */}
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                  isActive
                    ? 'bg-[#050811] border-cyan-500/50'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    isActive ? mode.accentColor : 'text-slate-400'
                  }`}
                />
              </div>

              {/* Text Meta */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-mono font-bold text-xs tracking-wide truncate ${
                      isActive ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    {mode.label}
                  </span>
                  {mode.badge && (
                    <span className="px-1 py-0.2 text-[8px] font-mono font-bold text-sky-300 bg-sky-500/20 rounded">
                      {mode.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-sans truncate">
                  {mode.sublabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
