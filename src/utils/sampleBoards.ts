import { SampleBoard } from '../types';

const demoCache = new Map<string, string>();

/** Draw a synthetic calibration board for the offline demo presets. */
export function renderSampleBoard(board: SampleBoard): { src: string; width: number; height: number } {
  const width = 1000;
  const height = 750;
  const cached = demoCache.get(board.id);
  if (cached) return { src: cached, width, height };

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0a2318';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#123d2b';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < width; i += 24) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let j = 0; j < height; j += 24) {
    ctx.beginPath();
    ctx.moveTo(0, j);
    ctx.lineTo(width, j);
    ctx.stroke();
  }

  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(120, 150);
  ctx.lineTo(350, 150);
  ctx.lineTo(350, 300);
  ctx.lineTo(600, 300);
  ctx.lineTo(750, 480);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(150, 450);
  ctx.lineTo(300, 450);
  ctx.lineTo(400, 600);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.fillText(board.title.toUpperCase(), 40, 50);
  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.fillStyle = '#22d3ee';
  ctx.fillText(`DEMO CALIBRATION BOARD // ${board.difficulty}`, 40, 76);

  for (const det of board.mockAnalysis.detections) {
    const [ymin, xmin, ymax, xmax] = det.box_2d;
    const x = (xmin / 1000) * width;
    const y = (ymin / 1000) * height;
    const w = ((xmax - xmin) / 1000) * width;
    const h = ((ymax - ymin) / 1000) * height;
    const label = det.label.toLowerCase();

    if (det.type === 'HAZARD') {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 3;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    } else if (label.includes('capacitor')) {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2.2, h / 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + w * 0.15, y + h * 0.2, w * 0.15, h * 0.6);
    } else if (label.includes('button') || label.includes('switch')) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x + w * 0.1, y + h * 0.1, w * 0.8, h * 0.8);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(x + w * 0.25, y + h * 0.02, w * 0.5, h * 0.08);
    }
  }

  const src = canvas.toDataURL('image/jpeg', 0.9);
  demoCache.set(board.id, src);
  return { src, width, height };
}

