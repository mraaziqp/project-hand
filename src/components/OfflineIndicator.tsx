import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-[calc(env(safe-area-inset-top)+3.75rem)] left-3 right-3 z-50 flex items-center justify-center gap-2 rounded-lg bg-amber-500/90 backdrop-blur-md px-3 py-2 text-xs font-semibold text-slate-950 shadow-lg border border-amber-400">
      <WifiOff className="w-4 h-4 text-slate-950 animate-pulse" />
      <span>Offline - scanning needs internet. Parts bin, history and demo boards still work.</span>
    </div>
  );
};
