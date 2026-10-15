import { useCallback, useEffect, useRef, useState } from 'react';
import { playTacticalAudio } from '../utils/audio';

export type SolderCoachSubMode = 'THREE_SEC_RULE' | 'WALK_AND_ROCK';

export interface SolderCoach {
  subMode: SolderCoachSubMode;
  setSubMode: (mode: SolderCoachSubMode) => void;
  /** 0 = idle, 1 = heat, 2 = feed solder, 3 = freeze, 4 = done */
  solderStep: 0 | 1 | 2 | 3 | 4;
  isPacingActive: boolean;
  trigger3SecondRule: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  isMetronomeActive: boolean;
  setMetronomeActive: (active: boolean) => void;
  rockingSide: 'LEFT' | 'RIGHT';
  rockingSecondsRemaining: number;
  totalCyclesDone: number;
  resetCycles: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

/** Single source of truth for the soldering pacer, shared by the camera overlay and the side panel. */
export function useSolderCoach(isActiveMode: boolean): SolderCoach {
  const [subMode, setSubMode] = useState<SolderCoachSubMode>('THREE_SEC_RULE');
  const [solderStep, setSolderStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMetronomeActive, setMetronomeActive] = useState(false);
  const [rockingSide, setRockingSide] = useState<'LEFT' | 'RIGHT'>('LEFT');
  const [rockingSecondsRemaining, setRockingSecondsRemaining] = useState(3);
  const [totalCyclesDone, setTotalCyclesDone] = useState(0);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;
  const pacingRef = useRef(false);

  const clearPacer = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const trigger3SecondRule = useCallback(() => {
    if (pacingRef.current) return;
    pacingRef.current = true;
    setSolderStep(1);
    if (soundRef.current) playTacticalAudio.solderSecond1();

    const schedule = (ms: number, fn: () => void) => timeoutsRef.current.push(setTimeout(fn, ms));
    schedule(1000, () => {
      setSolderStep(2);
      if (soundRef.current) playTacticalAudio.solderSecond2();
    });
    schedule(2000, () => {
      setSolderStep(3);
      if (soundRef.current) playTacticalAudio.solderSecond3();
    });
    schedule(3000, () => {
      setSolderStep(4);
      if (soundRef.current) playTacticalAudio.solderPullFreeze();
    });
    schedule(4500, () => {
      setSolderStep(0);
      pacingRef.current = false;
      timeoutsRef.current = [];
    });
  }, []);

  // Spacebar hotkey (e.g. a bluetooth clicker or keyboard) while hands hold the iron.
  useEffect(() => {
    if (!isActiveMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTypingTarget(e.target)) return;
      e.preventDefault();
      if (subMode === 'THREE_SEC_RULE') trigger3SecondRule();
      else setMetronomeActive(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActiveMode, subMode, trigger3SecondRule]);

  // Stop everything when leaving solder coach mode.
  useEffect(() => {
    if (isActiveMode) return;
    setMetronomeActive(false);
    clearPacer();
    pacingRef.current = false;
    setSolderStep(0);
  }, [isActiveMode]);

  // Walk & Rock metronome: 3s on pin A, 3s on pin B, repeat.
  useEffect(() => {
    if (!isMetronomeActive) {
      setRockingSecondsRemaining(3);
      return;
    }
    let side: 'LEFT' | 'RIGHT' = 'LEFT';
    let remaining = 3;
    setRockingSide(side);
    setRockingSecondsRemaining(remaining);
    if (soundRef.current) playTacticalAudio.metronomeLeft();

    const interval = setInterval(() => {
      if (remaining <= 1) {
        side = side === 'LEFT' ? 'RIGHT' : 'LEFT';
        remaining = 3;
        if (soundRef.current) {
          if (side === 'LEFT') playTacticalAudio.metronomeLeft();
          else playTacticalAudio.metronomeRight();
        }
        if (side === 'LEFT') setTotalCyclesDone(c => c + 1);
        setRockingSide(side);
      } else {
        remaining -= 1;
        if (soundRef.current) playTacticalAudio.countdownTick();
      }
      setRockingSecondsRemaining(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [isMetronomeActive]);

  useEffect(() => clearPacer, []);

  return {
    subMode,
    setSubMode,
    solderStep,
    isPacingActive: solderStep !== 0,
    trigger3SecondRule,
    soundEnabled,
    setSoundEnabled,
    isMetronomeActive,
    setMetronomeActive,
    rockingSide,
    rockingSecondsRemaining,
    totalCyclesDone,
    resetCycles: () => setTotalCyclesDone(0),
  };
}
