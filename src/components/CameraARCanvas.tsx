import React, { useRef, useEffect, useState, useCallback, MutableRefObject } from 'react';
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  SwitchCamera,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Crosshair,
  ImageUp,
  Radio,
  Sliders,
  Video,
  X,
  Aperture,
} from 'lucide-react';
import { Currency, DetectionItem, OperatingMode, SampleBoard, StillFrame } from '../types';
import { SAMPLE_BOARDS, renderSampleBoard } from '../utils/sampleBoards';
import { playTacticalAudio } from '../utils/audio';
import { captureVideoFrame, fileToScaledImage, LoadedImage } from '../utils/image';
import { formatPrice } from '../utils/shopping';
import { SolderCoachOverlay } from './SolderCoachOverlay';
import { SolderCoach } from '../hooks/useSolderCoach';

type SourceType = 'LIVE' | 'DEMO';

interface CameraARCanvasProps {
  detections: DetectionItem[];
  selectedDetection: DetectionItem | null;
  onSelectDetection: (item: DetectionItem | null) => void;
  still: StillFrame | null;
  onStillChange: (still: StillFrame | null) => void;
  /** Analyze an image. `freeze` = show it as the still frame while analyzing. */
  onScanImage: (image: LoadedImage, freeze: boolean) => void;
  onLoadDemoBoard: (board: SampleBoard) => void;
  onClearDetections: () => void;
  isAnalyzing: boolean;
  activeMode: OperatingMode;
  onLogHarvestedPart: (item: DetectionItem) => void;
  isAutoWatchActive: boolean;
  onToggleAutoWatch: () => void;
  autoWatchSecondsLeft: number;
  coach: SolderCoach;
  currency: Currency;
  /** Lets App grab a fresh live frame (auto-watch, voice "scan"). */
  liveCaptureRef: MutableRefObject<(() => LoadedImage | null) | null>;
  torchToggleRef: MutableRefObject<(() => void) | null>;
}

interface MediaRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Where the media actually lands inside the container for object-fit contain/cover.
function fitRect(mediaW: number, mediaH: number, boxW: number, boxH: number, mode: 'contain' | 'cover'): MediaRect {
  if (!mediaW || !mediaH) return { x: 0, y: 0, w: boxW, h: boxH };
  const scale = mode === 'contain' ? Math.min(boxW / mediaW, boxH / mediaH) : Math.max(boxW / mediaW, boxH / mediaH);
  const w = mediaW * scale;
  const h = mediaH * scale;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
}

const TYPE_COLORS: Record<string, string> = {
  HAZARD: '#f43f5e',
  THROUGH_HOLE: '#34d399',
  SMD: '#fbbf24',
  CONNECTOR: '#fbbf24',
  IC_CHIP: '#22d3ee',
  MODULE: '#a78bfa',
  MECHANICAL: '#f97316',
};

