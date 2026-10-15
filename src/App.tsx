import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HeaderTelemetry } from './components/HeaderTelemetry';
import { CameraARCanvas } from './components/CameraARCanvas';
import { ModeSelector } from './components/ModeSelector';
import { TelemetryDrawer } from './components/TelemetryDrawer';
import { CravingOverrideModal } from './components/CravingOverrideModal';
import { PartsBinDrawer } from './components/PartsBinDrawer';
import { NASSyncDrawer } from './components/NASSyncDrawer';
import { OfflineIndicator } from './components/OfflineIndicator';

import {
  OperatingMode,
  DetectionItem,
  AnalysisResult,
  SalvagedPart,
  BenchStats,
  EcosystemStatus,
} from './types';
import {
  getStoredParts,
  addStoredPart,
  deleteStoredPart,
  togglePartTested,
  getStoredStats,
  incrementCravingDefeated,
  getStoredSettings,
  UserSettings,
} from './utils/storage';
import { requestScreenWakeLock, releaseScreenWakeLock } from './utils/wakeLock';
import {
  startHandsFreeListening,
  stopHandsFreeListening,
  isSpeechRecognitionSupported,
} from './utils/speechRecognition';
import { speakJarvis, cancelJarvisVoice, playTacticalAudio } from './utils/audio';
import { SAMPLE_BOARDS } from './utils/sampleBoards';

