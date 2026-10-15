import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, X } from 'lucide-react';
import { isNativeApp } from '../utils/platform';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || isNativeApp()) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="min-h-[40px] min-w-[40px] flex items-center justify-center gap-1.5 px-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 text-xs font-mono font-semibold active:scale-95"
        title="Install BENCH-OS to your home screen"
      >
        <Download className="w-4 h-4" />
        <span className="hidden md:inline">INSTALL</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="min-h-[40px] min-w-[40px] flex items-center justify-center gap-1.5 px-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 text-xs font-mono font-semibold active:scale-95"
          title="Install on iPhone"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden md:inline">INSTALL</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#0b1329] border border-cyan-500/40 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-cyan-900/50">
                <h3 className="text-sm font-mono font-bold tracking-wider text-cyan-400 uppercase">
                  Install BENCH-OS on iOS
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs text-slate-300 font-sans leading-relaxed">
                <p>To lock the HUD into permanent full-screen workbench mode:</p>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-mono font-bold text-[10px]">
                      1
                    </span>
                    <span>
                      Tap the <strong className="text-white">Share</strong> button in Safari toolbar.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-mono font-bold text-[10px]">
                      2
                    </span>
                    <span>
                      Scroll down and tap <strong className="text-cyan-400">Add to Home Screen</strong>.
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Runs with hardware screen wake-lock enabled so your phone never turns off while soldering.
                </p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider hover:bg-cyan-400 transition"
              >
                Acknowledge
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
