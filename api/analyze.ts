import type { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

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

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64, mode = 'HARVEST', partsInventory = [], customPrompt = '' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 payload.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.-]+;base64,/, '');

    const systemInstruction = `You are JARVIS // BENCH-OS: a real-time Hardware Reverse-Engineering, Soldering Coach, and Nicotine-Craving Override HUD for a zero-budget electronics tinkerer.
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
      promptText = `SCAN & HARVEST MODE: Detect reusable through-hole components first (caps, headers, switches, buzzers, MOSFETs, regulators). Warn if Li-Ion pouch battery is installed!`;
    } else if (mode === 'SOLDER_COACH') {
      promptText = `SOLDER & DESOLDER COACH MODE: Evaluate visible joints (Good Volcano vs Cold Blob vs Bridge). Reinforce 3-Second Rule and Walk & Rock desoldering method.`;
    } else if (mode === 'BUILD_ADVISOR') {
      promptText = `ZERO-BUDGET BUILD ADVISOR: Suggest 2 zero-cost circuits from user's parts bin with ASCII schematic.`;
    } else if (mode === 'CRAVING_OVERRIDE') {
      promptText = `EMERGENCY 3-MINUTE CRAVING OVERRIDE: Assign rapid physical desoldering mission with iron and pliers in 180 seconds.`;
    } else if (mode === 'DEVICE_DOCTOR') {
      promptText = `DEAD DEVICE DOCTOR: Non-destructive triage steps for phone/motherboard (charging port lint, ribbon reseating, battery connector, power switch pads).`;
    } else {
      promptText = customPrompt || 'Analyze this PCB for components, hazards, and solder joints.';
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
            { text: promptText },
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
    const parsedData = JSON.parse(rawText);
    return res.json(parsedData);
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || 'Vision analysis failed',
      spoken_telemetry: 'Vision telemetry uplink interrupted. Check lighting and board positioning, sir.',
      step_by_step_guide: ['Ensure steady board illumination', 'Reposition camera 10-15cm over PCB', 'Retry scan'],
      safety_hazard_detected: false,
      safety_warning: '',
      detections: [],
    });
  }
}
