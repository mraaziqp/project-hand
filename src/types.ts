export type OperatingMode =
  | 'HARVEST'
  | 'SOLDER_COACH'
  | 'BUILD_ADVISOR'
  | 'CRAVING_OVERRIDE'
  | 'DEVICE_DOCTOR';

export type ComponentType = 'THROUGH_HOLE' | 'SMD' | 'CONNECTOR' | 'IC_CHIP' | 'MODULE' | 'MECHANICAL' | 'HAZARD';

export type HarvestWorth = 'HIGH' | 'MEDIUM' | 'LOW' | 'SKIP';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'ZAR' | 'INR' | 'AUD' | 'CAD';

export interface DetectionItem {
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
  label: string;
  type: ComponentType;
  part_number?: string;
  harvest_worth?: HarvestWorth;
  est_value?: number;
  buy_search_query?: string;
  desolder_technique: string;
  pinout_notes: string;
  reuse_ideas: string;
}

export interface ShoppingItem {
  item: string;
  purpose: string;
  est_price?: number;
  search_query: string;
  priority?: 'MUST' | 'NICE';
}

export interface CircuitFirmware {
  title: string;
  description: string;
  arduinoCode: string;
  pythonNasCode: string;
  nodeNasCode: string;
  pinoutTable: {
    partPin: string;
    targetConnection: string;
    notes: string;
  }[];
  continuityTestGuide: string[];
}

export interface AnalysisResult {
  object_identified?: string;
  spoken_telemetry: string;
  answer?: string;
  step_by_step_guide: string[];
  safety_hazard_detected: boolean;
  safety_warning?: string;
  salvage_value_total?: number;
  detections: DetectionItem[];
  shopping_list?: ShoppingItem[];
  schematic_ascii?: string;
  challenge_task?: string;
  model?: string;
  /** Set on locally generated demo results so the UI can label them. */
  isDemo?: boolean;
}

export interface SalvagedPart {
  id: string;
  name: string;
  category: 'Capacitor' | 'Header' | 'Switch' | 'LED' | 'IC' | 'MOSFET' | 'Buzzer' | 'Inductor' | 'Connector' | 'Motor' | 'Module' | 'Other';
  dateHarvested: string;
  testedWorking: boolean;
  partNumber?: string;
  estValue?: number;
  pinout?: string;
  reuseIdeas?: string;
  sourceBoard?: string;
}

export interface BenchStats {
  cravingsDefeated: number;
  nicotineFreeHours: number;
  partsHarvested: number;
  circuitsBuilt: number;
  budgetSaved: number;
}

export interface SampleBoard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'High-Density';
  mockAnalysis: AnalysisResult;
}

export interface DeviceDoctorStep {
  id: string;
  title: string;
  instruction: string;
  caution: string;
  tool: string;
}

export interface EcosystemStatus {
  connected: boolean;
  latencyMs: number | null;
  lastPing: string | null;
  message?: string;
}

export interface ScanHistoryEntry {
  id: string;
  timestamp: string;
  mode: OperatingMode;
  question?: string;
  thumbnail: string; // small JPEG data URL
  analysis: AnalysisResult;
}

/** A still image currently shown in the viewport (captured, uploaded or demo). */
export interface StillFrame {
  src: string; // data URL
  width: number;
  height: number;
  demoBoardId?: string;
}