export const SAMPLE_BOARDS: SampleBoard[] = [
  {
    id: 'router-pcb',
    title: 'Dead Wi-Fi Router PCB',
    subtitle: 'Zero-Budget Through-Hole Stripper',
    description: 'Harvested from an e-waste bin. Loaded with 470uF caps, AMS1117 3.3V LDO regulator, tactile reset button, and status LEDs.',
    difficulty: 'Beginner',
    mockAnalysis: {
      spoken_telemetry:
        'Target board locked, sir. High yield of through-hole components detected. Four radial capacitors and one tactile switch are ideal for the Walk-and-Rock method. Zero battery hazards present.',
      step_by_step_guide: [
        'Apply fresh rosin flux to capacitor pin joints on solder side',
        'Set iron to 340°C, apply heat to Pin 1 for 2 seconds while tilting body gently',
        'Swap to Pin 2 for 2 seconds to walk the lead out cleanly',
        'Straighten capacitor legs with needle-nose pliers and test with DMM',
      ],
      safety_hazard_detected: false,
      safety_warning: '',
      detections: [
        {
          box_2d: [180, 140, 420, 360],
          label: '470uF 25V Radial Electrolytic Capacitor',
          type: 'THROUGH_HOLE',
          desolder_technique: 'Walk & Rock: Heat pin 1 for 2s with gentle tilt, alternate to pin 2.',
          pinout_notes: 'White negative stripe on casing indicates cathode pin.',
          reuse_ideas: 'Ideal for 5V rail filtering on DIY ESP32 workbench nodes or USB camera power buffer.',
        },
        {
          box_2d: [190, 420, 390, 600],
          label: 'AMS1117 3.3V Low-Dropout Voltage Regulator',
          type: 'SMD',
          desolder_technique: 'Flood tab with leaded solder, drag across 3 pins, lift gently with tweezers.',
          pinout_notes: 'Pin 1: Ground, Pin 2: Vout (Tab), Pin 3: Vin (up to 12V).',
          reuse_ideas: 'Drop 5V USB down to clean 3.3V for harvested microcontrollers or sensors.',
        },
        {
          box_2d: [480, 220, 680, 420],
          label: '6x6mm Tactile Momentary Push Button',
          type: 'THROUGH_HOLE',
          desolder_technique: 'Solder sucker or wick each of the 4 corner pins cleanly.',
          pinout_notes: 'Opposite pin pairs are internally connected.',
          reuse_ideas: 'Manual override trigger or camera shutter button.',
        },
        {
          box_2d: [520, 680, 720, 880],
          label: '3mm Emerald Green LED (Through-Hole)',
          type: 'THROUGH_HOLE',
          desolder_technique: 'Quick touch (1.5s max per leg) to avoid thermal lens damage.',
          pinout_notes: 'Long leg = Anode (+), Flat rim side = Cathode (-).',
          reuse_ideas: 'Visual continuity tester or NAS sync heartbeat light.',
        },
      ],
      schematic_ascii: `[5V USB IN] ----[100uF Cap (+)]----[AMS1117 VIN]
                                    |
                               [3.3V OUT] ---- [ESP32 VCC]
                                    |
[GND] ----------[Cap (-)]-----------[AMS1117 GND]-- [ESP32 GND]`,
      challenge_task: 'Desolder both 470uF capacitors using the Walk-and-Rock method in under 180 seconds.',
    },
  },
  {
    id: 'phone-board',
    title: 'Cracked Smartphone Mainboard',
    subtitle: 'Hazard Warning & Sensor Harvester',
    description: 'Swollen Li-Ion pouch battery detected! Immediate safety disconnect required before applying soldering iron.',
    difficulty: 'High-Density',
    mockAnalysis: {
      spoken_telemetry:
        'Warning! High priority safety hazard detected on desk. A 3.8V Lithium-Ion pouch cell is attached to the left rail. Do not bring the soldering iron near this battery. Detach connector first.',
      step_by_step_guide: [
        'PRIORITY 1: Use plastic spudger to disconnect battery ribbon flex cable immediately',
        'Move battery to ceramic fireproof tray away from soldering heat',
        'Once battery is isolated, harvest vibration motor and micro tactile buttons',
        'Use low-melt solder for delicate micro-switches to protect flex substrate',
      ],
      safety_hazard_detected: true,
      safety_warning: 'CRITICAL LITHIUM BATTERY HAZARD: Pouch battery is connected to PCB. Puncture or soldering iron tip contact will cause thermal runaway!',
      detections: [
        {
          box_2d: [120, 60, 860, 380],
          label: 'HAZARD: 3.8V 3200mAh Li-Ion Pouch Battery',
          type: 'HAZARD',
          desolder_technique: 'DO NOT SOLDER! Unclip plastic connector with nylon spudger. Inspect for swelling.',
          pinout_notes: 'Gold contacts: Pin 1 Vbat (+), Pin 2 NTC Temp, Pin 3 GND (-).',
          reuse_ideas: 'Only reuse if unswollen with dedicated BMS protection board.',
        },
        {
          box_2d: [200, 520, 440, 780],
          label: 'Coin-Type Linear Resonant Haptic Actuator',
          type: 'CONNECTOR',
          desolder_technique: 'Pry adhesive backing gently after heating perimeter to 60°C.',
          pinout_notes: '2-pin spring contacts, polarity agnostic for AC vibration.',
          reuse_ideas: 'Silent tactile workbench timer or secret tap feedback indicator.',
        },
        {
          box_2d: [550, 480, 750, 720],
          label: 'Micro SMD Volume / Power Tactile Switch',
          type: 'SMD',
          desolder_technique: 'Use chip-quik alloy or hot air tweezers at 280°C.',
          pinout_notes: 'Side-mounted SMD pads.',
          reuse_ideas: 'Low-profile push trigger for wearable or camera rig.',
        },
      ],
      challenge_task: 'Safely disconnect battery connector, then salvage the haptic vibrator motor cleanly.',
    },
  },
  {
    id: 'power-board',
    title: 'ATX Desktop Power Board',
    subtitle: 'High-Mass Through-Hole Desoldering',
    description: 'Heavy copper planes with large electrolytic reservoir caps and power MOSFETs bolted to extruded aluminum heatsinks.',
    difficulty: 'Intermediate',
    mockAnalysis: {
      spoken_telemetry:
        'Heavy thermal mass board recognized. Ensure large reservoir capacitors are fully discharged with a 1k resistor before touching. Excellent yield of N-Channel MOSFETs and high-current toroidal inductors.',
      step_by_step_guide: [
        'Discharge 400V capacitors using a power resistor; confirm zero volts with multimeter',
        'Preheat copper ground plane to 80°C to assist heat transfer on thick ground lugs',
        'Use wide chisel tip iron (3.2mm) with ample flux to melt lead-free solder pool',
        'Extract heatsink retaining clip before removing semiconductor leads',
      ],
      safety_hazard_detected: true,
      safety_warning: 'HIGH VOLTAGE CAPACITOR CAUTION: Primary reservoir capacitor can store 380V DC after power unplugged. Discharge before touching pins!',
      detections: [
        {
          box_2d: [140, 160, 540, 440],
          label: '450V 120uF High-Voltage Filter Capacitor',
          type: 'THROUGH_HOLE',
          desolder_technique: 'Confirm 0V with DMM! Use heavy chisel tip on ground plane pins.',
          pinout_notes: 'Check polarization stripe before remounting.',
          reuse_ideas: 'Strobe circuits, bench power supply primary filtering.',
        },
        {
          box_2d: [220, 520, 620, 840],
          label: 'IRFZ44N / 20N60 Power MOSFET on Heatsink',
          type: 'THROUGH_HOLE',
          desolder_technique: 'Unscrew M3 bolt from heatsink first, then suck solder from 3 TO-220 pins.',
          pinout_notes: 'Pin 1: Gate, Pin 2: Drain, Pin 3: Source.',
          reuse_ideas: 'High-current DC motor driver, workbench fume extractor PWM governor.',
        },
        {
          box_2d: [580, 260, 880, 560],
          label: 'Toroidal Core Iron Powder Inductor',
          type: 'THROUGH_HOLE',
          desolder_technique: 'Heavy heat required on thick enameled copper pins.',
          pinout_notes: 'High current rating (up to 15A).',
          reuse_ideas: 'LC filter for eliminating motor noise on home NAS 12V bus.',
        },
      ],
      schematic_ascii: `[12V PSU] ----[Toroid Inductor]----+----[MOSFET Drain]
                                    |         |
                               [470uF Cap] [12V PWM Fan]
                                    |         |
[GND] ------------------------------+----[MOSFET Source]
                                               ^
[ESP32 PWM GPIO] --------[100 Ohm]------------[MOSFET Gate]`,
      challenge_task: 'Unbolt and desolder the TO-220 power MOSFET from the heatsink in 180 seconds.',
    },
  },
  {
    id: 'solder-strip',
    title: 'Solder Joint Inspection & Coach Strip',
    subtitle: 'Joint Quality & Defect Reticle HUD',
    description: 'Bench test strip evaluating good volcano joints, cold solder balls, and solder bridges across adjacent pins.',
    difficulty: 'Beginner',
    mockAnalysis: {
      spoken_telemetry:
        'Solder joint coach active. Pad 2 displays a textbook concave volcano joint with ideal wetting. Pad 3 is a cold blob with insufficient pad heat. Pad 4 has a dangerous solder bridge shorting pins together.',
      step_by_step_guide: [
        'Pad 3 Fix: Re-apply rosin flux, touch tip to both pad and pin for 2 seconds until solder reflows into shiny meniscus',
        'Pad 4 Bridge Fix: Wipe iron tip clean on brass sponge, apply flux between pins, and drag clean tip upward between pads',
        'Practice 3-Second Rule: Tin tip -> Heat work for 2s -> Feed solder -> Freeze 1s',
      ],
      safety_hazard_detected: false,
      safety_warning: '',
      detections: [
        {
          box_2d: [180, 120, 480, 320],
          label: 'Good Volcano Solder Joint (Pass)',
          type: 'THROUGH_HOLE',
          desolder_technique: 'No action required. Textbook 45-degree shiny meniscus.',
          pinout_notes: 'Full pad coverage with zero voiding.',
          reuse_ideas: 'Baseline reference for mechanical strength and electrical conductivity.',
        },
        {
          box_2d: [200, 360, 520, 560],
          label: 'Defect: Cold Solder Joint (Blob)',
          type: 'SMD',
          desolder_technique: 'Touch with fluxed 350°C iron tip. Wait for solder to collapse flat against pad.',
          pinout_notes: 'Dull crystalline surface, high resistance, prone to vibration failure.',
          reuse_ideas: 'Reflow immediately before commissioning board.',
        },
        {
          box_2d: [210, 600, 540, 880],
          label: 'Defect: Solder Bridge Short Circuit',
          type: 'HAZARD',
          desolder_technique: 'Add flux, drag clean tinned iron tip lengthwise between pins, or use copper wick.',
          pinout_notes: 'Direct electrical short between adjacent VCC and GPIO lines.',
          reuse_ideas: 'Must be cleared or board will fail on power-up.',
        },
      ],
      challenge_task: 'Clear the solder bridge on Pad 4 and reflow the cold joint on Pad 3 before the 3-minute timer expires.',
    },
  },
];
