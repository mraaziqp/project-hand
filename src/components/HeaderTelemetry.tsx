import React from 'react';
import { Volume2, VolumeX, Mic, MicOff, ShieldAlert, Cpu, Database, Eye, Activity } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { BenchStats, EcosystemStatus } from '../types';

interface HeaderTelemetryProps {
  stats: BenchStats;
  isWakeLockOn: boolean;
  isVoiceMuted: boolean;
  onToggleVoiceMute: () => void;
  isHandsFreeActive: boolean;
  onToggleHandsFree: () => void;
  onOpenPartsBin: () => void;
  onOpenNASSync: () => void;
  ecosystemStatus?: EcosystemStatus;
}

export const HeaderTelemetry: React.FC<HeaderTelemetryProps> = ({
  stats,
  isWakeLockOn,
  isVoiceMuted,
  onToggleVoiceMute,
  isHandsFreeActive,
  onToggleHandsFree,
  onOpenPartsBin,
  onOpenNASSync,
  ecosystemStatus,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#050811]/90 backdrop-blur-md border-b border-cyan-950/70 px-3 sm:px-4 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Wordmark & Core Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-cyan-500/10 animate-pulse" />
            <span className="font-mono font-bold text-xs text-cyan-400">HUD</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-mono font-bold tracking-wider text-cyan-400 uppercase">
                JARVIS // BENCH-OS
              </span>
              {isWakeLockOn && (
                <span
                  title="Screen Wake Lock is active - display will remain illuminated while soldering"
                  className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-500/30"
                >
                  <Eye className="w-3 h-3" />
                  <span>WAKE LOCK</span>
                </span>
              )}
            </div>
            <div className="hidden xs:flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span className="text-cyan-300">BENCH v2.5</span>
              <span>·</span>
              <span className="text-emerald-400 tabular-nums">{stats.nicotineFreeHours}h NICOTINE-FREE</span>
              {ecosystemStatus?.connected && (
                <>
                  <span>·</span>
                  <span className="text-cyan-400 font-bold flex items-center gap-1">
                    <Activity className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
                    <span>ECOSYSTEM {ecosystemStatus.latencyMs ? `${ecosystemStatus.latencyMs}ms` : 'SYNC'}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Zone 2: Telemetry Badges & Quick Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Cravings Defeated Streak */}
          <div
            title="Nicotine cravings conquered on this workbench"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-crimson-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono tabular-nums"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-bold">{stats.cravingsDefeated}</span>
            <span className="hidden sm:inline text-[10px] text-rose-400/80">OVERRIDDEN</span>
          </div>

          {/* Salvaged Bin Quick Open */}
          <button
            onClick={onOpenPartsBin}
            className="min-h-[40px] px-2 sm:px-2.5 py-1.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs font-mono tabular-nums flex items-center gap-1.5 hover:bg-amber-950/50 transition-colors"
            title="Open Salvaged Parts Bin"
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold">{stats.partsHarvested}</span>
            <span className="hidden sm:inline text-[10px] text-amber-400/80">PARTS</span>
          </button>

          {/* Hands-Free Voice Trigger Toggle */}
          <button
            onClick={onToggleHandsFree}
            className={`min-h-[40px] min-w-[40px] px-2 py-1.5 rounded-lg border text-xs font-mono flex items-center justify-center gap-1.5 transition-colors ${
              isHandsFreeActive
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={isHandsFreeActive ? 'Hands-Free Mic Active ("Jarvis scan", "Jarvis heat", "Jarvis craving")' : 'Enable Hands-Free Voice Commands'}
          >
            {isHandsFreeActive ? (
              <>
                <Mic className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="hidden lg:inline text-[11px] font-bold">MIC LIVE</span>
              </>
            ) : (
              <>
                <MicOff className="w-4 h-4" />
                <span className="hidden lg:inline text-[11px]">MIC OFF</span>
              </>
            )}
          </button>

          {/* Jarvis TTS Voice Mute Toggle */}
          <button
            onClick={onToggleVoiceMute}
            className={`min-h-[40px] min-w-[40px] px-2 py-1.5 rounded-lg border text-xs font-mono flex items-center justify-center transition-colors ${
              isVoiceMuted
                ? 'bg-slate-900 border-slate-800 text-slate-500'
                : 'bg-cyan-950/40 border-cyan-600/40 text-cyan-400 hover:bg-cyan-900/40'
            }`}
            title={isVoiceMuted ? 'Unmute Jarvis Voice Telemetry' : 'Mute Jarvis Voice Telemetry'}
          >
            {isVoiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Second Brain & NAS Bridge Button */}
          <button
            onClick={onOpenNASSync}
            className={`min-h-[40px] min-w-[40px] px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center justify-center gap-1.5 transition-colors ${
              ecosystemStatus?.connected
                ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-cyan-300'
            }`}
            title="Configure Second Brain & Home NAS Bridge"
          >
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="hidden xl:inline text-[11px]">BRIDGE</span>
          </button>

          {/* PWA Install Trigger */}
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
