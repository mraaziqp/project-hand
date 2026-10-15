import React, { useState, useEffect } from 'react';
import { ShieldAlert, Droplets, CheckCircle, Flame, X, Trophy } from 'lucide-react';
import { playTacticalAudio, speakJarvis } from '../utils/audio';

interface CravingOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  targetTask?: string;
}

export const CravingOverrideModal: React.FC<CravingOverrideModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  targetTask = 'Desolder both through-hole radial capacitors off this PCB cleanly using the Walk-and-Rock technique.',
}) => {
  const [secondsLeft, setSecondsLeft] = useState(180);
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSecondsLeft(180);
      setIsActive(true);
      setIsCompleted(false);
      playTacticalAudio.alert();

      const prompt = `Craving override engaged. Drink a mouthful of cold water right now. Pliers in hand, soldering iron hot. Your mission: ${targetTask}. One hundred and eighty seconds on the clock. Go!`;
      speakJarvis(prompt);
    } else {
      setIsActive(false);
    }
  }, [isOpen, targetTask]);

  useEffect(() => {
    if (!isActive || isCompleted || !isOpen) return;

    if (secondsLeft <= 0) {
      handleCompleteChallenge();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        const next = prev - 1;
        // Tactical audible ticks at key intervals
        if (next === 120) {
          speakJarvis('Two minutes remaining. Maintain steady heat and tilt pins smoothly.');
        } else if (next === 60) {
          speakJarvis('Final sixty seconds. Clear the solder and set parts in your tray.');
        } else if (next <= 5 && next > 0) {
          playTacticalAudio.countdownTick();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, secondsLeft, isCompleted, isOpen]);

  const handleCompleteChallenge = () => {
    setIsCompleted(true);
    setIsActive(false);
    playTacticalAudio.success();
    speakJarvis('Challenge victorious! Nicotine craving neutralized. Dopamine restored through pure mechanical craftsmanship. Great work, sir.');
    onComplete();
  };

  if (!isOpen) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progressPercent = ((180 - secondsLeft) / 180) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#090e1f] border-2 border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.35)] p-5 sm:p-6 text-slate-100 overflow-hidden">
        {/* Animated Crimson Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 animate-pulse" />

        <div className="flex items-center justify-between pb-3 border-b border-rose-900/60">
          <div className="flex items-center gap-2 text-rose-400 font-mono font-bold text-sm tracking-wider uppercase">
            <ShieldAlert className="w-5 h-5 animate-bounce" />
            <span>EMERGENCY CRAVING OVERRIDE // 180s</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
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
                {targetTask}
              </p>
              <p className="text-[11px] text-slate-400 mt-2 font-mono">
                Hands busy = Craving defeated. Solder melting temperature: 350°C. Focus on the solder meniscus.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleCompleteChallenge}
                className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-mono font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(52,211,153,0.4)] active:scale-95 transition"
              >
                <CheckCircle className="w-5 h-5" />
                <span>MISSION ACCOMPLISHED (+1 STREAK)</span>
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
                You occupied your hands with the soldering iron, conquered the chemical urge, and harvested usable hardware components for your home NAS!
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
              <div>
                <span className="text-amber-400 block font-bold text-sm">100%</span>
                <span>REVERSED</span>
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
