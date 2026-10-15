import React, { useState } from 'react';
import { Copy, Check, Zap, HelpCircle } from 'lucide-react';
import { CircuitFirmware } from '../types';
import { copyText } from '../utils/shopping';

interface FirmwareSuiteGeneratorProps {
  firmwareSuite?: CircuitFirmware;
}

export const DEFAULT_FIRMWARE_SUITE: CircuitFirmware = {
  title: 'Zero-Cost NAS Alert Beacon & Hardware Tally Light',
  description:
    'Harvests a motherboard piezo buzzer, green LED, 470uF filter cap, and tactile reset switch. Flashes via ESP32/Arduino or directly triggers from your NAS via USB Serial / Webhook when a RAID scrub or backup completes.',
  pinoutTable: [
    {
      partPin: 'Piezo Buzzer (+) Positive Pin',
      targetConnection: 'ESP32 GPIO 25 (or Arduino D9)',
      notes: 'Series with 100 Ohm salvaged resistor to prevent GPIO overcurrent',
    },
    {
      partPin: 'Piezo Buzzer (-) Negative Pin',
      targetConnection: 'System Ground (GND)',
      notes: 'Common ground with power supply',
    },
    {
      partPin: '5mm Emerald LED Long Leg (+)',
      targetConnection: 'ESP32 GPIO 26 (or Arduino D10)',
      notes: 'Flat rim indicates cathode (-)',
    },
    {
      partPin: '5mm Emerald LED Short Leg (-)',
      targetConnection: 'System Ground (GND)',
      notes: 'Cathode connected to ground rail',
    },
    {
      partPin: '470uF 25V Electrolytic Cap',
      targetConnection: 'Across 5V VBUS and GND rails',
      notes: 'White stripe = negative. Smooths out current spikes when buzzer chirps',
    },
    {
      partPin: 'Tactile Switch Leg 1',
      targetConnection: 'ESP32 GPIO 04 (Pull-Up)',
      notes: 'Mutes active alarm or triggers manual workbench sync',
    },
    {
      partPin: 'Stripped USB Cable (Red Wire)',
      targetConnection: '5V VBUS Rail',
      notes: '5V DC directly from NAS / phone charger',
    },
    {
      partPin: 'Stripped USB Cable (Black Wire)',
      targetConnection: 'Common GND Rail',
      notes: '0V Reference',
    },
  ],
  arduinoCode: `// =================================================================
// JARVIS // BENCH-OS - ZERO-COST NAS ALERT BEACON (ESP32 / ARDUINO)
// Harvested: Piezo Buzzer (Pin 25), LED (Pin 26), Button (Pin 4)
// =================================================================

#define BUZZER_PIN 25
#define LED_PIN    26
#define BUTTON_PIN 4

bool alarmActive = false;

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Quick startup chime
  digitalWrite(LED_PIN, HIGH);
  tone(BUZZER_PIN, 880, 100);
  delay(150);
  tone(BUZZER_PIN, 1760, 150);
  digitalWrite(LED_PIN, LOW);
  Serial.println("[JARVIS HARDWARE NODE] Ready for NAS events.");
}

void loop() {
  // Check for Serial trigger from NAS / Host
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    if (cmd == 'A') { // NAS Alert Trigger
      alarmActive = true;
      Serial.println("[ACK] Alarm Triggered");
    } else if (cmd == 'O') { // NAS OK / Cleared
      alarmActive = false;
      noTone(BUZZER_PIN);
      digitalWrite(LED_PIN, LOW);
      Serial.println("[ACK] Alarm Cleared");
    }
  }

  // Handle Alarm Beacon
  if (alarmActive) {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 1200);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    noTone(BUZZER_PIN);
    delay(200);
  }

  // Hardware Mute Button Press
  if (digitalRead(BUTTON_PIN) == LOW) {
    alarmActive = false;
    noTone(BUZZER_PIN);
    digitalWrite(LED_PIN, LOW);
    Serial.println("[USER] Alarm manually acknowledged on workbench.");
    delay(400); // debounce
  }
}`,
  pythonNasCode: `# =================================================================
# JARVIS // BENCH-OS - NAS SERVER DISK & SCRUB MONITOR (PYTHON)
# Run on TrueNAS / Synology / Unraid / Pi: python3 jarvis_nas_alert.py
# =================================================================
import serial
import time
import requests

SERIAL_PORT = "/dev/ttyUSB0" # Plug salvaged Arduino/ESP32 into NAS USB
BAUD_RATE = 115200

def trigger_bench_beacon(alert_type="SCRUB_COMPLETE"):
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        time.sleep(2) # wait for microcontroller boot
        if alert_type == "ERROR":
            ser.write(b"A") # Trigger buzzer & flashing LED
            print("[JARVIS NAS] Sent ALARM signal to workbench node.")
        else:
            ser.write(b"O") # Clear alarm
            print("[JARVIS NAS] Sent CLEAR signal to workbench node.")
        ser.close()
    except Exception as e:
        print(f"[ERR] Failed to communicate with bench node: {e}")

if __name__ == "__main__":
    print("[JARVIS] Monitoring NAS disk arrays...")
    # Simulate event notification
    trigger_bench_beacon("ERROR")`,
  nodeNasCode: `// =================================================================
// JARVIS // BENCH-OS - SECOND BRAIN WEBHOOK TRIGGER (NODE.JS)
// =================================================================
import http from 'http';
import { SerialPort } from 'serialport';

const PORT = 5050;
const port = new SerialPort({ path: '/dev/ttyUSB0', baudRate: 115200, autoOpen: false });

port.open((err) => {
  if (err) console.log('[WARN] Serial node offline. Operating in HTTP mode.');
});

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/alert') {
    port.write('A\\n');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ACK', node: 'BEACON_ENGAGED' }));
  } else {
    res.writeHead(200);
    res.end('JARVIS Bench Hook Active');
  }
});

server.listen(PORT, () => console.log(\`JARVIS NAS hook on port \${PORT}\`));`,
  continuityTestGuide: [
    'Zero-Budget Continuity Tester: Grab a dead motherboard CR2032 coin cell and your harvested green LED.',
    'Test Polarity: Touch the long LED leg to the (+) marked top of the coin cell, and short leg to the flat bottom (-). The LED will illuminate.',
    'Test Your Circuit Traces: Keep the long leg on (+). Place the short leg on one end of your wire/switch, and touch the coin cell bottom to the other end. If the connection is solid, the LED lights up instantly with zero multimeter needed!',
    'Capacitor ESR Sniff: Briefly touch a discharged cap across the coin cell test leads; a good capacitor will create a brief micro-flash as it charges up.',
  ],
};

