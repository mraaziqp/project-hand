// Shared Gemini vision analysis used by both the local Express server (server.ts)
// and the Vercel serverless function (api/analyze.ts).
import { ApiError, GoogleGenAI, Type } from '@google/genai';

export const OPERATING_MODES = [
  'HARVEST',
  'SOLDER_COACH',
  'BUILD_ADVISOR',
  'CRAVING_OVERRIDE',
  'DEVICE_DOCTOR',
] as const;
export type Mode = (typeof OPERATING_MODES)[number];

const COMPONENT_TYPES = ['THROUGH_HOLE', 'SMD', 'CONNECTOR', 'IC_CHIP', 'MODULE', 'MECHANICAL', 'HAZARD'];
const HARVEST_WORTH = ['HIGH', 'MEDIUM', 'LOW', 'SKIP'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'ZAR', 'INR', 'AUD', 'CAD'];

// Models are tried in order; the first one that answers is remembered for the
// life of the process. Google retires model IDs regularly (gemini-2.5-flash is
// scheduled for shutdown 2026-10-16), so GEMINI_MODEL lets you pin a new one
// without a code change, and the "-latest" alias tracks the current Flash model.
const MODEL_CANDIDATES = Array.from(
  new Set(
    [
      ...(process.env.GEMINI_MODEL || '').split(',').map(s => s.trim()),
      'gemini-flash-latest',
      'gemini-3.5-flash',
      'gemini-2.5-flash',
    ].filter(Boolean)
  )
);
let workingModel: string | null = null;

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    object_identified: {
      type: Type.STRING,
      description:
        'What the scanned thing is, as specifically as possible (brand/model if readable), e.g. "HP DeskJet 2130 printer main board" or "Unknown 12V brushed DC motor". Empty string if nothing relevant is in view.',
    },
    spoken_telemetry: {
      type: Type.STRING,
      description: 'Punchy, safety-aware spoken summary from Jarvis in 2-4 short sentences for text-to-speech.',
    },
    answer: {
      type: Type.STRING,
      description: "Direct, practical answer to the user's question if one was asked; otherwise empty string.",
    },
    step_by_step_guide: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Concrete next steps for the user at the workbench.',
    },
    safety_hazard_detected: {
      type: Type.BOOLEAN,
      description:
        'True if a lithium battery, swollen cell, coin cell, mains-voltage section, large/high-voltage capacitor, CRT, microwave transformer/capacitor, or short/bridge is present.',
    },
    safety_warning: {
      type: Type.STRING,
      description: 'Urgent, specific warning if a hazard is present; otherwise empty string.',
    },
    salvage_value_total: {
      type: Type.NUMBER,
      description: 'Rough total reuse/resale value of everything worth salvaging, in the requested currency. 0 if none.',
    },
    detections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          box_2d: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            description: '[ymin, xmin, ymax, xmax] normalized to 0-1000 relative to the image.',
          },
          label: {
            type: Type.STRING,
            description: 'Part name and value, e.g. "220uF 25V electrolytic capacitor", "28BYJ-48 stepper motor", "CH340G USB-serial IC".',
          },
          part_number: {
            type: Type.STRING,
            description: 'Exact markings / part number read from the part if legible (e.g. "AMS1117-3.3", "NE555P"); empty string if not readable.',
          },
          type: { type: Type.STRING, format: 'enum', enum: COMPONENT_TYPES },
          harvest_worth: {
            type: Type.STRING,
            format: 'enum',
            enum: HARVEST_WORTH,
            description: 'Is it worth the effort to salvage, considering value, reusability and difficulty?',
          },
          est_value: {
            type: Type.NUMBER,
            description: 'Approximate price to buy this part new from a cheap online source, in the requested currency.',
          },
          buy_search_query: {
            type: Type.STRING,
            description: 'Best short search query to buy this part (or an equivalent) online, e.g. "AMS1117 3.3V regulator module".',
          },
          desolder_technique: {
            type: Type.STRING,
            description: 'How to remove it: desoldering method, or unscrew/unclip for mechanical parts.',
          },
          pinout_notes: {
            type: Type.STRING,
            description: 'Pinout / polarity / wiring details (e.g. stripe = negative, red wire = +).',
          },
          reuse_ideas: {
            type: Type.STRING,
            description: 'Concrete reuse ideas with Arduino, ESP32, Raspberry Pi, robots, power supplies, etc.',
          },
        },
        required: ['box_2d', 'label', 'type', 'desolder_technique', 'pinout_notes', 'reuse_ideas'],
      },
    },
    shopping_list: {
      type: Type.ARRAY,
      description: 'Things worth buying to repair this, finish the suggested project, or make the salvaged parts usable. Can be empty.',
      items: {
        type: Type.OBJECT,
        properties: {
          item: { type: Type.STRING, description: 'What to buy.' },
          purpose: { type: Type.STRING, description: 'Why it is needed.' },
          est_price: { type: Type.NUMBER, description: 'Approximate price in the requested currency.' },
          search_query: { type: Type.STRING, description: 'Short search query to find it online.' },
          priority: { type: Type.STRING, format: 'enum', enum: ['MUST', 'NICE'] },
        },
        required: ['item', 'purpose', 'search_query'],
      },
    },
    schematic_ascii: {
      type: Type.STRING,
      description: 'Optional ASCII wiring diagram showing how to connect the parts. Empty string if not useful.',
    },
    challenge_task: {
      type: Type.STRING,
      description: 'Only for craving override mode: a 3-minute physical hands-on challenge. Otherwise empty string.',
    },
  },
  required: [
    'object_identified',
    'spoken_telemetry',
    'step_by_step_guide',
    'safety_hazard_detected',
    'safety_warning',
    'detections',
  ],
};

