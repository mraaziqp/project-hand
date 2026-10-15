import { SalvagedPart, BenchStats } from '../types';

const STORAGE_KEY_PARTS = 'jarvis_bench_parts_bin_v1';
const STORAGE_KEY_STATS = 'jarvis_bench_stats_v1';
const STORAGE_KEY_SETTINGS = 'jarvis_bench_settings_v2';

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
}

const DEFAULT_PARTS: SalvagedPart[] = [
  {
    id: 'part-01',
    name: '470uF 25V Electrolytic Cap',
    category: 'Capacitor',
    dateHarvested: '2026-10-14',
    testedWorking: true,
    pinout: 'White stripe = Cathode (-), Long leg = Anode (+)',
    reuseIdeas: 'Smooth ripple on 5V/12V NAS fan rail or Arduino power header',
    sourceBoard: 'Dead Netgear Wi-Fi Router',
  },
  {
    id: 'part-02',
    name: 'Piezo Buzzer 5V Active',
    category: 'Buzzer',
    dateHarvested: '2026-10-14',
    testedWorking: true,
    pinout: '+ on top marking, negative ground pin',
    reuseIdeas: 'NAS drive failure acoustic alarm or camera tally beep',
    sourceBoard: 'Old Microwave Control Panel',
  },
  {
    id: 'part-03',
    name: 'IRFZ44N N-Channel Power MOSFET',
    category: 'MOSFET',
    dateHarvested: '2026-10-15',
    testedWorking: true,
    pinout: 'Pin 1: Gate, Pin 2: Drain (Tab), Pin 3: Source',
    reuseIdeas: 'PWM Governor for 12V high-RPM cooling fan or workbench LED strip',
    sourceBoard: 'Dead ATX PC Power Supply',
  },
  {
    id: 'part-04',
    name: '5mm High-Intensity Emerald LED',
    category: 'LED',
    dateHarvested: '2026-10-15',
    testedWorking: true,
    pinout: 'Flat notch on rim = Cathode (-), Long leg = Anode (+)',
    reuseIdeas: 'Workbench visual continuity checker or NAS sync status beacon',
    sourceBoard: 'Scrap DVD Player',
  },
  {
    id: 'part-05',
    name: 'Tactile Momentary Push Button',
    category: 'Switch',
    dateHarvested: '2026-10-15',
    testedWorking: true,
    pinout: 'Diagonal pin pairs are internally bridged',
    reuseIdeas: 'Hardware reboot switch or manual trigger for camera capture',
    sourceBoard: 'Dead Netgear Wi-Fi Router',
  },
];

const DEFAULT_STATS: BenchStats = {
  cravingsDefeated: 7,
  nicotineFreeHours: 36,
  partsHarvested: 24,
  circuitsBuilt: 3,
  budgetSaved: 48,
};

const DEFAULT_SETTINGS: UserSettings = {
  jarvisCoreApiUrl: 'http://192.168.1.100:8000/api/v1/jarvis',
  secondBrainAuthToken: '',
  nasWebhookUrl: 'http://192.168.1.150:8080/jarvis-webhook',
  externalCameraStreamUrl: '',
  ipCameraUrl: '',
  voiceSpeed: 1.08,
  autoSpeak: true,
  handsFreeWake: false,
  autoWatchIntervalSeconds: 8,
};

export function getStoredParts(): SalvagedPart[] {
  if (typeof window === 'undefined') return DEFAULT_PARTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PARTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PARTS, JSON.stringify(DEFAULT_PARTS));
      return DEFAULT_PARTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PARTS;
  }
}

export function saveStoredParts(parts: SalvagedPart[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PARTS, JSON.stringify(parts));
  } catch {}
}

export function addStoredPart(part: Omit<SalvagedPart, 'id' | 'dateHarvested'>): SalvagedPart {
  const parts = getStoredParts();
  const newPart: SalvagedPart = {
    ...part,
    id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    dateHarvested: new Date().toISOString().split('T')[0],
  };
  const updated = [newPart, ...parts];
  saveStoredParts(updated);

  const stats = getStoredStats();
  stats.partsHarvested += 1;
  stats.budgetSaved += 2.5;
  saveStoredStats(stats);

  return newPart;
}

export function deleteStoredPart(id: string) {
  const parts = getStoredParts().filter(p => p.id !== id);
  saveStoredParts(parts);
}

export function togglePartTested(id: string) {
  const parts = getStoredParts().map(p => (p.id === id ? { ...p, testedWorking: !p.testedWorking } : p));
  saveStoredParts(parts);
}

export function getStoredStats(): BenchStats {
  if (typeof window === 'undefined') return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(DEFAULT_STATS));
      return DEFAULT_STATS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_STATS;
  }
}

export function saveStoredStats(stats: BenchStats) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
  } catch {}
}

export function incrementCravingDefeated() {
  const stats = getStoredStats();
  stats.cravingsDefeated += 1;
  stats.nicotineFreeHours += 1;
  saveStoredStats(stats);
  return stats;
}

export function getStoredSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) {
      // Check legacy key
      const legacy = localStorage.getItem('jarvis_bench_settings_v1');
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          return { ...DEFAULT_SETTINGS, ...parsed };
        } catch {}
      }
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: UserSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch {}
}
