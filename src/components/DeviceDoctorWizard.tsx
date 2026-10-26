import React, { useState } from 'react';
import { Stethoscope, CheckCircle2, AlertTriangle, Check, Bot } from 'lucide-react';
import { DeviceDoctorStep } from '../types';
import { playTacticalAudio, speakJarvis } from '../utils/audio';
import { postJSON } from '../utils/api';

const TRIAGE_STEPS: DeviceDoctorStep[] = [
  {
    id: 'step-lint',
    title: 'Stage 1: Non-Destructive Port Lint Extraction',
    instruction:
      'Gently insert a sharpened non-conductive wooden toothpick or plastic pick into the USB-C / Lightning port. Scrape out compressed pocket lint preventing charging contacts from seating.',
    caution: 'NEVER use metal tweezers or safety pins in a live port—risk of shorting 5V VBUS to GND!',
    tool: 'Wooden toothpick or shaved plastic zip-tie',
  },
  {
    id: 'step-battery-conn',
    title: 'Stage 2: Battery Terminal & Flex Reseating',
    instruction:
      'Inspect the main battery connector. Unseat the snap connector with a plastic spudger, inspect gold pins for white oxidation or debris, and firmly re-click it into place.',
    caution: 'If battery pouch feels squishy or swollen like a pillow, STOP immediately. Do not puncture.',
    tool: 'Plastic guitar pick or nylon spudger',
  },
  {
    id: 'step-ribbon',
    title: 'Stage 3: Screen & Sub-Board FPC Reseating',
    instruction:
      'Disconnect and reseat the display ribbon and sub-board interconnect cables. Drops frequently disconnect the display while the logic board is still fully functional.',
    caution: 'Check zero-insertion-force (ZIF) lock flaps before pulling flex cables.',
    tool: 'Plastic spudger + isopropyl alcohol (99%)',
  },
  {
    id: 'step-power-pad',
    title: 'Stage 4: Power Switch Bypass Test',
    instruction:
      'Dead power buttons are the #1 false-flag dead motherboard cause. Bridge the two PWR_KEY test pads on the board using insulated tweezers for 2 seconds to simulate power button press.',
    caution: 'Only bridge verified PWR pads or switch legs, do not bridge adjacent decoupling caps.',
    tool: 'Curved ESD-safe tweezers or stripped jumper wire',
  },
  {
    id: 'step-thermal',
    title: 'Stage 5: Alcohol Vapor Thermal Short Detection',
    instruction:
      'Coat the board with 99% isopropyl alcohol while injecting low voltage (3.8V-4.2V current-limited to 1A). The shorted ceramic capacitor will rapidly evaporate alcohol first.',
    caution: 'No open flames or hot iron tips nearby while alcohol vapor is present.',
    tool: '99% Isopropyl Alcohol + 5V USB / bench supply',
  },
];

export const DeviceDoctorWizard: React.FC = () => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [isReporting, setIsReporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  const currentStep = TRIAGE_STEPS[currentStepIdx];

  const handleSelectStep = (idx: number) => {
    setCurrentStepIdx(idx);
    playTacticalAudio.chirp();
    const step = TRIAGE_STEPS[idx];
    speakJarvis(`Triage Stage ${idx + 1}: ${step.title}. ${step.instruction}`);
  };

  const handleToggleComplete = (id: string) => {
    playTacticalAudio.success();
    setCompletedSteps(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDispatchTriage = async () => {
    setIsReporting(true);
    playTacticalAudio.chirp();
    const verifiedCount = Object.values(completedSteps).filter(Boolean).length;
    try {
      await postJSON('/api/agent-builder/relay', {
        title: `BENCH-OS Device Doctor Triage Report (${verifiedCount}/${TRIAGE_STEPS.length} steps)`,
        message: `Triage stage ${currentStepIdx + 1}: ${currentStep.title}. Completed: ${Object.keys(completedSteps).filter(k => completedSteps[k]).join(', ') || 'In progress'}`,
        sender: 'BENCH-OS',
        eventType: 'event',
        metadata: {
          currentStep: currentStep.id,
          verifiedCount,
          completedSteps,
        },
      });
      setReportDone(true);
      playTacticalAudio.success();
      setTimeout(() => setReportDone(false), 3000);
    } catch {
      playTacticalAudio.alert();
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 p-4 rounded-2xl bg-[#090e1f]/95 border border-cyan-500/40 shadow-2xl text-slate-100 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-3 border-b border-cyan-950/70">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-mono font-bold text-xs sm:text-sm text-cyan-300 uppercase tracking-wide">
              DEVICE DOCTOR CHECKLIST
            </h3>
            <p className="text-[10px] font-mono text-slate-400">
              NON-DESTRUCTIVE CHECKS BEFORE YOU DESOLDER ANYTHING
            </p>
          </div>
        </div>

        <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
          STAGE {currentStepIdx + 1} OF {TRIAGE_STEPS.length}
        </span>
      </div>

      {/* Stepper Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {TRIAGE_STEPS.map((step, idx) => {
          const isCurrent = currentStepIdx === idx;
          const isDone = completedSteps[step.id];

          return (
            <button
              key={step.id}
              onClick={() => handleSelectStep(idx)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all ${
                isCurrent
                  ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                  : isDone
                  ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {isDone ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <span className="text-[10px]">0{idx + 1}.</span>
              )}
              <span>{step.title.split(':')[1]?.trim() || step.title}</span>
            </button>
          );
        })}
      </div>

      {/* Active Stage Details Card */}
      <div className="p-4 rounded-xl bg-[#050811] border border-cyan-900/60 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">
              CURRENT TRIAGE PROCEDURE
            </span>
            <h4 className="text-sm font-mono font-bold text-white mt-0.5">
              {currentStep.title}
            </h4>
          </div>

          <button
            onClick={() => handleToggleComplete(currentStep.id)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
              completedSteps[currentStep.id]
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-500'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{completedSteps[currentStep.id] ? 'VERIFIED PASS' : 'MARK VERIFIED'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-200 font-sans leading-relaxed">
          {currentStep.instruction}
        </p>

        {/* Recommended Non-Conductive Tool */}
        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-cyan-400 font-bold shrink-0">RECOMMENDED TOOL:</span>
          <span className="text-slate-300">{currentStep.tool}</span>
        </div>

        {/* Hazard Caution Callout */}
        <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-[11px] font-mono flex items-start gap-2 text-rose-200">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{currentStep.caution}</span>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={() => handleSelectStep(Math.max(0, currentStepIdx - 1))}
            disabled={currentStepIdx === 0}
            className="min-h-[40px] px-3 rounded-lg text-xs font-mono bg-slate-900 border border-slate-800 disabled:opacity-40 text-slate-300"
          >
            ← Prev
          </button>

          <button
            onClick={handleDispatchTriage}
            disabled={isReporting}
            className="min-h-[40px] px-3 rounded-lg text-xs font-mono bg-purple-950/40 border border-purple-500/40 text-purple-200 hover:bg-purple-900/40 flex items-center gap-1.5 transition active:scale-95"
            title="Dispatch triage report to Agent Builder"
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden xs:inline">{isReporting ? 'SENDING...' : reportDone ? 'DISPATCHED!' : 'REPORT TO BUILDER'}</span>
          </button>

          <button
            onClick={() => {
              if (currentStepIdx < TRIAGE_STEPS.length - 1) {
                handleSelectStep(currentStepIdx + 1);
              }
            }}
            disabled={currentStepIdx === TRIAGE_STEPS.length - 1}
            className="min-h-[40px] px-4 rounded-lg text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 uppercase disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};
