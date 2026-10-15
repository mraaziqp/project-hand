import { SalvagedPart, BenchStats, Currency, ScanHistoryEntry } from '../types';

const STORAGE_KEY_PARTS = 'jarvis_bench_parts_bin_v1';
const STORAGE_KEY_STATS = 'jarvis_bench_stats_v1';
const STORAGE_KEY_SETTINGS = 'jarvis_bench_settings_v2';
const STORAGE_KEY_HISTORY = 'jarvis_bench_scan_history_v1';

const MAX_HISTORY = 25;

export interface UserSettings {
  jarvisCoreApiUrl: string;
  secondBrainAuthToken: string;
  nasWebhookUrl: string;
  externalCameraStreamUrl: string;
  ipCameraUrl: string; // legacy alias
  voiceSpeed: number;
  autoSpeak: boolean;
  handsFreeWake: boolean;
  autoWatchIntervalSeconds: number;
  currency: Currency;
  accessKey: string;
  /** Override for the server URL (mainly for the Android app). Blank = built-in default. */
  apiBaseUrl: string;
}

// Earlier builds seeded the bin with example parts and inflated stats. Those are
// stripped on load so the AI's build advice is based only on real inventory.
const LEGACY_SEED_PART_IDS = new Set(['part-01', 'part-02', 'part-03', 'part-04', 'part-05']);
const LEGACY_SEED_STATS = JSON.stringify({ cravingsDefeated: 7, nicotineFreeHours: 36, partsHarvested: 24, circuitsBuilt: 3, budgetSaved: 48 });

const DEFAULT_STATS: BenchStats = {
  cravingsDefeated: 0,
  nicotineFreeHours: 0,
  partsHarvested: 0,
  circuitsBuilt: 0,
  budgetSaved: 0,
};

const DEFAULT_SETTINGS: UserSettings = {
  jarvisCoreApiUrl: '',
  secondBrainAuthToken: '',
  nasWebhookUrl: '',
  externalCameraStreamUrl: '',
  ipCameraUrl: '',
  voiceSpeed: 1.08,
  autoSpeak: true,
  handsFreeWake: false,
  autoWatchIntervalSeconds: 8,
  currency: 'USD',
  accessKey: '',
  apiBaseUrl: '',
};

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getStoredParts(): SalvagedPart[] {
  const parts = readJSON<SalvagedPart[]>(STORAGE_KEY_PARTS);
  if (!Array.isArray(parts)) return [];
  return parts.filter(p => p && typeof p.name === 'string' && !LEGACY_SEED_PART_IDS.has(p.id));
}

export function saveStoredParts(parts: SalvagedPart[]) {
  writeJSON(STORAGE_KEY_PARTS, parts);
}

export function addStoredPart(part: Omit<SalvagedPart, 'id' | 'dateHarvested'>): SalvagedPart {
  const newPart: SalvagedPart = {
    ...part,
    id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    dateHarvested: new Date().toISOString().split('T')[0],
  };
  saveStoredParts([newPart, ...getStoredParts()]);

  const stats = getStoredStats();
  stats.partsHarvested += 1;
  stats.budgetSaved = Math.round((stats.budgetSaved + (part.estValue ?? 0)) * 100) / 100;
  saveStoredStats(stats);

  return newPart;
}

export function deleteStoredPart(id: string) {
  saveStoredParts(getStoredParts().filter(p => p.id !== id));
}

export function togglePartTested(id: string) {
  saveStoredParts(getStoredParts().map(p => (p.id === id ? { ...p, testedWorking: !p.testedWorking } : p)));
}

export function getStoredStats(): BenchStats {
  const stats = readJSON<BenchStats>(STORAGE_KEY_STATS);
  if (!stats || JSON.stringify(stats) === LEGACY_SEED_STATS) return { ...DEFAULT_STATS };
  return { ...DEFAULT_STATS, ...stats };
}

export function saveStoredStats(stats: BenchStats) {
  writeJSON(STORAGE_KEY_STATS, stats);
}

export function incrementCravingDefeated() {
  const stats = getStoredStats();
  stats.cravingsDefeated += 1;
  saveStoredStats(stats);
  return stats;
}

const LEGACY_DEFAULT_URLS = new Set([
  'http://192.168.1.100:8000/api/v1/jarvis',
  'http://192.168.1.150:8080/jarvis-webhook',
]);

export function getStoredSettings(): UserSettings {
  const stored =
    readJSON<Partial<UserSettings>>(STORAGE_KEY_SETTINGS) || readJSON<Partial<UserSettings>>('jarvis_bench_settings_v1') || {};
  const merged = { ...DEFAULT_SETTINGS, ...stored };
  // Older builds pre-filled placeholder LAN addresses that don't exist on most networks.
  if (LEGACY_DEFAULT_URLS.has(merged.jarvisCoreApiUrl)) merged.jarvisCoreApiUrl = '';
  if (LEGACY_DEFAULT_URLS.has(merged.nasWebhookUrl)) merged.nasWebhookUrl = '';
  return merged;
}

export function saveStoredSettings(settings: UserSettings) {
  writeJSON(STORAGE_KEY_SETTINGS, settings);
}

export function getVoiceMuted(): boolean {
  return readJSON<boolean>('jarvis_bench_voice_muted') === true;
}

export function saveVoiceMuted(muted: boolean) {
  writeJSON('jarvis_bench_voice_muted', muted);
}

export function getScanHistory(): ScanHistoryEntry[] {
  const history = readJSON<ScanHistoryEntry[]>(STORAGE_KEY_HISTORY);
  return Array.isArray(history) ? history : [];
}

export function addScanHistory(entry: ScanHistoryEntry): ScanHistoryEntry[] {
  let history = [entry, ...getScanHistory()].slice(0, MAX_HISTORY);
  // localStorage is ~5MB; drop the oldest scans until it fits.
  while (history.length > 0 && !writeJSON(STORAGE_KEY_HISTORY, history)) {
    history = history.slice(0, -1);
  }
  return history;
}

export function deleteScanHistory(id: string): ScanHistoryEntry[] {
  const history = getScanHistory().filter(h => h.id !== id);
  writeJSON(STORAGE_KEY_HISTORY, history);
  return history;
}

export function clearScanHistory() {
  writeJSON(STORAGE_KEY_HISTORY, []);
}
