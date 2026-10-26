import React from 'react';
import { Volume2, VolumeX, Mic, MicOff, ShieldAlert, Cpu, Settings, History, Activity, Bot } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { BenchStats, EcosystemStatus } from '../types';

interface HeaderTelemetryProps {
  stats: BenchStats;
  partsCount: number;
  historyCount: number;
  isWakeLockOn: boolean;
  isVoiceMuted: boolean;
  onToggleVoiceMute: () => void;
  isHandsFreeActive: boolean;
  onToggleHandsFree: () => void;
  onOpenPartsBin: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  ecosystemStatus?: EcosystemStatus;
}

const iconBtn =
  'min-h-[40px] min-w-[40px] px-2 rounded-lg border text-xs font-mono flex items-center justify-center gap-1.5 transition-colors active:scale-95';

export const HeaderTelemetry: React.FC<HeaderTelemetryProps> = ({
  stats,
  partsCount,
  historyCount,
  isWakeLockOn,
  isVoiceMuted,
  onToggleVoiceMute,
  isHandsFreeActive,
  onToggleHandsFree,
  onOpenPartsBin,
  onOpenHistory,
  onOpenSettings,
  ecosystemStatus,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#050811]/90 backdrop-blur-md border-b border-cyan-950/70 px-2 sm:px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/icon.svg" alt="" className="w-8 h-8 shrink-0" />
          <div className="min-w-0 hidden xs:block">
            <div className="text-sm sm:text-base font-mono font-bold tracking-wider text-cyan-400 truncate">BENCH-OS</div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-slate-400">
              {isWakeLockOn && <span className="text-emerald-400">SCREEN ON</span>}
              {ecosystemStatus?.connected && (
                <span className="text-cyan-400 flex items-center gap-1">
                  <Activity className="w-2.5 h-2.5" />
                  JARVIS {ecosystemStatus.latencyMs ? `${ecosystemStatus.latencyMs}ms` : ''}
                </span>
              )}
              {ecosystemStatus?.agentBuilderConnected && (
                <span className="text-purple-400 flex items-center gap-1">
                  <Bot className="w-2.5 h-2.5" />
                  BUILDER {ecosystemStatus.agentBuilderLatencyMs ? `${ecosystemStatus.agentBuilderLatencyMs}ms` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={onOpenPartsBin}
            className={`${iconBtn} bg-amber-950/30 border-amber-500/30 text-amber-300 tabular-nums`}
            title="Parts bin"
          >
            <Cpu className="w-4 h-4 text-amber-400" />
            <span className="font-bold">{partsCount}</span>
          </button>

          <button
            onClick={onOpenHistory}
            className={`${iconBtn} bg-slate-900/60 border-slate-800 text-slate-300 tabular-nums`}
            title="Scan history"
          >
            <History className="w-4 h-4 text-cyan-400" />
            {historyCount > 0 && <span className="hidden xs:inline font-bold">{historyCount}</span>}
          </button>

          {stats.cravingsDefeated > 0 && (
            <div
              title="Cravings beaten"
              className="hidden sm:flex items-center gap-1.5 min-h-[40px] px-2 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono tabular-nums"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span className="font-bold">{stats.cravingsDefeated}</span>
            </div>
          )}

          <button
            onClick={onToggleHandsFree}
            className={`${iconBtn} ${
              isHandsFreeActive
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}
            title={isHandsFreeActive ? 'Voice commands on ("scan", "heat", "log part")' : 'Turn on voice commands'}
          >
            {isHandsFreeActive ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
          </button>

          <button
            onClick={onToggleVoiceMute}
            className={`${iconBtn} ${
              isVoiceMuted ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-cyan-950/40 border-cyan-600/40 text-cyan-400'
            }`}
            title={isVoiceMuted ? 'Unmute Jarvis voice' : 'Mute Jarvis voice'}
          >
            {isVoiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenSettings}
            className={`${iconBtn} ${
              ecosystemStatus?.connected ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300' : 'bg-slate-900/80 border-slate-800 text-slate-300'
            }`}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
