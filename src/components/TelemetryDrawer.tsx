import React, { useState } from 'react';
import {
  AlertOctagon,
  Volume2,
  CheckCircle2,
  ListOrdered,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  Flame,
  Wrench,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { AnalysisResult, DetectionItem, OperatingMode } from '../types';
import { speakJarvis, playTacticalAudio } from '../utils/audio';
import { SolderCoachOverlay } from './SolderCoachOverlay';
import { FirmwareSuiteGenerator, DEFAULT_FIRMWARE_SUITE } from './FirmwareSuiteGenerator';
import { DeviceDoctorWizard } from './DeviceDoctorWizard';

interface TelemetryDrawerProps {
  analysis: AnalysisResult | null;
  activeMode: OperatingMode;
  onLogHarvestedPart: (item: DetectionItem) => void;
  onSelectDetection: (item: DetectionItem) => void;
  selectedDetection: DetectionItem | null;
  onHighlightStepBox?: (box?: [number, number, number, number]) => void;
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({
  analysis,
  activeMode,
  onLogHarvestedPart,
  onSelectDetection,
  selectedDetection,
  onHighlightStepBox,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copiedSchematic, setCopiedSchematic] = useState(false);

  if (!analysis) {
    return (
      <div className="w-full p-4 rounded-2xl bg-[#0b1329]/90 border border-slate-800 text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
        <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
        <span>AIM PHONE AT MOTHERBOARD AND TAP SCAN FRAME TO COMMENCE TELEMETRY</span>
      </div>
    );
  }

  const handleReplayVoice = () => {
    playTacticalAudio.chirp();
    speakJarvis(analysis.spoken_telemetry);
  };

  const copySchematic = () => {
    if (!analysis.schematic_ascii) return;
    navigator.clipboard.writeText(analysis.schematic_ascii);
    setCopiedSchematic(true);
    setTimeout(() => setCopiedSchematic(false), 2000);
  };

  return (
    <div className="w-full flex flex-col rounded-2xl bg-[#0b1329]/95 border border-cyan-950/90 shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Header bar with Jarvis Voice Readout */}
      <div className="px-4 py-3 bg-[#080e21] border-b border-cyan-950/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-3.5 bg-cyan-400 rounded-sm voice-bar" />
            <span className="w-1.5 h-5 bg-cyan-400 rounded-sm voice-bar [animation-delay:0.2s]" />
            <span className="w-1.5 h-2.5 bg-cyan-400 rounded-sm voice-bar [animation-delay:0.4s]" />
          </div>
          <span className="font-mono font-bold text-xs text-cyan-400 uppercase tracking-wider">
            JARVIS SPOKEN TELEMETRY
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleReplayVoice}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs font-mono flex items-center gap-1.5 transition"
            title="Replay Voice Guidance"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>REPEAT</span>
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {/* Spoken Quote Box */}
          <div className="p-3.5 rounded-xl bg-[#050811] border border-cyan-900/50 relative">
            <p className="text-xs sm:text-sm font-sans text-cyan-100 leading-relaxed italic">
              "{analysis.spoken_telemetry}"
            </p>
          </div>

          {/* Critical Hazard Alert Banner */}
          {analysis.safety_hazard_detected && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500 text-rose-200 text-xs font-mono flex items-start gap-2.5 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
              <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-300 uppercase font-bold tracking-wider">
                  SAFETY INTERCEPT TRIGGERED:
                </strong>
                <p className="mt-0.5 font-sans text-xs text-rose-100">
                  {analysis.safety_warning || 'Active hazard identified. Disconnect battery or discharge high-voltage capacitor before soldering.'}
                </p>
              </div>
            </div>
          )}

          {/* Solder Coach 3-Second Rule Pacer & Walk & Rock Metronome (When in Solder Mode) */}
          {activeMode === 'SOLDER_COACH' && (
            <SolderCoachOverlay isActiveMode={true} isFloatingOverlay={false} />
          )}

          {/* Device Doctor Triage Wizard (When in Device Doctor Mode) */}
          {activeMode === 'DEVICE_DOCTOR' && (
            <DeviceDoctorWizard onHighlightStepBox={onHighlightStepBox} />
          )}

          {/* Step-by-Step Instructions */}
          {analysis.step_by_step_guide && analysis.step_by_step_guide.length > 0 && activeMode !== 'DEVICE_DOCTOR' && (
            <div>
              <h4 className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <ListOrdered className="w-3.5 h-3.5 text-cyan-400" />
                <span>TACTICAL WORKBENCH STEPS</span>
              </h4>
              <div className="space-y-1.5">
                {analysis.step_by_step_guide.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-200 font-sans"
                  >
                    <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/80 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schematic Diagram & Firmware Generator (Build Advisor Mode) */}
          {activeMode === 'BUILD_ADVISOR' && (
            <div className="space-y-4">
              {analysis.schematic_ascii && (
                <div className="p-3 rounded-xl bg-[#050811] border border-amber-500/40">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-950/60">
                    <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold text-xs uppercase">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>ZERO-BUDGET WIRING PINOUT</span>
                    </div>
                    <button
                      onClick={copySchematic}
                      className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[10px] font-mono flex items-center gap-1"
                    >
                      {copiedSchematic ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSchematic ? 'COPIED' : 'COPY'}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-[11px] text-amber-200 overflow-x-auto p-2 bg-black/60 rounded border border-amber-950/80 leading-relaxed">
                    {analysis.schematic_ascii}
                  </pre>
                </div>
              )}

              {/* Firmware & Ecosystem Code Generator Suite */}
              <FirmwareSuiteGenerator firmwareSuite={analysis.firmware_suite || DEFAULT_FIRMWARE_SUITE} />
            </div>
          )}

          {/* Detected Components Grid & 1-Tap Log */}
          {analysis.detections && analysis.detections.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>DETECTED COMPONENTS & PADS ({analysis.detections.length})</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-500">TAP CARD TO INSPECT</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {analysis.detections.map((det, index) => {
                  const isSelected = selectedDetection?.label === det.label;
                  const isHazard = det.type === 'HAZARD';

                  return (
                    <div
                      key={index}
                      onClick={() => onSelectDetection(det)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                          : isHazard
                          ? 'bg-rose-950/30 border-rose-900/60 hover:border-rose-700'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-black/50 text-slate-300">
                              #{index + 1}
                            </span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                                isHazard
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-cyan-500/20 text-cyan-300'
                              }`}
                            >
                              {det.type}
                            </span>
                          </div>
                          <h5 className="font-mono font-bold text-xs sm:text-sm text-white mt-1 truncate">
                            {det.label}
                          </h5>
                        </div>

                        {/* Quick 1-Tap Log Button */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onLogHarvestedPart(det);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-[11px] flex items-center gap-1 active:scale-95 transition shrink-0"
                          title="Save to Salvaged Parts Bin"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>+ LOG</span>
                        </button>
                      </div>

                      <div className="mt-2 space-y-1 text-[11px] font-sans text-slate-300">
                        <p>
                          <strong className="text-cyan-300 font-mono">Desolder:</strong>{' '}
                          {det.desolder_technique}
                        </p>
                        <p>
                          <strong className="text-emerald-300 font-mono">Pinout:</strong>{' '}
                          {det.pinout_notes}
                        </p>
                        {det.reuse_ideas && (
                          <p>
                            <strong className="text-amber-300 font-mono">Reuse:</strong>{' '}
                            {det.reuse_ideas}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
