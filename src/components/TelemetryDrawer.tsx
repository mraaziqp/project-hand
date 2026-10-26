import React, { useState } from 'react';
import {
  AlertOctagon,
  Volume2,
  CheckCircle2,
  ListOrdered,
  Cpu,
  ChevronDown,
  ChevronUp,
  Wrench,
  Copy,
  Check,
  ShoppingCart,
  MessageSquare,
  Send,
  ExternalLink,
  Coins,
  Sparkles,
  Code2,
  Bot,
} from 'lucide-react';
import { AnalysisResult, Currency, DetectionItem, OperatingMode } from '../types';
import { speakJarvis, playTacticalAudio } from '../utils/audio';
import { buildStoreLinks, copyText, formatPrice } from '../utils/shopping';
import { postJSON } from '../utils/api';
import { SolderCoachOverlay } from './SolderCoachOverlay';
import { DeviceDoctorWizard } from './DeviceDoctorWizard';
import { SolderCoach } from '../hooks/useSolderCoach';

interface TelemetryDrawerProps {
  analysis: AnalysisResult | null;
  activeMode: OperatingMode;
  onLogHarvestedPart: (item: DetectionItem) => void;
  onSelectDetection: (item: DetectionItem) => void;
  selectedDetection: DetectionItem | null;
  coach: SolderCoach;
  currency: Currency;
  onAsk: (question: string) => void;
  isAnalyzing: boolean;
  errorMessage: string | null;
  onDismissError: () => void;
}

const WORTH_STYLE: Record<string, string> = {
  HIGH: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  MEDIUM: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  LOW: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
  SKIP: 'bg-slate-800 text-slate-500 border-slate-700',
};

const StoreLinks: React.FC<{ query: string; currency: Currency; partNumber?: string }> = ({ query, currency, partNumber }) => (
  <div className="flex flex-wrap gap-1.5 mt-2">
    {buildStoreLinks(query, currency, partNumber).map(link => (
      <a
        key={link.name}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="min-h-[32px] px-2.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-200 flex items-center gap-1 active:scale-95"
      >
        {link.name}
        <ExternalLink className="w-3 h-3 text-slate-400" />
      </a>
    ))}
  </div>
);

