import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldAlert, Droplets, CheckCircle, Flame, X, Trophy } from 'lucide-react';
import { playTacticalAudio, speakJarvis } from '../utils/audio';

interface CravingOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  targetTask?: string;
}

const DEFAULT_TASK = 'Desolder two through-hole capacitors from a scrap board cleanly using the walk-and-rock technique.';
const DURATION = 180;

export const CravingOverrideModal: React.FC<CravingOverrideModalProps> = ({ isOpen, onClose, onComplete, targetTask }) => {
  const task = targetTask?.trim() || DEFAULT_TASK;
  const [secondsLeft, setSecondsLeft] = useState(DURATION);
  const [isCompleted, setIsCompleted] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Reset only when the modal opens, not when the AI's mission text arrives later.
  useEffect(() => {
    if (!isOpen) return;
    setSecondsLeft(DURATION);
    setIsCompleted(false);
    playTacticalAudio.alert();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    speakJarvis(`Craving override engaged. Drink a mouthful of cold water right now. Your mission: ${task}. Three minutes on the clock. Go!`);
  }, [isOpen, task]);

  const handleCompleteChallenge = useCallback(() => {
    setIsCompleted(prev => {
      if (prev) return prev;
      playTacticalAudio.success();
      speakJarvis('Challenge complete. Craving neutralised with pure craftsmanship. Great work.');
      onCompleteRef.current();
      return true;
    });
  }, []);

  useEffect(() => {
    if (!isOpen || isCompleted) return;
    const timer = setInterval(() => setSecondsLeft(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [isOpen, isCompleted]);

  useEffect(() => {
    if (!isOpen || isCompleted) return;
    if (secondsLeft === 120) speakJarvis('Two minutes remaining. Steady heat, smooth tilt.');
    else if (secondsLeft === 60) speakJarvis('Final sixty seconds. Clear the solder and set the parts in your tray.');
    else if (secondsLeft > 0 && secondsLeft <= 5) playTacticalAudio.countdownTick();
    else if (secondsLeft === 0) handleCompleteChallenge();
  }, [secondsLeft, isOpen, isCompleted, handleCompleteChallenge]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progressPercent = ((DURATION - secondsLeft) / DURATION) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-2xl bg-[#090e1f] border-2 border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.35)] p-5 sm:p-6 text-slate-100 overflow-hidden">
        {/* Animated Crimson Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 animate-pulse" />

        <div className="flex items-center justify-between pb-3 border-b border-rose-900/60">
          <div className="flex items-center gap-2 text-rose-400 font-mono font-bold text-sm tracking-wider uppercase">
            <ShieldAlert className="w-5 h-5 animate-bounce" />
            <span>CRAVING OVERRIDE // 3 MIN</span>
          </div>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isCompleted ? (
          <div className="mt-4 space-y-4">
            {/* Massive Tactical Countdown Clock */}
            <div className="text-center py-2 relative">
              <div className="text-5xl sm:text-6xl font-mono font-bold tracking-tight text-white tabular-nums drop-shadow-[0_0_20px_rgba(244,63,94,0.6)]">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <p className="text-[11px] font-mono text-rose-400 uppercase tracking-widest mt-1">
                MECHANICAL OCCUPATION PROTOCOL
              </p>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-900 rounded-full mt-3 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Step 1: Cold Water Hydration */}
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                <Droplets className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <strong className="text-cyan-300 font-mono">PRIORITY ZERO:</strong>
                <p className="text-slate-200">
                  Take a deep, slow gulp of ice-cold water right now. Shock the oral nerve loop.
                </p>
              </div>
            </div>

            {/* Target Hardware Challenge Directive */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold text-xs uppercase mb-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>TACTILE TARGET MISSION</span>
              </div>
              <p className="text-sm font-sans text-white font-medium leading-relaxed">
                {task}
              </p>
              <p className="text-[11px] text-slate-400 mt-2 font-mono">
                Hands busy = Craving defeated. Iron at ~330-350°C. Focus on the solder melting.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleCompleteChallenge}
                className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-mono font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(52,211,153,0.4)] active:scale-95 transition"
              >
                <CheckCircle className="w-5 h-5" />
                <span>DONE (+1)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(52,211,153,0.5)]">
              <Trophy className="w-8 h-8 animate-bounce" />
            </div>

            <div>
              <h3 className="text-xl font-mono font-bold text-emerald-400 uppercase tracking-wide">
                CRAVING DEFEATED
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto font-sans">
                You occupied your hands with the soldering iron, and rode out the urge. Every one of these makes the next one easier.
              </p>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs font-mono flex items-center justify-around text-slate-300">
              <div>
                <span className="text-emerald-400 block font-bold text-sm">+1</span>
                <span>STREAK GAINED</span>
              </div>
              <div>
                <span className="text-cyan-400 block font-bold text-sm">$0.00</span>
                <span>BUDGET SPENT</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition"
            >
              Return to Workbench HUD
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
