export type OperatingMode =
  | 'HARVEST'
  | 'SOLDER_COACH'
  | 'BUILD_ADVISOR'
  | 'CRAVING_OVERRIDE'
  | 'DEVICE_DOCTOR';

export type ComponentType = 'THROUGH_HOLE' | 'SMD' | 'CONNECTOR' | 'IC_CHIP' | 'HAZARD';

export interface DetectionItem {
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
  label: string;
  type: ComponentType;
  desolder_technique: string;
  pinout_notes: string;
  reuse_ideas: string;
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
  spoken_telemetry: string;
  step_by_step_guide: string[];
  safety_hazard_detected: boolean;
  safety_warning?: string;
  detections: DetectionItem[];
  schematic_ascii?: string;
  challenge_task?: string;
  firmware_suite?: CircuitFirmware;
}

export interface SalvagedPart {
  id: string;
  name: string;
  category: 'Capacitor' | 'Header' | 'Switch' | 'LED' | 'IC' | 'MOSFET' | 'Buzzer' | 'Inductor' | 'Connector' | 'Other';
  dateHarvested: string;
  testedWorking: boolean;
  pinout?: string;
  reuseIdeas?: string;
  sourceBoard?: string;
}

export interface BenchStats {
  cravingsDefeated: number;
  nicotineFreeHours: number;
  partsHarvested: number;
  circuitsBuilt: number;
  budgetSaved: number; // in USD
}

export type CameraSourceType = 'REAR_CAM' | 'FRONT_CAM' | 'EXTERNAL_IP' | 'SAMPLE_PHOTO';

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
  box_2d?: [number, number, number, number];
}

export interface EcosystemStatus {
  connected: boolean;
  latencyMs: number | null;
  lastPing: string | null;
  message?: string;
}