const MODE_PROMPTS: Record<Mode, string> = {
  HARVEST: `SCAN & SOURCE MODE:
1. Identify what this is: a bare PCB, a closed device, an appliance, a toy, a tool, a module, a motor, a loose component, a cable - anything.
2. List every part worth salvaging (electronic AND mechanical: motors, steppers, fans, speakers, LCDs, sensors, switches, connectors, regulators, ICs, crystals, inductors, magnets, gears, bearings, springs, screws, power supplies, batteries, cables). Highest value first.
3. For each part: read the part number/markings if legible, estimate what it costs to buy new, rate harvest_worth, and give a buy_search_query.
4. If it is a closed device, say what is typically inside it, box the visible parts (ports, screws, buttons, labels) and explain how to open it safely.
5. shopping_list: what to buy to repair it, or to make the salvaged parts useful (e.g. driver boards for steppers, a buck converter, an ESP32).
6. SAFETY FIRST: flag lithium cells, coin cells, mains sections, large capacitors, microwave/CRT parts as HAZARD with an urgent warning.
7. spoken_telemetry: 2-3 sentences on what it is and the best stuff to grab.`,
  SOLDER_COACH: `SOLDER & DESOLDER COACH MODE:
1. Inspect the visible solder joints and pads.
2. Classify joints: good (shiny concave fillet) vs cold (dull ball) vs bridges (shorts) vs insufficient solder vs lifted pads. Box each one you comment on.
3. For defective joints give the exact fix (flux, reflow, wick, drag).
4. Reinforce the 3-second rule (tin tip, heat pad+lead ~2s, feed solder, remove heat and hold still) and the walk-and-rock desolder method where relevant.
5. spoken_telemetry: speak directly to their technique in 2-3 sentences.`,
  BUILD_ADVISOR: `BUILD ADVISOR MODE:
1. Look at what is in view and cross-reference the user's parts bin (listed in the system instructions).
2. Recommend 1-2 concrete projects they can build mostly from what they have, naming exactly which parts are used.
3. Put an ASCII wiring diagram with exact pin-to-pin connections in schematic_ascii.
4. shopping_list: anything they still need to buy to finish the project (with prices).
5. Box any parts in view that the project uses.
6. spoken_telemetry: announce the best project to build right now.`,
  CRAVING_OVERRIDE: `CRAVING OVERRIDE PROTOCOL:
1. The user has a nicotine craving right now and needs to keep their hands busy.
2. Pick ONE specific component or joint cluster visible here and box it.
3. In challenge_task, prescribe an immediate 3-minute hands-on challenge with iron and pliers on that target (e.g. "Desolder these 2 capacitors cleanly using walk-and-rock before the clock hits zero").
4. spoken_telemetry: an energetic, encouraging briefing to lock in focus.`,
  DEVICE_DOCTOR: `DEAD DEVICE DOCTOR MODE:
1. Identify the device and the most likely reasons it is dead, given what is visible.
2. Prioritise NON-DESTRUCTIVE checks first: charging port debris, unseated ribbon/flex cables, battery connector, blown fuse, bulging caps, burnt components, corrosion, power button.
3. Box each test point / suspicious area.
4. step_by_step_guide: an ordered diagnostic plan including multimeter checks with expected values where possible.
5. shopping_list: likely replacement parts (with part numbers if readable).
6. spoken_telemetry: an encouraging triage assessment.`,
};