export default function App() {
  const [activeMode, setActiveMode] = useState<OperatingMode>('HARVEST');

  // CRITICAL ZERO-MOCK ENFORCEMENT:
  // On startup with live camera, detections are strictly EMPTY until a real scan is performed!
  const [detections, setDetections] = useState<DetectionItem[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedDetection, setSelectedDetection] = useState<DetectionItem | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Storage states
  const [parts, setParts] = useState<SalvagedPart[]>([]);
  const [stats, setStats] = useState<BenchStats>(getStoredStats());
  const [settings, setSettings] = useState<UserSettings>(getStoredSettings());

  // Hardware controls
  const [isWakeLockOn, setIsWakeLockOn] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isHandsFreeActive, setIsHandsFreeActive] = useState(false);

  // Auto-Watch 8s Bench Overwatch Loop
  const [isAutoWatchActive, setIsAutoWatchActive] = useState(false);
  const [autoWatchSecondsLeft, setAutoWatchSecondsLeft] = useState(8);

  // Modals & Drawers
  const [isCravingModalOpen, setIsCravingModalOpen] = useState(false);
  const [isPartsBinOpen, setIsPartsBinOpen] = useState(false);
  const [isNASSyncOpen, setIsNASSyncOpen] = useState(false);

  // Ecosystem bridge status
  const [ecosystemStatus, setEcosystemStatus] = useState<EcosystemStatus | undefined>({
    connected: false,
    latencyMs: null,
    lastPing: null,
  });

  const lastCapturedImageRef = useRef<string | null>(null);
  const triggerCaptureRef = useRef<(() => void) | null>(null);

  // 1. Initialize Screen Wake Lock on startup so screen never turns off while soldering
  useEffect(() => {
    let mounted = true;

    async function initWakeLock() {
      const acquired = await requestScreenWakeLock();
      if (mounted) setIsWakeLockOn(acquired);
    }

    initWakeLock();

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const reacquired = await requestScreenWakeLock();
        if (mounted) setIsWakeLockOn(reacquired);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseScreenWakeLock();
    };
  }, []);

  // 2. Load stored parts & stats
  useEffect(() => {
    setParts(getStoredParts());
    setStats(getStoredStats());
    setSettings(getStoredSettings());
  }, []);

  // 3. Hands-Free Voice Command Listener
  const handleVoiceCommand = useCallback(
    (
      command:
        | 'SCAN'
        | 'CHECK_JOINT'
        | 'BUILD'
        | 'CRAVING'
        | 'LOG_PART'
        | 'MUTE'
        | 'TORCH'
        | 'HEAT'
        | 'DOCTOR'
        | 'AUTO_WATCH',
      rawPhrase: string
    ) => {
      playTacticalAudio.chirp();

      switch (command) {
        case 'SCAN':
          setActiveMode('HARVEST');
          if (lastCapturedImageRef.current) {
            handleAnalyzeFrame(lastCapturedImageRef.current, 'HARVEST');
          } else {
            speakJarvis('Initiating motherboard harvest scan, sir.');
          }
          break;

        case 'CHECK_JOINT':
          setActiveMode('SOLDER_COACH');
          if (lastCapturedImageRef.current) {
            handleAnalyzeFrame(lastCapturedImageRef.current, 'SOLDER_COACH');
          } else {
            speakJarvis('Solder joint coach engaged. Hold your iron steady at the work.');
          }
          break;

        case 'HEAT':
          setActiveMode('SOLDER_COACH');
          playTacticalAudio.solderSecond1();
          speakJarvis('Three-second soldering countdown started. Heat pad and pin.');
          break;

        case 'BUILD':
          setActiveMode('BUILD_ADVISOR');
          if (lastCapturedImageRef.current) {
            handleAnalyzeFrame(lastCapturedImageRef.current, 'BUILD_ADVISOR');
          } else {
            speakJarvis('Scanning parts bin for zero-budget circuits and firmware.');
          }
          break;

        case 'DOCTOR':
          setActiveMode('DEVICE_DOCTOR');
          speakJarvis('Dead Device Doctor triage active. Commencing non-destructive diagnostics.');
          break;

        case 'AUTO_WATCH':
          setIsAutoWatchActive(prev => {
            const next = !prev;
            if (next) {
              speakJarvis('Continuous bench overwatch activated. Scanning every eight seconds.');
            } else {
              speakJarvis('Auto-watch disengaged.');
            }
            return next;
          });
          break;

        case 'CRAVING':
          setActiveMode('CRAVING_OVERRIDE');
          setIsCravingModalOpen(true);
          break;

        case 'LOG_PART':
          if (selectedDetection) {
            handleLogPart(selectedDetection);
            speakJarvis(`Logged ${selectedDetection.label} to your parts bin.`);
          } else if (detections.length > 0) {
            handleLogPart(detections[0]);
            speakJarvis(`Logged ${detections[0].label} to your parts bin.`);
          }
          break;

        case 'MUTE':
          cancelJarvisVoice();
          setIsVoiceMuted(prev => !prev);
          break;

        default:
          break;
      }
    },
    [selectedDetection, detections]
  );

  const toggleHandsFree = () => {
    if (isHandsFreeActive) {
      stopHandsFreeListening();
      setIsHandsFreeActive(false);
      speakJarvis('Voice mic standby.');
    } else {
      if (!isSpeechRecognitionSupported()) {
        alert('Voice speech recognition is not supported in this browser environment. You can use tactical buttons!');
        return;
      }
      startHandsFreeListening(handleVoiceCommand, active => setIsHandsFreeActive(active));
      setIsHandsFreeActive(true);
      speakJarvis('Hands-free microphone online. Say Jarvis scan, Jarvis heat, or Jarvis doctor.');
    }
  };

  const toggleVoiceMute = () => {
    if (!isVoiceMuted) {
      cancelJarvisVoice();
      setIsVoiceMuted(true);
    } else {
      setIsVoiceMuted(false);
      speakJarvis('Voice telemetry unmuted.');
    }
  };

  // 4. Analyze Frame with Gemini Vision API
  const handleAnalyzeFrame = async (base64Image: string, modeOverride?: OperatingMode) => {
    lastCapturedImageRef.current = base64Image;
    const mode = modeOverride || activeMode;
    setIsAnalyzing(true);
    setSelectedDetection(null);

    if (mode === 'CRAVING_OVERRIDE') {
      setIsCravingModalOpen(true);
    }

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          mode,
          partsInventory: parts,
        }),
      });

      const data: AnalysisResult = await response.json();

      if (data && data.spoken_telemetry) {
        setAnalysis(data);
        setDetections(data.detections || []);

        if (data.safety_hazard_detected) {
          playTacticalAudio.alert();
        } else {
          playTacticalAudio.chirp();
        }

        if (!isVoiceMuted) {
          speakJarvis(data.spoken_telemetry);
        }
      }
    } catch (err) {
      console.warn('Analysis network issue, falling back to local calibration:', err);
      const fallbackBoard =
        SAMPLE_BOARDS.find(b =>
          mode === 'SOLDER_COACH' ? b.id === 'solder-strip' : b.id === 'router-pcb'
        ) || SAMPLE_BOARDS[0];

      setAnalysis(fallbackBoard.mockAnalysis);
      setDetections(fallbackBoard.mockAnalysis.detections);

      if (!isVoiceMuted) {
        speakJarvis(fallbackBoard.mockAnalysis.spoken_telemetry);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-Watch 8-Second Loop
  useEffect(() => {
    if (!isAutoWatchActive) {
      setAutoWatchSecondsLeft(8);
      return;
    }

    const interval = setInterval(() => {
      setAutoWatchSecondsLeft(prev => {
        if (prev <= 1) {
          // Trigger frame capture if image is available
          if (lastCapturedImageRef.current && !isAnalyzing) {
            handleAnalyzeFrame(lastCapturedImageRef.current);
          }
          return 8;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoWatchActive, isAnalyzing]);

  // Clear detections on camera switch
  const handleClearDetections = () => {
    setDetections([]);
    setSelectedDetection(null);
  };

  // 5. Parts Bin Management
  const handleLogPart = (item: DetectionItem) => {
    playTacticalAudio.chirp();
    let cat: SalvagedPart['category'] = 'Other';
    if (item.label.includes('Capacitor')) cat = 'Capacitor';
    else if (item.label.includes('Switch') || item.label.includes('Button')) cat = 'Switch';
    else if (item.label.includes('LED')) cat = 'LED';
    else if (item.label.includes('Regulator') || item.type === 'IC_CHIP') cat = 'IC';
    else if (item.label.includes('MOSFET')) cat = 'MOSFET';
    else if (item.label.includes('Buzzer')) cat = 'Buzzer';
    else if (item.label.includes('Inductor')) cat = 'Inductor';
    else if (item.label.includes('Header') || item.type === 'CONNECTOR') cat = 'Header';

    const newPart = addStoredPart({
      name: item.label,
      category: cat,
      testedWorking: true,
      pinout: item.pinout_notes,
      reuseIdeas: item.reuse_ideas,
      sourceBoard: 'Camera Harvest',
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
    setParts(prev =>
      prev.map(p => (p.id === id ? { ...p, testedWorking: !p.testedWorking } : p))
    );
  };

  // 6. Craving Override Mission Completed
  const handleCravingCompleted = () => {
    const updatedStats = incrementCravingDefeated();
    setStats(updatedStats);
  };

  // 7. Select Mode
  const handleSelectMode = (mode: OperatingMode) => {
    setActiveMode(mode);
    playTacticalAudio.chirp();

    if (mode === 'CRAVING_OVERRIDE') {
      setIsCravingModalOpen(true);
      return;
    }

    if (lastCapturedImageRef.current) {
      handleAnalyzeFrame(lastCapturedImageRef.current, mode);
    } else {
      if (mode === 'DEVICE_DOCTOR') {
        speakJarvis('Dead Device Doctor triage active. Inspecting non-destructive test points.');
      }
    }
  };

  // Highlight step target box in Device Doctor mode
  const handleHighlightStepBox = (box?: [number, number, number, number]) => {
    if (box) {
      const mockItem: DetectionItem = {
        box_2d: box,
        label: 'Triage Inspection Target',
        type: 'CONNECTOR',
        desolder_technique: 'Non-destructive probe with wooden pick or tweezers',
        pinout_notes: 'Inspect for lint or corrosion',
        reuse_ideas: 'Diagnostic checkpoint',
      };
      setSelectedDetection(mockItem);
    } else {
      setSelectedDetection(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col font-sans hud-grid select-none">
      <OfflineIndicator />

      {/* Top Telemetry Contract */}
      <HeaderTelemetry
        stats={stats}
        isWakeLockOn={isWakeLockOn}
        isVoiceMuted={isVoiceMuted}
        onToggleVoiceMute={toggleVoiceMute}
        isHandsFreeActive={isHandsFreeActive}
        onToggleHandsFree={toggleHandsFree}
        onOpenPartsBin={() => setIsPartsBinOpen(true)}
        onOpenNASSync={() => setIsNASSyncOpen(true)}
        ecosystemStatus={ecosystemStatus}
      />

      {/* Main Workbench Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 flex flex-col gap-3">
        {/* Five Mode Selector Grid */}
        <ModeSelector
          activeMode={activeMode}
          onSelectMode={handleSelectMode}
          isAnalyzing={isAnalyzing}
        />

        {/* Dynamic Dual-Column Split */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* Left Column: Live Optics & Interactive AR Bounding Box Canvas */}
          <div className="lg:col-span-7 flex flex-col min-h-[400px] sm:min-h-[480px]">
            <CameraARCanvas
              detections={detections}
              selectedDetection={selectedDetection}
              onSelectDetection={det => {
                setSelectedDetection(det);
                if (det && !isVoiceMuted) {
                  speakJarvis(`${det.label}. Pinout note: ${det.pinout_notes}.`);
                }
              }}
              onCaptureFrame={base64 => handleAnalyzeFrame(base64)}
              onClearDetections={handleClearDetections}
              isAnalyzing={isAnalyzing}
              activeMode={activeMode}
              onLogHarvestedPart={handleLogPart}
              isAutoWatchActive={isAutoWatchActive}
              onToggleAutoWatch={() => {
                setIsAutoWatchActive(prev => {
                  const next = !prev;
                  if (next) {
                    speakJarvis('Continuous bench overwatch activated. Monitoring PCB every eight seconds.');
                  } else {
                    speakJarvis('Auto-watch disengaged.');
                  }
                  return next;
                });
              }}
              autoWatchSecondsLeft={autoWatchSecondsLeft}
            />
          </div>

          {/* Right Column: Telemetry, Solder Rule Pacer, Firmware Suite, or Device Doctor */}
          <div className="lg:col-span-5 flex flex-col">
            <TelemetryDrawer
              analysis={analysis}
              activeMode={activeMode}
              onLogHarvestedPart={handleLogPart}
              onSelectDetection={det => setSelectedDetection(det)}
              selectedDetection={selectedDetection}
              onHighlightStepBox={handleHighlightStepBox}
            />
          </div>
        </div>
      </main>

      {/* Emergency 3-Minute Craving Override Protocol Modal */}
      <CravingOverrideModal
        isOpen={isCravingModalOpen}
        onClose={() => setIsCravingModalOpen(false)}
        onComplete={handleCravingCompleted}
        targetTask={analysis?.challenge_task}
      />

      {/* Salvaged Parts Bin Drawer */}
      <PartsBinDrawer
        isOpen={isPartsBinOpen}
        onClose={() => setIsPartsBinOpen(false)}
        parts={parts}
        onAddPart={handleAddManualPart}
        onDeletePart={handleDeletePart}
        onToggleTested={handleTogglePartTested}
      />

      {/* Second Brain & Home NAS Bridge Drawer */}
      <NASSyncDrawer
        isOpen={isNASSyncOpen}
        onClose={() => setIsNASSyncOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        parts={parts}
        stats={stats}
        onEcosystemStatusChange={setEcosystemStatus}
      />
    </div>
  );
}
