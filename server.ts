import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared Gemini client with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Response Schema for Vision & Spatial Telemetry
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    spoken_telemetry: {
      type: Type.STRING,
      description: 'Punchy, witty, safety-aware spoken guidance from Jarvis in 2-4 sentences max for fast TTS speech.',
    },
    step_by_step_guide: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Tactical step-by-step instructions for the workbench user.',
    },
    safety_hazard_detected: {
      type: Type.BOOLEAN,
      description: 'True if a battery (lithium pouch, swollen cell, CR2032), high-voltage capacitor, or short/bridge is present.',
    },
    safety_warning: {
      type: Type.STRING,
      description: 'Urgent warning if lithium battery, live capacitor charge, toxic flux, or solder bridge is visible.',
    },
    detections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          box_2d: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            description: '[ymin, xmin, ymax, xmax] coordinates normalized to 0-1000 scale.',
          },
          label: {
            type: Type.STRING,
            description: 'Component name & value (e.g., 220uF 25V Electrolytic Cap, tactile switch, CH340 USB chip).',
          },
          type: {
            type: Type.STRING,
            description: 'One of: THROUGH_HOLE, SMD, CONNECTOR, IC_CHIP, HAZARD',
          },
          desolder_technique: {
            type: Type.STRING,
            description: 'Exact desoldering method (e.g., Walk & Rock for 2 pins, braided wick, chip-quik, hot air).',
          },
          pinout_notes: {
            type: Type.STRING,
            description: 'Pinout/polarity details (e.g., Long leg / stripe = cathode/negative).',
          },
          reuse_ideas: {
            type: Type.STRING,
            description: 'Concrete zero-cost reuse ideas with Arduino, ESP32, Camera, or Home NAS.',
          },
        },
        required: ['box_2d', 'label', 'type', 'desolder_technique', 'pinout_notes', 'reuse_ideas'],
      },
    },
    schematic_ascii: {
      type: Type.STRING,
      description: 'Optional ASCII or pinout wire diagram showing how to connect harvested parts.',
    },
    challenge_task: {
      type: Type.STRING,
      description: 'If craving override mode: 3-minute physical mechanical challenge for hands with iron & pliers.',
    },
  },
  required: ['spoken_telemetry', 'step_by_step_guide', 'safety_hazard_detected', 'safety_warning', 'detections'],
};

