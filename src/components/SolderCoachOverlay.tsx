import React from 'react';
import { Flame, Activity, Volume2, VolumeX, Play, Square, RotateCcw } from 'lucide-react';
import { playTacticalAudio } from '../utils/audio';
import { SolderCoach } from '../hooks/useSolderCoach';

interface SolderCoachOverlayProps {
  coach: SolderCoach;
  isActiveMode: boolean;
  isFloatingOverlay?: boolean;
}

export const SolderCoachOverlay: React.FC<SolderCoachOverlayProps> = ({
  coach,
  isActiveMode,
  isFloatingOverlay = false,
}) => {
  const {
    subMode,
    setSubMode,
    solderStep,
    isPacingActive,
    trigger3SecondRule,
    soundEnabled,
    setSoundEnabled,
    isMetronomeActive,
    setMetronomeActive,
    rockingSide,
    rockingSecondsRemaining,
    totalCyclesDone,
    resetCycles,
  } = coach;

  if (!isActiveMode) return null;

  // Floating Camera Overlay mode (renders over the top of live camera)
  if (isFloatingOverlay) {
    if (solderStep === 0 && !isMetronomeActive) return null;

    return (
      <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-center p-4">
        {/* Active 3-Second Soldering Rule Live Reticle */}
        {solderStep > 0 && (
          <div className="flex flex-col items-center justify-center">
            {/* Massive Glowing Countdown Ring */}
            <div
              className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 flex flex-col items-center justify-center backdrop-blur-md transition-all duration-300 shadow-2xl ${
                solderStep === 1
                  ? 'border-cyan-400 bg-cyan-950/80 shadow-[0_0_50px_rgba(34,211,238,0.7)]'
                  : solderStep === 2
                  ? 'border-emerald-400 bg-emerald-950/80 shadow-[0_0_50px_rgba(52,211,153,0.7)]'
                  : solderStep === 3
                  ? 'border-sky-400 bg-sky-950/80 shadow-[0_0_50px_rgba(56,189,248,0.7)]'
                  : 'border-emerald-300 bg-emerald-900/90 shadow-[0_0_60px_rgba(52,211,153,0.9)]'
              }`}
            >
              <div className="text-5xl sm:text-6xl font-mono font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">
                {solderStep === 4 ? '✓' : solderStep}
              </div>
              <div
                className={`text-[11px] sm:text-xs font-mono font-bold tracking-widest uppercase mt-1 ${
                  solderStep === 1
                    ? 'text-cyan-300'
                    : solderStep === 2
                    ? 'text-emerald-300'
                    : solderStep === 3
                    ? 'text-sky-300'
                    : 'text-white'
                }`}
              >
                {solderStep === 1
                  ? '1. HEAT PAD & PIN'
                  : solderStep === 2
                  ? '2. FEED SOLDER'
                  : solderStep === 3
                  ? '3. FREEZE & PULL'
                  : 'GOOD VOLCANO JOINT'}
              </div>
            </div>

            {/* Instruction Banner Under Ring */}
            <div className="mt-4 px-4 py-1.5 rounded-full bg-black/85 border border-white/20 text-xs font-mono text-white text-center shadow-lg">
              {solderStep === 1 && 'Hold iron tip against copper pad and pin'}
              {solderStep === 2 && 'Touch solder wire directly into heated joint'}
              {solderStep === 3 && 'Remove iron tip. Keep hand rock-still. Let freeze!'}
              {solderStep === 4 && 'Concave shiny volcano joint verified'}
            </div>
          </div>
        )}

        {/* Walk & Rock Floating Metronome Pacing Indicator */}
        {isMetronomeActive && solderStep === 0 && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-max max-w-[calc(100%-1rem)] px-4 py-3 rounded-2xl bg-[#050811]/90 border-2 border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.5)] flex items-center gap-4 text-slate-100">
            <Activity className="w-6 h-6 text-amber-400 animate-pulse" />
            <div className="text-center font-mono">
              <div className="text-xs text-amber-300 font-bold uppercase tracking-wider">
                WALK-AND-ROCK DESOLDER METRONOME
              </div>
              <div className="text-sm sm:text-lg font-black text-white flex items-center justify-center gap-2 mt-0.5">
                <span className={rockingSide === 'LEFT' ? 'text-amber-400 font-black scale-110' : 'text-slate-500'}>
                  ← TILT PIN A
                </span>
                <span className="text-sm px-2 py-0.5 rounded bg-black/60 border border-amber-500/50 text-amber-300">
                  {rockingSecondsRemaining}s
                </span>
                <span className={rockingSide === 'RIGHT' ? 'text-amber-400 font-black scale-110' : 'text-slate-500'}>
                  TILT PIN B →
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Standard In-Drawer HUD Control Component
  return (
    <div className="w-full flex flex-col gap-3 p-3.5 rounded-2xl bg-[#090e1f]/95 border border-emerald-500/40 shadow-[0_0_25px_rgba(52,211,153,0.15)] text-slate-100 backdrop-blur-md">
      {/* Submode Tabs: 3-Second Rule vs Walk & Rock */}
      <div className="flex items-center justify-between gap-2 border-b border-emerald-950/70 pb-2.5">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
          <button
            onClick={() => {
              setSubMode('THREE_SEC_RULE');
              playTacticalAudio.chirp();
            }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              subMode === 'THREE_SEC_RULE'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>3-SEC RULE</span>
          </button>

          <button
            onClick={() => {
              setSubMode('WALK_AND_ROCK');
              playTacticalAudio.chirp();
            }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              subMode === 'WALK_AND_ROCK'
                ? 'bg-amber-400 text-slate-950 font-bold shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>WALK & ROCK</span>
          </button>
        </div>

        {/* Audio Metronome Mute/Unmute */}
        <button
          onClick={() => {
            setSoundEnabled(!soundEnabled);
            playTacticalAudio.chirp();
          }}
          className={`p-1.5 rounded-xl border text-xs font-mono transition-colors ${
            soundEnabled
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}
          title={soundEnabled ? 'Metronome Audio Ticks Active' : 'Metronome Muted'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Mode 1: 3-Second Soldering Rule: 1s (Heat), 2s (Feed Solder), 3s (Freeze) */}
      {subMode === 'THREE_SEC_RULE' && (
        <div className="space-y-3">
          {/* Visual Step Countdown Strip */}
          <div className="grid grid-cols-3 gap-2 font-mono text-center">
            {/* 1s: Heat */}
            <div
              className={`p-3 rounded-xl border transition-all duration-200 ${
                solderStep === 1
                  ? 'bg-cyan-500/30 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)] text-white scale-[1.03]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="text-[10px] text-cyan-400 font-bold uppercase">1s (440Hz TONE)</div>
              <div className="text-sm font-black text-white mt-0.5">HEAT</div>
              <div className="text-[10px] text-slate-300 mt-0.5">Pad & Pin simultaneously</div>
            </div>

            {/* 2s: Feed Solder */}
            <div
              className={`p-3 rounded-xl border transition-all duration-200 ${
                solderStep === 2
                  ? 'bg-emerald-500/30 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)] text-white scale-[1.03]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="text-[10px] text-emerald-400 font-bold uppercase">2s (660Hz TONE)</div>
              <div className="text-sm font-black text-emerald-300 mt-0.5">FEED SOLDER</div>
              <div className="text-[10px] text-slate-300 mt-0.5">Introduce solder wire</div>
            </div>

            {/* 3s: Freeze */}
            <div
              className={`p-3 rounded-xl border transition-all duration-200 ${
                solderStep === 3
                  ? 'bg-sky-500/30 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.6)] text-white scale-[1.03]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="text-[10px] text-sky-400 font-bold uppercase">3s (880Hz TONE)</div>
              <div className="text-sm font-black text-sky-300 mt-0.5">FREEZE</div>
              <div className="text-[10px] text-slate-300 mt-0.5">Pull iron & hold still!</div>
            </div>
          </div>

          {/* Trigger Button */}
          <button
            onClick={trigger3SecondRule}
            disabled={isPacingActive}
            className={`w-full py-3 px-4 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              isPacingActive
                ? 'bg-gradient-to-r from-cyan-500 via-emerald-500 to-sky-500 text-slate-950 shadow-[0_0_25px_rgba(52,211,153,0.5)]'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
            }`}
          >
            <Flame className="w-4 h-4 fill-current" />
            <span>
              {isPacingActive
                ? solderStep === 1
                  ? 'STEP 1: HEATING PAD & PIN...'
                  : solderStep === 2
                  ? 'STEP 2: FEEDING SOLDER WIRE...'
                  : solderStep === 3
                  ? 'STEP 3: FREEZING JOINT (HOLD STILL)...'
                  : 'PERFECT MENISCUS ACHIEVED!'
                : 'START 3-SECOND RULE'}
            </span>
          </button>
        </div>
      )}

      {/* Mode 2: 'Walk & Rock' Desoldering Pacing */}
      {subMode === 'WALK_AND_ROCK' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            Alternates 3-second pin heating cycles for safely walking multi-pin electrolytic capacitors, headers, and switches out of dense multi-layer circuit boards without delaminating copper traces.
          </p>

          {/* Visual Rocking Tilt Meter */}
          <div className="p-3.5 rounded-xl bg-[#050811] border border-amber-950/70 flex flex-col items-center justify-center gap-2">
            <div className="w-full flex items-center justify-between gap-2 text-[10px] sm:text-xs font-mono px-1">
              <span
                className={`flex items-center gap-1 font-bold ${
                  rockingSide === 'LEFT' && isMetronomeActive
                    ? 'text-amber-400 scale-105'
                    : 'text-slate-500'
                }`}
              >
                ← HEAT PIN A
              </span>
              <span className="text-[11px] text-slate-400 tabular-nums">
                CYCLE #{totalCyclesDone}
              </span>
              <span
                className={`flex items-center gap-1 font-bold ${
                  rockingSide === 'RIGHT' && isMetronomeActive
                    ? 'text-amber-400 scale-105'
                    : 'text-slate-500'
                }`}
              >
                HEAT PIN B →
              </span>
            </div>

            {/* Rocking Capacitor Graphic */}
            <div className="relative w-48 h-16 flex items-center justify-center">
              <div
                className={`w-12 h-14 rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-300 ${
                  !isMetronomeActive
                    ? 'bg-slate-900 border-slate-700 text-slate-500'
                    : rockingSide === 'LEFT'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 -rotate-12 -translate-x-4 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
                    : 'bg-amber-500/20 border-amber-400 text-amber-300 rotate-12 translate-x-4 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
                }`}
              >
                <div className="text-xs font-mono font-black">CAP</div>
                <div className="text-[9px] font-mono">{isMetronomeActive ? `${rockingSecondsRemaining}s` : 'IDLE'}</div>
              </div>
            </div>
          </div>

          {/* Metronome Control Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMetronomeActive(!isMetronomeActive);
                playTacticalAudio.chirp();
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                isMetronomeActive
                  ? 'bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.5)]'
                  : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/50'
              }`}
            >
              {isMetronomeActive ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isMetronomeActive ? 'STOP METRONOME PACING' : 'START WALK & ROCK METRONOME'}</span>
            </button>

            {isMetronomeActive && (
              <button
                onClick={() => {
                  resetCycles();
                  playTacticalAudio.chirp();
                }}
                className="px-3 py-3 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 text-xs font-mono"
                title="Reset Cycle Counter"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