export interface AnalyzeInput {
  imageBase64?: unknown;
  mode?: unknown;
  partsInventory?: unknown;
  question?: unknown;
  customPrompt?: unknown;
  currency?: unknown;
}

export class AnalyzeError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function asString(v: unknown, max = 2000): string {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function buildPrompts(input: AnalyzeInput) {
  const mode: Mode = OPERATING_MODES.includes(input.mode as Mode) ? (input.mode as Mode) : 'HARVEST';
  const currency = CURRENCIES.includes(input.currency as string) ? (input.currency as string) : 'USD';
  const question = asString(input.question, 1000).trim() || asString(input.customPrompt, 1000).trim();
  const inventory = Array.isArray(input.partsInventory)
    ? input.partsInventory
        .map(p => (p && typeof p === 'object' ? asString((p as { name?: unknown }).name, 120) : asString(p, 120)))
        .filter(Boolean)
        .slice(0, 150)
    : [];

  const systemInstruction = `You are JARVIS // BENCH-OS: a hardware reverse-engineering assistant, salvage scout and soldering coach for a budget electronics tinkerer working at a bench with their phone.
Tone: sharp, concise, a little witty, always safety-conscious and technically precise. Never invent part numbers you cannot read - leave part_number empty instead.
Coordinates: box_2d is [ymin, xmin, ymax, xmax] normalized 0-1000 for every detection.
Prices: estimate realistic prices in ${currency} for buying the part new from cheap online sources (AliExpress/LCSC-level pricing for components, retail for modules). Use 0 when you have no idea.

If the image contains no electronics, device, tool or hardware at all (e.g. a face, an empty room, a ceiling), return empty detections, an empty shopping_list, object_identified "" and say briefly that nothing relevant is in view.

Operating mode: ${mode}.
User's salvaged parts bin: ${JSON.stringify(inventory)}.`;