export const FirmwareSuiteGenerator: React.FC<FirmwareSuiteGeneratorProps> = ({
  firmwareSuite = DEFAULT_FIRMWARE_SUITE,
}) => {
  const [activeTab, setActiveTab] = useState<'pinout' | 'arduino' | 'python' | 'tester'>('pinout');
  const [copied, setCopied] = useState(false);

  const getCodeText = () => (activeTab === 'arduino' ? firmwareSuite.arduinoCode : firmwareSuite.pythonNasCode);

  const handleCopy = async () => {
    if (await copyText(getCodeText())) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full flex flex-col rounded-2xl bg-[#090e1f]/95 border border-amber-500/40 shadow-2xl text-slate-100 overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="px-3 sm:px-4 py-3 bg-[#050811] border-b border-amber-950/80 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h4 className="font-mono font-bold text-xs sm:text-sm text-amber-300 uppercase tracking-wide">
              EXAMPLE PROJECT: {firmwareSuite.title}
            </h4>
            <p className="text-[10px] font-mono text-slate-400">
              STARTER WIRING + CODE (NOT GENERATED FROM YOUR SCAN)
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-mono self-start">
          <button
            onClick={() => setActiveTab('pinout')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              activeTab === 'pinout' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pinout Table
          </button>
          <button
            onClick={() => setActiveTab('arduino')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              activeTab === 'arduino' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Arduino/ESP32
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              activeTab === 'python' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            NAS Python
          </button>
          <button
            onClick={() => setActiveTab('tester')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              activeTab === 'tester' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            No-DMM Test
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-3">
        {/* Tab 1: Pinout & Wiring Table */}
        {activeTab === 'pinout' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-300 font-sans">
              Connect your harvested motherboard components according to this zero-cost wiring matrix. Can be powered safely via any stripped 5V USB cable:
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left font-mono text-xs text-slate-200">
                <thead className="bg-[#050811] text-amber-400 text-[11px] border-b border-slate-800 uppercase">
                  <tr>
                    <th className="p-2.5">Harvested Component Pin</th>
                    <th className="p-2.5">Connects To</th>
                    <th className="p-2.5">Polarity / Safety Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                  {firmwareSuite.pinoutTable.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-bold text-white">{row.partPin}</td>
                      <td className="p-2.5 text-cyan-300 font-semibold">{row.targetConnection}</td>
                      <td className="p-2.5 text-slate-300 text-[11px] font-sans">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2 & 3: Code Blocks */}
        {(activeTab === 'arduino' || activeTab === 'python') && (
          <div className="relative space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>{activeTab === 'arduino' ? 'Arduino IDE / ESP32 PlatformIO (.ino / .cpp)' : 'Home NAS Host Script (.py)'}</span>
              <button
                onClick={handleCopy}
                className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 font-mono text-xs flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY CODE'}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-black/90 border border-slate-800 text-[11px] font-mono text-cyan-200 overflow-x-auto max-h-72 leading-relaxed">
              {getCodeText()}
            </pre>
          </div>
        )}

        {/* Tab 4: No-Multimeter Continuity Test Guide */}
        {activeTab === 'tester' && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold uppercase">
              <HelpCircle className="w-4 h-4" />
              <span>ZERO-BUDGET HARDWARE CONTINUITY CHECKER</span>
            </div>
            <div className="space-y-1.5">
              {firmwareSuite.continuityTestGuide.map((step, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5 text-slate-200 font-sans"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
