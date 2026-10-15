// Screen Wake Lock API controller so workbench smartphone screen stays on while holding hot iron

let wakeLockSentinel: any = null;

export async function requestScreenWakeLock(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
    console.info('Screen Wake Lock API not supported on this browser/platform.');
    return false;
  }

  try {
    wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
    });
    return true;
  } catch (err) {
    console.warn('Wake Lock request rejected:', err);
    return false;
  }
}

export function releaseScreenWakeLock() {
  if (wakeLockSentinel) {
    try {
      wakeLockSentinel.release();
    } catch {}
    wakeLockSentinel = null;
  }
}

export function isWakeLockActive(): boolean {
  return wakeLockSentinel !== null && !wakeLockSentinel.released;
}