  let promptText = MODE_PROMPTS[mode];
  if (question) {
    promptText += `\n\nUSER QUESTION (answer it directly and practically in "answer", using what is visible in the image): ${question}`;
  }
  return { mode, systemInstruction, promptText };
}

function clamp(n: unknown, lo: number, hi: number): number {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : Number(n);
  return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo;
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : undefined;
}

// Defensive normalisation so the client never crashes on a malformed model reply.
function sanitize(raw: any) {
  const detections = (Array.isArray(raw?.detections) ? raw.detections : [])
    .filter((d: any) => d && Array.isArray(d.box_2d) && d.box_2d.length === 4)
    .map((d: any) => {
      let [ymin, xmin, ymax, xmax] = d.box_2d.map((v: unknown) => clamp(v, 0, 1000));
      if (ymin > ymax) [ymin, ymax] = [ymax, ymin];
      if (xmin > xmax) [xmin, xmax] = [xmax, xmin];
      return {
        box_2d: [ymin, xmin, ymax, xmax],
        label: asString(d.label, 200) || 'Unknown part',
        part_number: asString(d.part_number, 80),
        type: COMPONENT_TYPES.includes(d.type) ? d.type : 'THROUGH_HOLE',
        harvest_worth: HARVEST_WORTH.includes(d.harvest_worth) ? d.harvest_worth : undefined,
        est_value: num(d.est_value),
        buy_search_query: asString(d.buy_search_query, 200),
        desolder_technique: asString(d.desolder_technique),
        pinout_notes: asString(d.pinout_notes),
        reuse_ideas: asString(d.reuse_ideas),
      };
    });

  const shopping_list = (Array.isArray(raw?.shopping_list) ? raw.shopping_list : [])
    .filter((s: any) => s && typeof s.item === 'string')
    .map((s: any) => ({
      item: asString(s.item, 200),
      purpose: asString(s.purpose, 500),
      est_price: num(s.est_price),
      search_query: asString(s.search_query, 200) || asString(s.item, 200),
      priority: s.priority === 'MUST' ? 'MUST' : 'NICE',
    }));

  return {
    object_identified: asString(raw?.object_identified, 300),
    spoken_telemetry: asString(raw?.spoken_telemetry) || 'Scan complete.',
    answer: asString(raw?.answer, 4000),
    step_by_step_guide: (Array.isArray(raw?.step_by_step_guide) ? raw.step_by_step_guide : [])
      .filter((s: unknown) => typeof s === 'string' && s.trim())
      .slice(0, 20),
    safety_hazard_detected: raw?.safety_hazard_detected === true,
    safety_warning: asString(raw?.safety_warning),
    salvage_value_total: num(raw?.salvage_value_total),
    detections,
    shopping_list,
    schematic_ascii: asString(raw?.schematic_ascii, 6000),
    challenge_task: asString(raw?.challenge_task, 1000),
  };
}

function isModelUnavailable(err: unknown): boolean {
  const status = err instanceof ApiError ? err.status : undefined;
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  return (
    status === 404 ||
    msg.includes('not found') ||
    msg.includes('no longer available') ||
    msg.includes('is not supported for generatecontent')
  );
}

function isTransient(err: unknown): boolean {
  const status = err instanceof ApiError ? err.status : undefined;
  return status === 500 || status === 503 || status === 504;
}

export async function analyzeImage(input: AnalyzeInput) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
    throw new AnalyzeError(
      'GEMINI_API_KEY is not set on the server. Add it as an environment variable (Vercel project settings, or a local .env file) - get a key at https://aistudio.google.com/apikey.',
      500
    );
  }

  const image = asString(input.imageBase64, 12_000_000);
  if (!image) throw new AnalyzeError('Missing imageBase64 payload.', 400);

  const mimeMatch = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const data = image.replace(/^data:[^;]+;base64,/, '');

  const { systemInstruction, promptText } = buildPrompts(input);

  const candidates = workingModel ? [workingModel, ...MODEL_CANDIDATES.filter(m => m !== workingModel)] : MODEL_CANDIDATES;
  let lastErr: unknown = null;

  for (const model of candidates) {
    try {
      const response = await getClient().models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data } }, { text: promptText }] }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: analysisSchema,
          temperature: 0.2,
        },
      });

      const rawText = response.text?.trim() || '';
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        console.error(`[analyze] ${model} returned non-JSON output:`, rawText.slice(0, 500));
        throw new AnalyzeError('The vision model returned an unreadable answer. Try scanning again.', 502);
      }
      if (workingModel !== model) {
        workingModel = model;
        console.log(`[analyze] using model ${model}`);
      }
      return { ...sanitize(parsed), model };
    } catch (err) {
      lastErr = err;
      if (isModelUnavailable(err) || isTransient(err)) {
        console.warn(`[analyze] model ${model} failed (${(err as Error).message}); trying next candidate`);
        if (workingModel === model) workingModel = null;
        continue;
      }
      break;
    }
  }

  if (lastErr instanceof AnalyzeError) throw lastErr;
  const status = lastErr instanceof ApiError ? lastErr.status : 500;
  const message = lastErr instanceof Error ? lastErr.message : 'Vision analysis failed';
  if (status === 400 && /api key/i.test(message)) {
    throw new AnalyzeError('Gemini rejected the API key. Check GEMINI_API_KEY in your .env file.', 401);
  }
  if (status === 429) {
    throw new AnalyzeError('Gemini rate limit / quota hit. Wait a minute and try again.', 429);
  }
  throw new AnalyzeError(message, status >= 400 && status < 600 ? status : 500);
}

// --- Outbound webhook helpers (NAS / Jarvis core bridges) ---

// Only allow plain http(s) targets so the relay endpoints can't be pointed at
// file:, data: or other schemes. These relays are meant for your own LAN/Tailscale
// devices; set APP_ACCESS_KEY when the app is reachable from the internet.
export function parseOutboundUrl(value: unknown): URL | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export const OUTBOUND_TIMEOUT_MS = 8000;

// Optional shared secret. When APP_ACCESS_KEY is set, every /api request must
// send the same value in the x-bench-key header.
export function isAuthorized(headerValue: unknown): boolean {
  const required = process.env.APP_ACCESS_KEY;
  if (!required) return true;
  return typeof headerValue === 'string' && headerValue === required;
}