export const CameraARCanvas: React.FC<CameraARCanvasProps> = ({
  detections,
  selectedDetection,
  onSelectDetection,
  still,
  onStillChange,
  onScanImage,
  onLoadDemoBoard,
  onClearDetections,
  isAnalyzing,
  activeMode,
  onLogHarvestedPart,
  isAutoWatchActive,
  onToggleAutoWatch,
  autoWatchSecondsLeft,
  coach,
  currency,
  liveCaptureRef,
  torchToggleRef,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [source, setSource] = useState<SourceType>('LIVE');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoSize, setVideoSize] = useState({ w: 0, h: 0 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [demoBoardId, setDemoBoardId] = useState(SAMPLE_BOARDS[0].id);

  const showingStill = !!still;

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsVideoReady(false);
    setTorchAvailable(false);
    setIsTorchOn(false);
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices?.enumerateDevices?.();
      if (devices) setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
    } catch {
      // ignore
    }
  }, []);

  // Camera lifecycle: one effect owns starting/stopping the stream.
  const [restartToken, setRestartToken] = useState(0);
  useEffect(() => {
    if (source !== 'LIVE') {
      stopStream();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        window.isSecureContext
          ? 'This browser does not support live camera access. Use the PHOTO button to snap a picture instead.'
          : 'Live camera needs HTTPS. Open the app over https:// (see README), or tap PHOTO below to use your phone camera directly.'
      );
      return;
    }

    let cancelled = false;
    setCameraError(null);
    stopStream();

    const video: MediaTrackConstraints = selectedDeviceId
      ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      : { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } };

    navigator.mediaDevices
      .getUserMedia({ audio: false, video })
      .then(stream => {
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        track.addEventListener('ended', () => {
          if (streamRef.current === stream) setRestartToken(t => t + 1);
        });
        const caps: any = track.getCapabilities?.() ?? {};
        setTorchAvailable(!!caps.torch);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        refreshDevices();
      })
      .catch((err: DOMException) => {
        if (cancelled) return;
        console.warn('Camera access issue:', err);
        const msg =
          err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access in your browser settings, or use PHOTO / GALLERY below.'
            : err.name === 'NotFoundError' || err.name === 'OverconstrainedError'
            ? 'No matching camera found. Try FLIP, pick another camera, or use PHOTO / GALLERY.'
            : err.message || 'Unable to start the camera. Use PHOTO / GALLERY below instead.';
        setCameraError(msg);
      });

    return () => {
      cancelled = true;
    };
  }, [source, facingMode, selectedDeviceId, restartToken, stopStream, refreshDevices]);

  useEffect(() => stopStream, [stopStream]);

  // Mobile browsers kill the camera when the app is backgrounded; restart on return.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || source !== 'LIVE') return;
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track || track.readyState === 'ended') setRestartToken(t => t + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [source]);

  // Track container size for the overlay canvas.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      setContainerSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const getMediaRect = useCallback((): MediaRect => {
    const { w, h } = containerSize;
    if (still) return fitRect(still.width, still.height, w, h, 'contain');
    return fitRect(videoSize.w, videoSize.h, w, h, 'cover');
  }, [containerSize, still, videoSize]);

  // Draw the AR overlay whenever inputs change (no busy animation loop).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { w: cw, h: ch } = containerSize;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    // Center reticle
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cw / 2 - 20, ch / 2);
    ctx.lineTo(cw / 2 + 20, ch / 2);
    ctx.moveTo(cw / 2, ch / 2 - 20);
    ctx.lineTo(cw / 2, ch / 2 + 20);
    ctx.stroke();

    // Boxes only make sense on the image they were computed from: the still frame,
    // or live video during auto-watch.
    if (!still && !isAutoWatchActive) return;

    const rect = getMediaRect();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    ctx.clip();

    detections.forEach((det, index) => {
      const [ymin, xmin, ymax, xmax] = det.box_2d;
      const x = rect.x + (xmin / 1000) * rect.w;
      const y = rect.y + (ymin / 1000) * rect.h;
      const w = ((xmax - xmin) / 1000) * rect.w;
      const h = ((ymax - ymin) / 1000) * rect.h;
      const isSelected = selectedDetection === det;
      const color = TYPE_COLORS[det.type] ?? '#22d3ee';

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = isSelected ? 10 : 3;

      const c = Math.max(4, Math.min(16, w * 0.3, h * 0.3));
      ctx.beginPath();
      ctx.moveTo(x, y + c);
      ctx.lineTo(x, y);
      ctx.lineTo(x + c, y);
      ctx.moveTo(x + w - c, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + c);
      ctx.moveTo(x, y + h - c);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x + c, y + h);
      ctx.moveTo(x + w - c, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w, y + h - c);
      ctx.stroke();

      if (isSelected || det.type === 'HAZARD') {
        ctx.shadowBlur = 0;
        ctx.fillStyle = det.type === 'HAZARD' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(34, 211, 238, 0.15)';
        ctx.fillRect(x, y, w, h);
      }

      // Number tag (full labels live in the list below; long labels clutter a phone screen)
      ctx.shadowBlur = 0;
      const tag = isSelected ? `${index + 1}. ${det.label}` : `${index + 1}`;
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      const tw = Math.min(ctx.measureText(tag).width + 10, cw - 4);
      const tagH = 18;
      const tx = Math.min(Math.max(2, x), cw - tw - 2);
      const ty = y - tagH - 2 < 0 ? y + 2 : y - tagH - 2;
      ctx.fillStyle = 'rgba(5, 8, 17, 0.9)';
      ctx.fillRect(tx, ty, tw, tagH);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(tx, ty, tw, tagH);
      ctx.fillStyle = color;
      ctx.fillText(tag, tx + 5, ty + 13, tw - 10);
      ctx.restore();
    });
    ctx.restore();
  }, [detections, selectedDetection, containerSize, getMediaRect, still, isAutoWatchActive]);

  // Tap-to-inspect: map the tap back into normalized image coordinates.
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const rect = getMediaRect();
    const normX = ((e.clientX - bounds.left - rect.x) / rect.w) * 1000;
    const normY = ((e.clientY - bounds.top - rect.y) / rect.h) * 1000;

    // Prefer the smallest box containing the tap so nested parts stay selectable.
    const hits = detections
      .filter(det => {
        const [ymin, xmin, ymax, xmax] = det.box_2d;
        return normX >= xmin && normX <= xmax && normY >= ymin && normY <= ymax;
      })
      .sort((a, b) => (a.box_2d[2] - a.box_2d[0]) * (a.box_2d[3] - a.box_2d[1]) - (b.box_2d[2] - b.box_2d[0]) * (b.box_2d[3] - b.box_2d[1]));

    if (hits[0]) {
      playTacticalAudio.lockOn();
      onSelectDetection(hits[0]);
    } else {
      onSelectDetection(null);
    }
  };

  const captureLive = useCallback((): LoadedImage | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || source !== 'LIVE') return null;
    return captureVideoFrame(video);
  }, [source]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchAvailable) return;
    try {
      const next = !isTorchOn;
      await track.applyConstraints({ advanced: [{ torch: next } as any] });
      setIsTorchOn(next);
      playTacticalAudio.chirp();
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  }, [isTorchOn, torchAvailable]);

  useEffect(() => {
    liveCaptureRef.current = captureLive;
    torchToggleRef.current = toggleTorch;
  }, [captureLive, toggleTorch, liveCaptureRef, torchToggleRef]);

  const handleScanButton = () => {
    playTacticalAudio.chirp();
    if (still) {
      onScanImage({ dataUrl: still.src, width: still.width, height: still.height }, true);
      return;
    }
    const frame = captureLive();
    if (frame) onScanImage(frame, true);
    else captureInputRef.current?.click(); // no live camera: fall back to the native camera
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    try {
      const image = await fileToScaledImage(file);
      onScanImage(image, true);
    } catch (err) {
      console.warn('Could not read image:', err);
      setCameraError('Could not read that image. Try a JPEG or PNG photo.');
    }
  };

  const backToLive = () => {
    playTacticalAudio.chirp();
    onStillChange(null);
    onClearDetections();
    setSource('LIVE');
  };

  const selectDemo = (board: SampleBoard) => {
    playTacticalAudio.chirp();
    setDemoBoardId(board.id);
    const img = renderSampleBoard(board);
    onStillChange({ src: img.src, width: img.width, height: img.height, demoBoardId: board.id });
    onLoadDemoBoard(board);
  };

  const flipCamera = () => {
    playTacticalAudio.chirp();
    setSelectedDeviceId('');
    setFacingMode(f => (f === 'environment' ? 'user' : 'environment'));
    if (source !== 'LIVE' || still) backToLive();
  };

  const chip = (active: boolean) =>
    `min-h-[36px] px-2.5 rounded-lg flex items-center gap-1.5 transition-colors ${
      active ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-cyan-300'
    }`;

  return (
    <div className="relative w-full flex-1 flex flex-col bg-[#050811] rounded-2xl border border-cyan-950/80 overflow-hidden shadow-2xl">
      {/* Viewport */}
      <div
        ref={containerRef}
        className="relative w-full h-[52dvh] min-h-[300px] lg:h-auto lg:flex-1 lg:min-h-[460px] bg-black overflow-hidden"
      >
        {source === 'LIVE' && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={e => {
              const v = e.currentTarget;
              setVideoSize({ w: v.videoWidth, h: v.videoHeight });
              setIsVideoReady(true);
            }}
            onResize={e => setVideoSize({ w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })}
            className={`absolute inset-0 w-full h-full object-cover z-10 ${showingStill ? 'invisible' : ''}`}
          />
        )}

        {still && (
          <img src={still.src} alt="Analyzed frame" className="absolute inset-0 w-full h-full object-contain z-10 bg-black" />
        )}

        <canvas ref={canvasRef} onClick={handleCanvasClick} className="absolute inset-0 w-full h-full z-20 cursor-crosshair" />

        {/* Top-left: source controls */}
        <div className="absolute top-2 left-2 z-30 flex items-center gap-1 p-1 rounded-xl bg-[#050811]/85 backdrop-blur-md border border-cyan-900/40 text-xs font-mono">
          {showingStill && source === 'LIVE' ? (
            <button onClick={backToLive} className={chip(false)} title="Back to live camera">
              <Video className="w-4 h-4 text-cyan-400" />
              <span>LIVE</span>
            </button>
          ) : (
            <button onClick={() => (source === 'LIVE' ? null : backToLive())} className={chip(source === 'LIVE')} title="Live camera">
              <Camera className="w-4 h-4" />
              <span className="hidden xs:inline">LIVE</span>
            </button>
          )}

          <button onClick={flipCamera} className={chip(false)} title="Flip camera">
            <SwitchCamera className="w-4 h-4 text-cyan-400" />
          </button>

          {videoDevices.length > 1 && (
            <div className="relative">
              <button onClick={() => setShowDevicePicker(v => !v)} className={chip(false)} title="Choose camera">
                <Sliders className="w-4 h-4 text-cyan-400" />
              </button>
              {showDevicePicker && (
                <div className="absolute top-full left-0 mt-1 w-56 max-w-[70vw] rounded-xl bg-[#0b1329] border border-cyan-500/40 p-2 shadow-2xl z-40 space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold px-2 py-1 border-b border-slate-800">
                    CAMERAS ({videoDevices.length})
                  </div>
                  {videoDevices.map((d, i) => (
                    <button
                      key={d.deviceId || i}
                      onClick={() => {
                        setSelectedDeviceId(d.deviceId);
                        setShowDevicePicker(false);
                        if (source !== 'LIVE' || still) backToLive();
                      }}
                      className={`w-full text-left px-2 py-2 rounded text-[11px] truncate ${
                        selectedDeviceId === d.deviceId ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {d.label || `Camera ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => {
              setSource('DEMO');
              const board = SAMPLE_BOARDS.find(b => b.id === demoBoardId) ?? SAMPLE_BOARDS[0];
              selectDemo(board);
            }}
            className={chip(source === 'DEMO')}
            title="Offline demo boards"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden xs:inline">DEMO</span>
          </button>
        </div>

        {/* Top-right: torch + auto-watch */}
        <div className="absolute top-2 right-2 z-30 flex items-center gap-1.5">
          {source === 'LIVE' && torchAvailable && !showingStill && (
            <button
              onClick={toggleTorch}
              className={`min-h-[40px] min-w-[40px] px-2.5 rounded-xl backdrop-blur-md border font-mono text-xs flex items-center justify-center gap-1.5 ${
                isTorchOn
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                  : 'bg-[#050811]/85 text-amber-300 border-amber-500/40'
              }`}
              title="Toggle flashlight"
            >
              {isTorchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}
          {source === 'LIVE' && (
            <button
              onClick={onToggleAutoWatch}
              disabled={!isVideoReady && !isAutoWatchActive}
              className={`min-h-[40px] px-2.5 rounded-xl backdrop-blur-md border font-mono text-[11px] flex items-center gap-1.5 disabled:opacity-40 ${
                isAutoWatchActive
                  ? 'bg-rose-500 text-white font-bold border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                  : 'bg-[#050811]/85 text-cyan-300 border-cyan-500/40'
              }`}
              title="Re-scan the live camera automatically every few seconds"
            >
              <Radio className="w-4 h-4" />
              <span>{isAutoWatchActive ? `${autoWatchSecondsLeft}s` : 'AUTO'}</span>
            </button>
          )}
        </div>

        {/* Analysis progress */}
        {isAnalyzing && (
          <div className="absolute inset-0 z-[25] pointer-events-none overflow-hidden">
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#22d3ee] scan-line" />
            <div className="absolute inset-0 bg-cyan-950/20" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-max max-w-[90%] px-3 py-2 rounded-xl bg-black/90 border border-cyan-400 text-cyan-300 font-mono text-[11px] flex items-center gap-2 shadow-2xl">
              <Crosshair className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>ANALYZING… (5-20s)</span>
            </div>
          </div>
        )}

        {isAutoWatchActive && !isAnalyzing && (
          <div className="absolute top-14 right-2 z-30 px-2 py-1 rounded-lg bg-black/80 border border-rose-500/60 text-rose-300 font-mono text-[10px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>OVERWATCH LIVE</span>
          </div>
        )}

        {source === 'DEMO' && (
          <div className="absolute top-14 left-2 z-30 px-2 py-1 rounded-lg bg-amber-500/90 text-slate-950 font-mono font-bold text-[10px]">
            DEMO DATA - NOT A REAL SCAN
          </div>
        )}

        <SolderCoachOverlay coach={coach} isActiveMode={activeMode === 'SOLDER_COACH'} isFloatingOverlay />

        {cameraError && source === 'LIVE' && !showingStill && (
          <div className="absolute z-30 inset-3 top-14 flex flex-col items-center justify-center p-4 text-center rounded-xl bg-[#0b1329]/95 border border-rose-500/40 text-slate-200">
            <AlertTriangle className="w-8 h-8 text-rose-400 mb-2" />
            <h4 className="font-mono font-bold text-sm text-rose-300 uppercase">Camera unavailable</h4>
            <p className="text-xs text-slate-300 mt-1 max-w-md leading-relaxed">{cameraError}</p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => captureInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-mono font-bold text-xs uppercase"
              >
                Take photo
              </button>
              <button
                onClick={() => setRestartToken(t => t + 1)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-mono text-xs uppercase"
              >
                Retry camera
              </button>
            </div>
          </div>
        )}

        {/* Selected part quick card */}
        {selectedDetection && (
          <div className="absolute bottom-2 left-2 right-2 z-30 p-2.5 rounded-xl bg-[#050811]/95 border border-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.25)] backdrop-blur-md flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                    selectedDetection.type === 'HAZARD' ? 'bg-rose-500/20 text-rose-300' : 'bg-cyan-500/20 text-cyan-300'
                  }`}
                >
                  {selectedDetection.type.replace('_', ' ')}
                </span>
                <h4 className="text-xs font-mono font-bold text-white truncate">{selectedDetection.label}</h4>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 truncate">
                {[selectedDetection.part_number, formatPrice(selectedDetection.est_value, currency), selectedDetection.pinout_notes]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            {selectedDetection.type !== 'HAZARD' && (
              <button
                onClick={() => onLogHarvestedPart(selectedDetection)}
                className="min-h-[40px] px-3 rounded-lg bg-amber-500 text-slate-950 font-mono font-bold text-xs flex items-center gap-1 active:scale-95 shrink-0"
                title="Save to parts bin"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>LOG</span>
              </button>
            )}
            <button
              onClick={() => onSelectDetection(null)}
              className="min-h-[40px] min-w-[40px] rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Demo board presets */}
      {source === 'DEMO' && (
        <div className="bg-[#0b1329] border-t border-cyan-950/80 px-2 py-2 flex items-center gap-2 overflow-x-auto">
          {SAMPLE_BOARDS.map(board => (
            <button
              key={board.id}
              onClick={() => selectDemo(board)}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 ${
                demoBoardId === board.id
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-300 border border-slate-800'
              }`}
            >
              {board.title}
            </button>
          ))}
        </div>
      )}

      {/* Bottom action bar: thumb-reachable on phones */}
      <div className="grid grid-cols-[1fr_1.6fr_1fr] gap-2 p-2 bg-[#080e21] border-t border-cyan-950/70">
        <button
          onClick={() => captureInputRef.current?.click()}
          disabled={isAnalyzing}
          className="min-h-[52px] rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-mono text-[11px] flex flex-col items-center justify-center gap-0.5 active:scale-95 disabled:opacity-50"
          title="Take a full-resolution photo with your camera app"
        >
          <Aperture className="w-5 h-5 text-cyan-400" />
          <span>PHOTO</span>
        </button>
        <button
          onClick={handleScanButton}
          disabled={isAnalyzing || source === 'DEMO'}
          className="min-h-[52px] rounded-xl bg-cyan-500 text-slate-950 font-mono font-bold text-sm flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_14px_rgba(34,211,238,0.45)] disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'ANALYZING' : showingStill ? 'RE-SCAN' : 'SCAN'}</span>
        </button>
        <button
          onClick={() => galleryInputRef.current?.click()}
          disabled={isAnalyzing}
          className="min-h-[52px] rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-mono text-[11px] flex flex-col items-center justify-center gap-0.5 active:scale-95 disabled:opacity-50"
          title="Pick a photo from your gallery"
        >
          <ImageUp className="w-5 h-5 text-cyan-400" />
          <span>GALLERY</span>
        </button>
        <input ref={captureInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
};
