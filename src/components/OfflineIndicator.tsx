import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-14 left-4 right-4 z-50 flex items-center justify-center gap-2 rounded-lg bg-amber-500/90 backdrop-blur-md px-3 py-2 text-xs font-semibold text-slate-950 shadow-lg border border-amber-400">
      <WifiOff className="w-4 h-4 text-slate-950 animate-pulse" />
      <span>Workbench Offline - Autonomous Local Cache & Practice Boards Enabled</span>
    </div>
  );
};