// API Route: Analyze Workbench Frame
app.post('/api/analyze', async (req, res) => {
  try {
    const { imageBase64, mode = 'HARVEST', partsInventory = [], customPrompt = '' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 payload.' });
    }

    // Clean base64 data
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.-]+;base64,/, '');

    // Construct mode-specific tactical prompt
    let systemInstruction = `You are JARVIS // BENCH-OS: a real-time Hardware Reverse-Engineering, Soldering Coach, and Nicotine-Craving Override HUD for a zero-budget electronics tinkerer.
The user is propping their phone over a workbench holding a hot soldering iron and pliers.
Your tone is sharp, punchy, witty, safety-conscious, and technical (like Tony Stark's JARVIS speaking to an engineer).
Always return coordinates in [ymin, xmin, ymax, xmax] normalized 0-1000 for every detected component or solder joint.

CRITICAL OBJECT DETECTION AUDIT RULE:
First examine if there is an actual printed circuit board (PCB), motherboard, soldered assembly, or electronic device visible in the optics field.
If the camera is pointed at a person, a room, ceiling, desk clutter without electronics, or general non-electronics background with no PCB visible:
You MUST return:
- "detections": []
- "safety_hazard_detected": false
- "safety_warning": ""
- "spoken_telemetry": "No circuit board detected in the optics field. Place a motherboard or device on the bench to begin."
- "step_by_step_guide": ["Position PCB directly under camera lens", "Ensure adequate workbench lighting", "Tap SCAN FRAME again"]

Operating Mode: ${mode}.
Current Saved Parts in User's Bin: ${JSON.stringify(partsInventory.map((p: any) => p.name))}.
`;

    let promptText = '';

    if (mode === 'HARVEST') {
      promptText = `SCAN & HARVEST MODE:
1. Examine this PCB / motherboard in view.
2. Detect the easiest, high-value through-hole or reusable components first (electrolytic capacitors, pin headers, tactile switches, piezo buzzers, inductors, MOSFETs, crystal oscillators, voltage regulators, or Wi-Fi/ESP modules).
3. CRITICAL SAFETY CHECK: Immediately inspect for any installed Lithium-Ion pouch battery, 18650 cell, or CR2032 coin cell. If found, mark type as 'HAZARD', safety_hazard_detected = true, and issue an urgent warning to disconnect before heating!
4. For each detected part, give the exact [ymin, xmin, ymax, xmax] 0-1000 box, desolder technique (e.g. Walk & Rock), pinout polarity, and reuse ideas for Arduino/ESP32/Camera/NAS.
5. In spoken_telemetry, give a crisp 2-3 sentence verbal summary of what's ripe for harvesting on this board.`;
    } else if (mode === 'SOLDER_COACH') {
      promptText = `SOLDER & DESOLDER COACH MODE:
1. Inspect the visible solder joints and pads on this circuit board.
2. Evaluate joint quality: Flag 'Good Volcano Joints' (smooth concave meniscus) vs 'Cold Blobs' (dull ball) or 'Solder Bridges' (shorts).
3. For defective or unworked joints, provide bounding boxes with desolder/touch-up technique.
4. Reinforce the "3-Second Soldering Rule" (Tin tip -> Heat pad & lead simultaneously for 2s -> Feed solder to joint -> Remove heat and freeze for 1s).
5. For desoldering, explain the "Walk & Rock" method (heat pin 1, tilt component gently, heat pin 2, walk it out).
6. In spoken_telemetry, speak directly to their technique right now in 2-3 sentences.`;
    } else if (mode === 'BUILD_ADVISOR') {
      promptText = `ZERO-BUDGET BUILD ADVISOR MODE:
1. Look at the board in view and cross-reference with the user's Salvaged Parts Bin: ${JSON.stringify(partsInventory.map((p: any) => p.name))}.
2. Recommend 2 concrete, zero-cost circuits they can build right now using these harvested parts (e.g., LED continuity tester, NAS drive-alert piezo alarm, camera tally light, 5V USB fan governor).
3. Include an interactive ASCII pinout diagram in 'schematic_ascii' showing exact pin-to-wire connections.
4. Detect the needed parts on the current board if visible with bounding boxes.
5. In spoken_telemetry, announce the best project to assemble right now.`;
    } else if (mode === 'CRAVING_OVERRIDE') {
      promptText = `EMERGENCY 3-MINUTE CRAVING OVERRIDE PROTOCOL:
1. The user has a nicotine craving right now. Their hands need high-intensity tactile occupation.
2. Pick ONE specific component or joint cluster visible on this board (e.g., two large electrolytic capacitors or a tactile switch).
3. Lock a target bounding box onto it.
4. In 'challenge_task', prescribe an immediate 3-minute mechanical challenge:
   "Iron hot? Pliers ready? Your mission: Desolder these 2 capacitors cleanly using Walk-and-Rock before the 180s clock hits zero. Drink a mouthful of cold water first. Begin!"
5. In spoken_telemetry, deliver an adrenaline-pumping, encouraging Jarvis voice briefing to lock in focus and crush the craving with mechanical tactile focus!`;
    } else if (mode === 'DEVICE_DOCTOR') {
      promptText = `DEAD DEVICE DOCTOR DIAGNOSTIC MODE:
1. Analyze this phone or motherboard for NON-DESTRUCTIVE triage points before any soldering or desoldering:
   - Charging port lint or debris
   - Ribbon cable flex connections that may have unseated
   - Battery connector status (inspect for corrosion or loose snap)
   - Power button switch contacts and test pads
2. Highlight these test points with bounding boxes.
3. In 'step_by_step_guide', outline the safe diagnostic steps (e.g. toothpick lint extraction, multi-meter voltage check at battery terminals, tweezers short across power switch pads).
4. In 'spoken_telemetry', give an encouraging triage assessment of non-destructive checks first.`;
    } else {
      promptText = `Analyze this electronic circuit board. ${customPrompt || 'Detect components, safety hazards, and provide desoldering guidance.'}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: analysisSchema,
        temperature: 0.2,
      },
    });

    const rawText = response.text?.trim() || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output:', rawText);
      return res.status(500).json({ error: 'Invalid JSON response from vision model', raw: rawText });
    }

    return res.json(parsedData);
  } catch (err: any) {
    console.error('Gemini vision analysis error:', err);
    return res.status(500).json({
      error: err.message || 'Vision analysis failed',
      spoken_telemetry: 'Vision telemetry uplink interrupted. Check lighting and board positioning, sir.',
      step_by_step_guide: ['Ensure steady board illumination', 'Reposition camera 10-15cm over PCB', 'Retry scan'],
      safety_hazard_detected: false,
      safety_warning: '',
      detections: [],
    });
  }
});

// API Route: Jarvis & Second Brain Telemetry Relay
app.post('/api/jarvis/telemetry', async (req, res) => {
  const { jarvisCoreUrl, authToken, state } = req.body;
  const startTime = Date.now();

  if (!jarvisCoreUrl) {
    return res.json({
      success: true,
      mode: 'autonomous',
      message: 'JARVIS // BENCH-OS running in autonomous offline edge mode.',
      latencyMs: 0,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'JARVIS-BENCH-OS/2.0',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(jarvisCoreUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source: 'BENCH-OS',
        timestamp: new Date().toISOString(),
        ...state,
      }),
    });

    const latencyMs = Date.now() - startTime;
    const data = await response.json().catch(() => ({}));

    return res.json({
      success: response.ok,
      status: response.status,
      latencyMs,
      data,
    });
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      error: err.message || 'Failed to reach Jarvis Core backend URL',
      latencyMs: Date.now() - startTime,
    });
  }
});

// API Route: Jarvis Inventory Sync
app.post('/api/jarvis/inventory-sync', async (req, res) => {
  const { jarvisCoreUrl, nasWebhookUrl, authToken, parts, stats } = req.body;
  const targetUrl = jarvisCoreUrl || nasWebhookUrl;

  if (!targetUrl) {
    return res.status(400).json({ error: 'No Jarvis Core or NAS URL configured.' });
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'JARVIS-BENCH-OS/2.0',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event: 'INVENTORY_SYNC',
        timestamp: new Date().toISOString(),
        totalParts: parts?.length || 0,
        parts: parts || [],
        stats: stats || {},
      }),
    });

    return res.json({
      success: response.ok,
      status: response.status,
      message: response.ok ? 'Inventory sync committed to Second Brain.' : 'Sync failed.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Inventory sync transport error.',
    });
  }
});

// API Route: NAS Proxy (CORS bypass for user's home NAS / Tailscale IP)
const handleNasProxy = async (req: express.Request, res: express.Response) => {
  const { webhookUrl, payload } = req.body;
  const startTime = Date.now();

  if (!webhookUrl) {
    return res.status(400).json({ error: 'Missing webhookUrl parameter.' });
  }

  try {
    const nasResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'JARVIS-BENCH-OS/2.0',
      },
      body: JSON.stringify({
        source: 'JARVIS // BENCH-OS',
        timestamp: new Date().toISOString(),
        ...payload,
      }),
    });

    const latencyMs = Date.now() - startTime;
    const statusText = await nasResponse.text().catch(() => '');

    return res.json({
      success: nasResponse.ok,
      status: nasResponse.status,
      latencyMs,
      response: statusText,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      latencyMs: Date.now() - startTime,
      error: err.message || 'Failed to reach home NAS webhook. Verify local network IP or port forward.',
    });
  }
};

app.post('/api/nas/proxy', handleNasProxy);
app.post('/api/nas-sync', handleNasProxy); // backward-compatibility

// Full-stack Vite dev middleware vs Production static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[JARVIS // BENCH-OS] Tactical HUD active at http://0.0.0.0:${PORT}`);
  });
}

startServer();
