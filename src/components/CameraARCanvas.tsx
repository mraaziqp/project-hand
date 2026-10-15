import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  Upload,
  Radio,
  Eye,
  Sliders,
} from 'lucide-react';
import { CameraSourceType, DetectionItem, SampleBoard } from '../types';
import { SAMPLE_BOARDS } from '../utils/sampleBoards';
import { playTacticalAudio } from '../utils/audio';
import { SolderCoachOverlay } from './SolderCoachOverlay';

interface CameraARCanvasProps {
  detections: DetectionItem[];
  selectedDetection: DetectionItem | null;
  onSelectDetection: (item: DetectionItem | null) => void;
  onCaptureFrame: (base64Image: string) => void;
  onClearDetections: () => void;
  isAnalyzing: boolean;
  activeMode: string;
  onLogHarvestedPart: (item: DetectionItem) => void;
  isAutoWatchActive: boolean;
  onToggleAutoWatch: () => void;
  autoWatchSecondsLeft: number;
}

export const CameraARCanvas: React.FC<CameraARCanvasProps> = ({
  detections,
  selectedDetection,
  onSelectDetection,
  onCaptureFrame,
  onClearDetections,
  isAnalyzing,
  activeMode,
  onLogHarvestedPart,
  isAutoWatchActive,
  onToggleAutoWatch,
  autoWatchSecondsLeft,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sourceType, setSourceType] = useState<CameraSourceType>('REAR_CAM');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Device Enumeration & Multi-Camera Switcher
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [showDevicePicker, setShowDevicePicker] = useState(false);

  // Sample Boards & Uploaded Image
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [selectedSampleBoard, setSelectedSampleBoard] = useState<SampleBoard | null>(SAMPLE_BOARDS[0]);

  // Enumerate video devices
  const refreshDevices = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      }
    } catch (e) {
      console.warn('Failed to enumerate devices:', e);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // Start hardware camera stream
  const startCamera = useCallback(
    async (deviceId?: string, facing: 'environment' | 'user' = 'environment') => {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }

      // CRITICAL ZERO-MOCK AUDIT RULE:
      // When live camera is active, immediately purge any mock bounding boxes!
      onClearDetections();

      try {
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : {
                facingMode: { ideal: facing },
                width: { ideal: 1920, min: 1280 },
                height: { ideal: 1080, min: 720 },
              },
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play().catch(() => {});
        }

        // Check for torch capability
        const track = newStream.getVideoTracks()[0];
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        setTorchAvailable(!!capabilities.torch);
        setIsTorchOn(false);

        await refreshDevices();
      } catch (err: any) {
        console.warn('Camera access issue:', err);
        setCameraError(err.message || 'Unable to access hardware camera. Check permissions or select a sample board.');
        setSourceType('SAMPLE_PHOTO');
      }
    },
    [stream, onClearDetections, refreshDevices]
  );

  // Handle source changes
  useEffect(() => {
    if (sourceType === 'REAR_CAM') {
      setFacingMode('environment');
      startCamera(selectedDeviceId || undefined, 'environment');
    } else if (sourceType === 'FRONT_CAM') {
      setFacingMode('user');
      startCamera(selectedDeviceId || undefined, 'user');
    } else {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [sourceType, selectedDeviceId]);

  // Flip camera between Rear (Environment) and Front (User)
  const flipCamera = () => {
    playTacticalAudio.chirp();
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setSourceType(nextFacing === 'environment' ? 'REAR_CAM' : 'FRONT_CAM');
    setSelectedDeviceId(''); // let constraints pick best for facing mode
    startCamera(undefined, nextFacing);
  };

  // Torch toggle
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !isTorchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextState } as any],
      });
      setIsTorchOn(nextState);
      playTacticalAudio.chirp();
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // Render Synthetic Sample Boards on Canvas when in TEST BOARDS mode
  useEffect(() => {
    if (sourceType !== 'SAMPLE_PHOTO' || !selectedSampleBoard) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1000;
    canvas.height = 750;

    // Dark solder-mask green
    ctx.fillStyle = '#0a2318';
    ctx.fillRect(0, 0, 1000, 750);

    // Copper ground plane hatching
    ctx.strokeStyle = '#123d2b';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 1000; i += 24) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 750);
      ctx.stroke();
    }
    for (let j = 0; j < 750; j += 24) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(1000, j);
      ctx.stroke();
    }

    // Gold / Copper traces
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(120, 150);
    ctx.lineTo(350, 150);
    ctx.lineTo(350, 300);
    ctx.lineTo(600, 300);
    ctx.lineTo(750, 480);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(150, 450);
    ctx.lineTo(300, 450);
    ctx.lineTo(400, 600);
    ctx.stroke();

    // Silkscreen markings & title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillText(selectedSampleBoard.title.toUpperCase(), 40, 50);
    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.fillStyle = '#22d3ee';
    ctx.fillText(`BENCH-OS CALIBRATION BOARD // ${selectedSampleBoard.difficulty}`, 40, 76);

    // Silkscreen pin notes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillText('VCC_IN: 5.0V', 40, 120);
    ctx.fillText('GND_RAIL', 40, 140);

    // Draw visual component shapes
    selectedSampleBoard.mockAnalysis.detections.forEach(det => {
      const [ymin, xmin, ymax, xmax] = det.box_2d;
      const x = (xmin / 1000) * 1000;
      const y = (ymin / 1000) * 750;
      const w = ((xmax - xmin) / 1000) * 1000;
      const h = ((ymax - ymin) / 1000) * 750;

      if (det.type === 'HAZARD') {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 16px "JetBrains Mono", monospace';
        ctx.fillText('⚠ LITHIUM HAZARD', x + 10, y + 26);
      } else if (det.label.includes('Capacitor')) {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2.2, h / 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + w * 0.15, y + h * 0.2, w * 0.15, h * 0.6);
        ctx.fillStyle = '#050811';
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.fillText('-', x + w * 0.18, y + h * 0.55);
      } else if (det.label.includes('Regulator') || det.type === 'SMD') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(x + w * 0.2, y - 6, w * 0.6, 6);
      } else if (det.label.includes('Button') || det.label.includes('Switch')) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.25, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#334155';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
      }
    });
  }, [sourceType, selectedSampleBoard]);

  // Continuous AR Canvas Drawing Loop
  useEffect(() => {
    let animId: number;

    const renderAROverlay = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const container = containerRef.current;
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      if (sourceType !== 'SAMPLE_PHOTO') {
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        ctx.clearRect(0, 0, width, height);
      }

      const scaleX = canvas.width;
      const scaleY = canvas.height;

      // Draw subtle crosshair reticle in center
      const centerX = width / 2;
      const centerY = height / 2;
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - 24, centerY);
      ctx.lineTo(centerX + 24, centerY);
      ctx.moveTo(centerX, centerY - 24);
      ctx.lineTo(centerX, centerY + 24);
      ctx.stroke();

      // Draw detected components
      detections.forEach((det, index) => {
        const [ymin, xmin, ymax, xmax] = det.box_2d;
        const x = (xmin / 1000) * scaleX;
        const y = (ymin / 1000) * scaleY;
        const w = ((xmax - xmin) / 1000) * scaleX;
        const h = ((ymax - ymin) / 1000) * scaleY;

        const isSelected = selectedDetection?.label === det.label;
        const isHazard = det.type === 'HAZARD';
        const isJointCoach = activeMode === 'SOLDER_COACH';

        let color = '#22d3ee';
        if (isHazard) color = '#f43f5e';
        else if (det.type === 'THROUGH_HOLE' || (isJointCoach && det.label.includes('Good'))) color = '#34d399';
        else if (det.type === 'SMD' || det.type === 'CONNECTOR') color = '#fbbf24';

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = isSelected ? 12 : 4;

        const cornerSize = Math.min(16, w * 0.3, h * 0.3);
        ctx.beginPath();
        ctx.moveTo(x, y + cornerSize);
        ctx.lineTo(x, y);
        ctx.lineTo(x + cornerSize, y);
        ctx.moveTo(x + w - cornerSize, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + cornerSize);
        ctx.moveTo(x, y + h - cornerSize);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x + cornerSize, y + h);
        ctx.moveTo(x + w - cornerSize, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w, y + h - cornerSize);
        ctx.stroke();

        if (isSelected || isHazard) {
          ctx.fillStyle = isHazard ? 'rgba(244, 63, 94, 0.12)' : 'rgba(34, 211, 238, 0.1)';
          ctx.fillRect(x, y, w, h);
        }

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(5, 8, 17, 0.9)';
        const tagText = `${index + 1}. ${det.label}`;
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        const textWidth = ctx.measureText(tagText).width;
        const tagHeight = 22;

        const tagY = Math.max(0, y - tagHeight - 2);
        ctx.fillRect(x, tagY, textWidth + 14, tagHeight);

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, tagY, textWidth + 14, tagHeight);

        ctx.fillStyle = color;
        ctx.fillText(tagText, x + 6, tagY + 15);

        ctx.restore();
      });

      animId = requestAnimationFrame(renderAROverlay);
    };

    animId = requestAnimationFrame(renderAROverlay);
    return () => cancelAnimationFrame(animId);
  }, [detections, selectedDetection, sourceType, activeMode]);

  // Tap-to-Inspect: click coordinate math
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const normX = (clickX / rect.width) * 1000;
    const normY = (clickY / rect.height) * 1000;

    const clicked = detections.find(det => {
      const [ymin, xmin, ymax, xmax] = det.box_2d;
      return normX >= xmin && normX <= xmax && normY >= ymin && normY <= ymax;
    });

    if (clicked) {
      playTacticalAudio.lockOn();
      onSelectDetection(clicked);
    } else {
      onSelectDetection(null);
    }
  };

  // Capture current frame for Gemini analysis
  const captureCurrentFrame = () => {
    playTacticalAudio.chirp();

    if (sourceType === 'SAMPLE_PHOTO') {
      const canvas = canvasRef.current;
      if (canvas) {
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        onCaptureFrame(base64);
      }
      return;
    }

    if (uploadedImageSrc) {
      onCaptureFrame(uploadedImageSrc);
      return;
    }

    // Video frame capture
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      console.warn('Video not ready for frame capture');
      return;
    }

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = video.videoWidth || 1280;
    offscreenCanvas.height = video.videoHeight || 720;
    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
    const base64 = offscreenCanvas.toDataURL('image/jpeg', 0.85);
    onCaptureFrame(base64);
  };

  // Handle uploaded macro image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      setUploadedImageSrc(result);
      setSourceType('SAMPLE_PHOTO');
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        onCaptureFrame(result);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative w-full flex-1 min-h-[380px] sm:min-h-[460px] flex flex-col bg-[#050811] rounded-2xl border border-cyan-950/80 overflow-hidden shadow-2xl">
      {/* Top Optics Controls Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2 pointer-events-auto flex-wrap">
        {/* Source Selector Dropdown Chips */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#050811]/90 backdrop-blur-md border border-cyan-900/40 text-xs font-mono">
          <button
            onClick={() => {
              setSourceType('REAR_CAM');
              onClearDetections();
            }}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              sourceType === 'REAR_CAM' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-cyan-300'
            }`}
            title="Use Workbench Camera (Rear Environment)"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">BENCH CAM</span>
          </button>

          {/* Quick Flip Cam Button */}
          <button
            onClick={flipCamera}
            className="px-2 py-1.5 rounded-lg text-slate-300 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            title="Flip Camera (Rear / Front / Microscope)"
          >
            <SwitchCamera className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">FLIP</span>
          </button>

          {/* Device Selector Trigger */}
          {videoDevices.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowDevicePicker(!showDevicePicker)}
                className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-white flex items-center gap-1"
                title="Select Video Hardware Device"
              >
                <Sliders className="w-3 h-3 text-cyan-400" />
              </button>

              {showDevicePicker && (
                <div className="absolute top-full left-0 mt-1 w-56 rounded-xl bg-[#0b1329] border border-cyan-500/40 p-2 shadow-2xl z-40 space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold px-2 py-1 border-b border-slate-800">
                    SELECT VIDEO INPUT ({videoDevices.length})
                  </div>
                  {videoDevices.map((d, i) => (
                    <button
                      key={d.deviceId || i}
                      onClick={() => {
                        setSelectedDeviceId(d.deviceId);
                        setShowDevicePicker(false);
                        startCamera(d.deviceId);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded text-[11px] truncate ${
                        selectedDeviceId === d.deviceId
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'text-slate-300 hover:bg-slate-800'
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
              setSourceType('SAMPLE_PHOTO');
              if (selectedSampleBoard) {
                // In test boards mode, demo data is expected
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              sourceType === 'SAMPLE_PHOTO' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-cyan-300'
            }`}
            title="Use Built-in Benchmark Test Boards"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">TEST BOARDS</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1.5 rounded-lg text-slate-300 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            title="Upload Macro PCB Photo"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden md:inline">UPLOAD</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Action Controls: Torch + AUTO-WATCH + SCAN FRAME */}
        <div className="flex items-center gap-2">
          {/* Torch & Flashlight Toggle */}
          {sourceType === 'REAR_CAM' && (
            <button
              onClick={toggleTorch}
              className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl backdrop-blur-md border font-mono text-xs flex items-center gap-1.5 transition-all ${
                isTorchOn
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                  : 'bg-[#050811]/80 text-amber-300 border-amber-500/40 hover:bg-amber-950/40'
              }`}
              title={torchAvailable ? 'Toggle Torch Light' : 'Screen Light Assist'}
            >
              {isTorchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
              <span className="hidden xs:inline">TORCH</span>
            </button>
          )}

          {/* Hands-Free AUTO-WATCH (8s) Toggle */}
          <button
            onClick={onToggleAutoWatch}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl backdrop-blur-md border font-mono text-xs flex items-center gap-1.5 transition-all ${
              isAutoWatchActive
                ? 'bg-rose-500 text-white font-bold border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse'
                : 'bg-[#050811]/90 text-cyan-300 border-cyan-500/40 hover:bg-cyan-950/40'
            }`}
            title="Continuous bench overwatch every 8s while hands are full"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isAutoWatchActive ? `WATCH (${autoWatchSecondsLeft}s)` : 'AUTO-WATCH (8s)'}</span>
          </button>

          {/* Quick Frame Scan Button */}
          <button
            onClick={captureCurrentFrame}
            disabled={isAnalyzing}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 hover:bg-cyan-400 active:scale-95 transition-all shadow-[0_0_12px_rgba(34,211,238,0.4)] disabled:opacity-50"
            title="Analyze Current Board Frame with Gemini Vision"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'REASONING...' : 'SCAN FRAME'}</span>
          </button>
        </div>
      </div>

      {/* Camera Viewport & AR Layer Container */}
      <div
        ref={containerRef}
        className="relative w-full flex-1 min-h-[340px] flex items-center justify-center bg-black overflow-hidden"
      >
        {/* Live Video Element */}
        {sourceType !== 'SAMPLE_PHOTO' && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover z-10"
          />
        )}

        {/* AR Canvas Overlay Layer */}
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={`absolute inset-0 w-full h-full cursor-crosshair z-20 ${
            sourceType === 'SAMPLE_PHOTO' ? 'object-contain' : ''
          }`}
        />

        {/* Scanline Sweep Animation during Analysis */}
        {isAnalyzing && (
          <div className="absolute inset-0 z-25 pointer-events-none overflow-hidden">
            <div className="w-full h-2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#22d3ee] animate-[bounce_2s_infinite]" />
            <div className="absolute inset-0 bg-cyan-950/20 backdrop-blur-[1px]" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-black/90 border border-cyan-400 text-cyan-300 font-mono text-xs flex items-center gap-2 shadow-2xl">
              <Crosshair className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>JARVIS OPTICAL REASONING IN PROGRESS...</span>
            </div>
          </div>
        )}

        {/* Auto-Watch Active Indicator Badge */}
        {isAutoWatchActive && !isAnalyzing && (
          <div className="absolute top-16 left-3 z-30 px-2.5 py-1 rounded-lg bg-black/80 border border-rose-500/60 text-rose-300 font-mono text-[10px] flex items-center gap-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>BENCH OVERWATCH LIVE // RE-SCAN IN {autoWatchSecondsLeft}s</span>
          </div>
        )}

        {/* Floating 3-Second Rule & Walk-and-Rock Visual Countdown HUD Overlay */}
        <SolderCoachOverlay isActiveMode={activeMode === 'SOLDER_COACH'} isFloatingOverlay={true} />

        {/* Camera Permission / Error Fallback Notice */}
        {cameraError && sourceType !== 'SAMPLE_PHOTO' && (
          <div className="absolute z-30 inset-4 flex flex-col items-center justify-center p-6 text-center rounded-xl bg-[#0b1329]/95 border border-rose-500/40 text-slate-200">
            <AlertTriangle className="w-8 h-8 text-rose-400 mb-2" />
            <h4 className="font-mono font-bold text-sm text-rose-300 uppercase">Camera Hardware Notice</h4>
            <p className="text-xs text-slate-300 mt-1 max-w-md leading-relaxed">{cameraError}</p>
            <button
              onClick={() => setSourceType('SAMPLE_PHOTO')}
              className="mt-4 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider hover:bg-cyan-400 transition"
            >
              Switch to Bench Practice Boards
            </button>
          </div>
        )}
      </div>

      {/* Bottom Preset Switcher (When in TEST BOARDS mode) */}
      {sourceType === 'SAMPLE_PHOTO' && (
        <div className="bg-[#0b1329] border-t border-cyan-950/80 px-3 py-2 flex items-center gap-2 overflow-x-auto z-30">
          <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0">BENCH PRESETS:</span>
          {SAMPLE_BOARDS.map(board => (
            <button
              key={board.id}
              onClick={() => {
                setSelectedSampleBoard(board);
                playTacticalAudio.chirp();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 transition-colors ${
                selectedSampleBoard?.id === board.id
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-300 hover:text-cyan-300 border border-slate-800'
              }`}
            >
              {board.title}
            </button>
          ))}
        </div>
      )}

      {/* Selected Component Quick Inspection Pill (Tap-to-Inspect result) */}
      {selectedDetection && (
        <div className="absolute bottom-3 left-3 right-3 z-30 p-3 rounded-xl bg-[#050811]/95 border border-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.25)] backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  selectedDetection.type === 'HAZARD'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}
              >
                {selectedDetection.type}
              </span>
              <h4 className="text-xs sm:text-sm font-mono font-bold text-white truncate">
                {selectedDetection.label}
              </h4>
            </div>
            <p className="text-[11px] text-slate-300 font-sans mt-0.5 truncate">
              <strong>Pinout:</strong> {selectedDetection.pinout_notes}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onLogHarvestedPart(selectedDetection)}
              className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 active:scale-95 transition"
              title="Save to Salvaged Parts Bin"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>+ LOG HARVESTED</span>
            </button>
            <button
              onClick={() => onSelectDetection(null)}
              className="px-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
