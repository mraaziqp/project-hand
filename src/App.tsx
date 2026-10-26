import { useState, useEffect, useCallback, useRef } from 'react';
import { HeaderTelemetry } from './components/HeaderTelemetry';
import { CameraARCanvas } from './components/CameraARCanvas';
import { ModeSelector } from './components/ModeSelector';
import { TelemetryDrawer } from './components/TelemetryDrawer';
import { CravingOverrideModal } from './components/CravingOverrideModal';
import { PartsBinDrawer } from './components/PartsBinDrawer';
import { NASSyncDrawer } from './components/NASSyncDrawer';
import { ScanHistoryDrawer } from './components/ScanHistoryDrawer';
import { OfflineIndicator } from './components/OfflineIndicator';

import {
  OperatingMode,
  DetectionItem,
  AnalysisResult,
  SalvagedPart,
  BenchStats,
  EcosystemStatus,
  SampleBoard,
  ScanHistoryEntry,
  StillFrame,
} from './types';
import {
  getStoredParts,
  addStoredPart,
  deleteStoredPart,
  togglePartTested,
  getStoredStats,
  incrementCravingDefeated,
  getStoredSettings,
  getVoiceMuted,
  saveVoiceMuted,
  getScanHistory,
  addScanHistory,
  deleteScanHistory,
  clearScanHistory,
  UserSettings,
} from './utils/storage';
import { requestScreenWakeLock, releaseScreenWakeLock } from './utils/wakeLock';
import { startHandsFreeListening, stopHandsFreeListening, isSpeechRecognitionSupported, VoiceCommandHandler } from './utils/speechRecognition';
import { speakJarvis, playTacticalAudio, setVoiceMuted } from './utils/audio';
import { postJSON, ApiRequestError } from './utils/api';
import { LoadedImage, makeThumbnail } from './utils/image';
import { useSolderCoach } from './hooks/useSolderCoach';

interface ScanOptions {
  mode?: OperatingMode;
  question?: string;
  /** Show this image frozen in the viewport while/after analyzing. */
  freeze: boolean;
  /** Auto-watch scans are not saved to history. */
  saveHistory?: boolean;
}

function categorize(item: DetectionItem): SalvagedPart['category'] {
  const l = item.label.toLowerCase();
  if (/capacitor|\bcap\b|electrolytic|\buf\b|µf/.test(l)) return 'Capacitor';
  if (/mosfet|transistor|irf|to-220/.test(l)) return 'MOSFET';
  if (/motor|stepper|servo|fan|vibration|actuator/.test(l)) return 'Motor';
  if (/switch|button|tactile/.test(l)) return 'Switch';
  if (/\bled\b/.test(l)) return 'LED';
  if (/buzzer|piezo|speaker/.test(l)) return 'Buzzer';
  if (/inductor|coil|choke|toroid/.test(l)) return 'Inductor';
  if (/header|pin strip/.test(l)) return 'Header';
  if (item.type === 'MODULE' || /module|board|sensor|lcd|display/.test(l)) return 'Module';
  if (item.type === 'CONNECTOR' || /connector|jack|socket|usb|cable|port/.test(l)) return 'Connector';
  if (item.type === 'IC_CHIP' || /regulator|\bic\b|chip|mcu|controller/.test(l)) return 'IC';
  return 'Other';
}