const SectionTitle: React.FC<{ icon: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }> = ({
  icon,
  children,
  right,
}) => (
  <div className="flex items-center justify-between mb-2 gap-2">
    <h4 className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
      {icon}
      <span>{children}</span>
    </h4>
    {right}
  </div>
);

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({
  analysis,
  activeMode,
  onLogHarvestedPart,
  onSelectDetection,
  selectedDetection,
  coach,
  currency,
  onAsk,
  isAnalyzing,
  errorMessage,
  onDismissError,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copiedSchematic, setCopiedSchematic] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [question, setQuestion] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [loggedIdx, setLoggedIdx] = useState<Set<number>>(new Set());
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSent, setDispatchSent] = useState(false);

  const handleDispatchToAgentBuilder = async () => {
    if (!analysis) return;
    setIsDispatching(true);
    playTacticalAudio.chirp();
    try {
      await postJSON('/api/agent-builder/relay', {
        title: `BENCH-OS Hardware Task: ${analysis.object_identified || 'Workbench Scan'}`,
        message: `Analysis of ${analysis.object_identified || 'PCB'}. Detected ${analysis.detections?.length || 0} parts. Spoken guidance: ${analysis.spoken_telemetry}`,
        sender: 'BENCH-OS',
        eventType: 'event',
        metadata: {
          object: analysis.object_identified,
          detections: analysis.detections?.map(d => ({ label: d.label, type: d.type, partNumber: d.part_number })),
          safetyHazard: analysis.safety_hazard_detected,
        },
      });
      setDispatchSent(true);
      playTacticalAudio.success();
      setTimeout(() => setDispatchSent(false), 4000);
    } catch {
      playTacticalAudio.alert();
    } finally {
      setIsDispatching(false);
    }
  };

  // Reset per-result UI state when a new analysis arrives.
  const [lastAnalysis, setLastAnalysis] = useState(analysis);
  if (analysis !== lastAnalysis) {
    setLastAnalysis(analysis);
    setExpandedIdx(null);
    setLoggedIdx(new Set());
  }

  const submitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || isAnalyzing) return;
    onAsk(q);
    setQuestion('');
  };

  const copySchematic = async () => {
    if (!analysis?.schematic_ascii) return;
    if (await copyText(analysis.schematic_ascii)) {
      setCopiedSchematic(true);
      setTimeout(() => setCopiedSchematic(false), 2000);
    }
  };

  const copyCode = async () => {
    if (!analysis?.code_snippet) return;
    if (await copyText(analysis.code_snippet)) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const modeTools = (
    <>
      {activeMode === 'SOLDER_COACH' && <SolderCoachOverlay coach={coach} isActiveMode isFloatingOverlay={false} />}
      {activeMode === 'DEVICE_DOCTOR' && <DeviceDoctorWizard />}
    </>
  );

  const askBox = (
    <form onSubmit={submitQuestion} className="flex gap-2">
      <div className="relative flex-1">
        <MessageSquare className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) submitQuestion(e);
          }}
          rows={1}
          placeholder={analysis ? 'Ask about this…' : 'Ask about what the camera sees…'}
          className="w-full min-h-[44px] max-h-32 pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-y select-text"
        />
      </div>
      <button
        type="submit"
        disabled={!question.trim() || isAnalyzing}
        className="min-h-[44px] min-w-[48px] px-3 rounded-xl bg-cyan-500 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-95"
        title="Ask Jarvis about the current image"
      >
        <Send className="w-4 h-4" />
        <span className="hidden sm:inline">ASK</span>
      </button>
    </form>
  );

  const errorBanner = errorMessage && (
    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/70 text-rose-100 text-xs flex items-start gap-2.5">
      <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
      <div className="flex-1 min-w-0 select-text break-words">
        <strong className="font-mono text-rose-300 block">SCAN FAILED</strong>
        {errorMessage}
      </div>
      <button onClick={onDismissError} className="text-rose-300 font-mono text-[11px] shrink-0 px-1">
        OK
      </button>
    </div>
  );

  if (!analysis) {
    return (
      <div className="w-full flex flex-col gap-3">
        {errorBanner}
        <div className="w-full p-4 rounded-2xl bg-[#0b1329]/90 border border-slate-800 text-slate-300 text-sm space-y-3">
          <div className="flex items-center gap-2 font-mono text-xs text-cyan-400 font-bold">
            <Cpu className="w-4 h-4 animate-pulse" />
            <span>READY TO SCAN</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[13px] text-slate-300">
            <li>Point the camera at a device, board, motor, or part.</li>
            <li>
              Tap <strong className="text-cyan-300">SCAN</strong>, or <strong className="text-cyan-300">PHOTO</strong> for a sharper shot.
            </li>
            <li>You get what it is, what's worth salvaging, what it's worth, and where to buy parts.</li>
          </ol>
          {askBox}
        </div>
        {modeTools}
      </div>
    );
  }

  const detections = analysis.detections || [];
  const shopping = analysis.shopping_list || [];
  const steps = analysis.step_by_step_guide || [];

  return (
    <div className="w-full flex flex-col gap-3">
      {errorBanner}
      <div className="w-full flex flex-col rounded-2xl bg-[#0b1329]/95 border border-cyan-950/90 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-3 sm:px-4 py-3 bg-[#080e21] border-b border-cyan-950/70 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono font-bold text-[10px] text-cyan-400 uppercase tracking-wider">IDENTIFIED</span>
              {analysis.isDemo && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-mono font-bold">DEMO</span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white leading-snug select-text">
              {analysis.object_identified || (detections.length ? 'Hardware in view' : 'Nothing recognised')}
            </h3>
            {analysis.salvage_value_total ? (
              <p className="text-[11px] font-mono text-emerald-300 mt-0.5 flex items-center gap-1">
                <Coins className="w-3 h-3" />
                Salvage value {formatPrice(analysis.salvage_value_total, currency)} {currency}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                playTacticalAudio.chirp();
                speakJarvis(analysis.answer || analysis.spoken_telemetry);
              }}
              className="min-h-[40px] min-w-[40px] rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center"
              title="Read aloud"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCollapsed(c => !c)}
              className="min-h-[40px] min-w-[40px] rounded-lg text-slate-400 flex items-center justify-center"
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="p-3 sm:p-4 space-y-4 select-text">
            {analysis.safety_hazard_detected && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500 text-rose-200 text-xs flex items-start gap-2.5 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-rose-300 uppercase font-mono font-bold tracking-wider">Safety warning</strong>
                  <p className="mt-0.5 text-[13px] text-rose-100">
                    {analysis.safety_warning || 'Hazard identified. Disconnect batteries and discharge capacitors before working on it.'}
                  </p>
                </div>
              </div>
            )}

            {analysis.answer && (
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/50">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-cyan-300 uppercase mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Answer
                </div>
                <p className="text-[13px] sm:text-sm text-slate-100 leading-relaxed whitespace-pre-line">{analysis.answer}</p>
              </div>
            )}

            <p className="text-[13px] text-cyan-100/90 leading-relaxed italic border-l-2 border-cyan-700 pl-3">
              {analysis.spoken_telemetry}
            </p>

            {askBox}

            {modeTools}

            {/* Agent Builder Bridge Dispatch */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-200">
              <div className="flex items-center gap-2 min-w-0">
                <Bot className="w-4 h-4 text-purple-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-purple-200 truncate">Agent Builder Bridge</div>
                  <div className="text-[10px] text-purple-300/80 truncate">Queue diagnostic or firmware build task</div>
                </div>
              </div>
              <button
                onClick={handleDispatchToAgentBuilder}
                disabled={isDispatching}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-[10px] uppercase shrink-0 transition flex items-center gap-1 active:scale-95"
              >
                {isDispatching ? (
                  'Sending...'
                ) : dispatchSent ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-300" />
                    <span>Dispatched!</span>
                  </>
                ) : (
                  'Send Task'
                )}
              </button>
            </div>

            {/* Detected parts */}
            {detections.length > 0 && (
              <div>
                <SectionTitle
                  icon={<Cpu className="w-3.5 h-3.5 text-cyan-400" />}
                  right={<span className="text-[10px] font-mono text-slate-500">TAP FOR DETAILS</span>}
                >
                  Parts found ({detections.length})
                </SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                  {detections.map((det, index) => {
                    const isSelected = selectedDetection === det;
                    const isHazard = det.type === 'HAZARD';
                    const isExpanded = expandedIdx === index;
                    const price = formatPrice(det.est_value, currency);
                    const logged = loggedIdx.has(index);

                    return (
                      <div
                        key={index}
                        onClick={() => {
                          onSelectDetection(det);
                          setExpandedIdx(isExpanded ? null : index);
                        }}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-400'
                            : isHazard
                            ? 'bg-rose-950/30 border-rose-900/60'
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/50 text-slate-300">
                                #{index + 1}
                              </span>
                              {det.harvest_worth && !isHazard && (
                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold ${WORTH_STYLE[det.harvest_worth]}`}>
                                  {det.harvest_worth === 'SKIP' ? 'SKIP' : `${det.harvest_worth} VALUE`}
                                </span>
                              )}
                              {isHazard && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold bg-rose-500/20 text-rose-300">HAZARD</span>
                              )}
                              {price && <span className="text-[11px] font-mono text-emerald-300">{price}</span>}
                            </div>
                            <h5 className="font-semibold text-[13px] sm:text-sm text-white mt-1 leading-snug">{det.label}</h5>
                            {det.part_number && <p className="text-[11px] font-mono text-amber-300 mt-0.5">{det.part_number}</p>}
                          </div>

                          {!isHazard && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                onLogHarvestedPart(det);
                                setLoggedIdx(prev => new Set(prev).add(index));
                              }}
                              className={`min-h-[40px] px-2.5 rounded-lg font-mono font-bold text-[11px] flex items-center gap-1 active:scale-95 shrink-0 ${
                                logged ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500 text-slate-950'
                              }`}
                              title="Save to parts bin"
                            >
                              {logged ? <Check className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                              <span>{logged ? 'LOGGED' : 'LOG'}</span>
                            </button>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="mt-2 space-y-1.5 text-[12px] text-slate-300 leading-relaxed">
                            {det.desolder_technique && (
                              <p>
                                <strong className="text-cyan-300 font-mono">Remove:</strong> {det.desolder_technique}
                              </p>
                            )}
                            {det.pinout_notes && (
                              <p>
                                <strong className="text-emerald-300 font-mono">Pinout:</strong> {det.pinout_notes}
                              </p>
                            )}
                            {det.reuse_ideas && (
                              <p>
                                <strong className="text-amber-300 font-mono">Reuse:</strong> {det.reuse_ideas}
                              </p>
                            )}
                            {!isHazard && (
                              <StoreLinks query={det.buy_search_query || det.part_number || det.label} currency={currency} partNumber={det.part_number} />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Shopping list */}
            {shopping.length > 0 && (
              <div>
                <SectionTitle icon={<ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />}>Worth buying</SectionTitle>
                <div className="space-y-2">
                  {shopping.map((s, idx) => (
                    <details key={idx} className="group p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                      <summary className="list-none cursor-pointer flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {s.priority === 'MUST' && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">NEEDED</span>
                            )}
                            <span className="font-semibold text-[13px] text-white">{s.item}</span>
                          </div>
                          <p className="text-[12px] text-slate-400 mt-0.5">{s.purpose}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {formatPrice(s.est_price, currency) && (
                            <span className="text-[11px] font-mono text-emerald-300">{formatPrice(s.est_price, currency)}</span>
                          )}
                          <ChevronDown className="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform" />
                        </div>
                      </summary>
                      <StoreLinks query={s.search_query} currency={currency} />
                    </details>
                  ))}
                </div>
              </div>
            )}

            {steps.length > 0 && (
              <div>
                <SectionTitle icon={<ListOrdered className="w-3.5 h-3.5 text-cyan-400" />}>Next steps</SectionTitle>
                <div className="space-y-1.5">
                  {steps.map((step, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 flex items-start gap-2.5 text-[13px] text-slate-200">
                      <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/80 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.schematic_ascii && (
              <div className="p-3 rounded-xl bg-[#050811] border border-amber-500/40">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-950/60">
                  <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold text-xs uppercase">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Wiring diagram</span>
                  </div>
                  <button
                    onClick={copySchematic}
                    className="min-h-[32px] px-2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono flex items-center gap-1"
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

            {analysis.code_snippet && (
              <div className="p-3 rounded-xl bg-[#050811] border border-cyan-500/40">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-950/60">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-mono font-bold text-xs uppercase">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Arduino / ESP32 sketch</span>
                  </div>
                  <button
                    onClick={copyCode}
                    className="min-h-[32px] px-2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono flex items-center gap-1"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'COPIED' : 'COPY'}</span>
                  </button>
                </div>
                <pre className="font-mono text-[11px] text-cyan-100 overflow-auto max-h-80 p-2 bg-black/60 rounded border border-cyan-950/80 leading-relaxed">
                  {analysis.code_snippet}
                </pre>
              </div>
            )}

            {analysis.model && <p className="text-[10px] font-mono text-slate-600 text-right">via {analysis.model}</p>}
          </div>
        )}
      </div>
    </div>
  );
};
