import React, { useState } from 'react';
import {
  Database,
  CheckCircle,
  AlertTriangle,
  X,
  Code2,
  Copy,
  Check,
  Server,
  Activity,
  Key,
  Settings,
  Coins,
  Globe,
  Bot,
} from 'lucide-react';
import { UserSettings, saveStoredSettings } from '../utils/storage';
import { SalvagedPart, BenchStats, EcosystemStatus, Currency } from '../types';
import { playTacticalAudio } from '../utils/audio';
import { DEFAULT_API_BASE, postJSON } from '../utils/api';
import { copyText } from '../utils/shopping';

const CURRENCIES: Currency[] = ['USD', 'ZAR', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'];
const inputCls =
  'w-full min-h-[44px] px-3 rounded-xl bg-[#050811] border border-slate-800 text-white font-mono text-base sm:text-xs focus:outline-none focus:border-cyan-400';

interface NASSyncDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
  parts: SalvagedPart[];
  stats: BenchStats;
  onEcosystemStatusChange?: (status: EcosystemStatus) => void;
}

export const NASSyncDrawer: React.FC<NASSyncDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  parts,
  stats,
  onEcosystemStatusChange,
}) => {
  const [jarvisCoreUrl, setJarvisCoreUrl] = useState(settings.jarvisCoreApiUrl);
  const [secondBrainAuthToken, setSecondBrainAuthToken] = useState(settings.secondBrainAuthToken);
  const [agentBuilderUrl, setAgentBuilderUrl] = useState(settings.agentBuilderUrl);
  const [agentBuilderApiKey, setAgentBuilderApiKey] = useState(settings.agentBuilderApiKey);
  const [webhookUrl, setWebhookUrl] = useState(settings.nasWebhookUrl);
  const [currency, setCurrency] = useState<Currency>(settings.currency);
  const [accessKey, setAccessKey] = useState(settings.accessKey);
  const [apiBaseUrl, setApiBaseUrl] = useState(settings.apiBaseUrl);

  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; latencyMs?: number; message: string } | null>(null);

  const [isAgentBuilderPinging, setIsAgentBuilderPinging] = useState(false);
  const [agentBuilderPingResult, setAgentBuilderPingResult] = useState<{ success: boolean; latencyMs?: number; message: string } | null>(null);

  const [activeScriptTab, setActiveScriptTab] = useState<'node' | 'python'>('node');
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    const updated: UserSettings = {
      ...settings,
      jarvisCoreApiUrl: jarvisCoreUrl.trim(),
      secondBrainAuthToken: secondBrainAuthToken.trim(),
      agentBuilderUrl: agentBuilderUrl.trim(),
      agentBuilderApiKey: agentBuilderApiKey.trim(),
      nasWebhookUrl: webhookUrl.trim(),
      currency,
      accessKey: accessKey.trim(),
      apiBaseUrl: apiBaseUrl.trim().replace(/\/+$/, ''),
    };
    onUpdateSettings(updated);
    saveStoredSettings(updated);
    playTacticalAudio.chirp();
  };

  const handleTestHandshake = async () => {
    setIsPinging(true);
    setPingResult(null);
    playTacticalAudio.chirp();

    try {
      const data = await postJSON<{ success: boolean; latencyMs?: number; error?: string; message?: string }>('/api/jarvis/telemetry', {
        jarvisCoreUrl: jarvisCoreUrl.trim() || undefined,
        authToken: secondBrainAuthToken.trim() || undefined,
        state: {
          event: 'HANDSHAKE_TEST',
          totalParts: parts.length,
          cravingsDefeated: stats.cravingsDefeated,
          activeClient: 'BENCH-OS v3.1',
          timestamp: new Date().toISOString(),
        },
      });

      if (data.success) {
        const latency = data.latencyMs ?? 0;
        setPingResult({
          success: true,
          latencyMs: latency,
          message: `Connected to Jarvis (${latency}ms).`,
        });
        playTacticalAudio.success();
        if (onEcosystemStatusChange) {
          onEcosystemStatusChange({
            connected: true,
            latencyMs: latency,
            lastPing: new Date().toLocaleTimeString(),
            message: 'Jarvis Online',
          });
        }
      } else {
        setPingResult({
          success: false,
          message: data.error || 'Could not connect to Jarvis.',
        });
        playTacticalAudio.alert();
        if (onEcosystemStatusChange) {
          onEcosystemStatusChange({
            connected: false,
            latencyMs: null,
            lastPing: new Date().toLocaleTimeString(),
            message: 'Jarvis Offline',
          });
        }
      }
    } catch (err: any) {
      setPingResult({ success: false, message: err.message || 'Network transport error' });
      playTacticalAudio.alert();
    } finally {
      setIsPinging(false);
    }
  };

  const handleTestAgentBuilder = async () => {
    setIsAgentBuilderPinging(true);
    setAgentBuilderPingResult(null);
    playTacticalAudio.chirp();

    try {
      const data = await postJSON<{ success: boolean; latencyMs?: number; error?: string; message?: string }>('/api/agent-builder/relay', {
        agentBuilderUrl: agentBuilderUrl.trim() || undefined,
        apiKey: agentBuilderApiKey.trim() || undefined,
        title: 'BENCH-OS Handshake',
        message: 'BENCH-OS Workbench connected to Agent Builder bridge',
        sender: 'BENCH-OS',
        eventType: 'event',
        metadata: {
          totalParts: parts.length,
          cravingsDefeated: stats.cravingsDefeated,
          client: 'BENCH-OS v3.1',
          timestamp: new Date().toISOString(),
        },
      });

      if (data.success) {
        const latency = data.latencyMs ?? 0;
        setAgentBuilderPingResult({
          success: true,
          latencyMs: latency,
          message: `Connected to Agent Builder (${latency}ms).`,
        });
        playTacticalAudio.success();
        if (onEcosystemStatusChange) {
          onEcosystemStatusChange({
            connected: true,
            latencyMs: pingResult?.latencyMs ?? latency,
            lastPing: new Date().toLocaleTimeString(),
            agentBuilderConnected: true,
            agentBuilderLatencyMs: latency,
          });
        }
      } else {
        setAgentBuilderPingResult({
          success: false,
          message: data.error || 'Could not reach Agent Builder bridge.',
        });
        playTacticalAudio.alert();
      }
    } catch (err: any) {
      setAgentBuilderPingResult({ success: false, message: err.message || 'Agent Builder bridge error' });
      playTacticalAudio.alert();
    } finally {
      setIsAgentBuilderPinging(false);
    }
  };

  const nodeScript = `// jarvis-nas-receiver.js
// Deploy to TrueNAS / Synology / Unraid / Raspberry Pi: node jarvis-nas-receiver.js
import http from 'http';
import fs from 'fs';

const PORT = 8080;
const INVENTORY_DB = 'jarvis-salvaged-inventory.json';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'POST' && (req.url === '/jarvis-webhook' || req.url === '/api/v1/jarvis')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        console.log(\`[BENCH-OS SYNC \${new Date().toLocaleTimeString()}]:\`, payload.event || 'DATA_RECEIVED');
        fs.writeFileSync(INVENTORY_DB, JSON.stringify(payload, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ACK', savedAt: new Date().toISOString() }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(\`JARVIS NAS Receiver listening on port \${PORT}\`);
});`;

  const pythonScript = `# jarvis_nas_receiver.py
# Deploy to TrueNAS / Synology / Unraid / Raspberry Pi: python3 jarvis_nas_receiver.py
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 8080
INVENTORY_DB = "jarvis-salvaged-inventory.json"

class JarvisHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('content-length', 0))
        body = self.rfile.read(length)
        try:
            data = json.loads(body.decode('utf-8'))
            print(f"[BENCH-OS SYNC]: Received {data.get('event', 'DATA')}")
            with open(INVENTORY_DB, "w") as f:
                json.dump(data, f, indent=2)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status":"ACK"}')
        except Exception as e:
            self.send_response(400)
            self.end_headers()

server = HTTPServer(('0.0.0.0', PORT), JarvisHandler)
print(f"JARVIS Ecosystem Receiver listening on port {PORT}")
server.serve_forever()`;

  const copyScript = async () => {
    const text = activeScriptTab === 'node' ? nodeScript : pythonScript;
    if (await copyText(text)) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[92dvh] flex flex-col rounded-2xl bg-[#090e1f] border border-cyan-500/40 shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-3 sm:px-5 py-3 bg-[#050811] border-b border-cyan-950/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold text-sm tracking-wide uppercase">
            <Settings className="w-5 h-5 text-cyan-400" />
            <span>BACKEND CONNECTIONS & SETTINGS</span>
          </div>
          <button onClick={onClose} className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs font-mono">
          {/* Section 0: General */}
          <div className="space-y-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-300 font-bold uppercase text-[11px]">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span>GENERAL & ACCESS SECURITY</span>
            </div>
            <div>
              <label className="text-slate-400 block text-[10px] mb-1">PRICE CURRENCY (estimates + Amazon store region)</label>
              <select value={currency} onChange={e => setCurrency(e.target.value as Currency)} className={inputCls}>
                {CURRENCIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 block text-[10px] mb-1">BENCH-OS ACCESS KEY (protects your live API)</label>
              <div className="relative">
                <input type="password" value={accessKey} onChange={e => setAccessKey(e.target.value)} placeholder="Leave blank if not required" className={inputCls} autoComplete="off" />
                <Key className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div>
              <label className="text-slate-400 block text-[10px] mb-1">SERVER URL (advanced - blank uses the built-in default)</label>
              <div className="relative">
                <input type="url" value={apiBaseUrl} onChange={e => setApiBaseUrl(e.target.value)} placeholder={DEFAULT_API_BASE || 'Same server as this page'} className={inputCls} autoComplete="off" />
                <Globe className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Section 1: Jarvis Core API & Token */}
          <div className="space-y-3 p-3.5 rounded-xl bg-slate-900/60 border border-cyan-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-300 font-bold uppercase text-[11px]">
                <Server className="w-4 h-4 text-cyan-400" />
                <span>JARVIS CORE ECOSYSTEM</span>
              </div>
              <span className="text-[10px] text-cyan-500 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">Second Brain</span>
            </div>

            <div>
              <label className="text-slate-400 block text-[10px] mb-1">
                JARVIS_CORE_API_URL (Cloudflare Tunnel, Tailscale, or LAN)
              </label>
              <input
                type="url"
                value={jarvisCoreUrl}
                onChange={e => setJarvisCoreUrl(e.target.value)}
                placeholder="https://jarvis.savestate.co.za"
                className={inputCls}
              />
            </div>

            <div>
              <label className="text-slate-400 block text-[10px] mb-1">
                JARVIS_API_KEY (Integration Key or Master Key)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={secondBrainAuthToken}
                  onChange={e => setSecondBrainAuthToken(e.target.value)}
                  placeholder="jb_live_sk_... or master key"
                  className={inputCls}
                />
                <Key className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              onClick={handleTestHandshake}
              disabled={isPinging}
              className="w-full min-h-[40px] px-3 rounded-lg bg-cyan-950/40 border border-cyan-500/50 hover:bg-cyan-900/40 text-cyan-200 font-bold text-xs uppercase flex items-center justify-center gap-2 transition"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isPinging ? 'TESTING JARVIS...' : 'TEST JARVIS HANDSHAKE'}</span>
            </button>

            {pingResult && (
              <div
                className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                  pingResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                }`}
              >
                {pingResult.success ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{pingResult.message}</span>
              </div>
            )}
          </div>

          {/* Section 2: Agent Builder Bridge */}
          <div className="space-y-3 p-3.5 rounded-xl bg-slate-900/60 border border-purple-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-300 font-bold uppercase text-[11px]">
                <Bot className="w-4 h-4 text-purple-400" />
                <span>AGENT BUILDER BRIDGE</span>
              </div>
              <span className="text-[10px] text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">Autonomous Builder</span>
            </div>

            <div>
              <label className="text-slate-400 block text-[10px] mb-1">
                AGENT_BUILDER_BRIDGE_URL (Portfolio Bridge or PC Agent Bridge)
              </label>
              <input
                type="url"
                value={agentBuilderUrl}
                onChange={e => setAgentBuilderUrl(e.target.value)}
                placeholder="https://portfolio.arpcloudsolutions.co.za/api/agent-builder/bridge"
                className={inputCls}
              />
            </div>

            <div>
              <label className="text-slate-400 block text-[10px] mb-1">
                AGENT_BUILDER_KEY (Authorization Key)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={agentBuilderApiKey}
                  onChange={e => setAgentBuilderApiKey(e.target.value)}
                  placeholder="jrv_... key"
                  className={inputCls}
                />
                <Key className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              onClick={handleTestAgentBuilder}
              disabled={isAgentBuilderPinging}
              className="w-full min-h-[40px] px-3 rounded-lg bg-purple-950/40 border border-purple-500/50 hover:bg-purple-900/40 text-purple-200 font-bold text-xs uppercase flex items-center justify-center gap-2 transition"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{isAgentBuilderPinging ? 'TESTING AGENT BUILDER...' : 'TEST AGENT BUILDER BRIDGE'}</span>
            </button>

            {agentBuilderPingResult && (
              <div
                className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                  agentBuilderPingResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                }`}
              >
                {agentBuilderPingResult.success ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{agentBuilderPingResult.message}</span>
              </div>
            )}
          </div>

          {/* Section 3: Home NAS Webhook */}
          <div className="space-y-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-amber-300 font-bold uppercase text-[11px]">
              <Database className="w-4 h-4 text-amber-400" />
              <span>HOME NAS WEBHOOK (OPTIONAL)</span>
            </div>

            <div>
              <label className="text-slate-400 block text-[10px] mb-1">
                NAS_WEBHOOK_URL (Local IP or Tailscale Mesh IP)
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="http://192.168.1.150:8080/jarvis-webhook"
                className={inputCls}
              />
            </div>
          </div>

          {/* Ready-to-Run Server Scripts */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>SERVER RECEIVER SCRIPT (PASTE ON NAS)</span>
              </span>
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                <button
                  onClick={() => setActiveScriptTab('node')}
                  className={`px-2 py-0.5 rounded ${
                    activeScriptTab === 'node' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Node.js
                </button>
                <button
                  onClick={() => setActiveScriptTab('python')}
                  className={`px-2 py-0.5 rounded ${
                    activeScriptTab === 'python' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Python
                </button>
              </div>
            </div>

            <div className="relative">
              <pre className="p-3 bg-black/80 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-200 overflow-x-auto max-h-48 leading-relaxed">
                {activeScriptTab === 'node' ? nodeScript : pythonScript}
              </pre>
              <button
                onClick={copyScript}
                className="absolute top-2.5 right-2.5 px-2 py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-[10px] flex items-center gap-1 transition"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'COPIED' : 'COPY SCRIPT'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#050811] border-t border-cyan-950/80 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              handleSave();
              onClose();
            }}
            className="min-h-[44px] px-5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs uppercase"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