export default function App() {
  const [activeMode, setActiveMode] = useState<OperatingMode>('HARVEST');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [still, setStill] = useState<StillFrame | null>(null);
  const [selectedDetection, setSelectedDetection] = useState<DetectionItem | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [parts, setParts] = useState<SalvagedPart[]>(getStoredParts);
  const [stats, setStats] = useState<BenchStats>(getStoredStats);
  const [settings, setSettings] = useState<UserSettings>(getStoredSettings);
  const [history, setHistory] = useState<ScanHistoryEntry[]>(getScanHistory);

  const [isWakeLockOn, setIsWakeLockOn] = useState(false);
  const [isVoiceMuted, setIsVoiceMutedState] = useState(getVoiceMuted);
  const [isHandsFreeActive, setIsHandsFreeActive] = useState(false);

  const [isAutoWatchActive, setIsAutoWatchActive] = useState(false);
  const [autoWatchSecondsLeft, setAutoWatchSecondsLeft] = useState(8);

  const [isCravingModalOpen, setIsCravingModalOpen] = useState(false);
  const [isPartsBinOpen, setIsPartsBinOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [ecosystemStatus, setEcosystemStatus] = useState<EcosystemStatus>({ connected: false, latencyMs: null, lastPing: null });

  const coach = useSolderCoach(activeMode === 'SOLDER_COACH');

  const liveCaptureRef = useRef<(() => LoadedImage | null) | null>(null);
  const torchToggleRef = useRef<(() => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const analyzingRef = useRef(false);

  const detections = analysis?.detections ?? [];

  // Voice mute is global (applies to every spoken line, not just scan results).
  useEffect(() => {
    setVoiceMuted(isVoiceMuted);
    saveVoiceMuted(isVoiceMuted);
  }, [isVoiceMuted]);

  // Keep the screen on while working; re-acquire after the app returns to the foreground.
  useEffect(() => {
    let mounted = true;
    const acquire = async () => {
      const ok = await requestScreenWakeLock();
      if (mounted) setIsWakeLockOn(ok);
    };
    acquire();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', onVisibility);
      releaseScreenWakeLock();
    };
  }, []);

  // Periodic ecosystem heartbeat with Jarvis and Agent Builder bridge
  useEffect(() => {
    let cancelled = false;
    const checkEcosystem = async () => {
      try {
        const jarvisPromise = postJSON<{ success: boolean; latencyMs?: number }>('/api/jarvis/telemetry', {
          jarvisCoreUrl: settings.jarvisCoreApiUrl,
          authToken: settings.secondBrainAuthToken,
          state: { event: 'BENCH_OS_HEARTBEAT', timestamp: new Date().toISOString() },
        }).catch(() => null);

        const builderPromise = postJSON<{ success: boolean; latencyMs?: number }>('/api/agent-builder/relay', {
          agentBuilderUrl: settings.agentBuilderUrl,
          apiKey: settings.agentBuilderApiKey,
          title: 'BENCH-OS Heartbeat',
          message: 'BENCH-OS workbench live session check-in',
          sender: 'BENCH-OS',
          eventType: 'event',
        }).catch(() => null);

        const [jarvisRes, builderRes] = await Promise.all([jarvisPromise, builderPromise]);
        if (!cancelled) {
          setEcosystemStatus({
            connected: !!jarvisRes?.success,
            latencyMs: jarvisRes?.latencyMs ?? null,
            lastPing: new Date().toLocaleTimeString(),
            agentBuilderConnected: !!builderRes?.success,
            agentBuilderLatencyMs: builderRes?.latencyMs ?? null,
          });
        }
      } catch {
        /* Fail open: standalone operations never interrupted */
      }
    };

    checkEcosystem();
    const interval = setInterval(checkEcosystem, 5 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [settings.jarvisCoreApiUrl, settings.secondBrainAuthToken, settings.agentBuilderUrl, settings.agentBuilderApiKey]);

  // --- Analysis ---
  const runAnalysis = useCallback(
    async (image: LoadedImage, opts: ScanOptions) => {
      const mode = opts.mode ?? activeMode;
      if (opts.freeze) setStill({ src: image.dataUrl, width: image.width, height: image.height });

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      analyzingRef.current = true;
      setIsAnalyzing(true);
      setErrorMessage(null);
      setSelectedDetection(null);
      if (mode === 'CRAVING_OVERRIDE') setIsCravingModalOpen(true);

      try {
        const data = await postJSON<AnalysisResult>(
          '/api/analyze',
          {
            imageBase64: image.dataUrl,
            mode,
            question: opts.question,
            currency: settings.currency,
            partsInventory: parts.map(p => ({ name: p.name })),
          },
          controller.signal
        );
        if (controller.signal.aborted) return;

        setAnalysis(data);
        if (data.safety_hazard_detected) playTacticalAudio.alert();
        else playTacticalAudio.success();
        speakJarvis(opts.question && data.answer ? data.answer : data.spoken_telemetry);

        if (opts.saveHistory !== false) {
          const thumbnail = await makeThumbnail(image.dataUrl, 640);
          setHistory(
            addScanHistory({
              id: `scan-${Date.now()}`,
              timestamp: new Date().toISOString(),
              mode,
              question: opts.question,
              thumbnail,
              analysis: data,
            })
          );
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        const message = err instanceof Error ? err.message : 'Scan failed.';
        setErrorMessage(message);
        playTacticalAudio.alert();
        if (err instanceof ApiRequestError && err.needsAccessKey) setIsSettingsOpen(true);
      } finally {
        if (abortRef.current === controller) {
          analyzingRef.current = false;
          setIsAnalyzing(false);
        }
      }
    },
    [activeMode, parts, settings.currency]
  );

  // Always call the latest runAnalysis from timers / voice callbacks.
  const runAnalysisRef = useRef(runAnalysis);
  runAnalysisRef.current = runAnalysis;

  const currentImage = useCallback((): LoadedImage | null => {
    if (still) return { dataUrl: still.src, width: still.width, height: still.height };
    return liveCaptureRef.current?.() ?? null;
  }, [still]);

  const handleScanImage = (image: LoadedImage, freeze: boolean) => {
    runAnalysis(image, { freeze });
  };

  const handleAsk = (question: string) => {
    const image = currentImage();
    if (!image) {
      setErrorMessage('Point the live camera at something or take a PHOTO first, then ask your question.');
      return;
    }
    runAnalysis(image, { question, freeze: true });
  };

  const handleLoadDemoBoard = (board: SampleBoard) => {
    abortRef.current?.abort();
    setIsAutoWatchActive(false);
    setErrorMessage(null);
    setSelectedDetection(null);
    setAnalysis({ ...board.mockAnalysis, object_identified: `${board.title} (demo)`, isDemo: true });
  };

  const handleStillChange = (next: StillFrame | null) => {
    setStill(next);
    if (!next) {
      setAnalysis(null);
      setSelectedDetection(null);
    }
  };

  // --- Auto-watch: rescan a fresh live frame every N seconds ---
  useEffect(() => {
    if (!isAutoWatchActive) {
      setAutoWatchSecondsLeft(settings.autoWatchIntervalSeconds);
      return;
    }
    setStill(null);
    let remaining = settings.autoWatchIntervalSeconds;
    setAutoWatchSecondsLeft(remaining);
    const interval = setInterval(() => {
      if (analyzingRef.current) return; // wait for the in-flight scan
      remaining -= 1;
      if (remaining <= 0) {
        remaining = settings.autoWatchIntervalSeconds;
        const frame = liveCaptureRef.current?.();
        if (frame) runAnalysisRef.current(frame, { freeze: false, saveHistory: false });
      }
      setAutoWatchSecondsLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [isAutoWatchActive, settings.autoWatchIntervalSeconds]);

  const toggleAutoWatch = () => {
    setIsAutoWatchActive(prev => {
      speakJarvis(prev ? 'Auto-watch off.' : `Auto-watch on. Rescanning every ${settings.autoWatchIntervalSeconds} seconds.`);
      return !prev;
    });
  };

  // --- Parts bin ---
  const handleLogPart = (item: DetectionItem) => {
    playTacticalAudio.chirp();
    const newPart = addStoredPart({
      name: item.label,
      category: categorize(item),
      testedWorking: false,
      partNumber: item.part_number || undefined,
      estValue: item.est_value,
      pinout: item.pinout_notes,
      reuseIdeas: item.reuse_ideas,
      sourceBoard: analysis?.object_identified || 'Camera scan',
    });
    setParts(prev => [newPart, ...prev]);
    setStats(getStoredStats());
  };

  const handleAddManualPart = (newPartData: Omit<SalvagedPart, 'id' | 'dateHarvested'>) => {
    const created = addStoredPart(newPartData);
    setParts(prev => [created, ...prev]);
    setStats(getStoredStats());
  };

  const handleDeletePart = (id: string) => {
    deleteStoredPart(id);
    setParts(prev => prev.filter(p => p.id !== id));
  };

  const handleTogglePartTested = (id: string) => {
    togglePartTested(id);
    setParts(prev => prev.map(p => (p.id === id ? { ...p, testedWorking: !p.testedWorking } : p)));
  };

  // --- Modes ---
  const handleSelectMode = (mode: OperatingMode) => {
    if (mode === activeMode && mode !== 'CRAVING_OVERRIDE') return;
    setActiveMode(mode);
    playTacticalAudio.chirp();

    if (mode === 'CRAVING_OVERRIDE') {
      setIsCravingModalOpen(true);
      return;
    }
    // Re-run the current photo through the new mode (demo boards stay local).
    if (still && !still.demoBoardId && !isAutoWatchActive) {
      runAnalysis({ dataUrl: still.src, width: still.width, height: still.height }, { mode, freeze: true });
    }
  };

  // --- History ---
  const handleOpenHistory = async (entry: ScanHistoryEntry) => {
    abortRef.current?.abort();
    setIsAutoWatchActive(false);
    setIsHistoryOpen(false);
    setActiveMode(entry.mode);
    setAnalysis(entry.analysis);
    setSelectedDetection(null);
    setErrorMessage(null);
    if (entry.thumbnail) {
      const img = new Image();
      img.onload = () => setStill({ src: entry.thumbnail, width: img.naturalWidth, height: img.naturalHeight });
      img.src = entry.thumbnail;
    }
  };

  // --- Voice ---
  const handleVoiceCommand: VoiceCommandHandler = command => {
    playTacticalAudio.chirp();
    const scanIn = (mode: OperatingMode, fallback: string) => {
      setActiveMode(mode);
      const frame = liveCaptureRef.current?.() ?? currentImage();
      if (frame) runAnalysis(frame, { mode, freeze: true });
      else speakJarvis(fallback);
    };

    switch (command) {
      case 'SCAN':
        scanIn('HARVEST', 'Point the camera at something first.');
        break;
      case 'CHECK_JOINT':
        scanIn('SOLDER_COACH', 'Solder coach on. Point the camera at the joint.');
        break;
      case 'BUILD':
        scanIn('BUILD_ADVISOR', 'Build advisor on.');
        break;
      case 'DOCTOR':
        scanIn('DEVICE_DOCTOR', 'Device doctor on. Point the camera at the device.');
        break;
      case 'HEAT':
        setActiveMode('SOLDER_COACH');
        coach.trigger3SecondRule();
        break;
      case 'AUTO_WATCH':
        toggleAutoWatch();
        break;
      case 'CRAVING':
        setActiveMode('CRAVING_OVERRIDE');
        setIsCravingModalOpen(true);
        break;
      case 'LOG_PART': {
        const target = selectedDetection ?? detections.find(d => d.type !== 'HAZARD');
        if (target) {
          handleLogPart(target);
          speakJarvis(`Logged ${target.label}.`);
        } else {
          speakJarvis('Nothing to log yet. Scan first.');
        }
        break;
      }
      case 'MUTE':
        setIsVoiceMutedState(m => !m);
        break;
      case 'TORCH':
        torchToggleRef.current?.();
        break;
    }
  };
  const voiceHandlerRef = useRef(handleVoiceCommand);
  voiceHandlerRef.current = handleVoiceCommand;

  const toggleHandsFree = () => {
    if (isHandsFreeActive) {
      stopHandsFreeListening();
      setIsHandsFreeActive(false);
      speakJarvis('Voice commands off.');
      return;
    }
    if (!isSpeechRecognitionSupported()) {
      setErrorMessage('Voice commands are not supported in this browser. Chrome on Android works best.');
      return;
    }
    startHandsFreeListening((cmd, phrase) => voiceHandlerRef.current(cmd, phrase), active => setIsHandsFreeActive(active));
    setIsHandsFreeActive(true);
    speakJarvis('Voice commands on. Say scan, heat, log part, or torch.');
  };

  useEffect(() => () => stopHandsFreeListening(), []);

  return (
    <div className="min-h-dvh bg-[#050811] text-slate-100 flex flex-col font-sans hud-grid">
      <OfflineIndicator />

      <HeaderTelemetry
        stats={stats}
        partsCount={parts.length}
        historyCount={history.length}
        isWakeLockOn={isWakeLockOn}
        isVoiceMuted={isVoiceMuted}
        onToggleVoiceMute={() => setIsVoiceMutedState(m => !m)}
        isHandsFreeActive={isHandsFreeActive}
        onToggleHandsFree={toggleHandsFree}
        onOpenPartsBin={() => setIsPartsBinOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        ecosystemStatus={ecosystemStatus}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 flex flex-col gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <ModeSelector activeMode={activeMode} onSelectMode={handleSelectMode} isAnalyzing={isAnalyzing} />

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          <div className="lg:col-span-7 flex flex-col lg:sticky lg:top-20">
            <CameraARCanvas
              detections={detections}
              selectedDetection={selectedDetection}
              onSelectDetection={setSelectedDetection}
              still={still}
              onStillChange={handleStillChange}
              onScanImage={handleScanImage}
              onLoadDemoBoard={handleLoadDemoBoard}
              onClearDetections={() => {
                setAnalysis(null);
                setSelectedDetection(null);
              }}
              isAnalyzing={isAnalyzing}
              activeMode={activeMode}
              onLogHarvestedPart={handleLogPart}
              isAutoWatchActive={isAutoWatchActive}
              onToggleAutoWatch={toggleAutoWatch}
              autoWatchSecondsLeft={autoWatchSecondsLeft}
              coach={coach}
              currency={settings.currency}
              liveCaptureRef={liveCaptureRef}
              torchToggleRef={torchToggleRef}
            />
          </div>

          <div className="lg:col-span-5 flex flex-col">
            <TelemetryDrawer
              analysis={analysis}
              activeMode={activeMode}
              onLogHarvestedPart={handleLogPart}
              onSelectDetection={setSelectedDetection}
              selectedDetection={selectedDetection}
              coach={coach}
              currency={settings.currency}
              onAsk={handleAsk}
              isAnalyzing={isAnalyzing}
              errorMessage={errorMessage}
              onDismissError={() => setErrorMessage(null)}
            />
          </div>
        </div>
      </main>

      <CravingOverrideModal
        isOpen={isCravingModalOpen}
        onClose={() => setIsCravingModalOpen(false)}
        onComplete={() => setStats(incrementCravingDefeated())}
        targetTask={analysis?.challenge_task}
      />

      <PartsBinDrawer
        isOpen={isPartsBinOpen}
        onClose={() => setIsPartsBinOpen(false)}
        parts={parts}
        onAddPart={handleAddManualPart}
        onDeletePart={handleDeletePart}
        onToggleTested={handleTogglePartTested}
        currency={settings.currency}
      />

      <ScanHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onOpenEntry={handleOpenHistory}
        onDeleteEntry={id => setHistory(deleteScanHistory(id))}
        onClearAll={() => {
          clearScanHistory();
          setHistory([]);
        }}
      />

      {isSettingsOpen && (
        <NASSyncDrawer
          isOpen
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={setSettings}
          parts={parts}
          stats={stats}
          onEcosystemStatusChange={setEcosystemStatus}
        />
      )}
    </div>
  );
}
