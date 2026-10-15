// Keeps the phone screen on while working at the bench.
import { KeepAwake } from '@capacitor-community/keep-awake';
import { isNativeApp } from './platform';

let wakeLockSentinel: WakeLockSentinel | null = null;

export async function requestScreenWakeLock(): Promise<boolean> {
  if (isNativeApp()) {
    try {
      await KeepAwake.keepAwake();
      return true;
    } catch {
      return false;
    }
  }

  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return false;
  if (wakeLockSentinel && !wakeLockSentinel.released) return true;

  try {
    wakeLockSentinel = await navigator.wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
    });
    return true;
  } catch (err) {
    console.info('Wake Lock request rejected:', err);
    return false;
  }
}

export function releaseScreenWakeLock() {
  if (isNativeApp()) {
    KeepAwake.allowSleep().catch(() => {});
    return;
  }
  wakeLockSentinel?.release().catch(() => {});
  wakeLockSentinel = null;
}
