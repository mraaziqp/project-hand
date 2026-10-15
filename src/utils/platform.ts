/** True when running inside the Capacitor Android/iOS shell rather than a browser. */
export function isNativeApp(): boolean {
  return !!(window as any).Capacitor?.isNativePlatform?.();
}
